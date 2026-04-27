import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useState, useMemo } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";
import { useApi } from "@/hooks/useApi";
import { useColors } from "@/hooks/useColors";

type ChatType = "INDIVIDUAL" | "GROUP" | "GLOBAL";

interface Member {
  id: string;
  userId: string;
  user: { id: string; name: string; email: string };
}

interface LastMessage {
  id: string;
  content?: string;
  createdAt: string;
  sender: { id: string; name: string };
  attachments?: { id: string; fileType: string; fileName: string }[];
}

interface Chat {
  id: string;
  name?: string;
  type: ChatType;
  lastMessageAt: string;
  members: Member[];
  messages?: LastMessage[];
  unreadCount?: number;
  _count?: { members: number; messages: number };
}

const TABS: { key: ChatType; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "INDIVIDUAL", label: "Direct", icon: "user" },
  { key: "GROUP", label: "Groups", icon: "users" },
  { key: "GLOBAL", label: "Global", icon: "globe" },
];

export default function ChatListScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { request } = useApi();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ChatType>("INDIVIDUAL");
  const [search, setSearch] = useState("");

  const listQuery = useQuery({
    queryKey: ["chats", activeTab],
    queryFn: () => request<{ chats: Chat[] }>(`/chats?type=${activeTab}`),
    enabled: activeTab !== "GLOBAL",
    refetchInterval: 5000,
  });

  const globalQuery = useQuery({
    queryKey: ["chats", "global"],
    queryFn: () => request<{ chat: Chat }>("/chats/global"),
    enabled: activeTab === "GLOBAL",
    refetchInterval: 5000,
  });

  const chats: Chat[] =
    activeTab === "GLOBAL"
      ? globalQuery.data?.chat
        ? [globalQuery.data.chat]
        : []
      : listQuery.data?.chats ?? [];

  const isLoading =
    activeTab === "GLOBAL" ? globalQuery.isLoading : listQuery.isLoading;
  const refetch = activeTab === "GLOBAL" ? globalQuery.refetch : listQuery.refetch;

  const getName = (chat: Chat): string => {
    if (chat.name) return chat.name;
    if (chat.type === "GLOBAL") return "Global Chat";
    if (chat.type === "INDIVIDUAL") {
      const other = chat.members.find((m) => m.userId !== user?.id);
      return other?.user?.name || "Unknown";
    }
    return `Group · ${chat._count?.members ?? chat.members.length}`;
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return chats;
    const q = search.toLowerCase();
    return chats.filter((c) => getName(c).toLowerCase().includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats, search, user?.id]);

  const formatTime = (iso: string): string => {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const previewOf = (chat: Chat): string => {
    const m = chat.messages?.[0];
    if (!m) return "No messages yet";
    if (m.attachments && m.attachments.length) {
      const a = m.attachments[0];
      if (a.fileType.startsWith("image")) return "📷 Photo";
      if (a.fileType.startsWith("audio")) return "🎤 Voice message";
      if (a.fileType.startsWith("video")) return "🎥 Video";
      return `📎 ${a.fileName}`;
    }
    const prefix =
      chat.type !== "INDIVIDUAL" && m.sender?.id === user?.id ? "You: " : "";
    return prefix + (m.content || "");
  };

  const initialsOf = (name: string) =>
    name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const renderItem = ({ item }: { item: Chat }) => {
    const name = getName(item);
    const preview = previewOf(item);
    const unread = item.unreadCount || 0;
    const isGroup = item.type === "GROUP";
    const isGlobal = item.type === "GLOBAL";

    return (
      <Pressable
        onPress={() => router.push(`/chat/${item.id}`)}
        android_ripple={{ color: colors.muted }}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: pressed ? colors.muted : "transparent" },
        ]}
      >
        <View style={styles.avatarWrap}>
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: isGlobal
                  ? colors.gold
                  : isGroup
                    ? colors.info
                    : colors.primary,
              },
            ]}
          >
            {isGlobal ? (
              <Feather name="globe" size={22} color="#fff" />
            ) : isGroup ? (
              <Feather name="users" size={20} color="#fff" />
            ) : (
              <Text style={styles.avatarText}>{initialsOf(name)}</Text>
            )}
          </View>
          {unread > 0 && (
            <View style={[styles.unreadDot, { borderColor: colors.background }]} />
          )}
        </View>

        <View style={styles.body}>
          <View style={styles.topRow}>
            <Text
              style={[styles.name, { color: colors.foreground }]}
              numberOfLines={1}
            >
              {name}
            </Text>
            <Text style={[styles.time, { color: colors.mutedForeground }]}>
              {formatTime(item.lastMessageAt)}
            </Text>
          </View>
          <View style={styles.bottomRow}>
            <Text
              style={[
                styles.preview,
                {
                  color: unread > 0 ? colors.foreground : colors.mutedForeground,
                  fontWeight: unread > 0 ? "600" : "400",
                },
              ]}
              numberOfLines={1}
            >
              {preview}
            </Text>
            {unread > 0 && (
              <View
                style={[styles.unreadBadge, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.unreadBadgeText}>
                  {unread > 99 ? "99+" : unread}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Messages</Text>
        <TouchableOpacity
          onPress={() => router.push({ pathname: "/chat/new", params: { type: activeTab === "GLOBAL" ? "INDIVIDUAL" : activeTab } })}
          style={[styles.newBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.85}
        >
          <Feather name="edit-3" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.searchWrap,
          { backgroundColor: colors.secondary, borderColor: colors.border },
        ]}
      >
        <Feather name="search" size={17} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search messages…"
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")} hitSlop={10}>
            <Feather name="x-circle" size={17} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      <View style={[styles.segmentWrap, { backgroundColor: colors.secondary }]}>
        {TABS.map((t) => {
          const active = activeTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              activeOpacity={0.85}
              onPress={() => setActiveTab(t.key)}
              style={[
                styles.segment,
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
                name={t.icon}
                size={14}
                color={active ? colors.primary : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.segmentText,
                  { color: active ? colors.primary : colors.mutedForeground },
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 24,
            flexGrow: 1,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          ItemSeparatorComponent={() => (
            <View
              style={{
                height: 1,
                marginLeft: 76,
                backgroundColor: colors.border,
                opacity: 0.5,
              }}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon={activeTab === "GLOBAL" ? "globe" : "message-circle"}
              title={
                activeTab === "GLOBAL"
                  ? "Global chat"
                  : "No conversations yet"
              }
              subtitle={
                activeTab === "GLOBAL"
                  ? "Connect with everyone in the system."
                  : activeTab === "INDIVIDUAL"
                    ? "Tap the pencil to start a private conversation."
                    : "Create a group to discuss together."
              }
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", fontWeight: "700" },
  newBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  segmentWrap: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 4,
    borderRadius: 12,
    gap: 4,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 9,
    gap: 6,
  },
  segmentText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  unreadDot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22c55e",
    borderWidth: 2,
  },
  body: { flex: 1, gap: 4 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: { flex: 1, fontSize: 16, fontFamily: "Inter_600SemiBold" },
  time: { fontSize: 11, fontFamily: "Inter_400Regular" },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  preview: { flex: 1, fontSize: 13.5, fontFamily: "Inter_400Regular" },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
});
