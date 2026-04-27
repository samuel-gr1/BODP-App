import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApi } from "@/hooks/useApi";
import { useColors } from "@/hooks/useColors";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface Answer {
  questionId: string;
  question: string;
  type: string;
  answer: string;
  textAnswer?: string;
  files?: string[];
}

interface Section {
  name: string;
  title: string;
  answers: Answer[];
}

interface Submission {
  id: string;
  userId: string;
  user: { id: string; name: string; email: string; role: string; department?: string };
  version: number;
  status: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewComments?: string;
  sections: Section[];
}

export default function SubmissionReviewScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { request } = useApi();
  const qc = useQueryClient();
  const { submissionId } = useLocalSearchParams<{ submissionId: string }>();
  const [activeTab, setActiveTab] = useState<"overview" | "sections">("overview");
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [reviewComments, setReviewComments] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["submission-review", submissionId],
    queryFn: () => request<{ submission: Submission }>(`/approver/review?submissionId=${submissionId}`),
    enabled: !!submissionId,
    retry: 1,
  });

  const submission = data?.submission;

  const reviewMutation = useMutation({
    mutationFn: (action: "APPROVE" | "REJECT" | "REQUEST_CHANGES") =>
      request("/approver/review", {
        method: "POST",
        body: JSON.stringify({
          submissionId,
          action,
          comments: reviewComments,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approver-submissions"] });
      qc.invalidateQueries({ queryKey: ["submission-review", submissionId] });
      Alert.alert("Success", "Review submitted successfully");
      router.back();
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message || "Failed to submit review");
    },
  });

  const paddingTop = Platform.OS === "web" ? 67 + 16 : insets.top + 16;
  const paddingBottom = Platform.OS === "web" ? 34 + 84 : 84;

  const handleReview = (action: "APPROVE" | "REJECT" | "REQUEST_CHANGES") => {
    const actionText = action === "APPROVE" ? "approve" : action === "REJECT" ? "reject" : "request changes for";
    Alert.alert(
      action === "APPROVE" ? "Approve Submission" : action === "REJECT" ? "Reject Submission" : "Request Changes",
      `Are you sure you want to ${actionText} this submission?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: action === "APPROVE" ? "Approve" : action === "REJECT" ? "Reject" : "Request Changes",
          style: action === "REJECT" ? "destructive" : "default",
          onPress: () => reviewMutation.mutate(action),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.topBar, { paddingTop, backgroundColor: colors.primary }]}>
          <Text style={styles.screenTitle}>Review Submission</Text>
        </View>
        <LoadingSpinner />
      </View>
    );
  }

  if (!submission) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.topBar, { paddingTop, backgroundColor: colors.primary }]}>
          <Text style={styles.screenTitle}>Review Submission</Text>
        </View>
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.foreground }]}>Submission not found</Text>
        </View>
      </View>
    );
  }

  const canReview = submission.status === "SUBMITTED" || submission.status === "UNDER_REVIEW";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop, backgroundColor: colors.primary }]}>
        <Text style={styles.screenTitle}>Review Submission</Text>
        <Text style={styles.screenSubtitle}>v{submission.version} by {submission.user.name}</Text>
      </View>

      <View style={styles.tabBar}>
        <Button
          variant={activeTab === "overview" ? "primary" : "outline"}
          size="sm"
          onPress={() => setActiveTab("overview")}
          style={{ flex: 1 }}
        >
          Overview
        </Button>
        <Button
          variant={activeTab === "sections" ? "primary" : "outline"}
          size="sm"
          onPress={() => setActiveTab("sections")}
          style={{ flex: 1 }}
        >
          Form Sections
        </Button>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ padding: 16, paddingBottom }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        {activeTab === "overview" ? (
          <View style={styles.overviewTab}>
            {/* User Info Card */}
            <Card style={styles.userCard}>
              <View style={styles.userHeader}>
                <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                  <Text style={styles.avatarText}>
                    {submission.user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: colors.foreground }]}>{submission.user.name}</Text>
                  <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>{submission.user.email}</Text>
                  {submission.user.department && (
                    <Text style={[styles.userDept, { color: colors.mutedForeground }]}>
                      {submission.user.department}
                    </Text>
                  )}
                </View>
              </View>
            </Card>

            {/* Status Card */}
            <Card style={styles.statusCard}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Submission Status</Text>
              <View style={[styles.statusBadge, { 
                backgroundColor: 
                  submission.status === "APPROVED" ? colors.successLight : 
                  submission.status === "REJECTED" ? colors.errorLight :
                  submission.status === "CHANGES_REQUESTED" ? colors.warningLight :
                  colors.accent
              }]}>
                <Text style={[styles.statusText, { 
                  color: 
                    submission.status === "APPROVED" ? colors.success : 
                    submission.status === "REJECTED" ? colors.destructive :
                    submission.status === "CHANGES_REQUESTED" ? colors.warning :
                    colors.primary
                }]}>
                  {submission.status}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Feather name="calendar" size={14} color={colors.mutedForeground} />
                <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
                  Submitted {new Date(submission.submittedAt).toLocaleDateString()}
                </Text>
              </View>
              {submission.reviewedAt && (
                <View style={styles.detailRow}>
                  <Feather name="check-circle" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
                    Reviewed {new Date(submission.reviewedAt).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </Card>

            {/* Section Summary */}
            <Card style={styles.summaryCard}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Section Summary</Text>
              {submission.sections.map((section: Section, index: number) => (
                <View key={section.name} style={styles.summaryRow}>
                  <View style={[styles.sectionNumber, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.sectionNumberText, { color: colors.mutedForeground }]}>{index + 1}</Text>
                  </View>
                  <Text style={[styles.summaryText, { color: colors.foreground, flex: 1 }]}>{section.title}</Text>
                  <Feather name="check-circle" size={16} color={colors.success} />
                </View>
              ))}
            </Card>

            {/* Review Actions */}
            {canReview && (
              <Card style={styles.reviewCard}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Review Decision</Text>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Comments (optional)</Text>
                <TextInput
                  style={[styles.commentsInput, { 
                    borderColor: colors.border, 
                    color: colors.foreground,
                    backgroundColor: colors.background 
                  }]}
                  placeholder="Add your review comments here..."
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  numberOfLines={4}
                  value={reviewComments}
                  onChangeText={setReviewComments}
                />
                <View style={styles.actionButtons}>
                  <Button
                    variant="outline"
                    size="md"
                    onPress={() => handleReview("REQUEST_CHANGES")}
                    loading={reviewMutation.isPending}
                    style={{ flex: 1 }}
                  >
                    Request Changes
                  </Button>
                  <Button
                    variant="destructive"
                    size="md"
                    onPress={() => handleReview("REJECT")}
                    loading={reviewMutation.isPending}
                    style={{ flex: 1 }}
                  >
                    Reject
                  </Button>
                </View>
                <Button
                  variant="primary"
                  size="md"
                  onPress={() => handleReview("APPROVE")}
                  loading={reviewMutation.isPending}
                  style={{ marginTop: 12 }}
                >
                  Approve Submission
                </Button>
              </Card>
            )}

            {submission.reviewComments && (
              <Card style={styles.reviewCommentsCard}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Previous Review Comments</Text>
                <Text style={[styles.reviewCommentText, { color: colors.mutedForeground }]}>
                  {submission.reviewComments}
                </Text>
              </Card>
            )}
          </View>
        ) : (
          <View style={styles.sectionsTab}>
            {/* Section Selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sectionSelector}>
              {submission.sections.map((section: Section, index: number) => (
                <Pressable
                  key={section.name}
                  onPress={() => setSelectedSection(selectedSection === section.name ? null : section.name)}
                  style={[
                    styles.sectionChip,
                    { 
                      backgroundColor: selectedSection === section.name ? colors.primary : colors.secondary,
                      borderColor: colors.border 
                    }
                  ]}
                >
                  <Text style={[
                    styles.sectionChipText, 
                    { color: selectedSection === section.name ? "#fff" : colors.foreground }
                  ]}>
                    {index + 1}. {section.title}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Section Content */}
            {(selectedSection ? submission.sections.filter(s => s.name === selectedSection) : submission.sections).map((section: Section) => (
              <Card key={section.name} style={styles.sectionCard}>
                <Text style={[styles.sectionCardTitle, { color: colors.foreground }]}>{section.title}</Text>
                {section.answers.map((answer, idx) => (
                  <View key={answer.questionId} style={[styles.answerRow, { borderBottomColor: colors.border, borderBottomWidth: idx < section.answers.length - 1 ? 1 : 0 }]}>
                    <Text style={[styles.questionText, { color: colors.mutedForeground }]}>
                      {answer.question}
                    </Text>
                    <Text style={[styles.answerText, { color: colors.foreground }]}>
                      {answer.textAnswer || answer.answer || "Not answered"}
                    </Text>
                  </View>
                ))}
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingHorizontal: 20, paddingBottom: 16 },
  screenTitle: { color: "#fff", fontSize: 24, fontFamily: "Inter_700Bold", fontWeight: "700" },
  screenSubtitle: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  tabBar: { flexDirection: "row", padding: 16, gap: 10 },
  content: { flex: 1 },
  errorContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 16, fontFamily: "Inter_500Medium" },
  overviewTab: { gap: 16 },
  userCard: {},
  userHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 20, fontFamily: "Inter_600SemiBold" },
  userInfo: { flex: 1 },
  userName: { fontSize: 18, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  userEmail: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 2 },
  userDept: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  statusCard: {},
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", fontWeight: "600", marginBottom: 12 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, alignSelf: "flex-start", marginBottom: 12 },
  statusText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  detailText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  summaryCard: {},
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  sectionNumber: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  sectionNumberText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  summaryText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  reviewCard: {},
  label: { fontSize: 14, fontFamily: "Inter_500Medium", marginBottom: 8 },
  commentsInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  actionButtons: { flexDirection: "row", gap: 10 },
  reviewCommentsCard: {},
  reviewCommentText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  sectionsTab: { gap: 16 },
  sectionSelector: { flexDirection: "row", marginBottom: 8 },
  sectionChip: { 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 20, 
    marginRight: 8,
    borderWidth: 1,
  },
  sectionChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  sectionCard: {},
  sectionCardTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", fontWeight: "600", marginBottom: 12 },
  answerRow: { paddingVertical: 12 },
  questionText: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 4 },
  answerText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
