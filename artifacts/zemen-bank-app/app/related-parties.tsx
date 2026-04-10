import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useApi } from "@/hooks/useApi";
import { useColors } from "@/hooks/useColors";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface Declaration {
  id: string;
  infoFullName: string;
  infoTIN: string;
  infoRole: string;
  spouse?: { name: string; accountNumbers: string[] };
  father?: { name: string; accountNumbers: string[] };
  mother?: { name: string; accountNumbers: string[] };
  children?: { name: string; accountNumbers: string[] }[];
  businessAffiliations?: { fullName: string; companyName: string; shareholdingPercentage: number; relationshipType: string }[];
  locked: boolean;
  submittedAt?: string;
}

export default function RelatedPartiesScreen() {
  const colors = useColors();
  const { request } = useApi();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["related-parties"],
    queryFn: () => request<{ ok: boolean; data?: Declaration }>("/related-parties"),
    retry: 1,
  });

  const declaration = data?.data;
  const paddingBottom = Platform.OS === "web" ? 34 : 24;

  return (
    <>
      <Stack.Screen
        options={{
          title: "Related Parties",
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
        ) : !declaration ? (
          <Card>
            <View style={styles.emptyCenter}>
              <Feather name="users" size={32} color={colors.mutedForeground} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Declaration Found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                You haven't submitted a Related Parties Declaration yet.
              </Text>
              <Button variant="primary" size="md" onPress={() => {}} style={{ marginTop: 16 }} fullWidth>
                Submit Declaration
              </Button>
            </View>
          </Card>
        ) : (
          <>
            <Card style={styles.statusCard}>
              <View style={styles.statusRow}>
                <View>
                  <Text style={[styles.statusTitle, { color: colors.foreground }]}>Declaration Status</Text>
                  {declaration.submittedAt && (
                    <Text style={[styles.statusDate, { color: colors.mutedForeground }]}>
                      Submitted {new Date(declaration.submittedAt).toLocaleDateString("en-US", {
                        year: "numeric", month: "long", day: "numeric",
                      })}
                    </Text>
                  )}
                </View>
                <View style={[styles.lockBadge, { backgroundColor: declaration.locked ? colors.warningLight : colors.successLight }]}>
                  <Feather
                    name={declaration.locked ? "lock" : "unlock"}
                    size={14}
                    color={declaration.locked ? colors.warning : colors.success}
                  />
                  <Text style={[styles.lockText, { color: declaration.locked ? colors.warning : colors.success }]}>
                    {declaration.locked ? "Locked" : "Unlocked"}
                  </Text>
                </View>
              </View>
            </Card>

            <Card style={{ marginTop: 12 }}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>YOUR INFORMATION</Text>
              <DeclarationRow label="Full Name" value={declaration.infoFullName} />
              <DeclarationRow label="TIN" value={declaration.infoTIN} />
              <DeclarationRow label="Role" value={declaration.infoRole.toUpperCase()} />
            </Card>

            <Card style={{ marginTop: 12 }}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>FAMILY MEMBERS</Text>
              {declaration.spouse?.name && (
                <DeclarationRow label="Spouse" value={declaration.spouse.name} />
              )}
              {declaration.father?.name && (
                <DeclarationRow label="Father" value={declaration.father.name} />
              )}
              {declaration.mother?.name && (
                <DeclarationRow label="Mother" value={declaration.mother.name} />
              )}
              {(declaration.children?.length ?? 0) > 0 && (
                <DeclarationRow label="Children" value={`${declaration.children!.length} listed`} />
              )}
            </Card>

            {(declaration.businessAffiliations?.length ?? 0) > 0 && (
              <Card style={{ marginTop: 12 }}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>BUSINESS AFFILIATIONS</Text>
                {declaration.businessAffiliations!.map((aff, idx) => (
                  <View key={idx} style={[styles.affRow, { borderBottomColor: colors.border, borderBottomWidth: idx < declaration.businessAffiliations!.length - 1 ? 1 : 0 }]}>
                    <Text style={[styles.affName, { color: colors.foreground }]}>{aff.fullName}</Text>
                    <Text style={[styles.affCompany, { color: colors.mutedForeground }]}>{aff.companyName}</Text>
                    <Text style={[styles.affPct, { color: colors.primary }]}>{aff.shareholdingPercentage}% shareholding</Text>
                  </View>
                ))}
              </Card>
            )}

            {declaration.locked && (
              <View style={[styles.lockedNote, { backgroundColor: colors.warningLight }]}>
                <Feather name="info" size={14} color={colors.warning} />
                <Text style={[styles.lockedNoteText, { color: colors.warning }]}>
                  Your declaration is locked. To make changes, submit an update request for admin approval.
                </Text>
              </View>
            )}

            <Button
              variant="outline"
              size="md"
              onPress={() => {}}
              fullWidth
              style={{ marginTop: 12 }}
            >
              Request Update
            </Button>
          </>
        )}
      </ScrollView>
    </>
  );
}

function DeclarationRow({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={[styles.dRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.dLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.dValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  statusCard: {},
  statusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  statusDate: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  lockBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 },
  lockText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 },
  dRow: { flexDirection: "row", paddingVertical: 10, borderBottomWidth: 1 },
  dLabel: { width: 120, fontSize: 13, fontFamily: "Inter_400Regular" },
  dValue: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  affRow: { paddingVertical: 10 },
  affName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  affCompany: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  affPct: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
  lockedNote: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 8, marginTop: 12 },
  lockedNoteText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  emptyCenter: { alignItems: "center", paddingVertical: 16 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  emptySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
});
