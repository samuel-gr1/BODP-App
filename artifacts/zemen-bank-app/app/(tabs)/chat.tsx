import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useState, useCallback } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApi } from "@/hooks/useApi";
import { useColors } from "@/hooks/useColors";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";

type ChatType = "INDIVIDUAL" | "GROUP" | "GLOBAL";

interface ChatMember {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface ChatAttachment {
  id: string;
  fileType: string;
  fileName: string;
}

interface ChatMessage {
  id: string;
  content?: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    email: string;
  };
  attachments?: ChatAttachment[];
}

interface Chat {
  id: string;
  name?: string;
  type: ChatType;
  description?: string;
  lastMessageAt: string;
  members: ChatMember[];
  messages?: ChatMessage[];
  _count?: {
    members: number;
    messages: number;
  };
}

type TabType = "INDIVIDUAL" | "GROUP" | "GLOBAL";

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { request } = useApi();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("INDIVIDUAL");
  const [search, setSearch] = useState("");

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

  const filteredChats = chats.filter((chat) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    const chatName = getChatName(chat, user?.id).toLowerCase();
    return chatName.includes(searchLower);
  });

  const getChatName = (chat: Chat, currentUserId?: string): string => {
    if (chat.name) return chat.name;
    if (chat.type === "GLOBAL") return "Global Chat";
    if (chat.type === "INDIVIDUAL") {
      const otherMember = chat.members.find((m) => m.userId !== currentUserId);
      return otherMember?.user?.name || "Unknown";
    }
    return `Group (${chat._count?.members || chat.members.length})`;
  };

  // Avatar not available - User model doesn't have image field
  const getChatAvatar = (): null => null;

  const getLastMessagePreview = (chat: Chat): string => {
    const lastMessage = chat.messages?.[0];
    if (!lastMessage) return "No messages yet";
    
    if (lastMessage.attachments && lastMessage.attachments.length > 0) {
      const type = lastMessage.attachments[0].fileType;
      if (type === "image") return "📷 Image";
      if (type === "video") return "🎥 Video";
      return `📎 ${lastMessage.attachments[0].fileName}`;
    }
    
    return lastMessage.content || "";
  };

  const getUnreadCount = (chat: Chat, currentUserId?: string): number => {
    // Simplified - in real implementation, track lastReadAt vs message createdAt
    return 0;
  };

  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  const renderChatItem = ({ item: chat }: { item: Chat }) => {
    const chatName = getChatName(chat, user?.id);
    const lastMessage = getLastMessagePreview(chat);
    const time = formatTime(chat.lastMessageAt);
    const unreadCount = getUnreadCount(chat, user?.id);

    return (
      <Pressable
        onPress={() => router.push(`/chat/${chat.id}`)}
        style={({ pressed }) => [styles.chatItem, pressed && styles.pressed]}
      >
        <View style={styles.avatarContainer}>
          <View
            style={[
              styles.avatarFallback,
              { backgroundColor: colors.primary },
            ]}
          >
            <Text style={styles.avatarText}>
              {chat.type === "GLOBAL"
                ? "🌍"
                : chat.type === "GROUP"
                ? "👥"
                : chatName.charAt(0).toUpperCase()}
            </Text>
          </View>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={[styles.chatName, { color: colors.text }]} numberOfLines={1}>
              {chatName}
            </Text>
            <Text style={[styles.time, { color: colors.textSecondary }]}>
              {time}
            </Text>
          </View>
          <Text
            style={[styles.lastMessage, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {lastMessage}
          </Text>
        </View>
      </Pressable>
    );
  };

  const isTabLoading = activeTab === "GLOBAL" ? globalLoading : isLoading;

  if (isTabLoading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 10, backgroundColor: colors.background },
        ]}
      >
        <Text style={[styles.title, { color: colors.text }]}>Messages</Text>
        <Pressable
          onPress={() => router.push("/chat/new")}
          style={[styles.newButton, { backgroundColor: colors.primary }]}
        >
          <Feather name="plus" size={20} color="#fff" />
        </Pressable>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.secondary, borderColor: colors.border }]}
      >
        <Feather
          name="search"
          size={18}
          color={colors.textSecondary}
          style={styles.searchIcon}
        />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search chats..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <Feather name="x" size={18} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {/* Segmented Tab Navigation */}
      <View style={[styles.segmentWrap, { backgroundColor: colors.secondary }]}>
        {(["INDIVIDUAL", "GROUP", "GLOBAL"] as TabType[]).map((tab) => {
          const active = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              activeOpacity={0.85}
              style={[
                styles.segment,
                active && {
                  backgroundColor: colors.background,
                  shadowColor: "#000",
                  shadowOpacity: 0.08,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 1 },
                  elevation: 2,
                },
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
                color={active ? colors.primary : colors.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: active ? colors.primary : colors.textSecondary },
                ]}
              >
                {tab === "INDIVIDUAL" ? "Direct" : tab === "GROUP" ? "Group" : "Global"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Create Button - Only show for Individual & Group tabs */}
      {activeTab !== "GLOBAL" && (
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push({ pathname: "/chat/new", params: { type: activeTab } })}
        >
          <Feather name="plus" size={18} color="#fff" />
          <Text style={styles.createButtonText}>
            {activeTab === "INDIVIDUAL" ? "New Individual Chat" : "New Group Chat"}
          </Text>
        </TouchableOpacity>
      )}

      {/* Chat List */}
      <FlatList
        data={filteredChats}
        keyExtractor={(item) => item.id}
        renderItem={renderChatItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={activeTab === "GLOBAL" ? "globe" : "message-circle"}
            title={activeTab === "GLOBAL" ? "Global Chat" : "No conversations"}
            message={
              activeTab === "GLOBAL"
                ? "Connect with all system users here"
                : activeTab === "INDIVIDUAL"
                ? "Start a private conversation"
                : "Join a group or committee chat"
            }
          />
        }
      />
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
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  newButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  segmentWrap: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 4,
    borderRadius: 12,
    gap: 4,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 9,
    borderRadius: 9,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "500",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  list: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  pressed: {
    opacity: 0.7,
  },
  avatarContainer: {
    position: "relative",
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 24,
  },
  unreadBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  unreadText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 4,
  },
  chatInfo: {
    flex: 1,
    marginLeft: 12,
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  time: {
    fontSize: 12,
  },
  lastMessage: {
    fontSize: 14,
  },
});
