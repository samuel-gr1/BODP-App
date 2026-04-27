import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  KeyboardAvoidingView,
  useReanimatedKeyboardAnimation,
} from "react-native-keyboard-controller";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
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
  const { height: kbHeight } = useReanimatedKeyboardAnimation();

  const [message, setMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showAttachments, setShowAttachments] = useState(false);

  const { data: chatData, isLoading: chatLoading } = useQuery({
    queryKey: ["chat", id],
    queryFn: () => request<{ chat: ChatThread }>(`/chats/${id}`),
    retry: 1,
  });

  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ["chat-messages", id],
    queryFn: () => request<{ messages: Message[] }>(`/chats/${id}/messages`),
    retry: 1,
    refetchInterval: 3000,
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

  const deleteMutation = useMutation({
    mutationFn: (messageId: string) =>
      request(`/chats/${id}/messages/${messageId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat-messages", id] });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: () => request(`/chats/${id}/mark-read`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chats", "unread-count"] });
    },
  });

  useEffect(() => {
    if (id) {
      markAsReadMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const messages = messagesData?.messages ?? [];

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages.length]);

  const handleSend = () => {
    if (message.trim()) {
      sendMutation.mutate();
    }
  };

  const isOwnMessage = (msg: Message) => msg.senderId === user?.id;

  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  // Animated padding to lift list when keyboard rises (so last message is visible)
  const listPadAnimated = useAnimatedStyle(() => ({
    paddingBottom: Math.max(0, -kbHeight.value),
  }));

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const own = isOwnMessage(item);
    const prev = messages[index - 1];
    const showAvatar = !own && (!prev || prev.senderId !== item.senderId);
    const groupedTop = prev && prev.senderId === item.senderId;
    const parentMsg = item.parentId
      ? messages.find((m) => m.id === item.parentId)
      : null;

    return (
      <View
        style={[
          styles.messageRow,
          {
            justifyContent: own ? "flex-end" : "flex-start",
            marginTop: groupedTop ? 2 : 10,
          },
        ]}
      >
        {!own && (
          <View style={styles.avatarSlot}>
            {showAvatar ? (
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>{getInitials(item.senderName)}</Text>
              </View>
            ) : null}
          </View>
        )}

        <View style={[styles.messageContainer, { alignItems: own ? "flex-end" : "flex-start" }]}>
          {!own && showAvatar && (
            <Text style={[styles.senderName, { color: colors.mutedForeground }]}>
              {item.senderName}
            </Text>
          )}

          {parentMsg && (
            <View
              style={[
                styles.replyPreview,
                {
                  backgroundColor: own ? "rgba(255,255,255,0.15)" : colors.muted,
                  borderLeftColor: own ? "#fff" : colors.primary,
                },
              ]}
            >
              <Text
                style={[
                  styles.replyAuthor,
                  { color: own ? "rgba(255,255,255,0.9)" : colors.primary },
                ]}
                numberOfLines={1}
              >
                {parentMsg.senderName}
              </Text>
              <Text
                style={[
                  styles.replyText,
                  { color: own ? "rgba(255,255,255,0.8)" : colors.mutedForeground },
                ]}
                numberOfLines={1}
              >
                {parentMsg.content}
              </Text>
            </View>
          )}

          <View
            style={[
              styles.messageBubble,
              {
                backgroundColor: own ? colors.primary : colors.card,
                borderTopRightRadius: own && groupedTop ? 6 : 18,
                borderTopLeftRadius: !own && groupedTop ? 6 : 18,
                borderBottomRightRadius: own ? 6 : 18,
                borderBottomLeftRadius: own ? 18 : 6,
                shadowColor: own ? colors.primary : "#000",
              },
            ]}
          >
            {item.isDeleted ? (
              <Text
                style={[
                  styles.deletedText,
                  { color: own ? "rgba(255,255,255,0.7)" : colors.mutedForeground },
                ]}
              >
                This message was deleted
              </Text>
            ) : (
              <Text
                style={[
                  styles.messageText,
                  { color: own ? "#fff" : colors.foreground },
                ]}
              >
                {item.content}
              </Text>
            )}

            {item.attachments && item.attachments.length > 0 && (
              <View style={styles.attachmentsContainer}>
                {item.attachments.map((att, idx) => (
                  <Pressable
                    key={idx}
                    style={[
                      styles.attachment,
                      {
                        backgroundColor: own
                          ? "rgba(255,255,255,0.18)"
                          : colors.secondary,
                      },
                    ]}
                  >
                    <Feather
                      name={att.type.startsWith("image") ? "image" : "file-text"}
                      size={16}
                      color={own ? "#fff" : colors.primary}
                    />
                    <Text
                      style={[
                        styles.attachmentText,
                        { color: own ? "#fff" : colors.foreground },
                      ]}
                      numberOfLines={1}
                    >
                      {att.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={styles.messageMeta}>
            <Text style={[styles.timeText, { color: colors.mutedForeground }]}>
              {formatTime(item.createdAt)}
            </Text>
            {!item.isDeleted && (
              <>
                <Pressable
                  onPress={() => setReplyingTo(item)}
                  style={styles.actionBtn}
                  hitSlop={8}
                >
                  <Feather
                    name="corner-up-left"
                    size={12}
                    color={colors.mutedForeground}
                  />
                </Pressable>
                {own && (
                  <Pressable
                    onPress={() => deleteMutation.mutate(item.id)}
                    style={styles.actionBtn}
                    hitSlop={8}
                  >
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

  const headerName = chatData?.chat?.name || "Chat";
  const otherInitials = useMemo(() => getInitials(headerName), [headerName]);

  if (chatLoading) return <LoadingSpinner />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: "#fff",
          headerTitle: () => (
            <View style={styles.headerTitleRow}>
              <View style={[styles.headerAvatar, { backgroundColor: "rgba(255,255,255,0.18)" }]}>
                <Text style={styles.headerAvatarText}>{otherInitials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {headerName}
                </Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {chatData?.chat?.type === "GROUP"
                    ? `${chatData?.chat?.participants?.length ?? 0} members`
                    : "Online"}
                </Text>
              </View>
            </View>
          ),
          headerRight: () => (
            <Pressable style={styles.headerBtn} hitSlop={10}>
              <Feather
                name={chatData?.chat?.type === "GROUP" ? "users" : "phone"}
                size={20}
                color="#fff"
              />
            </Pressable>
          ),
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
        keyboardVerticalOffset={0}
      >
        <Animated.View style={[styles.flex, listPadAnimated]}>
          {messagesLoading ? (
            <LoadingSpinner />
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              contentContainerStyle={{
                paddingHorizontal: 12,
                paddingTop: 12,
                paddingBottom: 16,
              }}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() =>
                flatListRef.current?.scrollToEnd({ animated: true })
              }
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <View
                    style={[
                      styles.emptyIcon,
                      { backgroundColor: colors.accent },
                    ]}
                  >
                    <Feather
                      name="message-circle"
                      size={36}
                      color={colors.primary}
                    />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                    Start the conversation
                  </Text>
                  <Text
                    style={[styles.emptyText, { color: colors.mutedForeground }]}
                  >
                    Say hello and break the ice!
                  </Text>
                </View>
              }
              style={styles.flex}
            />
          )}
        </Animated.View>

        {/* Reply Preview */}
        {replyingTo && (
          <View
            style={[
              styles.replyBar,
              { backgroundColor: colors.accent, borderTopColor: colors.border },
            ]}
          >
            <View style={[styles.replyBarLine, { backgroundColor: colors.primary }]} />
            <View style={styles.replyBarContent}>
              <Text style={[styles.replyBarAuthor, { color: colors.primary }]}>
                Replying to {replyingTo.senderName}
              </Text>
              <Text
                style={[styles.replyBarText, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {replyingTo.content}
              </Text>
            </View>
            <Pressable onPress={() => setReplyingTo(null)} hitSlop={10}>
              <Feather name="x" size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>
        )}

        {/* Attachment Options */}
        {showAttachments && (
          <View
            style={[
              styles.attachmentOptions,
              { backgroundColor: colors.card, borderTopColor: colors.border },
            ]}
          >
            <Pressable style={styles.attachmentOption}>
              <View
                style={[
                  styles.attachmentIcon,
                  { backgroundColor: colors.successLight },
                ]}
              >
                <Feather name="image" size={20} color={colors.success} />
              </View>
              <Text
                style={[styles.attachmentLabel, { color: colors.foreground }]}
              >
                Photo
              </Text>
            </Pressable>
            <Pressable style={styles.attachmentOption}>
              <View
                style={[
                  styles.attachmentIcon,
                  { backgroundColor: colors.infoLight },
                ]}
              >
                <Feather name="file-text" size={20} color={colors.info} />
              </View>
              <Text
                style={[styles.attachmentLabel, { color: colors.foreground }]}
              >
                Document
              </Text>
            </Pressable>
            <Pressable style={styles.attachmentOption}>
              <View
                style={[
                  styles.attachmentIcon,
                  { backgroundColor: colors.warningLight },
                ]}
              >
                <Feather name="mic" size={20} color={colors.warning} />
              </View>
              <Text
                style={[styles.attachmentLabel, { color: colors.foreground }]}
              >
                Voice
              </Text>
            </Pressable>
          </View>
        )}

        {/* Input Area - sits flush above keyboard, above safe-area when no keyboard */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 8),
            },
          ]}
        >
          <Pressable
            onPress={() => setShowAttachments((s) => !s)}
            style={[
              styles.iconBtn,
              showAttachments && { backgroundColor: colors.accent },
            ]}
            hitSlop={6}
          >
            <Feather
              name={showAttachments ? "x" : "plus"}
              size={22}
              color={showAttachments ? colors.primary : colors.mutedForeground}
            />
          </Pressable>

          <View
            style={[
              styles.inputWrap,
              { backgroundColor: colors.secondary, borderColor: colors.border },
            ]}
          >
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Type a message..."
              placeholderTextColor={colors.mutedForeground}
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={1000}
            />
            <Pressable
              style={styles.emojiBtn}
              hitSlop={6}
              onPress={() => {}}
            >
              <Feather
                name="smile"
                size={20}
                color={colors.mutedForeground}
              />
            </Pressable>
          </View>

          <Pressable
            onPress={handleSend}
            disabled={!message.trim() || sendMutation.isPending}
            style={[
              styles.sendBtn,
              {
                backgroundColor: message.trim() ? colors.primary : colors.muted,
                transform: [{ scale: message.trim() ? 1 : 0.95 }],
              },
            ]}
          >
            {sendMutation.isPending ? (
              <LoadingSpinner size="small" />
            ) : (
              <Feather
                name={message.trim() ? "send" : "mic"}
                size={20}
                color="#fff"
              />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  headerBtn: { padding: 8, marginRight: 4 },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    maxWidth: 240,
  },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  messageRow: { flexDirection: "row", alignItems: "flex-end" },
  avatarSlot: { width: 36, marginRight: 6 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  messageContainer: { maxWidth: "78%" },
  senderName: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginBottom: 3,
    marginLeft: 4,
  },
  replyPreview: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderLeftWidth: 3,
    marginBottom: 4,
    minWidth: 120,
    maxWidth: "100%",
  },
  replyAuthor: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 1,
  },
  replyText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  messageText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 20 },
  deletedText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
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
    marginTop: 3,
    marginHorizontal: 4,
  },
  timeText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  actionBtn: { padding: 2 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingTop: 80 },
  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  replyBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  replyBarLine: { width: 3, height: 32, borderRadius: 2 },
  replyBarContent: { flex: 1 },
  replyBarAuthor: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  replyBarText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 8 : 4,
    minHeight: 42,
    maxHeight: 120,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    paddingVertical: Platform.OS === "ios" ? 4 : 6,
    maxHeight: 100,
  },
  emojiBtn: { paddingLeft: 8, paddingBottom: 4 },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
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
