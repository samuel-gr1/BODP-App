import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Stack } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useApi } from "@/hooks/useApi";
import { useColors } from "@/hooks/useColors";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface AnalyticsSummary {
  totalMeetings: number;
  totalParticipants: number;
  totalAgendaItems: number;
  totalCompletedItems: number;
  averageParticipants: number;
  overallCompletionRate: number;
  totalResolutions: number;
  totalVotes: number;
}

export default function AnalyticsScreen() {
  const colors = useColors();
  const { request } = useApi();

  const { data, isLoading } = useQuery({
    queryKey: ["meeting-analytics"],
    queryFn: () => request<{ summary: AnalyticsSummary }>("/analytics/meetings"),
    retry: 1,
  });

  const summary = data?.summary;
  const paddingBottom = Platform.OS === "web" ? 34 : 24;

  return (
    <>
      <Stack.Screen
        options={{
          title: "Analytics",
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: "#fff",
          headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: "#fff" },
        }}
      />
      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.background }]}
        contentContainerStyle={{ padding: 16, paddingBottom }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Meeting Analytics</Text>

            <View style={styles.statsGrid}>
              <StatCard label="Total Meetings" value={summary?.totalMeetings ?? 0} icon="calendar" color={colors.info} />
              <StatCard label="Participants" value={summary?.totalParticipants ?? 0} icon="users" color={colors.success} />
              <StatCard label="Agenda Items" value={summary?.totalAgendaItems ?? 0} icon="list" color={colors.warning} />
              <StatCard label="Resolutions" value={summary?.totalResolutions ?? 0} icon="check-square" color={colors.primary} />
            </View>

            <Card style={{ marginTop: 16, gap: 16 }}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Performance Overview</Text>
              {summary && (
                <>
                  <MetricRow
                    label="Overall Completion Rate"
                    value={`${summary.overallCompletionRate?.toFixed(1) ?? 0}%`}
                    barValue={summary.overallCompletionRate ?? 0}
                    barColor={colors.success}
                  />
                  <MetricRow
                    label="Agenda Items Completed"
                    value={`${summary.totalCompletedItems}/${summary.totalAgendaItems}`}
                    barValue={summary.totalAgendaItems ? (summary.totalCompletedItems / summary.totalAgendaItems) * 100 : 0}
                    barColor={colors.info}
                  />
                </>
              )}
            </Card>

            <Card style={{ marginTop: 12 }}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Averages</Text>
              <View style={styles.avgGrid}>
                <AvgItem label="Avg Participants" value={summary?.averageParticipants?.toFixed(1) ?? "0"} />
                <AvgItem label="Votes Cast" value={summary?.totalVotes?.toString() ?? "0"} />
              </View>
            </Card>
          </>
        )}
      </ScrollView>
    </>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: keyof typeof Feather.glyphMap; color: string }) {
  const colors = useColors();
  return (
    <Card style={[styles.statCard, { backgroundColor: `${color}10`, borderColor: "transparent" }]} padding={14}>
      <Feather name={icon} size={20} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </Card>
  );
}

function MetricRow({ label, value, barValue, barColor }: { label: string; value: string; barValue: number; barColor: string }) {
  const colors = useColors();
  return (
    <View>
      <View style={styles.metricHeader}>
        <Text style={[styles.metricLabel, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.metricValue, { color: colors.primary }]}>{value}</Text>
      </View>
      <View style={[styles.bar, { backgroundColor: colors.secondary }]}>
        <View style={[styles.barFill, { width: `${Math.min(barValue, 100)}%` as any, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

function AvgItem({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={[styles.avgItem, { backgroundColor: colors.secondary }]}>
      <Text style={[styles.avgValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.avgLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", fontWeight: "700", marginBottom: 12 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { width: "47%", alignItems: "center", gap: 4 },
  statValue: { fontSize: 24, fontFamily: "Inter_700Bold", fontWeight: "700" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  metricHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  metricLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  metricValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  bar: { height: 6, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3 },
  avgGrid: { flexDirection: "row", gap: 10, marginTop: 8 },
  avgItem: { flex: 1, padding: 12, borderRadius: 10, alignItems: "center" },
  avgValue: { fontSize: 20, fontFamily: "Inter_700Bold", fontWeight: "700" },
  avgLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2, textAlign: "center" },
});
