import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams, Stack } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";

interface AgendaItem {
  id: string;
  title: string;
  description?: string;
  presenter?: string;
  duration?: number;
  notes?: string;
  orderIndex: number;
  isCompleted: boolean;
}

interface Participant {
  id: string;
  userId: string;
  meetingRole?: string;
  attended?: boolean;
  user: { id: string; name: string; email: string };
}

interface Resolution {
  id: string;
  title: string;
  description: string;
  status: string;
  votes: { vote: string; voter: { name: string } }[];
}

interface MeetingDetail {
  id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  location?: string;
  status: string;
  minuteNumber?: string;
  quorumDeclaration?: string;
  startTime?: string;
  endTime?: string;
  category?: { name: string };
  creator?: { name: string };
  participants: Participant[];
  agendaItems: AgendaItem[];
  resolutions: Resolution[];
  _count?: { agendaItems: number; participants: number };
}

export default function MeetingDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { request } = useApi();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"info" | "agenda" | "participants" | "resolutions">("info");
  const [comment, setComment] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["meeting", id],
    queryFn: () => request<{ meeting: MeetingDetail }>(`/meetings/${id}`),
    retry: 1,
  });

  const meeting = data?.meeting;

  const voteMutation = useMutation({
    mutationFn: ({ resolutionId, vote }: { resolutionId: string; vote: string }) =>
      request(`/meetings/${id}/resolutions/${resolutionId}/vote`, {
        method: "POST",
        body: JSON.stringify({ vote }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meeting", id] }),
  });

  const paddingBottom = Platform.OS === "web" ? 34 : 0;

  if (isLoading) return <LoadingSpinner />;
  if (!meeting) return null;

  const completedAgenda = meeting.agendaItems.filter((a) => a.isCompleted).length;

  const TABS = [
    { key: "info", label: "Info" },
    { key: "agenda", label: `Agenda (${meeting.agendaItems.length})` },
    { key: "participants", label: `People (${meeting.participants.length})` },
    { key: "resolutions", label: `Votes (${meeting.resolutions?.length ?? 0})` },
  ] as const;

  return (
    <>
      <Stack.Screen
        options={{
          title: meeting.title,
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: "#fff",
          headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: "#fff" },
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.meetingBanner, { backgroundColor: colors.primary }]}>
          <StatusBadge status={meeting.status} />
          <View style={styles.bannerMeta}>
            <View style={styles.bannerMetaItem}>
              <Feather name="calendar" size={13} color="rgba(255,255,255,0.75)" />
              <Text style={styles.bannerMetaText}>
                {new Date(meeting.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
              </Text>
            </View>
            {meeting.time && (
              <View style={styles.bannerMetaItem}>
                <Feather name="clock" size={13} color="rgba(255,255,255,0.75)" />
                <Text style={styles.bannerMetaText}>{meeting.time}</Text>
              </View>
            )}
            {meeting.location && (
              <View style={styles.bannerMetaItem}>
                <Feather name="map-pin" size={13} color="rgba(255,255,255,0.75)" />
                <Text style={styles.bannerMetaText}>{meeting.location}</Text>
              </View>
            )}
          </View>
          {meeting.agendaItems.length > 0 && (
            <View style={styles.progressWrap}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: colors.success,
                      width: `${(completedAgenda / meeting.agendaItems.length) * 100}%` as any,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {completedAgenda}/{meeting.agendaItems.length} agenda items completed
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.tabsBar, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
            {TABS.map((tab) => (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key as typeof activeTab)}
                style={[
                  styles.tab,
                  activeTab === tab.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: activeTab === tab.key ? colors.primary : colors.mutedForeground },
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: paddingBottom + 24 }}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === "info" && (
            <View style={{ gap: 16 }}>
              {meeting.description && (
                <Card>
                  <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>DESCRIPTION</Text>
                  <Text style={[styles.cardBody, { color: colors.foreground }]}>{meeting.description}</Text>
                </Card>
              )}
              <Card>
                <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>DETAILS</Text>
                {meeting.minuteNumber && <DetailRow label="Minute Number" value={meeting.minuteNumber} />}
                {meeting.category && <DetailRow label="Committee/Board" value={meeting.category.name} />}
                {meeting.creator && <DetailRow label="Created By" value={meeting.creator.name} />}
                {meeting.startTime && <DetailRow label="Start Time" value={meeting.startTime} />}
                {meeting.endTime && <DetailRow label="End Time" value={meeting.endTime} />}
              </Card>
              {meeting.quorumDeclaration && (
                <Card>
                  <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>QUORUM</Text>
                  <Text style={[styles.cardBody, { color: colors.foreground }]}>{meeting.quorumDeclaration}</Text>
                </Card>
              )}
            </View>
          )}

          {activeTab === "agenda" && (
            <View style={{ gap: 10 }}>
              {meeting.agendaItems.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No agenda items</Text>
              ) : (
                meeting.agendaItems
                  .sort((a, b) => a.orderIndex - b.orderIndex)
                  .map((item, idx) => (
                    <Card key={item.id} style={[styles.agendaCard, item.isCompleted && { opacity: 0.7 }]}>
                      <View style={styles.agendaRow}>
                        <View style={[styles.agendaIndex, { backgroundColor: item.isCompleted ? colors.success : colors.secondary }]}>
                          {item.isCompleted ? (
                            <Feather name="check" size={12} color="#fff" />
                          ) : (
                            <Text style={[styles.agendaIndexText, { color: colors.mutedForeground }]}>{idx + 1}</Text>
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.agendaTitle, { color: colors.foreground }]}>{item.title}</Text>
                          {item.presenter && (
                            <Text style={[styles.agendaMeta, { color: colors.mutedForeground }]}>
                              Presenter: {item.presenter}
                            </Text>
                          )}
                          {item.duration && (
                            <Text style={[styles.agendaMeta, { color: colors.mutedForeground }]}>
                              {item.duration} min
                            </Text>
                          )}
                        </View>
                      </View>
                      {item.notes && (
                        <Text style={[styles.agendaNotes, { color: colors.mutedForeground }]}>{item.notes}</Text>
                      )}
                    </Card>
                  ))
              )}
            </View>
          )}

          {activeTab === "participants" && (
            <View style={{ gap: 8 }}>
              {meeting.participants.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No participants</Text>
              ) : (
                meeting.participants.map((p) => (
                  <Card key={p.id} padding={12}>
                    <View style={styles.participantRow}>
                      <View style={[styles.pAvatar, { backgroundColor: colors.accent }]}>
                        <Text style={[styles.pAvatarText, { color: colors.primary }]}>
                          {p.user.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.pName, { color: colors.foreground }]}>{p.user.name}</Text>
                        {p.meetingRole && (
                          <Text style={[styles.pRole, { color: colors.mutedForeground }]}>{p.meetingRole}</Text>
                        )}
                      </View>
                      {p.attended !== undefined && (
                        <View style={[styles.attendanceBadge, { backgroundColor: p.attended ? colors.successLight : colors.errorLight }]}>
                          <Text style={{ color: p.attended ? colors.success : colors.destructive, fontSize: 11, fontFamily: "Inter_500Medium" }}>
                            {p.attended ? "Present" : "Absent"}
                          </Text>
                        </View>
                      )}
                    </View>
                  </Card>
                ))
              )}
            </View>
          )}

          {activeTab === "resolutions" && (
            <View style={{ gap: 12 }}>
              {(meeting.resolutions?.length ?? 0) === 0 ? (
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No resolutions</Text>
              ) : (
                meeting.resolutions.map((res) => {
                  const yes = res.votes.filter((v) => v.vote === "YES").length;
                  const no = res.votes.filter((v) => v.vote === "NO").length;
                  const abstain = res.votes.filter((v) => v.vote === "ABSTAIN").length;
                  const total = yes + no + abstain;
                  return (
                    <Card key={res.id}>
                      <View style={styles.resHeader}>
                        <Text style={[styles.resTitle, { color: colors.foreground }]}>{res.title}</Text>
                        <StatusBadge status={res.status} size="sm" />
                      </View>
                      <Text style={[styles.resDesc, { color: colors.mutedForeground }]}>{res.description}</Text>
                      {total > 0 && (
                        <View style={styles.votesWrap}>
                          <View style={styles.voteBar}>
                            <View style={[styles.voteSegment, { backgroundColor: colors.voteYes, flex: yes || 0 }]} />
                            <View style={[styles.voteSegment, { backgroundColor: colors.voteNo, flex: no || 0 }]} />
                            <View style={[styles.voteSegment, { backgroundColor: colors.voteAbstain, flex: abstain || 0 }]} />
                          </View>
                          <View style={styles.voteCounts}>
                            <Text style={[styles.voteCount, { color: colors.voteYes }]}>YES {yes}</Text>
                            <Text style={[styles.voteCount, { color: colors.voteNo }]}>NO {no}</Text>
                            <Text style={[styles.voteCount, { color: colors.voteAbstain }]}>ABSTAIN {abstain}</Text>
                          </View>
                        </View>
                      )}
                      {res.status === "PROPOSED" && (
                        <View style={styles.voteActions}>
                          {(["YES", "NO", "ABSTAIN"] as const).map((v) => (
                            <Button
                              key={v}
                              variant={v === "YES" ? "primary" : v === "NO" ? "destructive" : "outline"}
                              size="sm"
                              onPress={() => voteMutation.mutate({ resolutionId: res.id, vote: v })}
                              loading={voteMutation.isPending}
                            >
                              {v}
                            </Button>
                          ))}
                        </View>
                      )}
                    </Card>
                  );
                })
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  meetingBanner: { padding: 16, paddingTop: 12, gap: 10 },
  bannerMeta: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  bannerMetaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  bannerMetaText: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontFamily: "Inter_400Regular" },
  progressWrap: { gap: 4 },
  progressBar: { height: 4, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 4, borderRadius: 2 },
  progressText: { color: "rgba(255,255,255,0.75)", fontSize: 11, fontFamily: "Inter_400Regular" },
  tabsBar: { borderBottomWidth: 1 },
  tabsRow: { paddingHorizontal: 8, gap: 4 },
  tab: { paddingHorizontal: 12, paddingVertical: 12 },
  tabText: { fontSize: 13, fontFamily: "Inter_500Medium", fontWeight: "500" },
  cardLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  cardBody: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  detailRow: { flexDirection: "row", paddingVertical: 10, borderBottomWidth: 1, gap: 12 },
  detailLabel: { width: 130, fontSize: 13, fontFamily: "Inter_400Regular" },
  detailValue: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", fontWeight: "500" },
  agendaCard: {},
  agendaRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  agendaIndex: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", marginTop: 1 },
  agendaIndexText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  agendaTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  agendaMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  agendaNotes: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 8, paddingLeft: 36, lineHeight: 18 },
  participantRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  pAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  pAvatarText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  pName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  pRole: { fontSize: 12, fontFamily: "Inter_400Regular" },
  attendanceBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  resHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 },
  resTitle: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  resDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, marginBottom: 12 },
  votesWrap: { gap: 6, marginBottom: 12 },
  voteBar: { height: 6, borderRadius: 3, overflow: "hidden", flexDirection: "row" },
  voteSegment: { height: 6 },
  voteCounts: { flexDirection: "row", gap: 16 },
  voteCount: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  voteActions: { flexDirection: "row", gap: 8 },
  emptyText: { textAlign: "center", fontSize: 14, fontFamily: "Inter_400Regular", paddingVertical: 32 },
});
