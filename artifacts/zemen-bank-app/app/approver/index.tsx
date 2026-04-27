import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApi } from "@/hooks/useApi";
import { useColors } from "@/hooks/useColors";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";

interface Submission {
  id: string;
  userId: string;
  user: { name: string; email: string };
  version: number;
  status: string;
  submittedAt: string;
  sections: { sectionName: string; status: string }[];
}

export default function ApproverDashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { request } = useApi();
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["approver-submissions"],
    queryFn: () => request<{ submissions: Submission[] }>("/approver/submissions"),
    retry: 1,
  });

  const submissions = data?.submissions ?? [];

  const stats = {
    pending: submissions.filter((s: Submission) => s.status === "SUBMITTED" || s.status === "UNDER_REVIEW").length,
    approved: submissions.filter((s: Submission) => s.status === "APPROVED").length,
    rejected: submissions.filter((s: Submission) => s.status === "REJECTED").length,
    total: submissions.length,
  };

  const paddingTop = Platform.OS === "web" ? 67 + 16 : insets.top + 16;
  const paddingBottom = Platform.OS === "web" ? 34 + 84 : 84;

  const getSectionCompletion = (sections: Submission["sections"]) => {
    const completed = sections.filter((s) => s.status !== "INCOMPLETE").length;
    return Math.round((completed / 5) * 100);
  };

  const renderItem = ({ item }: { item: Submission }) => {
    const completion = getSectionCompletion(item.sections);
    return (
      <Pressable
        onPress={() => router.push({ pathname: "/approver/[submissionId]", params: { submissionId: item.id } })}
      >
        <Card style={[styles.card, { borderColor: colors.border }]}>
          <View style={styles.header}>
            <View style={styles.userInfo}>
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>
                  {item.user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </Text>
              </View>
              <View>
                <Text style={[styles.userName, { color: colors.foreground }]}>{item.user.name}</Text>
                <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>{item.user.email}</Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: colors.warningLight }]}>
              <Text style={[styles.statusText, { color: colors.warning }]}>v{item.version}</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.details}>
            <View style={styles.detailRow}>
              <Feather name="calendar" size={14} color={colors.mutedForeground} />
              <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
                Submitted {new Date(item.submittedAt).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Feather name="check-circle" size={14} color={colors.mutedForeground} />
              <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
                {completion}% sections completed
              </Text>
            </View>
          </View>

          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${completion}%`, backgroundColor: colors.success }]} />
          </View>
        </Card>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop, backgroundColor: colors.primary }]}>
        <Text style={styles.screenTitle}>Approver</Text>
        <Text style={styles.screenSubtitle}>Review Submissions</Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <Card style={[styles.statCard, { backgroundColor: colors.warningLight, borderColor: "transparent" }]}>
          <Text style={[styles.statNumber, { color: colors.warning }]}>{stats.pending}</Text>
          <Text style={[styles.statLabel, { color: colors.warning }]}>Pending</Text>
        </Card>
        <Card style={[styles.statCard, { backgroundColor: colors.successLight, borderColor: "transparent" }]}>
          <Text style={[styles.statNumber, { color: colors.success }]}>{stats.approved}</Text>
          <Text style={[styles.statLabel, { color: colors.success }]}>Approved</Text>
        </Card>
        <Card style={[styles.statCard, { backgroundColor: colors.errorLight, borderColor: "transparent" }]}>
          <Text style={[styles.statNumber, { color: colors.destructive }]}>{stats.rejected}</Text>
          <Text style={[styles.statLabel, { color: colors.destructive }]}>Rejected</Text>
        </Card>
      </View>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={submissions}
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
                <Feather name="info" size={16} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.primary }]}>
                  Review and approve Fit & Proper assessments submitted by users.
                </Text>
              </View>
            </Card>
          }
          ListEmptyComponent={
            <EmptyState
              icon="check-circle"
              title="No submissions to review"
              subtitle="All submissions have been processed"
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
  statsRow: { flexDirection: "row", paddingHorizontal: 16, gap: 10, marginTop: -20 },
  statCard: { flex: 1, alignItems: "center", paddingVertical: 16 },
  statNumber: { fontSize: 24, fontFamily: "Inter_700Bold", fontWeight: "700" },
  statLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 4 },
  infoCard: { marginBottom: 16 },
  infoRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  card: { marginBottom: 12 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  userInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  userName: { fontSize: 16, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  userEmail: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  divider: { height: 1, marginVertical: 12 },
  details: { gap: 6 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  detailText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  progressBar: {
    height: 4,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 2,
    marginTop: 12,
    overflow: "hidden",
  },
  progressFill: { height: 4, borderRadius: 2 },
});
