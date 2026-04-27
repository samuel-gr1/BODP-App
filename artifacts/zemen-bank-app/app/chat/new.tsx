import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role?: string;
}

type ChatType = "INDIVIDUAL" | "GROUP";

export default function NewChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { request } = useApi();
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ type?: ChatType }>();

  const [chatType, setChatType] = useState<ChatType>(params.type ?? "INDIVIDUAL");
  const [chatName, setChatName] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: () => request<{ users: UserItem[] }>("/users"),
  });

  const filtered = useMemo(() => {
    const all = (usersQuery.data?.users ?? []).filter((u) => u.id !== me?.id);
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter(
      (u) =>
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [usersQuery.data, search, me?.id]);

  const create = useMutation({
    mutationFn: () =>
      request<{ chat: { id: string } }>("/chats", {
        method: "POST",
        body: JSON.stringify({
          type: chatType,
          name: chatType === "GROUP" ? chatName.trim() : undefined,
          memberIds: selected,
        }),
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["chats"] });
      router.replace(`/chat/${data.chat.id}`);
    },
    onError: (e: Error) =>
      Alert.alert("Couldn't create chat", e.message ?? "Try again"),
  });

  const toggleUser = (uid: string) => {
    if (chatType === "INDIVIDUAL") {
      setSelected([uid]);
    } else {
      setSelected((prev) =>
        prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid],
      );
    }
  };

  const initials = (n: string) =>
    n
      .split(" ")
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const canCreate =
    selected.length > 0 &&
    (chatType !== "GROUP" || chatName.trim().length > 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: chatType === "GROUP" ? "New group" : "New message",
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: "#fff",
          presentation: "modal",
        }}
      />

      <View
        style={[
          styles.typeRow,
          { backgroundColor: colors.secondary, marginTop: 12 },
        ]}
      >
        {(["INDIVIDUAL", "GROUP"] as ChatType[]).map((t) => {
          const active = chatType === t;
          return (
            <TouchableOpacity
              key={t}
              activeOpacity={0.85}
              onPress={() => {
                setChatType(t);
                if (t === "INDIVIDUAL" && selected.length > 1) {
                  setSelected(selected.slice(0, 1));
                }
              }}
              style={[
                styles.typeBtn,
                active && {
                  backgroundColor: colors.background,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.08,
                  shadowRadius: 3,
                  elevation: 2,
                },
              ]}
            >
              <Feather
                name={t === "INDIVIDUAL" ? "user" : "users"}
                size={15}
                color={active ? colors.primary : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.typeLabel,
                  { color: active ? colors.primary : colors.mutedForeground },
                ]}
              >
                {t === "INDIVIDUAL" ? "Direct" : "Group"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {chatType === "GROUP" && (
        <View style={styles.groupNameWrap}>
          <Text style={[styles.label, { color: colors.foreground }]}>
            Group name
          </Text>
          <TextInput
            value={chatName}
            onChangeText={setChatName}
            placeholder="e.g., Risk Committee"
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.groupNameInput,
              {
                color: colors.foreground,
                backgroundColor: colors.secondary,
                borderColor: colors.border,
              },
            ]}
          />
        </View>
      )}

      <View
        style={[
          styles.searchWrap,
          { backgroundColor: colors.secondary, borderColor: colors.border },
        ]}
      >
        <Feather name="search" size={17} color={colors.mutedForeground} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search people"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.searchInput, { color: colors.foreground }]}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")} hitSlop={10}>
            <Feather name="x-circle" size={17} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      {selected.length > 0 && (
        <View
          style={[
            styles.selectedBar,
            { backgroundColor: colors.accent },
          ]}
        >
          <Text style={[styles.selectedText, { color: colors.primary }]}>
            {selected.length}{" "}
            {selected.length === 1 ? "person" : "people"} selected
          </Text>
          <Pressable onPress={() => setSelected([])}>
            <Text style={[styles.clearText, { color: colors.destructive }]}>
              Clear
            </Text>
          </Pressable>
        </View>
      )}

      {usersQuery.isLoading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(u) => u.id}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 120,
          }}
          ItemSeparatorComponent={() => (
            <View
              style={{
                height: StyleSheet.hairlineWidth,
                marginLeft: 76,
                backgroundColor: colors.border,
              }}
            />
          )}
          renderItem={({ item }) => {
            const sel = selected.includes(item.id);
            return (
              <Pressable
                onPress={() => toggleUser(item.id)}
                android_ripple={{ color: colors.muted }}
                style={({ pressed }) => [
                  styles.userRow,
                  { backgroundColor: pressed ? colors.muted : "transparent" },
                ]}
              >
                <View style={[styles.userAvatar, { backgroundColor: colors.primary }]}>
                  <Text style={styles.userAvatarText}>
                    {initials(item.name)}
                  </Text>
                </View>
                <View style={styles.userBody}>
                  <Text
                    style={[styles.userName, { color: colors.foreground }]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={[
                      styles.userEmail,
                      { color: colors.mutedForeground },
                    ]}
                    numberOfLines={1}
                  >
                    {item.email}
                  </Text>
                </View>
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: sel ? colors.primary : "transparent",
                      borderColor: sel ? colors.primary : colors.border,
                    },
                  ]}
                >
                  {sel && <Feather name="check" size={14} color="#fff" />}
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="users" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No people found
              </Text>
            </View>
          }
        />
      )}

      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + 12,
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
      >
        <Button
          variant="primary"
          fullWidth
          onPress={() => create.mutate()}
          loading={create.isPending}
          disabled={!canCreate || create.isPending}
        >
          {chatType === "GROUP" ? "Create group" : "Start conversation"}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  typeRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    padding: 4,
    borderRadius: 12,
    gap: 4,
  },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 9,
    gap: 6,
  },
  typeLabel: { fontSize: 13.5, fontFamily: "Inter_600SemiBold" },
  groupNameWrap: { paddingHorizontal: 16, marginTop: 16 },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 8,
  },
  groupNameInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  selectedBar: {
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectedText: { fontSize: 13.5, fontFamily: "Inter_600SemiBold" },
  clearText: { fontSize: 13, fontFamily: "Inter_500Medium" },

  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  userBody: { flex: 1 },
  userName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  userEmail: { fontSize: 12.5, fontFamily: "Inter_400Regular", marginTop: 2 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyText: { fontSize: 13.5, fontFamily: "Inter_400Regular" },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
