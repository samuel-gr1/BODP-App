import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApi } from "@/hooks/useApi";
import { useColors } from "@/hooks/useColors";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Category {
  id: string;
  name: string;
}

interface AgendaItem {
  title: string;
  description: string;
  presenter: string;
  duration: string;
}

export default function CreateMeetingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { request } = useApi();
  const qc = useQueryClient();

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([{ title: "", description: "", presenter: "", duration: "30" }]);
  const [externalInvitees, setExternalInvitees] = useState<{ email: string; name: string }[]>([]);
  const [newInviteeEmail, setNewInviteeEmail] = useState("");
  const [newInviteeName, setNewInviteeName] = useState("");

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => request<{ users: User[] }>("/users"),
    retry: 1,
  });

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => request<{ categories: Category[] }>("/categories"),
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      request("/meetings", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          date,
          time,
          location,
          categoryId,
          participants: selectedParticipants.map((id) => ({ userId: id, role: "PARTICIPANT" })),
          externalInvitees,
          agendaItems: agendaItems.filter((item) => item.title.trim()),
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meetings"] });
      Alert.alert("Success", "Meeting created successfully!");
      router.replace("/(tabs)/meetings");
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message || "Failed to create meeting");
    },
  });

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const addAgendaItem = () => {
    setAgendaItems([...agendaItems, { title: "", description: "", presenter: "", duration: "30" }]);
  };

  const updateAgendaItem = (index: number, field: keyof AgendaItem, value: string) => {
    const newItems = [...agendaItems];
    newItems[index][field] = value;
    setAgendaItems(newItems);
  };

  const removeAgendaItem = (index: number) => {
    setAgendaItems(agendaItems.filter((_, i) => i !== index));
  };

  const addExternalInvitee = () => {
    if (newInviteeEmail.trim() && newInviteeName.trim()) {
      setExternalInvitees([...externalInvitees, { email: newInviteeEmail.trim(), name: newInviteeName.trim() }]);
      setNewInviteeEmail("");
      setNewInviteeName("");
    }
  };

  const removeExternalInvitee = (index: number) => {
    setExternalInvitees(externalInvitees.filter((_, i) => i !== index));
  };

  const validateStep = () => {
    switch (step) {
      case 1:
        return title.trim() && date.trim() && time.trim();
      case 2:
        return selectedParticipants.length > 0;
      case 3:
        return agendaItems.some((item) => item.title.trim());
      default:
        return true;
    }
  };

  const paddingBottom = Platform.OS === "web" ? 34 : insets.bottom + 24;

  if (usersLoading || categoriesLoading) return <LoadingSpinner />;

  return (
    <>
      <Stack.Screen
        options={{
          title: "Create Meeting",
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: "#fff",
        }}
      />
      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Step Indicator */}
          <View style={styles.stepIndicator}>
            {[1, 2, 3].map((s) => (
              <View key={s} style={styles.stepRow}>
                <View
                  style={[
                    styles.stepDot,
                    {
                      backgroundColor: s === step ? colors.primary : s < step ? colors.success : colors.border,
                    },
                  ]}
                >
                  {s < step ? (
                    <Feather name="check" size={12} color="#fff" />
                  ) : (
                    <Text style={[styles.stepNumber, { color: s === step ? "#fff" : colors.mutedForeground }]}>{s}</Text>
                  )}
                </View>
                <Text style={[styles.stepLabel, { color: s === step ? colors.primary : colors.mutedForeground }]}>
                  {s === 1 ? "Details" : s === 2 ? "Participants" : "Agenda"}
                </Text>
                {s < 3 && <View style={[styles.stepLine, { backgroundColor: s < step ? colors.success : colors.border }]} />}
              </View>
            ))}
          </View>

          {/* Step 1: Meeting Details */}
          {step === 1 && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>Meeting Details</Text>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>
                  Title <Text style={{ color: colors.destructive }}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, backgroundColor: colors.secondary, color: colors.foreground }]}
                  placeholder="Enter meeting title"
                  placeholderTextColor={colors.mutedForeground}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>Description</Text>
                <TextInput
                  style={[styles.textArea, { borderColor: colors.border, backgroundColor: colors.secondary, color: colors.foreground }]}
                  placeholder="Enter meeting description"
                  placeholderTextColor={colors.mutedForeground}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.rowFields}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.foreground }]}>
                    Date <Text style={{ color: colors.destructive }}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, backgroundColor: colors.secondary, color: colors.foreground }]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.mutedForeground}
                    value={date}
                    onChangeText={setDate}
                  />
                </View>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.foreground }]}>
                    Time <Text style={{ color: colors.destructive }}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, backgroundColor: colors.secondary, color: colors.foreground }]}
                    placeholder="10:00 AM"
                    placeholderTextColor={colors.mutedForeground}
                    value={time}
                    onChangeText={setTime}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>Location</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, backgroundColor: colors.secondary, color: colors.foreground }]}
                  placeholder="Meeting room or address"
                  placeholderTextColor={colors.mutedForeground}
                  value={location}
                  onChangeText={setLocation}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>Committee/Board</Text>
                <View style={[styles.selectContainer, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
                  {categoriesData?.categories?.map((cat) => (
                    <Pressable
                      key={cat.id}
                      style={[styles.selectOption, categoryId === cat.id && { backgroundColor: colors.primary }]}
                      onPress={() => setCategoryId(cat.id)}
                    >
                      <Text
                        style={[styles.selectText, { color: categoryId === cat.id ? "#fff" : colors.foreground }]}
                        numberOfLines={1}
                      >
                        {cat.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Step 2: Participants */}
          {step === 2 && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>Select Participants</Text>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>
                  Internal Participants <Text style={{ color: colors.destructive }}>*</Text>
                </Text>
                <View style={[styles.usersContainer, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
                  {usersData?.users?.map((user) => (
                    <Pressable
                      key={user.id}
                      style={[styles.userChip, selectedParticipants.includes(user.id) && { backgroundColor: colors.primary }]}
                      onPress={() => toggleParticipant(user.id)}
                    >
                      <Text
                        style={[styles.userChipText, { color: selectedParticipants.includes(user.id) ? "#fff" : colors.foreground }]}
                        numberOfLines={1}
                      >
                        {user.name}
                      </Text>
                      {selectedParticipants.includes(user.id) && <Feather name="check" size={12} color="#fff" style={{ marginLeft: 4 }} />}
                    </Pressable>
                  ))}
                </View>
                <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                  {selectedParticipants.length} selected
                </Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>External Invitees</Text>
                <View style={styles.rowFields}>
                  <TextInput
                    style={[styles.input, { flex: 1, borderColor: colors.border, backgroundColor: colors.secondary, color: colors.foreground }]}
                    placeholder="Name"
                    placeholderTextColor={colors.mutedForeground}
                    value={newInviteeName}
                    onChangeText={setNewInviteeName}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1.5, borderColor: colors.border, backgroundColor: colors.secondary, color: colors.foreground }]}
                    placeholder="Email"
                    placeholderTextColor={colors.mutedForeground}
                    value={newInviteeEmail}
                    onChangeText={setNewInviteeEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <Pressable style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={addExternalInvitee}>
                    <Feather name="plus" size={20} color="#fff" />
                  </Pressable>
                </View>

                {externalInvitees.map((invitee, index) => (
                  <View key={index} style={[styles.inviteeRow, { borderBottomColor: colors.border }]}>
                    <View>
                      <Text style={[styles.inviteeName, { color: colors.foreground }]}>{invitee.name}</Text>
                      <Text style={[styles.inviteeEmail, { color: colors.mutedForeground }]}>{invitee.email}</Text>
                    </View>
                    <Pressable onPress={() => removeExternalInvitee(index)}>
                      <Feather name="x" size={18} color={colors.destructive} />
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Step 3: Agenda */}
          {step === 3 && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>Meeting Agenda</Text>

              {agendaItems.map((item, index) => (
                <Card key={index} style={[styles.agendaCard, { borderColor: colors.border }]}>
                  <View style={styles.agendaHeader}>
                    <Text style={[styles.agendaNumber, { color: colors.primary }]}>Item {index + 1}</Text>
                    {agendaItems.length > 1 && (
                      <Pressable onPress={() => removeAgendaItem(index)}>
                        <Feather name="trash-2" size={16} color={colors.destructive} />
                      </Pressable>
                    )}
                  </View>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, backgroundColor: colors.secondary, color: colors.foreground }]}
                    placeholder="Agenda item title *"
                    placeholderTextColor={colors.mutedForeground}
                    value={item.title}
                    onChangeText={(text) => updateAgendaItem(index, "title", text)}
                  />
                  <TextInput
                    style={[styles.textArea, { borderColor: colors.border, backgroundColor: colors.secondary, color: colors.foreground }]}
                    placeholder="Description"
                    placeholderTextColor={colors.mutedForeground}
                    value={item.description}
                    onChangeText={(text) => updateAgendaItem(index, "description", text)}
                    multiline
                    numberOfLines={2}
                  />
                  <View style={styles.rowFields}>
                    <TextInput
                      style={[styles.input, { flex: 2, borderColor: colors.border, backgroundColor: colors.secondary, color: colors.foreground }]}
                      placeholder="Presenter"
                      placeholderTextColor={colors.mutedForeground}
                      value={item.presenter}
                      onChangeText={(text) => updateAgendaItem(index, "presenter", text)}
                    />
                    <TextInput
                      style={[styles.input, { flex: 1, borderColor: colors.border, backgroundColor: colors.secondary, color: colors.foreground }]}
                      placeholder="Minutes"
                      placeholderTextColor={colors.mutedForeground}
                      value={item.duration}
                      onChangeText={(text) => updateAgendaItem(index, "duration", text)}
                      keyboardType="number-pad"
                    />
                  </View>
                </Card>
              ))}

              <Button variant="outline" size="sm" onPress={addAgendaItem} style={styles.addAgendaBtn}>
                <Feather name="plus" size={14} color={colors.primary} />
                Add Agenda Item
              </Button>
            </View>
          )}

          {/* Navigation Buttons */}
          <View style={styles.navButtons}>
            {step > 1 && (
              <Button variant="outline" size="md" onPress={() => setStep(step - 1)} style={{ flex: 1 }}>
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button
                variant="primary"
                size="md"
                onPress={() => validateStep() && setStep(step + 1)}
                disabled={!validateStep()}
                style={{ flex: 1 }}
              >
                Next
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onPress={() => createMutation.mutate()}
                loading={createMutation.isPending}
                disabled={!validateStep()}
                style={{ flex: 1 }}
              >
                Create Meeting
              </Button>
            )}
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16 },
  stepIndicator: { flexDirection: "row", justifyContent: "center", marginBottom: 24, paddingHorizontal: 20 },
  stepRow: { alignItems: "center", flex: 1 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumber: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  stepLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 4 },
  stepLine: { width: "100%", height: 2, marginTop: -14, marginLeft: "50%", zIndex: -1 },
  stepContent: { gap: 16 },
  stepTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 8 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 14, fontFamily: "Inter_500Medium" },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular" },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    minHeight: 80,
    textAlignVertical: "top",
  },
  rowFields: { flexDirection: "row", gap: 10 },
  selectContainer: { borderWidth: 1, borderRadius: 10, padding: 8, gap: 6 },
  selectOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  selectText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  usersContainer: { borderWidth: 1, borderRadius: 10, padding: 10, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  userChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100 },
  userChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  addBtn: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  inviteeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1 },
  inviteeName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  inviteeEmail: { fontSize: 12, fontFamily: "Inter_400Regular" },
  agendaCard: { padding: 14, marginBottom: 10 },
  agendaHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  agendaNumber: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  addAgendaBtn: { marginTop: 4 },
  navButtons: { flexDirection: "row", gap: 10, marginTop: 24 },
});
