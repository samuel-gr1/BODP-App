import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Stack, router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  Switch,
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

type ChatType = "INDIVIDUAL" | "GROUP";

export default function NewChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { request } = useApi();
  const qc = useQueryClient();
  const { type } = useLocalSearchParams<{ type: ChatType }>();
  
  const isGroup = type === "GROUP";
  const [chatName, setChatName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => request<{ users: User[] }>("/users"),
    retry: 1,
  });

  // Fetch user's committees for group chat creation
  const { data: committeesData, isLoading: committeesLoading } = useQuery({
    queryKey: ["user-committees"],
    queryFn: () => request<{ committees: Category[] }>("/categories"),
    retry: 1,
    enabled: isGroup,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      request("/chats", {
        method: "POST",
        body: JSON.stringify({
          type: isGroup ? "GROUP" : "INDIVIDUAL",
          name: isGroup ? chatName : undefined,
          memberIds: selectedUsers,
          categoryId: isGroup ? selectedCategory : undefined,
        }),
      }),
    onSuccess: (data: { chat: { id: string } }) => {
      qc.invalidateQueries({ queryKey: ["chats"] });
      router.replace({ pathname: "/chat/[id]", params: { id: data.chat.id } });
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message || "Failed to create chat");
    },
  });

  const toggleUser = (userId: string) => {
    if (!isGroup) {
      // For direct chat, only allow one user
      setSelectedUsers([userId]);
    } else {
      setSelectedUsers((prev) =>
        prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
      );
    }
  };

  const filteredUsers = usersData?.users?.filter(
    (user: User) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const paddingBottom = Platform.OS === "web" ? 34 : insets.bottom + 24;

  if (usersLoading || (isGroup && committeesLoading)) return <LoadingSpinner />;

  return (
    <>
      <Stack.Screen
        options={{
          title: "New Message",
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
          {/* Chat Type Toggle */}
          <Card style={[styles.typeCard, { borderColor: colors.border }]}>
            <View style={styles.typeRow}>
              <View style={styles.typeLabel}>
                <Text style={[styles.typeTitle, { color: colors.foreground }]}>
                  {isGroup ? "Group Chat" : "Direct Message"}
                </Text>
                <Text style={[styles.typeSubtitle, { color: colors.mutedForeground }]}>
                  {isGroup ? "Chat with multiple people" : "Private conversation"}
                </Text>
              </View>
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                {isGroup ? "Creating Group Chat" : "Creating Individual Chat"}
              </Text>
            </View>
          </Card>

          {/* Group Chat Name */}
          {isGroup && (
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                Chat Name <Text style={{ color: colors.destructive }}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.secondary, color: colors.foreground }]}
                placeholder="e.g., Board Discussion"
                placeholderTextColor={colors.mutedForeground}
                value={chatName}
                onChangeText={setChatName}
              />
            </View>
          )}

          {/* Committee Selection for Group */}
          {isGroup && (
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Link to Committee (Optional)</Text>
              <View style={[styles.selectContainer, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
                <Pressable
                  style={[styles.selectOption, !selectedCategory && { backgroundColor: colors.primary }]}
                  onPress={() => setSelectedCategory("")}
                >
                  <Text style={[styles.selectText, { color: !selectedCategory ? "#fff" : colors.foreground }]}>
                    No Committee
                  </Text>
                </Pressable>
                {committeesData?.committees?.map((cat: Category) => (
                  <Pressable
                    key={cat.id}
                    style={[styles.selectOption, selectedCategory === cat.id && { backgroundColor: colors.primary }]}
                    onPress={() => setSelectedCategory(cat.id)}
                  >
                    <Text style={[styles.selectText, { color: selectedCategory === cat.id ? "#fff" : colors.foreground }]}>
                      {cat.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Search Users */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Select {isGroup ? "Participants" : "Person"}
              {isGroup && <Text style={{ color: colors.destructive }}> *</Text>}
            </Text>
            <View style={[styles.searchBox, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
              <Feather name="search" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.searchInput, { color: colors.foreground }]}
                placeholder="Search by name or email..."
                placeholderTextColor={colors.mutedForeground}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery && (
                <Pressable onPress={() => setSearchQuery("")}>
                  <Feather name="x" size={16} color={colors.mutedForeground} />
                </Pressable>
              )}
            </View>
          </View>

          {/* Selected Count */}
          {selectedUsers.length > 0 && (
            <View style={[styles.selectedBar, { backgroundColor: colors.accent }]}>
              <Text style={[styles.selectedText, { color: colors.primary }]}>
                {selectedUsers.length} {selectedUsers.length === 1 ? "person" : "people"} selected
              </Text>
              <Pressable onPress={() => setSelectedUsers([])}>
                <Text style={[styles.clearText, { color: colors.destructive }]}>Clear</Text>
              </Pressable>
            </View>
          )}

          {/* User List */}
          <View style={styles.usersList}>
            {filteredUsers?.map((user: User) => {
              const isSelected = selectedUsers.includes(user.id);
              return (
                <Pressable
                  key={user.id}
                  style={[styles.userRow, { borderBottomColor: colors.border }]}
                  onPress={() => toggleUser(user.id)}
                >
                  <View style={styles.userLeft}>
                    <View style={[styles.userAvatar, { backgroundColor: colors.primary }]}>
                      <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
                    </View>
                    <View>
                      <Text style={[styles.userName, { color: colors.foreground }]}>{user.name}</Text>
                      <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>{user.email}</Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: isSelected ? colors.primary : colors.border,
                        backgroundColor: isSelected ? colors.primary : "transparent",
                      },
                    ]}
                  >
                    {isSelected && <Feather name="check" size={14} color="#fff" />}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Empty State */}
          {filteredUsers?.length === 0 && (
            <View style={styles.emptyState}>
              <Feather name="users" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No users found matching your search
              </Text>
            </View>
          )}

          {/* Create Button */}
          <Button
            variant="primary"
            size="md"
            onPress={() => createMutation.mutate()}
            loading={createMutation.isPending}
            disabled={selectedUsers.length === 0 || (isGroup && !chatName.trim())}
            fullWidth
            style={{ marginTop: 24 }}
          >
            {isGroup ? "Create Group Chat" : "Start Conversation"}
          </Button>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16 },
  typeCard: { marginBottom: 16 },
  typeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  typeLabel: { flex: 1 },
  typeTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  typeSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontFamily: "Inter_500Medium", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  selectContainer: { borderWidth: 1, borderRadius: 10, padding: 8, gap: 6 },
  selectOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  selectText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", height: 44 },
  selectedBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  selectedText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  clearText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  usersList: { gap: 0 },
  userRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  userLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  userName: { fontSize: 15, fontFamily: "Inter_500Medium" },
  userEmail: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 1 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 12 },
});
