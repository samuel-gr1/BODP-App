import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApi } from "@/hooks/useApi";
import { useColors } from "@/hooks/useColors";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";

interface Document {
  id: string;
  title: string;
  description?: string;
  originalName: string;
  mimetype: string;
  size: number;
  createdAt: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimetype: string): { icon: string; color: string } {
  if (mimetype.includes("pdf")) return { icon: "file-text", color: "#EF4444" };
  if (mimetype.includes("word") || mimetype.includes("document")) return { icon: "file-text", color: "#2563EB" };
  if (mimetype.includes("image")) return { icon: "image", color: "#16A34A" };
  return { icon: "file", color: "#64748B" };
}

export default function DocumentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { request, downloadFile } = useApi();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["documents"],
    queryFn: () => request<{ documents: Document[] }>("/library-documents"),
    retry: 1,
  });

  const documents = data?.documents ?? [];
  const filtered = documents.filter(
    (d: Document) =>
      !search ||
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.originalName.toLowerCase().includes(search.toLowerCase())
  );

  const handleDownload = async (doc: Document) => {
    try {
      setDownloadingId(doc.id);
      
      // Use the downloadFile function from useApi hook to open in browser
      await downloadFile(`/library-documents/${doc.id}/download`, doc.originalName);
      
      // Document opened in browser
      Alert.alert("Document Opened", `Viewing: ${doc.originalName}`);
    } catch (error: any) {
      console.error("Open error:", error);
      Alert.alert("Cannot Open", error.message || "Failed to open document");
    } finally {
      setDownloadingId(null);
    }
  };

  const paddingTop = Platform.OS === "web" ? 67 + 16 : insets.top + 16;
  const paddingBottom = Platform.OS === "web" ? 34 + 84 : 84;

  const renderItem = ({ item }: { item: Document }) => {
    const { icon, color } = getFileIcon(item.mimetype);
    return (
      <Card style={styles.docCard}>
        <View style={styles.docRow}>
          <View style={[styles.iconWrap, { backgroundColor: `${color}15` }]}>
            <Feather name={icon as keyof typeof Feather.glyphMap} size={22} color={color} />
          </View>
          <View style={styles.docInfo}>
            <Text style={[styles.docTitle, { color: colors.foreground }]} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={[styles.docMeta, { color: colors.mutedForeground }]}>
              {formatFileSize(item.size)} • {new Date(item.createdAt).toLocaleDateString()}
            </Text>
            {item.description && (
              <Text style={[styles.docDesc, { color: colors.mutedForeground }]} numberOfLines={1}>
                {item.description}
              </Text>
            )}
          </View>
          <View style={styles.docActions}>
            <Pressable
              style={[styles.actionIcon, { backgroundColor: colors.secondary }]}
              onPress={() => handleDownload(item)}
              disabled={downloadingId === item.id}
            >
              {downloadingId === item.id ? (
                <LoadingSpinner size="small" />
              ) : (
                <Feather name="external-link" size={14} color={colors.primary} />
              )}
            </Pressable>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop, backgroundColor: colors.primary }]}>
        <Text style={styles.screenTitle}>Documents</Text>
        <Text style={styles.screenSubtitle}>Document Library</Text>
      </View>

      <View style={[styles.searchWrap, { backgroundColor: colors.background }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search documents..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="folder"
              title="No documents found"
              subtitle={search ? "Try different keywords" : "No documents available in the library"}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingHorizontal: 20, paddingBottom: 16 },
  screenTitle: { color: "#fff", fontSize: 24, fontFamily: "Inter_700Bold", fontWeight: "700" },
  screenSubtitle: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 10 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", height: 44 },
  docCard: { marginBottom: 10 },
  docRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  docInfo: { flex: 1 },
  docTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", fontWeight: "600", marginBottom: 2 },
  docMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  docDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  docActions: { alignItems: "center", gap: 6 },
  actionIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
});
