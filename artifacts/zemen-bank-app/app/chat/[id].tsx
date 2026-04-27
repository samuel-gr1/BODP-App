import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Audio } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack, router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";
import { useApi } from "@/hooks/useApi";
import { useColors } from "@/hooks/useColors";

const API_BASE = process.env.EXPO_PUBLIC_API_URL;

interface Attachment {
  id: string;
  url: string;
  fileType: string;
  fileName: string;
  fileSize?: number;
  durationMs?: number;
}

interface Message {
  id: string;
  content?: string;
  createdAt: string;
  isDeleted?: boolean;
  parentId?: string;
  parent?: { id: string; content?: string; sender: { name: string } };
  sender: { id: string; name: string; email?: string };
  attachments?: Attachment[];
}

interface ChatThread {
  id: string;
  name?: string;
  type: "INDIVIDUAL" | "GROUP" | "GLOBAL";
  members: { userId: string; user: { id: string; name: string; email: string } }[];
  _count?: { members: number };
}

export default function ChatConversationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { request } = useApi();
  const { user, token } = useAuth();
  const qc = useQueryClient();

  const listRef = useRef<FlatList<Message>>(null);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showAttach, setShowAttach] = useState(false);
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  // Voice recording state
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordTimer, setRecordTimer] = useState(0);
  const recordIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Voice playback state
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Keyboard tracking — manual listeners are far more reliable than
  // KeyboardAvoidingView, especially on Android and inside modal stacks.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showEvt =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvt, (e) => {
      // On Android the reported height already accounts for the safe-area;
      // on iOS we subtract the home-indicator inset because we still apply it.
      const h = e.endCoordinates?.height ?? 0;
      setKeyboardHeight(
        Platform.OS === "ios" ? Math.max(0, h - insets.bottom) : h,
      );
      setTimeout(
        () => listRef.current?.scrollToEnd({ animated: true }),
        80,
      );
    });
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [insets.bottom]);

  const chatQuery = useQuery({
    queryKey: ["chat", id],
    queryFn: () => request<{ chat: ChatThread }>(`/chats/${id}`),
  });

  const messagesQuery = useQuery({
    queryKey: ["chat-messages", id],
    queryFn: () =>
      request<{ messages: Message[] }>(`/chats/${id}/messages?limit=100`),
    refetchInterval: 4000,
  });

  const messages = messagesQuery.data?.messages ?? [];

  const sendText = useMutation({
    mutationFn: (payload: { content: string; replyToId?: string }) =>
      request(`/chats/${id}/messages`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setText("");
      setReplyTo(null);
      qc.invalidateQueries({ queryKey: ["chat-messages", id] });
      qc.invalidateQueries({ queryKey: ["chats"] });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    },
  });

  const deleteMsg = useMutation({
    mutationFn: (msgId: string) =>
      request(`/chats/${id}/messages/${msgId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat-messages", id] }),
  });

  const markRead = useMutation({
    mutationFn: () => request(`/chats/${id}/mark-read`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chats"] }),
  });

  useEffect(() => {
    if (id) markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 50);
    }
  }, [messages.length]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  // ---- Send helpers ----
  const handleSendText = () => {
    const content = text.trim();
    if (!content) return;
    Haptics.selectionAsync();
    sendText.mutate({ content, replyToId: replyTo?.id });
  };

  const uploadFile = async (file: {
    uri: string;
    name: string;
    type: string;
    durationMs?: number;
  }) => {
    if (!API_BASE || !token) {
      Alert.alert("Not signed in", "Please log in again.");
      return;
    }
    const form = new FormData();
    // React Native FormData accepts {uri, name, type}
    form.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);
    if (file.durationMs) form.append("durationMs", String(file.durationMs));
    if (replyTo?.id) form.append("replyToId", replyTo.id);

    try {
      const res = await fetch(`${API_BASE}/chats/${id}/attachments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Upload failed (${res.status})`);
      }
      setReplyTo(null);
      qc.invalidateQueries({ queryKey: ["chat-messages", id] });
      qc.invalidateQueries({ queryKey: ["chats"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      Alert.alert("Upload error", msg);
    }
  };

  // ---- Attachments ----
  const pickImage = async () => {
    setShowAttach(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission required", "Please allow photo access.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;
    const a = result.assets[0];
    await uploadFile({
      uri: a.uri,
      name: a.fileName ?? `image-${Date.now()}.jpg`,
      type: a.mimeType ?? "image/jpeg",
    });
  };

  const takePhoto = async () => {
    setShowAttach(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission required", "Please allow camera access.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;
    const a = result.assets[0];
    await uploadFile({
      uri: a.uri,
      name: a.fileName ?? `photo-${Date.now()}.jpg`,
      type: a.mimeType ?? "image/jpeg",
    });
  };

  const pickDocument = async () => {
    setShowAttach(false);
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.length) return;
    const a = result.assets[0];
    await uploadFile({
      uri: a.uri,
      name: a.name,
      type: a.mimeType ?? "application/octet-stream",
    });
  };

  // ---- Voice ----
  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Microphone permission", "Please allow microphone access.");
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      await rec.startAsync();
      recordingRef.current = rec;
      setRecording(true);
      setRecordTimer(0);
      recordIntervalRef.current = setInterval(
        () => setRecordTimer((t) => t + 1),
        1000,
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      console.log("recording error", e);
      Alert.alert("Recording failed", "Could not start recording.");
    }
  };

  const stopRecording = async (cancel = false) => {
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }
    setRecording(false);
    const rec = recordingRef.current;
    recordingRef.current = null;
    if (!rec) return;
    try {
      await rec.stopAndUnloadAsync();
    } catch {}
    const uri = rec.getURI();
    const duration = recordTimer * 1000;
    setRecordTimer(0);
    if (cancel || !uri || duration < 500) return;
    await uploadFile({
      uri,
      name: `voice-${Date.now()}.m4a`,
      type: "audio/m4a",
      durationMs: duration,
    });
  };

  const playVoice = async (att: Attachment) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      if (playingId === att.id) {
        setPlayingId(null);
        return;
      }
      const { sound } = await Audio.Sound.createAsync({ uri: att.url });
      soundRef.current = sound;
      setPlayingId(att.id);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingId(null);
          sound.unloadAsync().catch(() => {});
          if (soundRef.current === sound) soundRef.current = null;
        }
      });
      await sound.playAsync();
    } catch (e) {
      console.log("play error", e);
    }
  };

  // ---- Header info ----
  const chat = chatQuery.data?.chat;
  const headerName = useMemo(() => {
    if (!chat) return "Chat";
    if (chat.name) return chat.name;
    if (chat.type === "GLOBAL") return "Global Chat";
    if (chat.type === "INDIVIDUAL") {
      const other = chat.members.find((m) => m.userId !== user?.id);
      return other?.user?.name ?? "Direct Message";
    }
    return `Group · ${chat._count?.members ?? chat.members.length} members`;
  }, [chat, user?.id]);

  const subtitle = useMemo(() => {
    if (!chat) return "";
    if (chat.type === "GROUP") return `${chat._count?.members ?? chat.members.length} members`;
    if (chat.type === "GLOBAL") return "Everyone in the workspace";
    return "Direct message";
  }, [chat]);

  const initialsOf = (name: string) =>
    name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });

  const formatRecord = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const dayLabel = (iso: string): string => {
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor(
      (now.setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000,
    );
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    if (diff < 7) return d.toLocaleDateString([], { weekday: "long" });
    return d.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  };

  // ---- Render ----
  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const own = item.sender.id === user?.id;
    const prev = messages[index - 1];
    const grouped = prev && prev.sender.id === item.sender.id &&
      new Date(item.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60 * 1000;
    const showAvatar = !own && (!prev || prev.sender.id !== item.sender.id);
    const showSenderName =
      chat?.type !== "INDIVIDUAL" && !own && showAvatar;

    const showDateSep =
      !prev ||
      new Date(item.createdAt).toDateString() !==
        new Date(prev.createdAt).toDateString();

    const onLongPress = () => {
      if (item.isDeleted) return;
      const opts: { text: string; onPress?: () => void; style?: "destructive" | "cancel" }[] = [
        { text: "Reply", onPress: () => setReplyTo(item) },
      ];
      if (own) {
        opts.push({
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMsg.mutate(item.id),
        });
      }
      opts.push({ text: "Cancel", style: "cancel" });
      Haptics.selectionAsync();
      Alert.alert("Message", undefined, opts);
    };

    return (
      <View>
        {showDateSep && (
          <View style={styles.dayWrap}>
            <View
              style={[styles.dayPill, { backgroundColor: colors.secondary }]}
            >
              <Text style={[styles.dayText, { color: colors.mutedForeground }]}>
                {dayLabel(item.createdAt)}
              </Text>
            </View>
          </View>
        )}

        <View
          style={[
            styles.row,
            {
              justifyContent: own ? "flex-end" : "flex-start",
              marginTop: grouped ? 2 : 8,
            },
          ]}
        >
          {!own && (
            <View style={styles.avatarSlot}>
              {showAvatar && (
                <View
                  style={[styles.avatar, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.avatarText}>
                    {initialsOf(item.sender.name)}
                  </Text>
                </View>
              )}
            </View>
          )}

          <Pressable
            onLongPress={onLongPress}
            delayLongPress={250}
            style={({ pressed }) => [
              styles.bubbleWrap,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            {showSenderName && (
              <Text
                style={[styles.senderName, { color: colors.mutedForeground }]}
              >
                {item.sender.name}
              </Text>
            )}

            {item.parent && (
              <View
                style={[
                  styles.replyChip,
                  {
                    backgroundColor: own
                      ? "rgba(255,255,255,0.2)"
                      : colors.muted,
                    borderLeftColor: own ? "#fff" : colors.primary,
                    alignSelf: own ? "flex-end" : "flex-start",
                  },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.replyAuthor,
                    { color: own ? "#fff" : colors.primary },
                  ]}
                >
                  {item.parent.sender.name}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.replyText,
                    {
                      color: own
                        ? "rgba(255,255,255,0.85)"
                        : colors.mutedForeground,
                    },
                  ]}
                >
                  {item.parent.content || "Attachment"}
                </Text>
              </View>
            )}

            {item.attachments?.map((att) =>
              renderAttachment(att, own),
            )}

            {item.content ? (
              <View
                style={[
                  styles.bubble,
                  {
                    backgroundColor: own ? colors.primary : colors.card,
                    borderColor: own ? "transparent" : colors.border,
                    borderTopRightRadius: own && grouped ? 6 : 16,
                    borderTopLeftRadius: !own && grouped ? 6 : 16,
                    borderBottomRightRadius: own ? 4 : 16,
                    borderBottomLeftRadius: !own ? 4 : 16,
                    alignSelf: own ? "flex-end" : "flex-start",
                  },
                ]}
              >
                {item.isDeleted ? (
                  <Text
                    style={[
                      styles.bubbleText,
                      {
                        color: own
                          ? "rgba(255,255,255,0.7)"
                          : colors.mutedForeground,
                        fontStyle: "italic",
                      },
                    ]}
                  >
                    Message deleted
                  </Text>
                ) : (
                  <Text
                    style={[
                      styles.bubbleText,
                      { color: own ? "#fff" : colors.foreground },
                    ]}
                  >
                    {item.content}
                  </Text>
                )}
              </View>
            ) : null}

            <Text
              style={[
                styles.metaTime,
                {
                  color: colors.mutedForeground,
                  textAlign: own ? "right" : "left",
                },
              ]}
            >
              {formatTime(item.createdAt)}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderAttachment = (att: Attachment, own: boolean) => {
    const isImage = att.fileType.startsWith("image");
    const isAudio = att.fileType.startsWith("audio");

    if (isImage) {
      return (
        <Pressable
          key={att.id}
          onPress={() => setPreviewImg(att.url)}
          style={[
            styles.imageWrap,
            { alignSelf: own ? "flex-end" : "flex-start" },
          ]}
        >
          <Image
            source={{ uri: att.url }}
            style={styles.image}
            contentFit="cover"
            transition={150}
          />
        </Pressable>
      );
    }

    if (isAudio) {
      const isPlaying = playingId === att.id;
      const seconds = att.durationMs ? Math.round(att.durationMs / 1000) : 0;
      return (
        <View
          key={att.id}
          style={[
            styles.voiceWrap,
            {
              backgroundColor: own ? colors.primary : colors.card,
              borderColor: own ? "transparent" : colors.border,
              alignSelf: own ? "flex-end" : "flex-start",
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => playVoice(att)}
            activeOpacity={0.85}
            style={[
              styles.voiceBtn,
              {
                backgroundColor: own
                  ? "rgba(255,255,255,0.25)"
                  : colors.primary,
              },
            ]}
          >
            <Feather
              name={isPlaying ? "pause" : "play"}
              size={16}
              color="#fff"
            />
          </TouchableOpacity>
          <View style={styles.voiceBars}>
            {Array.from({ length: 18 }).map((_, i) => (
              <View
                key={i}
                style={{
                  width: 2,
                  height: 6 + ((i * 7) % 14),
                  borderRadius: 1,
                  marginHorizontal: 1,
                  backgroundColor: own
                    ? "rgba(255,255,255,0.85)"
                    : colors.primary,
                  opacity: isPlaying ? 1 : 0.6,
                }}
              />
            ))}
          </View>
          <Text
            style={[
              styles.voiceTime,
              { color: own ? "rgba(255,255,255,0.9)" : colors.mutedForeground },
            ]}
          >
            {formatRecord(seconds)}
          </Text>
        </View>
      );
    }

    return (
      <Pressable
        key={att.id}
        onPress={() => {
          /* no-op for now; could open in browser */
        }}
        style={[
          styles.fileWrap,
          {
            backgroundColor: own ? colors.primary : colors.card,
            borderColor: own ? "transparent" : colors.border,
            alignSelf: own ? "flex-end" : "flex-start",
          },
        ]}
      >
        <View
          style={[
            styles.fileIcon,
            {
              backgroundColor: own
                ? "rgba(255,255,255,0.25)"
                : colors.accent,
            },
          ]}
        >
          <Feather
            name="file"
            size={18}
            color={own ? "#fff" : colors.primary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={[
              styles.fileName,
              { color: own ? "#fff" : colors.foreground },
            ]}
          >
            {att.fileName}
          </Text>
          {att.fileSize ? (
            <Text
              style={[
                styles.fileMeta,
                {
                  color: own
                    ? "rgba(255,255,255,0.85)"
                    : colors.mutedForeground,
                },
              ]}
            >
              {(att.fileSize / 1024).toFixed(0)} KB
            </Text>
          ) : null}
        </View>
        <Feather
          name="download"
          size={16}
          color={own ? "#fff" : colors.mutedForeground}
        />
      </Pressable>
    );
  };

  if (chatQuery.isLoading) return <LoadingSpinner />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: "#fff",
          headerBackTitle: "Back",
          headerTitle: () => (
            <Pressable
              onPress={() => router.push(`/chat/${id}/info` as never)}
              style={styles.headerTitleRow}
            >
              <View
                style={[
                  styles.headerAvatar,
                  { backgroundColor: "rgba(255,255,255,0.18)" },
                ]}
              >
                <Text style={styles.headerAvatarText}>
                  {initialsOf(headerName)}
                </Text>
              </View>
              <View style={{ maxWidth: 220 }}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {headerName}
                </Text>
                <Text style={styles.headerSub} numberOfLines={1}>
                  {subtitle}
                </Text>
              </View>
            </Pressable>
          ),
        }}
      />

      <View style={[styles.flex, { marginBottom: keyboardHeight }]}>
        <View style={styles.flex}>
          {messagesQuery.isLoading ? (
            <LoadingSpinner />
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(m) => m.id}
              renderItem={renderMessage}
              contentContainerStyle={{
                paddingHorizontal: 12,
                paddingTop: 8,
                paddingBottom: 12,
                flexGrow: 1,
                justifyContent: messages.length ? "flex-end" : "center",
              }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={
                Platform.OS === "ios" ? "interactive" : "on-drag"
              }
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() =>
                listRef.current?.scrollToEnd({ animated: true })
              }
              ListEmptyComponent={
                <View style={styles.empty}>
                  <View
                    style={[
                      styles.emptyIcon,
                      { backgroundColor: colors.accent },
                    ]}
                  >
                    <Feather
                      name="message-circle"
                      size={32}
                      color={colors.primary}
                    />
                  </View>
                  <Text
                    style={[styles.emptyTitle, { color: colors.foreground }]}
                  >
                    Say hello
                  </Text>
                  <Text
                    style={[
                      styles.emptySub,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    No messages yet — be the first to send one.
                  </Text>
                </View>
              }
            />
          )}
        </View>

        {replyTo && (
          <View
            style={[
              styles.replyBar,
              {
                backgroundColor: colors.accent,
                borderTopColor: colors.border,
              },
            ]}
          >
            <View
              style={[styles.replyBarLine, { backgroundColor: colors.primary }]}
            />
            <View style={styles.flex}>
              <Text style={[styles.replyBarTitle, { color: colors.primary }]}>
                Replying to {replyTo.sender.name}
              </Text>
              <Text
                numberOfLines={1}
                style={[styles.replyBarText, { color: colors.foreground }]}
              >
                {replyTo.content || "Attachment"}
              </Text>
            </View>
            <Pressable onPress={() => setReplyTo(null)} hitSlop={10}>
              <Feather name="x" size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>
        )}

        {showAttach && (
          <View
            style={[
              styles.attachPanel,
              {
                backgroundColor: colors.card,
                borderTopColor: colors.border,
              },
            ]}
          >
            <AttachItem
              icon="image"
              label="Photo"
              bg={colors.successLight}
              fg={colors.success}
              onPress={pickImage}
            />
            <AttachItem
              icon="camera"
              label="Camera"
              bg={colors.infoLight}
              fg={colors.primary}
              onPress={takePhoto}
            />
            <AttachItem
              icon="file-text"
              label="Document"
              bg={colors.warningLight}
              fg={colors.warning}
              onPress={pickDocument}
            />
          </View>
        )}

        {recording ? (
          <View
            style={[
              styles.recordBar,
              {
                backgroundColor: colors.card,
                borderTopColor: colors.border,
                paddingBottom: keyboardHeight > 0 ? 8 : Math.max(insets.bottom, 8),
              },
            ]}
          >
            <Pressable
              onPress={() => stopRecording(true)}
              style={[styles.recordBtn, { backgroundColor: colors.muted }]}
            >
              <Feather name="trash-2" size={20} color={colors.destructive} />
            </Pressable>
            <View style={styles.recordCenter}>
              <View
                style={[styles.recordDot, { backgroundColor: colors.destructive }]}
              />
              <Text style={[styles.recordTime, { color: colors.foreground }]}>
                Recording  {formatRecord(recordTimer)}
              </Text>
            </View>
            <Pressable
              onPress={() => stopRecording(false)}
              style={[styles.recordBtn, { backgroundColor: colors.primary }]}
            >
              <Feather name="send" size={18} color="#fff" />
            </Pressable>
          </View>
        ) : (
          <View
            style={[
              styles.inputBar,
              {
                backgroundColor: colors.card,
                borderTopColor: colors.border,
                paddingBottom: keyboardHeight > 0 ? 8 : Math.max(insets.bottom, 8),
              },
            ]}
          >
            <Pressable
              onPress={() => setShowAttach((s) => !s)}
              style={[
                styles.iconBtn,
                showAttach && { backgroundColor: colors.accent },
              ]}
              hitSlop={6}
            >
              <Feather
                name={showAttach ? "x" : "paperclip"}
                size={20}
                color={showAttach ? colors.primary : colors.mutedForeground}
              />
            </Pressable>

            <View
              style={[
                styles.inputWrap,
                {
                  backgroundColor: colors.secondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Message"
                placeholderTextColor={colors.mutedForeground}
                value={text}
                onChangeText={setText}
                multiline
                maxLength={2000}
              />
            </View>

            {text.trim().length > 0 ? (
              <Pressable
                onPress={handleSendText}
                disabled={sendText.isPending}
                style={[styles.sendBtn, { backgroundColor: colors.primary }]}
              >
                {sendText.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Feather name="send" size={18} color="#fff" />
                )}
              </Pressable>
            ) : (
              <Pressable
                onLongPress={startRecording}
                onPressOut={() => {
                  if (recording) stopRecording(false);
                }}
                delayLongPress={200}
                style={[styles.sendBtn, { backgroundColor: colors.primary }]}
              >
                <Feather name="mic" size={20} color="#fff" />
              </Pressable>
            )}
          </View>
        )}
      </View>

      <Modal
        visible={!!previewImg}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImg(null)}
      >
        <View style={styles.previewBackdrop}>
          <Pressable
            style={styles.previewClose}
            onPress={() => setPreviewImg(null)}
            hitSlop={12}
          >
            <Feather name="x" size={24} color="#fff" />
          </Pressable>
          {previewImg && (
            <Image
              source={{ uri: previewImg }}
              style={styles.previewImage}
              contentFit="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

function AttachItem({
  icon,
  label,
  bg,
  fg,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  bg: string;
  fg: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.attachItem}
    >
      <View style={[styles.attachIcon, { backgroundColor: bg }]}>
        <Feather name={icon} size={22} color={fg} />
      </View>
      <Text style={[styles.attachLabel, { color: colors.foreground }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },

  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
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
    fontFamily: "Inter_700Bold",
  },
  headerTitle: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  headerSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },

  dayWrap: { alignItems: "center", marginVertical: 12 },
  dayPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dayText: { fontSize: 11, fontFamily: "Inter_500Medium" },

  row: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  avatarSlot: { width: 32 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  bubbleWrap: { maxWidth: "78%" },
  senderName: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginBottom: 4,
    marginLeft: 4,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
  },
  metaTime: {
    fontSize: 10,
    marginTop: 3,
    marginHorizontal: 4,
    fontFamily: "Inter_400Regular",
  },

  replyChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderLeftWidth: 3,
    marginBottom: 4,
    minWidth: 140,
    maxWidth: "100%",
  },
  replyAuthor: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  replyText: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },

  imageWrap: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 4,
  },
  image: {
    width: 220,
    height: 220,
    borderRadius: 14,
  },

  voiceWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
    minWidth: 200,
    marginBottom: 4,
  },
  voiceBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceBars: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 24,
  },
  voiceTime: { fontSize: 11, fontFamily: "Inter_500Medium" },

  fileWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
    minWidth: 220,
    marginBottom: 4,
  },
  fileIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  fileName: { fontSize: 13.5, fontFamily: "Inter_600SemiBold" },
  fileMeta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },

  empty: { alignItems: "center", paddingVertical: 80 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular" },

  replyBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  replyBarLine: { width: 3, height: 32, borderRadius: 2 },
  replyBarTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  replyBarText: { fontSize: 13, fontFamily: "Inter_400Regular" },

  attachPanel: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  attachItem: { alignItems: "center", gap: 8 },
  attachIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  attachLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
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
    alignItems: "center",
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    minHeight: 38,
    maxHeight: 120,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    paddingVertical: 0,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },

  recordBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  recordBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  recordCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
  },
  recordDot: { width: 10, height: 10, borderRadius: 5 },
  recordTime: { fontSize: 14, fontFamily: "Inter_500Medium" },

  previewBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  previewClose: {
    position: "absolute",
    top: 50,
    right: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  previewImage: { width: "100%", height: "85%" },
});
