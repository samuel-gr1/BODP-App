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
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApi } from "@/hooks/useApi";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";

interface Submission {
  id: string;
  version: number;
  status: string;
  submittedAt?: string;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
}

const SECTION_NAMES = [
  "GENERAL_INFO",
  "PERSONAL_INFO",
  "BUSINESS_ACTIVITIES",
  "FINANCIAL_INFORMATION",
  "PROPRIETY_TEST",
];

const SECTION_LABELS: Record<string, string> = {
  GENERAL_INFO: "General Information",
  PERSONAL_INFO: "Personal Information",
  BUSINESS_ACTIVITIES: "Business Activities",
  FINANCIAL_INFORMATION: "Financial Information",
  PROPRIETY_TEST: "Propriety Test",
};

const SECTION_ROUTES: Record<string, string> = {
  GENERAL_INFO: "/forms/general-info",
  PERSONAL_INFO: "/forms/personal-info",
  BUSINESS_ACTIVITIES: "/forms/business-activities",
  FINANCIAL_INFORMATION: "/forms/financial-info",
  PROPRIETY_TEST: "/forms/propriety-test",
};

export default function FormsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { request } = useApi();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["submissions"],
    queryFn: () => request<{ submissions: Submission[] }>("/form-submissions"),
    retry: 1,
  });

  const submissions = data?.submissions ?? [];

  const createMutation = useMutation({
    mutationFn: () => request<{ submission: Submission }>("/form-submissions", {
      method: "POST",
      body: JSON.stringify({ action: "create_new" }),
    }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["submissions"] });
      setSelectedSubmission(data.submission.id);
    },
  });

  const submitMutation = useMutation({
    mutationFn: (submissionId: string) =>
      request("/form-submissions/submit", {
        method: "POST",
        body: JSON.stringify({ submissionId }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["submissions"] });
      Alert.alert("Success", "Your Fit & Proper assessment has been submitted for review.");
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message || "Failed to submit. Please ensure all sections are complete.");
    },
  });

  const paddingTop = Platform.OS === "web" ? 67 + 16 : insets.top + 16;
  const paddingBottom = Platform.OS === "web" ? 34 + 84 : 84;

  const handleSectionPress = (sectionName: string, submissionId: string) => {
    setSelectedSubmission(submissionId);
    router.push(SECTION_ROUTES[sectionName] as any);
  };

  const handleSubmit = (submissionId: string) => {
    Alert.alert(
      "Submit Assessment",
      "Are you sure you want to submit your Fit & Proper assessment? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit",
          style: "default",
          onPress: () => submitMutation.mutate(submissionId),
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Submission }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={[styles.versionText, { color: colors.foreground }]}>
            Version {item.version}
          </Text>
          <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
            {new Date(item.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Text>
        </View>
        <View style={styles.badgeGroup}>
          <StatusBadge status={item.status} />
          {item.isActive && (
            <View style={[styles.activeDot, { backgroundColor: colors.success }]} />
          )}
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
        Form Sections - Tap to Edit
      </Text>
      <View style={styles.sections}>
        {SECTION_NAMES.map((sn, i: number) => (
          <Pressable
            key={sn}
            onPress={() => item.status === "DRAFT" && handleSectionPress(sn, item.id)}
            disabled={item.status !== "DRAFT"}
          >
            <View style={[styles.sectionRow, { borderBottomColor: colors.border, borderBottomWidth: i < SECTION_NAMES.length - 1 ? 1 : 0, opacity: item.status === "DRAFT" ? 1 : 0.6 }]}>
              <View style={[styles.sectionNumber, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.sectionNumberText, { color: colors.mutedForeground }]}>{i + 1}</Text>
              </View>
              <Text style={[styles.sectionName, { color: colors.foreground }]}>
                {SECTION_LABELS[sn]}
              </Text>
              {item.status === "DRAFT" && <Feather name="chevron-right" size={14} color={colors.mutedForeground} />}
            </View>
          </Pressable>
        ))}
      </View>

      {item.submittedAt && (
        <View style={[styles.submittedRow, { backgroundColor: colors.successLight }]}>
          <Feather name="check-circle" size={13} color={colors.success} />
          <Text style={[styles.submittedText, { color: colors.success }]}>
            Submitted {new Date(item.submittedAt).toLocaleDateString()}
          </Text>
        </View>
      )}

      {item.status === "DRAFT" && (
        <View style={styles.actions}>
          <Button 
            variant="primary" 
            size="sm" 
            onPress={() => handleSubmit(item.id)} 
            loading={submitMutation.isPending}
            fullWidth
          >
            Submit for Approval
          </Button>
        </View>
      )}
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop, backgroundColor: colors.primary }]}>
        <Text style={styles.screenTitle}>Fit & Proper</Text>
        <Text style={styles.screenSubtitle}>Form Submissions</Text>
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
            <View style={styles.listHeader}>
              <Card style={[styles.infoCard, { backgroundColor: colors.accent, borderColor: "transparent" }]} padding={14}>
                <View style={styles.infoRow}>
                  <Feather name="info" size={16} color={colors.primary} />
                  <Text style={[styles.infoText, { color: colors.primary }]}>
                    Complete all 5 sections to submit your Fit & Proper assessment.
                  </Text>
                </View>
              </Card>
              {(submissions.length === 0 || submissions.every(s => s.status !== "DRAFT")) && (
                <Button
                  variant="primary"
                  size="md"
                  onPress={() => createMutation.mutate()}
                  loading={createMutation.isPending}
                  fullWidth
                  style={{ marginTop: 12 }}
                >
                  Start New Submission
                </Button>
              )}
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              icon="file-text"
              title="No submissions yet"
              subtitle="Start your Fit & Proper assessment to submit your information for approval."
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
  listHeader: { marginBottom: 16 },
  infoCard: {},
  infoRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  infoText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
  card: { marginBottom: 16 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  versionText: { fontSize: 16, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  dateText: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  badgeGroup: { flexDirection: "row", alignItems: "center", gap: 8 },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  divider: { height: 1, marginVertical: 12 },
  sectionTitle: { fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  sections: {},
  sectionRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 10 },
  sectionNumber: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sectionNumberText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  sectionName: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  submittedRow: { flexDirection: "row", alignItems: "center", gap: 6, padding: 10, borderRadius: 8, marginTop: 12 },
  submittedText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  actions: { marginTop: 12 },
});
