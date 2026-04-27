import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApi } from "@/hooks/useApi";
import { useColors } from "@/hooks/useColors";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface ChatMember {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface ChatMessage {
  id: string;
  content?: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
  };
}

interface Chat {
  id: string;
  type: "INDIVIDUAL" | "GROUP" | "GLOBAL";
  name?: string;
  lastMessageAt: string;
  members: ChatMember[];
  messages?: ChatMessage[];
}

type TabType = "INDIVIDUAL" | "GROUP" | "GLOBAL";

export default function ChatIndexScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { request } = useApi();
  const [activeTab, setActiveTab] = useState<TabType>("INDIVIDUAL");

  // Fetch regular chats (INDIVIDUAL & GROUP)
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["chats", activeTab],
    queryFn: () => request<{ chats: Chat[] }>(`/chats?type=${activeTab}`),
    retry: 1,
    enabled: activeTab !== "GLOBAL",
  });

  // Fetch global chat separately
  const { data: globalData, isLoading: globalLoading } = useQuery({
    queryKey: ["global-chat"],
    queryFn: () => request<{ chat: Chat }>("/chats/global"),
    retry: 1,
    enabled: activeTab === "GLOBAL",
  });

  const chats = activeTab === "GLOBAL" 
    ? (globalData?.chat ? [globalData.chat] : []) 
    : (data?.chats ?? []);
  const isTabLoading = activeTab === "GLOBAL" ? globalLoading : isLoading;

  const paddingTop = Platform.OS === "web" ? 67 + 16 : insets.top + 16;
  const paddingBottom = Platform.OS === "web" ? 34 + 84 : 84;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return date.toLocaleDateString("en-US", { weekday: "short" });
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  };

  const getChatName = (chat: Chat): string => {
    if (chat.name) return chat.name;
    if (chat.type === "GLOBAL") return "Global Chat";
    if (chat.type === "INDIVIDUAL") {
      const otherMember = chat.members.find((m) => m.user.id !== "currentUser");
      return otherMember?.user?.name || "Unknown";
    }
    return "Group Chat";
  };

  const getLastMessagePreview = (chat: Chat): string => {
    const lastMessage = chat.messages?.[0];
    if (!lastMessage) return "No messages yet";
    return lastMessage.content || "";
  };

  const renderItem = ({ item }: { item: Chat }) => {
    const chatName = getChatName(item);
    const lastMessage = getLastMessagePreview(item);
    
    return (
    <Pressable onPress={() => router.push({ pathname: "/chat/[id]", params: { id: item.id } })}>
      <Card style={[styles.threadCard, { borderColor: colors.border }]}>
        <View style={styles.threadRow}>
          <View style={[styles.avatar, { backgroundColor: item.type === "GROUP" ? colors.primary : colors.success }]}>
            <Text style={styles.avatarText}>{getInitials(chatName)}</Text>
            {item.type === "GROUP" && (
              <View style={[styles.groupBadge, { backgroundColor: colors.gold }]}>
                <Feather name="users" size={10} color={colors.primary} />
              </View>
            )}
          </View>
          <View style={styles.threadContent}>
            <View style={styles.threadHeader}>
              <Text style={[styles.threadName, { color: colors.foreground }]} numberOfLines={1}>
                {chatName}
              </Text>
              <Text style={[styles.timeText, { color: colors.mutedForeground }]}>
                {formatTime(item.lastMessageAt)}
              </Text>
            </View>
            <View style={styles.threadMeta}>
              <Text style={[styles.lastMessage, { color: colors.mutedForeground }]} numberOfLines={1}>
                {lastMessage}
              </Text>
            </View>
            {item.type === "GROUP" && item.members.length > 0 && (
              <Text style={[styles.participantsText, { color: colors.mutedForeground }]}>
                {item.members.length} members
              </Text>
            )}
          </View>
        </View>
      </Card>
    </Pressable>
  );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop, backgroundColor: colors.primary }]}>
        <Text style={styles.screenTitle}>Messages</Text>
        
        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {(["INDIVIDUAL", "GROUP", "GLOBAL"] as TabType[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && { backgroundColor: "rgba(255,255,255,0.2)" },
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Feather
                name={
                  tab === "INDIVIDUAL"
                    ? "user"
                    : tab === "GROUP"
                    ? "users"
                    : "globe"
                }
                size={14}
                color="#fff"
              />
              <Text style={styles.tabText}>
                {tab === "INDIVIDUAL" ? "Individual" : tab === "GROUP" ? "Group" : "Global"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Create Button - Only show for Individual & Group tabs */}
      {activeTab !== "GLOBAL" && (
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push({ pathname: "/chat/new", params: { type: activeTab } })}
        >
          <Feather name="plus" size={20} color="#fff" />
          <Text style={styles.createButtonText}>
            {activeTab === "INDIVIDUAL" ? "New Individual Chat" : "New Group Chat"}
          </Text>
        </TouchableOpacity>
      )}

      {isTabLoading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />
          }
          ListHeaderComponent={
            <Card style={[styles.infoCard, { backgroundColor: colors.accent, borderColor: "transparent" }]}>
              <View style={styles.infoRow}>
                <Feather name="message-circle" size={18} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.primary }]}>
                  Communicate with board members and committees. Group chats are available for meetings and committees.
                </Text>
              </View>
            </Card>
          }
          ListEmptyComponent={
            <EmptyState
              icon={activeTab === "GLOBAL" ? "globe" : "message-square"}
              title={activeTab === "GLOBAL" ? "Global Chat" : "No conversations"}
              subtitle={
                activeTab === "GLOBAL"
                  ? "Connect with all system users here"
                  : activeTab === "INDIVIDUAL"
                  ? "Start a private conversation"
                  : "Join a group or committee chat"
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
  topBar: { paddingHorizontal: 20, paddingBottom: 12 },
  screenTitle: { color: "#fff", fontSize: 24, fontFamily: "Inter_700Bold", fontWeight: "700" },
  tabContainer: { flexDirection: "row", gap: 8, marginTop: 12 },
  tab: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  tabText: { color: "#fff", fontSize: 12, fontFamily: "Inter_500Medium" },
  createButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, margin: 16, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 },
  createButtonText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  infoCard: { marginBottom: 12 },
  infoRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  threadCard: { marginBottom: 10 },
  threadRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarText: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" },
  groupBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  threadContent: { flex: 1 },
  threadHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  threadName: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1, marginRight: 8 },
  timeText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  threadMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  lastMessage: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  participantsText: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
