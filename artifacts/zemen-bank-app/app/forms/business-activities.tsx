import { Feather } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Switch,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApi } from "@/hooks/useApi";
import { useColors } from "@/hooks/useColors";
import { useForm } from "@/context/FormContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface Shareholder {
  name: string;
  shareholding: number;
}

export default function BusinessActivitiesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { request } = useApi();
  const { submission, getSection, updateSection } = useForm();
  const qc = useQueryClient();
  
  const section = getSection("BUSINESS_ACTIVITIES");
  const [businessDescription, setBusinessDescription] = useState("");
  const [isStartUp, setIsStartUp] = useState(false);
  const [hasBorrowed, setHasBorrowed] = useState(false);
  const [borrowingDetails, setBorrowingDetails] = useState("");
  const [shareholders, setShareholders] = useState<Shareholder[]>([{ name: "", shareholding: 0 }]);

  useEffect(() => {
    if (section?.answers) {
      setBusinessDescription(section.answers.businessDescription || "");
      setIsStartUp(section.answers.isStartUp || false);
      setHasBorrowed(section.answers.hasBorrowed || false);
      setBorrowingDetails(section.answers.borrowingDetails || "");
      setShareholders(section.answers.shareholders?.length > 0 
        ? section.answers.shareholders 
        : [{ name: "", shareholding: 0 }]);
    }
  }, [section]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!submission?.id) throw new Error("No active submission");
      return request("/form-sections", {
        method: "POST",
        body: JSON.stringify({
          sectionName: "BUSINESS_ACTIVITIES",
          answers: {
            businessDescription,
            isStartUp,
            hasBorrowed,
            borrowingDetails: hasBorrowed ? borrowingDetails : undefined,
            shareholders: shareholders.filter(s => s.name.trim()),
          },
          submissionId: submission.id,
        }),
      });
    },
    onSuccess: () => {
      updateSection("BUSINESS_ACTIVITIES", { businessDescription, isStartUp, hasBorrowed, borrowingDetails, shareholders });
      qc.invalidateQueries({ queryKey: ["submissions"] });
      router.back();
    },
  });

  const addShareholder = () => {
    setShareholders([...shareholders, { name: "", shareholding: 0 }]);
  };

  const updateShareholder = (index: number, field: keyof Shareholder, value: string | number) => {
    const newShareholders = [...shareholders];
    newShareholders[index][field] = value as never;
    setShareholders(newShareholders);
  };

  const removeShareholder = (index: number) => {
    setShareholders(shareholders.filter((_, i) => i !== index));
  };

  const paddingBottom = Platform.OS === "web" ? 34 : insets.bottom + 24;

  return (
    <>
      <Stack.Screen
        options={{
          title: "Business Activities",
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
          <Card style={[styles.infoCard, { backgroundColor: colors.accent, borderColor: "transparent" }]}>
            <View style={styles.infoRow}>
              <Feather name="info" size={18} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.primary }]}>
                Section 3 of 5: Business description, shareholding and borrowing details
              </Text>
            </View>
          </Card>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Business Description <Text style={{ color: colors.destructive }}>*</Text>
            </Text>
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              Describe your business activities, products/services, and operations
            </Text>
            <TextInput
              style={[styles.textArea, { borderColor: colors.border, backgroundColor: colors.secondary, color: colors.foreground }]}
              placeholder="Enter detailed business description..."
              placeholderTextColor={colors.mutedForeground}
              value={businessDescription}
              onChangeText={setBusinessDescription}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={[styles.label, { color: colors.foreground }]}>Is this a Startup?</Text>
                <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                  Company established within the last 2 years
                </Text>
              </View>
              <Switch
                value={isStartUp}
                onValueChange={setIsStartUp}
                trackColor={{ false: colors.border, true: colors.success }}
                thumbColor={isStartUp ? colors.success : colors.mutedForeground}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={[styles.label, { color: colors.foreground }]}>Has the company borrowed funds?</Text>
              </View>
              <Switch
                value={hasBorrowed}
                onValueChange={setHasBorrowed}
                trackColor={{ false: colors.border, true: colors.success }}
                thumbColor={hasBorrowed ? colors.success : colors.mutedForeground}
              />
            </View>
          </View>

          {hasBorrowed && (
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Borrowing Details</Text>
              <TextInput
                style={[styles.textArea, { borderColor: colors.border, backgroundColor: colors.secondary, color: colors.foreground }]}
                placeholder="Describe loan amounts, lenders, and terms..."
                placeholderTextColor={colors.mutedForeground}
                value={borrowingDetails}
                onChangeText={setBorrowingDetails}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Shareholders</Text>
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              List all shareholders and their shareholding percentages
            </Text>
            
            {shareholders.map((shareholder, index) => (
              <Card key={index} style={[styles.shareholderCard, { borderColor: colors.border }]}>
                <View style={styles.shareholderRow}>
                  <View style={styles.shareholderInputs}>
                    <TextInput
                      style={[styles.shareholderInput, { borderColor: colors.border, backgroundColor: colors.secondary, color: colors.foreground }]}
                      placeholder="Shareholder Name"
                      placeholderTextColor={colors.mutedForeground}
                      value={shareholder.name}
                      onChangeText={(text) => updateShareholder(index, "name", text)}
                    />
                    <View style={styles.pctRow}>
                      <TextInput
                        style={[styles.pctInput, { borderColor: colors.border, backgroundColor: colors.secondary, color: colors.foreground }]}
                        placeholder="%"
                        placeholderTextColor={colors.mutedForeground}
                        value={shareholder.shareholding ? shareholder.shareholding.toString() : ""}
                        onChangeText={(text) => updateShareholder(index, "shareholding", parseFloat(text) || 0)}
                        keyboardType="decimal-pad"
                      />
                      <Text style={[styles.pctLabel, { color: colors.mutedForeground }]}>%</Text>
                    </View>
                  </View>
                  {shareholders.length > 1 && (
                    <Pressable onPress={() => removeShareholder(index)} style={styles.removeBtn}>
                      <Feather name="trash-2" size={18} color={colors.destructive} />
                    </Pressable>
                  )}
                </View>
              </Card>
            ))}
            
            <Button variant="outline" size="sm" onPress={addShareholder} style={styles.addBtn}>
              <Feather name="plus" size={14} color={colors.primary} />
              Add Shareholder
            </Button>
          </View>

          <View style={styles.actions}>
            <Button
              variant="primary"
              size="md"
              onPress={() => saveMutation.mutate()}
              loading={saveMutation.isPending}
              fullWidth
            >
              Save & Continue
            </Button>
            <Button
              variant="outline"
              size="md"
              onPress={() => router.back()}
              fullWidth
              style={{ marginTop: 8 }}
            >
              Cancel
            </Button>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, gap: 16 },
  infoCard: { marginBottom: 8 },
  infoRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  fieldGroup: { gap: 8 },
  label: { fontSize: 14, fontFamily: "Inter_500Medium" },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: -4 },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    minHeight: 120,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchLabel: { flex: 1 },
  shareholderCard: { marginBottom: 8 },
  shareholderRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  shareholderInputs: { flex: 1, gap: 8 },
  shareholderInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  pctRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  pctInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    width: 80,
  },
  pctLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  removeBtn: { padding: 4 },
  addBtn: { marginTop: 4 },
  actions: { marginTop: 8, gap: 8 },
});
