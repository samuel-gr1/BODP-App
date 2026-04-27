import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useState, useRef, useEffect } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface Message {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  attachments?: { url: string; type: string; name: string }[];
  parentId?: string;
  isDeleted?: boolean;
}

interface ChatThread {
  id: string;
  name: string;
  type: "DIRECT" | "GROUP";
  participants: { id: string; name: string; email: string }[];
  meetingId?: string;
  categoryId?: string;
}

export default function ChatConversationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { request } = useApi();
  const { user } = useAuth();
  const qc = useQueryClient();
  const flatListRef = useRef<FlatList>(null);

  const [message, setMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showAttachments, setShowAttachments] = useState(false);

  const { data: chatData, isLoading: chatLoading } = useQuery({
    queryKey: ["chat", id],
    queryFn: () => request<{ chat: ChatThread }>(`/chats/${id}`),
    retry: 1,
  });

  const { data: messagesData, isLoading: messagesLoading, refetch } = useQuery({
    queryKey: ["chat-messages", id],
    queryFn: () => request<{ messages: Message[] }>(`/chats/${id}/messages`),
    retry: 1,
    refetchInterval: 3000, // Poll every 3 seconds for new messages
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      request(`/chats/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({
          content: message,
          replyToId: replyingTo?.id,
        }),
      }),
    onSuccess: () => {
      setMessage("");
      setReplyingTo(null);
      qc.invalidateQueries({ queryKey: ["chat-messages", id] });
      qc.invalidateQueries({ queryKey: ["chats"] });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: () => request(`/chats/${id}/mark-read`, { method: "POST" }),
    onSuccess: () => {
      // Invalidate unread count query to update badge
      qc.invalidateQueries({ queryKey: ["chats", "unread-count"] });
    },
  });

  useEffect(() => {
    if (id) {
      markAsReadMutation.mutate();
    }
  }, [id]);

  const messages = messagesData?.messages ?? [];

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const handleSend = () => {
    if (message.trim()) {
      sendMutation.mutate();
    }
  };

  const isOwnMessage = (msg: Message) => msg.senderId === user?.id;

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const own = isOwnMessage(item);
    const isReply = item.parentId && messages.find((m) => m.id === item.parentId);

    return (
      <View style={[styles.messageRow, { justifyContent: own ? "flex-end" : "flex-start" }]}>
        {!own && (
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{getInitials(item.senderName)}</Text>
          </View>
        )}

        <View style={[styles.messageContainer, { alignItems: own ? "flex-end" : "flex-start" }]}>
          {!own && (
            <Text style={[styles.senderName, { color: colors.mutedForeground }]}>
              {item.senderName}
            </Text>
          )}

          {isReply && (
            <View style={[styles.replyPreview, { backgroundColor: colors.muted, borderLeftColor: colors.primary }]}>
              <Text style={[styles.replyText, { color: colors.mutedForeground }]} numberOfLines={1}>
                Replying to: {messages.find((m) => m.id === item.parentId)?.content}
              </Text>
            </View>
          )}

          <Card
            style={[
              styles.messageBubble,
              {
                backgroundColor: own ? colors.primary : colors.card,
                borderBottomRightRadius: own ? 4 : 16,
                borderBottomLeftRadius: own ? 16 : 4,
              },
            ]}
          >
            {item.isDeleted ? (
              <Text style={[styles.deletedText, { color: own ? "rgba(255,255,255,0.6)" : colors.mutedForeground }]}>
                This message was deleted
              </Text>
            ) : (
              <Text style={[styles.messageText, { color: own ? "#fff" : colors.foreground }]}>
                {item.content}
              </Text>
            )}

            {item.attachments && item.attachments.length > 0 && (
              <View style={styles.attachmentsContainer}>
                {item.attachments.map((att, idx) => (
                  <Pressable key={idx} style={[styles.attachment, { backgroundColor: own ? "rgba(255,255,255,0.2)" : colors.secondary }]}>
                    <Feather name={att.type.startsWith("image") ? "image" : "file-text"} size={16} color={own ? "#fff" : colors.primary} />
                    <Text style={[styles.attachmentText, { color: own ? "#fff" : colors.foreground }]} numberOfLines={1}>
                      {att.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </Card>

          <View style={styles.messageMeta}>
            <Text style={[styles.timeText, { color: colors.mutedForeground }]}>
              {formatTime(item.createdAt)}
            </Text>
            {!item.isDeleted && (
              <>
                <Pressable onPress={() => setReplyingTo(item)} style={styles.actionBtn}>
                  <Feather name="corner-up-left" size={12} color={colors.mutedForeground} />
                </Pressable>
                {own && (
                  <Pressable onPress={() => deleteMutation.mutate(item.id)} style={styles.actionBtn}>
                    <Feather name="trash-2" size={12} color={colors.destructive} />
                  </Pressable>
                )}
              </>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (chatLoading || messagesLoading) return <LoadingSpinner />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: chatData?.chat?.name || "Chat",
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: "#fff",
          headerRight: () => (
            chatData?.chat?.type === "GROUP" && (
              <Pressable style={styles.headerBtn}>
                <Feather name="users" size={20} color="#fff" />
              </Pressable>
            )
          ),
        }}
      />

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="message-circle" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No messages yet. Start the conversation!
            </Text>
          </View>
        }
        style={styles.messageList}
      />

      {/* Keyboard-aware Input section - wraps input area only */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 140 : 0}
        style={styles.inputWrapper}
      >
        <View style={styles.inputSection}>
        {/* Reply Preview */}
        {replyingTo && (
          <View style={[styles.replyBar, { backgroundColor: colors.accent, borderTopColor: colors.border }]}>
            <View style={styles.replyBarContent}>
              <Feather name="corner-up-left" size={14} color={colors.primary} />
              <Text style={[styles.replyBarText, { color: colors.foreground }]} numberOfLines={1}>
                Replying to {replyingTo.senderName}: {replyingTo.content}
              </Text>
            </View>
            <Pressable onPress={() => setReplyingTo(null)}>
              <Feather name="x" size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>
        )}

        {/* Input Area */}
        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <Pressable onPress={() => setShowAttachments(!showAttachments)} style={styles.attachBtn}>
          <Feather name="paperclip" size={22} color={colors.mutedForeground} />
        </Pressable>

        <TextInput
          style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground }]}
          placeholder="Type a message..."
          placeholderTextColor={colors.mutedForeground}
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={1000}
        />

        <Pressable
          onPress={handleSend}
          disabled={!message.trim() || sendMutation.isPending}
          style={[
            styles.sendBtn,
            { backgroundColor: message.trim() ? colors.primary : colors.muted },
          ]}
        >
          {sendMutation.isPending ? (
            <LoadingSpinner size="small" />
          ) : (
            <Feather name="send" size={20} color="#fff" />
          )}
        </Pressable>
      </View>

        {/* Attachment Options */}
        {showAttachments && (
          <View style={[styles.attachmentOptions, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <Pressable style={styles.attachmentOption}>
              <View style={[styles.attachmentIcon, { backgroundColor: colors.successLight }]}>
                <Feather name="image" size={20} color={colors.success} />
              </View>
              <Text style={[styles.attachmentLabel, { color: colors.foreground }]}>Photo</Text>
            </Pressable>
            <Pressable style={styles.attachmentOption}>
              <View style={[styles.attachmentIcon, { backgroundColor: colors.infoLight }]}>
                <Feather name="file-text" size={20} color={colors.info} />
              </View>
              <Text style={[styles.attachmentLabel, { color: colors.foreground }]}>Document</Text>
            </Pressable>
            <Pressable style={styles.attachmentOption}>
              <View style={[styles.attachmentIcon, { backgroundColor: colors.warningLight }]}>
                <Feather name="mic" size={20} color={colors.warning} />
              </View>
              <Text style={[styles.attachmentLabel, { color: colors.foreground }]}>Voice</Text>
            </Pressable>
          </View>
        )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBtn: { padding: 8 },
  messageList: { flex: 1 },
  inputWrapper: {},
  inputWrapperSpacer: { flex: 1 },
  messageRow: { flexDirection: "row", marginBottom: 16, alignItems: "flex-end" },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  avatarText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  messageContainer: { maxWidth: "75%" },
  senderName: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 2, marginLeft: 4 },
  replyPreview: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderLeftWidth: 3,
    marginBottom: 4,
    marginLeft: 4,
  },
  replyText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  messageText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 20 },
  deletedText: { fontSize: 14, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  attachmentsContainer: { marginTop: 8, gap: 6 },
  attachment: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  attachmentText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  messageMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    marginHorizontal: 4,
  },
  timeText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  actionBtn: { padding: 4 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingTop: 100 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 12 },
  replyBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  replyBarContent: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  replyBarText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  attachBtn: { padding: 6 },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentOptions: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  attachmentOption: { alignItems: "center", gap: 6 },
  attachmentIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
