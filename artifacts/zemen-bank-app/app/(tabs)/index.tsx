import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useApi } from "@/hooks/useApi";
import { useColors } from "@/hooks/useColors";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface DashboardMetrics {
  totalSubmissions: number;
  pendingApproval: number;
  approved: number;
  rejected: number;
}

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  location?: string;
  status: string;
  category?: { name: string };
  _count?: { participants: number };
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { request } = useApi();

  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: () => request<DashboardMetrics>("/dashboard/metrics"),
    retry: 1,
  });

  const { data: meetingsData, isLoading: meetingsLoading, refetch: refetchMeetings } = useQuery({
    queryKey: ["upcoming-meetings"],
    queryFn: () => request<{ meetings: Meeting[] }>("/meetings?status=SCHEDULED"),
    retry: 1,
  });

  const isRefreshing = metricsLoading || meetingsLoading;
  const onRefresh = () => {
    refetchMetrics();
    refetchMeetings();
  };

  const upcomingMeetings = meetingsData?.meetings?.slice(0, 3) ?? [];

  const paddingBottom = Platform.OS === "web" ? 34 : 0;
  const paddingTop = Platform.OS === "web" ? 67 + 16 : insets.top + 16;

  const getRoleColor = (role?: string) => {
    switch (role) {
      case "ADMIN": return colors.destructive;
      case "APPROVER": return colors.warning;
      case "SECRETARY": return colors.info;
      default: return colors.primary;
    }
  };

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: paddingBottom + 100 }}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.name ?? "User"}
            </Text>
          </View>
          <View style={styles.roleChip}>
            <Text style={[styles.roleText, { color: getRoleColor(user?.role) }]}>
              {user?.role}
            </Text>
          </View>
        </View>
        <Text style={styles.headerSub}>Zemen Bank Fit & Proper System</Text>
      </View>

      <View style={styles.content}>
        <SectionHeader title="Submission Overview" />
        {metricsLoading ? (
          <LoadingSpinner size="small" />
        ) : (
          <View style={styles.metricsGrid}>
            <MetricCard
              label="Total"
              value={metrics?.totalSubmissions ?? 0}
              color={colors.primary}
              bgColor={colors.accent}
              icon="file-text"
            />
            <MetricCard
              label="Pending"
              value={metrics?.pendingApproval ?? 0}
              color={colors.warning}
              bgColor={colors.warningLight}
              icon="clock"
            />
            <MetricCard
              label="Approved"
              value={metrics?.approved ?? 0}
              color={colors.success}
              bgColor={colors.successLight}
              icon="check-circle"
            />
            <MetricCard
              label="Rejected"
              value={metrics?.rejected ?? 0}
              color={colors.destructive}
              bgColor={colors.errorLight}
              icon="x-circle"
            />
          </View>
        )}

        <View style={styles.quickActions}>
          <SectionHeader title="Quick Actions" />
          <View style={styles.actionsRow}>
            <QuickActionButton
              icon="calendar"
              label="New Meeting"
              color={colors.info}
              onPress={() => router.push("/(tabs)/meetings")}
            />
            <QuickActionButton
              icon="file-plus"
              label="Submit Form"
              color={colors.success}
              onPress={() => router.push("/(tabs)/forms")}
            />
            <QuickActionButton
              icon="folder"
              label="Documents"
              color={colors.warning}
              onPress={() => router.push("/(tabs)/documents")}
            />
            <QuickActionButton
              icon="user"
              label="My Profile"
              color={colors.primary}
              onPress={() => router.push("/(tabs)/profile")}
            />
          </View>
        </View>

        <View>
          <SectionHeader
            title="Upcoming Meetings"
            action={{ label: "See all", onPress: () => router.push("/(tabs)/meetings") }}
          />
          {meetingsLoading ? (
            <LoadingSpinner size="small" />
          ) : upcomingMeetings.length === 0 ? (
            <Card>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No upcoming meetings
              </Text>
            </Card>
          ) : (
            upcomingMeetings.map((meeting) => (
              <Pressable
                key={meeting.id}
                onPress={() => router.push({ pathname: "/meeting/[id]", params: { id: meeting.id } })}
              >
                <Card style={styles.meetingCard}>
                  <View style={styles.meetingRow}>
                    <View style={[styles.meetingDateBadge, { backgroundColor: colors.accent }]}>
                      <Text style={[styles.meetingDateDay, { color: colors.primary }]}>
                        {new Date(meeting.date).getDate()}
                      </Text>
                      <Text style={[styles.meetingDateMonth, { color: colors.primary }]}>
                        {new Date(meeting.date).toLocaleString("default", { month: "short" })}
                      </Text>
                    </View>
                    <View style={styles.meetingInfo}>
                      <Text style={[styles.meetingTitle, { color: colors.foreground }]} numberOfLines={1}>
                        {meeting.title}
                      </Text>
                      {meeting.category && (
                        <Text style={[styles.meetingCategory, { color: colors.mutedForeground }]}>
                          {meeting.category.name}
                        </Text>
                      )}
                      <View style={styles.meetingMeta}>
                        {meeting.time && (
                          <View style={styles.metaItem}>
                            <Feather name="clock" size={12} color={colors.mutedForeground} />
                            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                              {meeting.time}
                            </Text>
                          </View>
                        )}
                        {meeting.location && (
                          <View style={styles.metaItem}>
                            <Feather name="map-pin" size={12} color={colors.mutedForeground} />
                            <Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1}>
                              {meeting.location}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <StatusBadge status={meeting.status} size="sm" />
                  </View>
                </Card>
              </Pressable>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function MetricCard({
  label,
  value,
  color,
  bgColor,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  bgColor: string;
  icon: keyof typeof Feather.glyphMap;
}) {
  const colors = useColors();
  return (
    <Card style={[styles.metricCard, { backgroundColor: bgColor, borderColor: "transparent" }]} padding={12}>
      <Feather name={icon} size={20} color={color} />
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </Card>
  );
}

function QuickActionButton({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable style={styles.actionBtn} onPress={onPress}>
      <View style={[styles.actionIconWrap, { backgroundColor: `${color}15` }]}>
        <Feather name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.actionLabel, { color: colors.foreground }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  welcomeText: { color: "rgba(255,255,255,0.75)", fontSize: 13, fontFamily: "Inter_400Regular" },
  userName: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold", fontWeight: "700", maxWidth: 220 },
  headerSub: { color: "rgba(255,255,255,0.65)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4 },
  roleChip: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    marginTop: 2,
  },
  roleText: { fontSize: 11, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  content: { padding: 16, gap: 24 },
  metricsGrid: { flexDirection: "row", gap: 10 },
  metricCard: { flex: 1, alignItems: "center", gap: 4 },
  metricValue: { fontSize: 22, fontFamily: "Inter_700Bold", fontWeight: "700" },
  metricLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  quickActions: {},
  actionsRow: { flexDirection: "row", justifyContent: "space-between" },
  actionBtn: { alignItems: "center", flex: 1 },
  actionIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  actionLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },
  meetingCard: { marginBottom: 10 },
  meetingRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  meetingDateBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  meetingDateDay: { fontSize: 16, fontFamily: "Inter_700Bold", fontWeight: "700", lineHeight: 18 },
  meetingDateMonth: { fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase" },
  meetingInfo: { flex: 1 },
  meetingTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", fontWeight: "600", marginBottom: 2 },
  meetingCategory: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 4 },
  meetingMeta: { flexDirection: "row", gap: 10 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  emptyText: { textAlign: "center", fontSize: 14, fontFamily: "Inter_400Regular", paddingVertical: 8 },
});
