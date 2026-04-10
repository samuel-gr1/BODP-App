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
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApi } from "@/hooks/useApi";
import { useColors } from "@/hooks/useColors";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const STATUS_FILTERS = ["ALL", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

interface Meeting {
  id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  location?: string;
  status: string;
  category?: { name: string };
  _count?: { agendaItems: number; participants: number };
}

export default function MeetingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { request } = useApi();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["meetings", statusFilter],
    queryFn: () =>
      request<{ meetings: Meeting[] }>(
        `/meetings${statusFilter !== "ALL" ? `?status=${statusFilter}` : ""}`
      ),
    retry: 1,
  });

  const meetings = data?.meetings ?? [];
  const filtered = meetings.filter(
    (m) =>
      !search ||
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.category?.name.toLowerCase().includes(search.toLowerCase())
  );

  const paddingTop = Platform.OS === "web" ? 67 + 16 : insets.top + 16;
  const paddingBottom = Platform.OS === "web" ? 34 + 84 : 84;

  const renderMeeting = ({ item }: { item: Meeting }) => (
    <Pressable onPress={() => router.push({ pathname: "/meeting/[id]", params: { id: item.id } })}>
      <Card style={styles.meetingCard}>
        <View style={styles.meetingHeader}>
          <View style={styles.meetingTitleRow}>
            <Text style={[styles.meetingTitle, { color: colors.foreground }]} numberOfLines={2}>
              {item.title}
            </Text>
            <StatusBadge status={item.status} size="sm" />
          </View>
          {item.category && (
            <Text style={[styles.category, { color: colors.mutedForeground }]}>
              {item.category.name}
            </Text>
          )}
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.meetingMeta}>
          <MetaChip icon="calendar" label={new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} />
          {item.time && <MetaChip icon="clock" label={item.time} />}
          {item.location && <MetaChip icon="map-pin" label={item.location} />}
        </View>
        {item._count && (
          <View style={styles.countRow}>
            <View style={styles.countItem}>
              <Feather name="users" size={12} color={colors.mutedForeground} />
              <Text style={[styles.countText, { color: colors.mutedForeground }]}>
                {item._count.participants}
              </Text>
            </View>
            <View style={styles.countItem}>
              <Feather name="list" size={12} color={colors.mutedForeground} />
              <Text style={[styles.countText, { color: colors.mutedForeground }]}>
                {item._count.agendaItems} agenda items
              </Text>
            </View>
          </View>
        )}
      </Card>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop, backgroundColor: colors.primary }]}>
        <Text style={styles.screenTitle}>Meetings</Text>
      </View>

      <View style={[styles.searchWrap, { backgroundColor: colors.background }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search meetings..."
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

      <View style={[styles.filtersRow, { backgroundColor: colors.background }]}>
        <FlatList
          horizontal
          data={STATUS_FILTERS}
          keyExtractor={(i) => i}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setStatusFilter(item)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: statusFilter === item ? colors.primary : colors.secondary,
                  borderColor: statusFilter === item ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: statusFilter === item ? "#fff" : colors.mutedForeground },
                ]}
              >
                {item === "IN_PROGRESS" ? "In Progress" : item.charAt(0) + item.slice(1).toLowerCase()}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={renderMeeting}
          contentContainerStyle={{ padding: 16, paddingBottom }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="calendar"
              title="No meetings found"
              subtitle={search ? "Try different search terms" : "No meetings match the selected filter"}
            />
          }
        />
      )}
    </View>
  );
}

function MetaChip({ icon, label }: { icon: keyof typeof Feather.glyphMap; label: string }) {
  const colors = useColors();
  return (
    <View style={styles.metaChip}>
      <Feather name={icon} size={11} color={colors.mutedForeground} />
      <Text style={[styles.metaChipText, { color: colors.mutedForeground }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingHorizontal: 20, paddingBottom: 16 },
  screenTitle: { color: "#fff", fontSize: 24, fontFamily: "Inter_700Bold", fontWeight: "700" },
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
  filtersRow: { paddingBottom: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, borderWidth: 1 },
  filterChipText: { fontSize: 13, fontFamily: "Inter_500Medium", fontWeight: "500" },
  meetingCard: { marginBottom: 12 },
  meetingHeader: { gap: 4 },
  meetingTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  meetingTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", fontWeight: "600", flex: 1 },
  category: { fontSize: 12, fontFamily: "Inter_400Regular" },
  divider: { height: 1, marginVertical: 10 },
  meetingMeta: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaChipText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  countRow: { flexDirection: "row", gap: 16, marginTop: 8 },
  countItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  countText: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
