import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
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
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useApi } from "@/hooks/useApi";  

interface Vote {
  id: string;
  title: string;
  description: string | null;
  status: "DRAFT" | "OPEN" | "CLOSED" | "CANCELLED";
  visibility: "ALL" | "COMMITTEE" | "SELECTED";
  startDate: string;
  endDate: string;
  hasVoted: boolean;
  createdBy: {
    id: string;
    name: string;
  };
  category?: {
    id: string;
    name: string;
  };
  _count: {
    responses: number;
  };
}

type FilterStatus = "all" | "open" | "closed";

export default function VotesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { request } = useApi();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>("all");

  const isAdmin = user?.role === "ADMIN" || user?.role === "SECRETARY";

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["votes", filter],
    queryFn: () => request<{ votes: Vote[] }>(`/votes${filter !== "all" ? `?status=${filter.toUpperCase()}` : ""}`),
    retry: 1,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return colors.success;
      case "CLOSED":
        return colors.mutedForeground;
      case "CANCELLED":
        return colors.destructive;
      case "DRAFT":
        return colors.warning;
      default:
        return colors.mutedForeground;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "OPEN":
        return "Open";
      case "CLOSED":
        return "Closed";
      case "CANCELLED":
        return "Cancelled";
      case "DRAFT":
        return "Draft";
      default:
        return status;
    }
  };

  const isVoteActive = (vote: Vote) => {
    const now = new Date();
    const start = new Date(vote.startDate);
    const end = new Date(vote.endDate);
    return vote.status === "OPEN" && now >= start && now <= end;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const renderVote = ({ item }: { item: Vote }) => {
    const active = isVoteActive(item);
    const showResults = item.status === "CLOSED" || isAdmin;

    return (
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/votes/[id]",
            params: { id: item.id },
          })
        }
      >
        <Card style={styles.voteCard}>
          <View style={styles.voteHeader}>
            <View style={styles.voteTitleContainer}>
              <Text
                style={[styles.voteTitle, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(item.status) + "20" },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(item.status) },
                  ]}
                >
                  {getStatusLabel(item.status)}
                </Text>
              </View>
            </View>
            {item.hasVoted && (
              <View style={[styles.votedBadge, { backgroundColor: colors.success + "20" }]}>
                <Feather name="check" size={12} color={colors.success} />
                <Text style={[styles.votedText, { color: colors.success }]}>
                  Voted
                </Text>
              </View>
            )}
          </View>

          {item.description && (
            <Text
              style={[styles.voteDescription, { color: colors.mutedForeground }]}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          )}

          <View style={styles.voteMeta}>
            <View style={styles.metaItem}>
              <Feather name="calendar" size={14} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {formatDate(item.startDate)} - {formatDate(item.endDate)}
              </Text>
            </View>

            {item.category && (
              <View style={styles.metaItem}>
                <Feather name="users" size={14} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                  {item.category.name}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.voteFooter}>
            <View style={styles.metaItem}>
              <Feather name="user" size={14} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                By {item.createdBy.name}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Feather name="message-square" size={14} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {item._count.responses} votes
              </Text>
            </View>
          </View>
        </Card>
      </Pressable>
    );
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const votes = data?.votes ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Votes</Text>
        {isAdmin && (
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/votes/new")}
          >
            <Feather name="plus" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(["all", "open", "closed"] as FilterStatus[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterTab,
              filter === f && { backgroundColor: colors.primary },
              { borderColor: colors.border },
            ]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterText,
                { color: filter === f ? "#fff" : colors.text },
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={votes}
        renderItem={renderVote}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="bar-chart-2" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No votes found
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {filter === "all"
                ? "There are no votes available at the moment"
                : `No ${filter} votes available`}
            </Text>
          </View>
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
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "500",
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  voteCard: {
    marginBottom: 12,
    padding: 16,
  },
  voteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  voteTitleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  voteTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  votedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
    gap: 4,
  },
  votedText: {
    fontSize: 12,
    fontWeight: "500",
  },
  voteDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  voteMeta: {
    gap: 8,
    marginBottom: 12,
  },
  voteFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
});
