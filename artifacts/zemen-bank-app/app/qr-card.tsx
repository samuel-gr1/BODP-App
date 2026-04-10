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
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";

interface QRCard {
  id: string;
  slug: string;
  data: {
    name?: string;
    title?: string;
    department?: string;
    phone?: string;
    email?: string;
  };
  template?: { name: string; key: string };
}

export default function QRCardScreen() {
  const colors = useColors();
  const { request } = useApi();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: user?.name ?? "",
    title: "",
    department: "",
    phone: "",
    email: user?.email ?? "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["qr-cards"],
    queryFn: () => request<{ cards: QRCard[] }>("/qr/cards"),
    retry: 1,
  });

  const { data: templatesData } = useQuery({
    queryKey: ["qr-templates"],
    queryFn: () => request<{ templates: { id: string; name: string; key: string }[] }>("/qr/templates"),
    retry: 1,
  });

  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  const createMutation = useMutation({
    mutationFn: () =>
      request("/qr/cards", {
        method: "POST",
        body: JSON.stringify({ templateId: selectedTemplate || templatesData?.templates?.[0]?.id, data: form }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["qr-cards"] });
      setShowCreate(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (cardId: string) =>
      request(`/qr/cards/${cardId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qr-cards"] }),
  });

  const cards = data?.cards ?? [];
  const paddingBottom = Platform.OS === "web" ? 34 : 24;

  return (
    <>
      <Stack.Screen
        options={{
          title: "QR Business Card",
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
        <Card style={[styles.infoCard, { backgroundColor: colors.accent, borderColor: "transparent" }]} padding={14}>
          <View style={styles.infoRow}>
            <Feather name="credit-card" size={18} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.primary }]}>
              Create digital business cards to share your contact information via QR code.
            </Text>
          </View>
        </Card>

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <>
            {cards.map((card) => (
              <Card key={card.id} style={styles.cardItem}>
                <View style={styles.qrPreview}>
                  <View style={[styles.qrPlaceholder, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                    <Feather name="grid" size={40} color={colors.mutedForeground} />
                    <Text style={[styles.qrLabel, { color: colors.mutedForeground }]}>QR Code</Text>
                  </View>
                  <View style={styles.cardDetails}>
                    <Text style={[styles.cardName, { color: colors.foreground }]}>
                      {card.data.name ?? user?.name}
                    </Text>
                    {card.data.title && (
                      <Text style={[styles.cardTitle, { color: colors.primary }]}>{card.data.title}</Text>
                    )}
                    {card.data.department && (
                      <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>{card.data.department}</Text>
                    )}
                    {card.data.email && (
                      <View style={styles.contactRow}>
                        <Feather name="mail" size={11} color={colors.mutedForeground} />
                        <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>{card.data.email}</Text>
                      </View>
                    )}
                    {card.data.phone && (
                      <View style={styles.contactRow}>
                        <Feather name="phone" size={11} color={colors.mutedForeground} />
                        <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>{card.data.phone}</Text>
                      </View>
                    )}
                    {card.template && (
                      <Text style={[styles.templateTag, { color: colors.gold, backgroundColor: colors.goldLight }]}>
                        {card.template.name}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.cardActions}>
                  <Button variant="outline" size="sm" onPress={() => {}}>
                    Share
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => deleteMutation.mutate(card.id)}
                    loading={deleteMutation.isPending}
                  >
                    Delete
                  </Button>
                </View>
              </Card>
            ))}

            {cards.length === 0 && !showCreate && (
              <EmptyState
                icon="credit-card"
                title="No business cards"
                subtitle="Create your first digital business card to share your information"
              />
            )}

            {!showCreate && (
              <Button
                variant="primary"
                size="md"
                onPress={() => setShowCreate(true)}
                fullWidth
                style={{ marginTop: 8 }}
              >
                Create New Card
              </Button>
            )}

            {showCreate && (
              <Card style={{ marginTop: 12 }}>
                <Text style={[styles.formTitle, { color: colors.foreground }]}>New Business Card</Text>

                {[
                  { key: "name", label: "Full Name", placeholder: "Your full name" },
                  { key: "title", label: "Title/Position", placeholder: "e.g. Board Member" },
                  { key: "department", label: "Department", placeholder: "e.g. Governance" },
                  { key: "phone", label: "Phone Number", placeholder: "+251..." },
                  { key: "email", label: "Email", placeholder: "you@zemenbank.com" },
                ].map(({ key, label, placeholder }) => (
                  <View key={key} style={styles.formField}>
                    <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text>
                    <TextInput
                      style={[styles.fieldInput, { borderColor: colors.border, backgroundColor: colors.secondary, color: colors.foreground }]}
                      placeholder={placeholder}
                      placeholderTextColor={colors.mutedForeground}
                      value={(form as Record<string, string>)[key]}
                      onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                    />
                  </View>
                ))}

                <View style={styles.formActions}>
                  <Button variant="outline" size="sm" onPress={() => setShowCreate(false)}>Cancel</Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onPress={() => createMutation.mutate()}
                    loading={createMutation.isPending}
                  >
                    Create Card
                  </Button>
                </View>
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  infoCard: { marginBottom: 16 },
  infoRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  cardItem: { marginBottom: 12 },
  qrPreview: { flexDirection: "row", gap: 14 },
  qrPlaceholder: { width: 80, height: 80, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 4 },
  qrLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  cardDetails: { flex: 1, gap: 3 },
  cardName: { fontSize: 16, fontFamily: "Inter_700Bold", fontWeight: "700" },
  cardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  cardMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  templateTag: { fontSize: 10, fontFamily: "Inter_500Medium", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: "flex-start", marginTop: 2 },
  divider: { height: 1, marginVertical: 12 },
  cardActions: { flexDirection: "row", gap: 8 },
  formTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 16 },
  formField: { marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 6 },
  fieldInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, height: 44, fontSize: 14, fontFamily: "Inter_400Regular" },
  formActions: { flexDirection: "row", gap: 8, marginTop: 8 },
});
