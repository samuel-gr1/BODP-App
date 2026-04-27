import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
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

interface VoteOption {
  id: string;
  text: string;
  order: number;
  _count?: {
    responses: number;
  };
}

interface Vote {
  id: string;
  title: string;
  description: string | null;
  status: "DRAFT" | "OPEN" | "CLOSED" | "CANCELLED";
  visibility: "ALL" | "COMMITTEE" | "SELECTED";
  startDate: string;
  endDate: string;
  hasVoted: boolean;
  selectedOptionId: string | null;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  category?: {
    id: string;
    name: string;
  };
  options: VoteOption[];
  _count: {
    responses: number;
  };
}

export default function VoteDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { request } = useApi();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const isAdmin = user?.role === "ADMIN" || user?.role === "SECRETARY";

  const { data, isLoading } = useQuery({
    queryKey: ["vote", id],
    queryFn: () => request<{ vote: Vote }>(`/votes/${id}`),
    retry: 1,
  });

  const voteMutation = useMutation({
    mutationFn: (optionId: string) =>
      request(`/votes/${id}/vote`, {
        method: "POST",
        body: JSON.stringify({ optionId }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vote", id] });
      qc.invalidateQueries({ queryKey: ["votes"] });
      Alert.alert("Success", "Your vote has been recorded!");
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to submit vote");
    },
  });

  const vote = data?.vote;

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!vote) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>Vote not found</Text>
      </View>
    );
  }

  const isActive = () => {
    const now = new Date();
    const start = new Date(vote.startDate);
    const end = new Date(vote.endDate);
    return vote.status === "OPEN" && now >= start && now <= end;
  };

  const handleVote = () => {
    if (!selectedOption) {
      Alert.alert("Error", "Please select an option");
      return;
    }
    voteMutation.mutate(selectedOption);
  };

  const getStatusColor = () => {
    switch (vote.status) {
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const totalVotes = vote.options.reduce(
    (sum, opt) => sum + (opt._count?.responses || 0),
    0
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
          Vote Details
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Status Banner */}
        <View
          style={[
            styles.statusBanner,
            { backgroundColor: getStatusColor() + "20" },
          ]}
        >
          <Feather
            name={vote.status === "OPEN" ? "check-circle" : "info"}
            size={20}
            color={getStatusColor()}
          />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {vote.status === "OPEN" && isActive()
              ? "Voting is Open"
              : vote.status === "CLOSED"
              ? "Voting is Closed"
              : vote.status === "CANCELLED"
              ? "Vote Cancelled"
              : "Vote is Draft"}
          </Text>
        </View>

        {/* Vote Info Card */}
        <Card style={styles.infoCard}>
          <Text style={[styles.voteTitle, { color: colors.foreground }]}>
            {vote.title}
          </Text>
          {vote.description && (
            <Text
              style={[styles.voteDescription, { color: colors.mutedForeground }]}
            >
              {vote.description}
            </Text>
          )}

          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Feather name="calendar" size={16} color={colors.mutedForeground} />
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>
                Start:
              </Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {formatDate(vote.startDate)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Feather name="clock" size={16} color={colors.mutedForeground} />
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>
                End:
              </Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {formatDate(vote.endDate)}
              </Text>
            </View>
            {vote.category && (
              <View style={styles.infoRow}>
                <Feather name="users" size={16} color={colors.mutedForeground} />
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>
                  Committee:
                </Text>
                <Text style={[styles.infoValue, { color: colors.foreground }]}>
                  {vote.category.name}
                </Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Feather name="user" size={16} color={colors.mutedForeground} />
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>
                Created by:
              </Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {vote.createdBy.name}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Feather name="message-square" size={16} color={colors.mutedForeground} />
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>
                Total votes:
              </Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {vote._count.responses}
              </Text>
            </View>
          </View>
        </Card>

        {/* Voting Options */}
        {isActive() && !vote.hasVoted && (
          <Card style={styles.optionsCard}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Cast Your Vote
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
              Select one option below
            </Text>

            <View style={styles.optionsList}>
              {vote.options.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionItem,
                    {
                      borderColor:
                        selectedOption === option.id
                          ? colors.primary
                          : colors.border,
                      backgroundColor:
                        selectedOption === option.id
                          ? colors.primary + "10"
                          : "transparent",
                    },
                  ]}
                  onPress={() => setSelectedOption(option.id)}
                >
                  <View
                    style={[
                      styles.radioCircle,
                      {
                        borderColor:
                          selectedOption === option.id
                            ? colors.primary
                            : colors.border,
                      },
                    ]}
                  >
                    {selectedOption === option.id && (
                      <View
                        style={[
                          styles.radioInner,
                          { backgroundColor: colors.primary },
                        ]}
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.optionText,
                      {
                        color:
                          selectedOption === option.id
                            ? colors.primary
                            : colors.foreground,
                      },
                    ]}
                  >
                    {option.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.voteButton,
                { backgroundColor: colors.primary },
                !selectedOption && { opacity: 0.5 },
              ]}
              onPress={handleVote}
              disabled={!selectedOption || voteMutation.isPending}
            >
              <Text style={styles.voteButtonText}>
                {voteMutation.isPending ? "Submitting..." : "Submit Vote"}
              </Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Already Voted */}
        {vote.hasVoted && (
          <Card style={[styles.optionsCard, { backgroundColor: colors.success + "10" }]}>
            <View style={styles.votedContainer}>
              <Feather name="check-circle" size={48} color={colors.success} />
              <Text style={[styles.votedTitle, { color: colors.success }]}>
                You have voted!
              </Text>
              <Text style={[styles.votedText, { color: colors.mutedForeground }]}>
                Thank you for participating in this vote.
              </Text>
              {vote.selectedOptionId && (
                <View style={styles.selectedOption}>
                  <Text style={[styles.selectedLabel, { color: colors.mutedForeground }]}>
                    You selected:
                  </Text>
                  <Text style={[styles.selectedValue, { color: colors.foreground }]}>
                    {vote.options.find((o) => o.id === vote.selectedOptionId)?.text}
                  </Text>
                </View>
              )}
            </View>
          </Card>
        )}

        {/* Voting Closed */}
        {vote.status === "CLOSED" && (
          <Card style={styles.optionsCard}>
            <View style={styles.closedContainer}>
              <Feather name="lock" size={48} color={colors.mutedForeground} />
              <Text style={[styles.closedTitle, { color: colors.foreground }]}>
                Voting is Closed
              </Text>
              <Text style={[styles.closedText, { color: colors.mutedForeground }]}>
                This vote has ended. Results are being compiled.
              </Text>
            </View>
          </Card>
        )}

        {/* Admin Results Button */}
        {isAdmin && (
          <TouchableOpacity
            style={[styles.resultsButton, { borderColor: colors.primary }]}
            onPress={() =>
              router.push({
                pathname: "/votes/results",
                params: { id: vote.id },
              })
            }
          >
            <Feather name="bar-chart" size={20} color={colors.primary} />
            <Text style={[styles.resultsButtonText, { color: colors.primary }]}>
              View Results
            </Text>
          </TouchableOpacity>
        )}
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
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
  },
  infoCard: {
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
    marginBottom: 16,
  },
  infoSection: {
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoLabel: {
    fontSize: 13,
    width: 80,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  optionsCard: {
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  optionsList: {
    gap: 10,
    marginBottom: 20,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderWidth: 2,
    borderRadius: 8,
    gap: 12,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  optionText: {
    fontSize: 16,
    flex: 1,
  },
  voteButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  voteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  votedContainer: {
    alignItems: "center",
    padding: 20,
  },
  votedTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 8,
  },
  votedText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  selectedOption: {
    alignItems: "center",
  },
  selectedLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  selectedValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  closedContainer: {
    alignItems: "center",
    padding: 20,
  },
  closedTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 8,
  },
  closedText: {
    fontSize: 14,
    textAlign: "center",
  },
  resultsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 2,
    gap: 8,
  },
  resultsButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
