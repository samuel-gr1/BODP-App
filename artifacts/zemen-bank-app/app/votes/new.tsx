import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useApi } from "@/hooks/useApi";

interface Category {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

type VisibilityType = "ALL" | "COMMITTEE" | "SELECTED";

export default function NewVoteScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { request } = useApi();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [visibility, setVisibility] = useState<VisibilityType>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Fetch committees for COMMITTEE visibility
  const { data: committeesData, isLoading: committeesLoading } = useQuery({
    queryKey: ["user-committees"],
    queryFn: () => request<{ committees: Category[] }>("/categories"),
    enabled: visibility === "COMMITTEE",
    retry: 1,
  });

  // Fetch users for SELECTED visibility
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => request<{ users: User[] }>("/users"),
    enabled: visibility === "SELECTED",
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      request("/votes", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          options: options.filter((o) => o.trim()),
          visibility,
          categoryId: visibility === "COMMITTEE" ? selectedCategory : undefined,
          selectedUserIds: visibility === "SELECTED" ? selectedUsers : undefined,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["votes"] });
      Alert.alert("Success", "Vote created successfully!");
      router.back();
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to create vote");
    },
  });

  const handleAddOption = () => {
    setOptions([...options, ""]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      Alert.alert("Error", "At least 2 options are required");
      return;
    }
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const toggleUserSelection = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleCreate = () => {
    if (!title.trim()) {
      Alert.alert("Error", "Title is required");
      return;
    }

    const validOptions = options.filter((o) => o.trim());
    if (validOptions.length < 2) {
      Alert.alert("Error", "At least 2 options are required");
      return;
    }

    if (visibility === "COMMITTEE" && !selectedCategory) {
      Alert.alert("Error", "Please select a committee");
      return;
    }

    if (visibility === "SELECTED" && selectedUsers.length === 0) {
      Alert.alert("Error", "Please select at least one user");
      return;
    }

    if (endDate <= startDate) {
      Alert.alert("Error", "End date must be after start date");
      return;
    }

    createMutation.mutate();
  };

  const onStartDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowStartPicker(false);
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const onEndDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowEndPicker(false);
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  if (committeesLoading || usersLoading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Create Vote</Text>
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: colors.primary }]}
          onPress={handleCreate}
          disabled={createMutation.isPending}
        >
          <Text style={styles.createButtonText}>
            {createMutation.isPending ? "Creating..." : "Create"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Title */}
        <Card style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground }]}>Title *</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter vote title"
            placeholderTextColor={colors.mutedForeground}
          />
        </Card>

        {/* Description */}
        <Card style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground }]}>Description</Text>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
            value={description}
            onChangeText={setDescription}
            placeholder="Enter vote description (optional)"
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={4}
          />
        </Card>

        {/* Options */}
        <Card style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground }]}>Options *</Text>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Add at least 2 options
          </Text>
          {options.map((option, index) => (
            <View key={index} style={styles.optionRow}>
              <TextInput
                style={[
                  styles.optionInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                value={option}
                onChangeText={(value) => handleOptionChange(index, value)}
                placeholder={`Option ${index + 1}`}
                placeholderTextColor={colors.mutedForeground}
              />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveOption(index)}
              >
                <Feather name="x" size={20} color={colors.destructive} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            style={[styles.addButton, { borderColor: colors.primary }]}
            onPress={handleAddOption}
          >
            <Feather name="plus" size={16} color={colors.primary} />
            <Text style={[styles.addButtonText, { color: colors.primary }]}>
              Add Option
            </Text>
          </TouchableOpacity>
        </Card>

        {/* Visibility */}
        <Card style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground }]}>Visibility</Text>
          <View style={styles.visibilityOptions}>
            {(["ALL", "COMMITTEE", "SELECTED"] as VisibilityType[]).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.visibilityOption,
                  visibility === type && { backgroundColor: colors.primary + "20" },
                  { borderColor: visibility === type ? colors.primary : colors.border },
                ]}
                onPress={() => setVisibility(type)}
              >
                <Text
                  style={[
                    styles.visibilityText,
                    { color: visibility === type ? colors.primary : colors.foreground },
                  ]}
                >
                  {type === "ALL" ? "All Users" : type === "COMMITTEE" ? "Committee" : "Selected Users"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {visibility === "COMMITTEE" && (
            <View style={styles.selectorContainer}>
              <Text style={[styles.label, { color: colors.foreground, marginTop: 16 }]}>
                Select Committee
              </Text>
              {committeesData?.committees?.map((committee) => (
                <TouchableOpacity
                  key={committee.id}
                  style={[
                    styles.selectorItem,
                    selectedCategory === committee.id && {
                      backgroundColor: colors.primary + "10",
                      borderColor: colors.primary,
                    },
                    { borderColor: colors.border },
                  ]}
                  onPress={() => setSelectedCategory(committee.id)}
                >
                  <View
                    style={[
                      styles.radioCircle,
                      {
                        borderColor:
                          selectedCategory === committee.id
                            ? colors.primary
                            : colors.border,
                      },
                    ]}
                  >
                    {selectedCategory === committee.id && (
                      <View
                        style={[styles.radioInner, { backgroundColor: colors.primary }]}
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.selectorText,
                      { color: colors.foreground },
                    ]}
                  >
                    {committee.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {visibility === "SELECTED" && (
            <View style={styles.selectorContainer}>
              <Text style={[styles.label, { color: colors.foreground, marginTop: 16 }]}>
                Select Users ({selectedUsers.length} selected)
              </Text>
              {usersData?.users?.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  style={[
                    styles.selectorItem,
                    selectedUsers.includes(u.id) && {
                      backgroundColor: colors.primary + "10",
                      borderColor: colors.primary,
                    },
                    { borderColor: colors.border },
                  ]}
                  onPress={() => toggleUserSelection(u.id)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: selectedUsers.includes(u.id)
                          ? colors.primary
                          : colors.border,
                        backgroundColor: selectedUsers.includes(u.id)
                          ? colors.primary
                          : "transparent",
                      },
                    ]}
                  >
                    {selectedUsers.includes(u.id) && (
                      <Feather name="check" size={14} color="#fff" />
                    )}
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={[styles.selectorText, { color: colors.foreground }]}>
                      {u.name}
                    </Text>
                    <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>
                      {u.email}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Card>

        {/* Dates */}
        <Card style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground }]}>Voting Period</Text>
          
          <TouchableOpacity
            style={[styles.dateButton, { borderColor: colors.border }]}
            onPress={() => setShowStartPicker(true)}
          >
            <Feather name="calendar" size={18} color={colors.mutedForeground} />
            <View style={styles.dateInfo}>
              <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>
                Start Date
              </Text>
              <Text style={[styles.dateValue, { color: colors.foreground }]}>
                {startDate.toLocaleString()}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>

          {showStartPicker && (
            <DateTimePicker
              value={startDate}
              mode="datetime"
              onChange={onStartDateChange}
              minimumDate={new Date()}
            />
          )}

          <TouchableOpacity
            style={[styles.dateButton, { borderColor: colors.border, marginTop: 12 }]}
            onPress={() => setShowEndPicker(true)}
          >
            <Feather name="clock" size={18} color={colors.mutedForeground} />
            <View style={styles.dateInfo}>
              <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>
                End Date
              </Text>
              <Text style={[styles.dateValue, { color: colors.foreground }]}>
                {endDate.toLocaleString()}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>

          {showEndPicker && (
            <DateTimePicker
              value={endDate}
              mode="datetime"
              onChange={onEndDateChange}
              minimumDate={startDate}
            />
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  createButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    padding: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    textAlignVertical: "top",
    minHeight: 100,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  optionInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  removeButton: {
    padding: 8,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  visibilityOptions: {
    flexDirection: "row",
    gap: 8,
  },
  visibilityOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  visibilityText: {
    fontSize: 13,
    fontWeight: "500",
  },
  selectorContainer: {
    marginTop: 8,
  },
  selectorItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
    gap: 10,
  },
  selectorText: {
    fontSize: 15,
    flex: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  userInfo: {
    flex: 1,
  },
  userEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    gap: 12,
  },
  dateInfo: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 2,
  },
});
