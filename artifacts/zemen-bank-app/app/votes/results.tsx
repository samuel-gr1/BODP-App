import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useApi } from "@/hooks/useApi";

interface VoteResult {
  vote: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    startDate: string;
    endDate: string;
    options: {
      id: string;
      text: string;
      order: number;
      percentage: number;
      _count: {
        responses: number;
      };
      responses: {
        id: string;
        createdAt: string;
        user: {
          id: string;
          name: string;
          email: string;
        };
      }[];
    }[];
    createdBy: {
      id: string;
      name: string;
      email: string;
    };
  };
  stats: {
    totalResponses: number;
    uniqueVoters: number;
    participationRate: number;
    startDate: string;
    endDate: string;
    isActive: boolean;
  };
  trend: {
    date: string;
    count: number;
  }[];
}

export default function VoteResultsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { request } = useApi();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const isAdmin = user?.role === "ADMIN" || user?.role === "SECRETARY";

  const { data, isLoading } = useQuery({
    queryKey: ["vote-results", id],
    queryFn: () => request<{ results: VoteResult }>(`/votes/${id}/results`),
    retry: 1,
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>
          Only admins can view results
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const results = data?.results;

  if (!results) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>Results not found</Text>
      </View>
    );
  }

  const { vote, stats } = results;
  const totalVotes = stats.totalResponses;

  // Find the winning option(s)
  const maxVotes = Math.max(...vote.options.map((o) => o._count.responses));
  const winningOptions = vote.options.filter((o) => o._count.responses === maxVotes);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
          Vote Results
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Vote Title Card */}
        <Card style={styles.titleCard}>
          <Text style={[styles.voteTitle, { color: colors.foreground }]}>
            {vote.title}
          </Text>
          {vote.description && (
            <Text style={[styles.voteDescription, { color: colors.mutedForeground }]}>
              {vote.description}
            </Text>
          )}
          <View style={styles.creatorRow}>
            <Feather name="user" size={14} color={colors.mutedForeground} />
            <Text style={[styles.creatorText, { color: colors.mutedForeground }]}>
              Created by {vote.createdBy.name}
            </Text>
          </View>
        </Card>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <Card style={[styles.statCard, { backgroundColor: colors.primary + "10" }]}>
            <Feather name="users" size={24} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {stats.uniqueVoters}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Total Voters
            </Text>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: colors.success + "10" }]}>
            <Feather name="message-square" size={24} color={colors.success} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {stats.totalResponses}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Total Votes
            </Text>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: colors.info + "10" }]}>
            <Feather name="percent" size={24} color={colors.info} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {Math.round(stats.participationRate)}%
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Participation
            </Text>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: colors.warning + "10" }]}>
            <Feather
              name={stats.isActive ? "clock" : "check-circle"}
              size={24}
              color={stats.isActive ? colors.warning : colors.success}
            />
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {stats.isActive ? "Active" : "Ended"}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Status
            </Text>
          </Card>
        </View>

        {/* Date Info */}
        <Card style={styles.dateCard}>
          <View style={styles.dateRow}>
            <Feather name="calendar" size={16} color={colors.mutedForeground} />
            <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>
              Start:
            </Text>
            <Text style={[styles.dateValue, { color: colors.foreground }]}>
              {formatDate(stats.startDate)}
            </Text>
          </View>
          <View style={styles.dateRow}>
            <Feather name="clock" size={16} color={colors.mutedForeground} />
            <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>
              End:
            </Text>
            <Text style={[styles.dateValue, { color: colors.foreground }]}>
              {formatDate(stats.endDate)}
            </Text>
          </View>
        </Card>

        {/* Results Chart */}
        <Card style={styles.resultsCard}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Voting Results
          </Text>

          {winningOptions.length > 0 && maxVotes > 0 && (
            <View
              style={[
                styles.winnerBanner,
                { backgroundColor: colors.success + "15" },
              ]}
            >
              <Feather name="award" size={24} color={colors.success} />
              <View style={styles.winnerTextContainer}>
                <Text style={[styles.winnerLabel, { color: colors.success }]}>
                  {winningOptions.length === 1 ? "Leading Option" : "Tied for Lead"}
                </Text>
                <Text style={[styles.winnerText, { color: colors.foreground }]}>
                  {winningOptions.map((o) => o.text).join(" & ")}
                </Text>
                <Text style={[styles.winnerVotes, { color: colors.mutedForeground }]}>
                  {maxVotes} {maxVotes === 1 ? "vote" : "votes"} (
                  {Math.round((maxVotes / totalVotes) * 100) || 0}%)
                </Text>
              </View>
            </View>
          )}

          <View style={styles.optionsList}>
            {vote.options.map((option, index) => {
              const percentage = option.percentage || 0;
              const isWinner = winningOptions.some((o) => o.id === option.id) && maxVotes > 0;

              return (
                <View key={option.id} style={styles.optionItem}>
                  <View style={styles.optionHeader}>
                    <Text
                      style={[
                        styles.optionText,
                        { color: colors.foreground },
                        isWinner && { fontWeight: "700" },
                      ]}
                    >
                      {index + 1}. {option.text}
                      {isWinner && " 🏆"}
                    </Text>
                    <View style={styles.optionStats}>
                      <Text style={[styles.voteCount, { color: colors.mutedForeground }]}>
                        {option._count.responses} votes
                      </Text>
                      <Text style={[styles.percentage, { color: colors.foreground }]}>
                        {percentage}%
                      </Text>
                    </View>
                  </View>

                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width: `${percentage}%`,
                          backgroundColor: isWinner ? colors.success : colors.primary,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Voters List */}
        <Card style={styles.votersCard}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Voter Details
          </Text>
          {vote.options.map((option) => (
            <View key={option.id} style={styles.voterSection}>
              <Text style={[styles.voterSectionTitle, { color: colors.foreground }]}>
                {option.text} ({option._count.responses} votes)
              </Text>
              {option.responses.length > 0 ? (
                option.responses.map((response) => (
                  <View
                    key={response.id}
                    style={styles.voterItem}
                  >
                    <View style={styles.voterInfo}>
                      <Text style={[styles.voterName, { color: colors.foreground }]}>
                        {response.user.name}
                      </Text>
                      <Text
                        style={[styles.voterEmail, { color: colors.mutedForeground }]}
                      >
                        {response.user.email}
                      </Text>
                    </View>
                    <Text style={[styles.voteTime, { color: colors.mutedForeground }]}>
                      {new Date(response.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                ))
              ) : (
                <Text
                  style={[styles.noVotersText, { color: colors.mutedForeground }]}
                >
                  No votes yet
                </Text>
              )}
            </View>
          ))}
        </Card>
      </ScrollView>
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
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  titleCard: {
    padding: 16,
    marginBottom: 16,
  },
  voteTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  voteDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  creatorText: {
    fontSize: 13,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    padding: 16,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 13,
    marginTop: 4,
  },
  dateCard: {
    padding: 16,
    marginBottom: 16,
    gap: 10,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateLabel: {
    fontSize: 13,
    width: 50,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  resultsCard: {
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  winnerBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    gap: 12,
  },
  winnerTextContainer: {
    flex: 1,
  },
  winnerLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  winnerText: {
    fontSize: 16,
    fontWeight: "600",
  },
  winnerVotes: {
    fontSize: 13,
    marginTop: 2,
  },
  optionsList: {
    gap: 16,
  },
  optionItem: {
    gap: 8,
  },
  optionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  optionText: {
    fontSize: 15,
    flex: 1,
    marginRight: 8,
  },
  optionStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  voteCount: {
    fontSize: 13,
  },
  percentage: {
    fontSize: 15,
    fontWeight: "600",
    minWidth: 40,
    textAlign: "right",
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  votersCard: {
    padding: 16,
    marginBottom: 16,
  },
  voterSection: {
    marginBottom: 20,
  },
  voterSectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  voterItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  voterInfo: {
    flex: 1,
  },
  voterName: {
    fontSize: 14,
    fontWeight: "500",
  },
  voterEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  voteTime: {
    fontSize: 12,
  },
  noVotersText: {
    fontSize: 13,
    fontStyle: "italic",
    paddingVertical: 8,
  },
});
