import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";
import { useApi } from "@/hooks/useApi";
import { useColors } from "@/hooks/useColors";

interface QRTitle {
  id: string;
  name: string;
  isActive?: boolean;
}

interface QRTemplate {
  id: string;
  key: string;
  name: string;
  isActive?: boolean;
}

interface QRUserProfile {
  id: string;
  name: string;
  email: string;
  role?: string;
  titleId?: string | null;
  cardData?: Record<string, any> | null;
  title?: QRTitle | null;
}

interface QRCardItem {
  id: string;
  slug: string;
  templateId: string;
  data: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  template?: QRTemplate;
  user?: QRUserProfile;
}

const PUBLIC_BASE =
  process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : process.env.EXPO_PUBLIC_API_URL?.replace(/\/api\/?$/, "") ?? "";

function buildCardUrl(slug?: string, id?: string) {
  if (!PUBLIC_BASE) return id ?? slug ?? "";
  if (slug) return `${PUBLIC_BASE}/qr/${slug}`;
  if (id) return `${PUBLIC_BASE}/qr/${id}`;
  return PUBLIC_BASE;
}

export default function QRScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { request } = useApi();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [activeCard, setActiveCard] = useState<QRCardItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    title: "",
    department: "",
    phone: "",
    email: "",
  });

  const profileQuery = useQuery({
    queryKey: ["qr-profile"],
    queryFn: () => request<{ user: QRUserProfile }>("/qr/user/me"),
    retry: 1,
  });

  const cardsQuery = useQuery({
    queryKey: ["qr-cards"],
    queryFn: () => request<{ cards: QRCardItem[] }>("/qr/cards"),
    retry: 1,
  });

  const templatesQuery = useQuery({
    queryKey: ["qr-templates"],
    queryFn: () => request<{ templates: QRTemplate[] }>("/qr/templates"),
    retry: 1,
  });

  const profile = profileQuery.data?.user;
  const cards = cardsQuery.data?.cards ?? [];
  const templates = templatesQuery.data?.templates ?? [];
  const primaryCard = cards[0] ?? null;

  const createMutation = useMutation({
    mutationFn: () => {
      const template =
        templates.find((t) => t.isActive !== false) ?? templates[0];
      if (!template) {
        throw new Error("No QR templates available. Please contact admin.");
      }
      return request<{ card: QRCardItem }>("/qr/cards", {
        method: "POST",
        body: JSON.stringify({
          templateId: template.id,
          data: {
            name: form.name || profile?.name || user?.name,
            title: form.title || profile?.title?.name || "",
            department: form.department,
            phone: form.phone,
            email: form.email || profile?.email || user?.email,
          },
        }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["qr-cards"] });
      setCreating(false);
      setForm({ name: "", title: "", department: "", phone: "", email: "" });
      Alert.alert("Success", "Your QR business card has been created.");
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message || "Failed to create QR card");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (cardId: string) =>
      request(`/qr/cards/${cardId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["qr-cards"] });
      setActiveCard(null);
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message || "Failed to delete card");
    },
  });

  const handleShare = async (card: QRCardItem) => {
    const url = buildCardUrl(card.slug, card.id);
    const data = card.data || {};
    const message = `${data.name ?? user?.name ?? "Business Card"}${
      data.title ? ` — ${data.title}` : ""
    }\n${url}`;
    try {
      await Share.share({ message, url, title: "My Business Card" });
    } catch {
      /* user cancelled */
    }
  };

  const isLoading =
    profileQuery.isLoading || cardsQuery.isLoading || templatesQuery.isLoading;

  const refresh = () => {
    profileQuery.refetch();
    cardsQuery.refetch();
    templatesQuery.refetch();
  };

  const paddingTop = Platform.OS === "web" ? 67 + 16 : insets.top + 16;
  const paddingBottom = Platform.OS === "web" ? 34 + 84 : 100;

  if (isLoading && !profile && cards.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient
          colors={[colors.primary, `${colors.primary}D0`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.header,
            { paddingTop, paddingBottom: 28 },
          ]}
        >
          <Text style={styles.headerTitle}>My QR</Text>
          <Text style={styles.headerSubtitle}>
            Your digital business card
          </Text>
        </LinearGradient>

        {/* Featured (primary) QR Card */}
        <View style={styles.content}>
          {primaryCard ? (
            <FeaturedCard
              card={primaryCard}
              colors={colors}
              user={user}
              profile={profile}
              onShare={() => handleShare(primaryCard)}
              onView={() => setActiveCard(primaryCard)}
            />
          ) : (
            <Card style={{ ...styles.emptyCard, borderColor: colors.border }}>
              <View
                style={[
                  styles.emptyIcon,
                  { backgroundColor: colors.accent },
                ]}
              >
                <Feather name="grid" size={28} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                Create your QR Card
              </Text>
              <Text
                style={[
                  styles.emptyMessage,
                  { color: colors.mutedForeground },
                ]}
              >
                Generate a digital business card and share it instantly with
                colleagues and partners.
              </Text>
              <Button
                variant="primary"
                size="md"
                onPress={() => {
                  setForm({
                    name: profile?.name || user?.name || "",
                    title: profile?.title?.name || "",
                    department: "",
                    phone: "",
                    email: profile?.email || user?.email || "",
                  });
                  setCreating(true);
                }}
                fullWidth
              >
                Create My QR Card
              </Button>
            </Card>
          )}

          {/* Action row */}
          {primaryCard && (
            <View style={styles.actionsRow}>
              <ActionTile
                icon="share-2"
                label="Share"
                colors={colors}
                onPress={() => handleShare(primaryCard)}
              />
              <ActionTile
                icon="maximize-2"
                label="View Full"
                colors={colors}
                onPress={() => setActiveCard(primaryCard)}
              />
              <ActionTile
                icon="plus"
                label="New"
                colors={colors}
                onPress={() => {
                  setForm({
                    name: profile?.name || user?.name || "",
                    title: profile?.title?.name || "",
                    department: "",
                    phone: "",
                    email: profile?.email || user?.email || "",
                  });
                  setCreating(true);
                }}
              />
            </View>
          )}

          {/* All cards list */}
          {cards.length > 1 && (
            <View style={styles.cardsListSection}>
              <View style={styles.sectionHeaderRow}>
                <Text
                  style={[styles.sectionTitle, { color: colors.foreground }]}
                >
                  All Cards
                </Text>
                <Text
                  style={[
                    styles.sectionCount,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {cards.length} cards
                </Text>
              </View>

              {cards.slice(1).map((card) => (
                <CardListItem
                  key={card.id}
                  card={card}
                  colors={colors}
                  onView={() => setActiveCard(card)}
                  onShare={() => handleShare(card)}
                  onDelete={() =>
                    Alert.alert(
                      "Delete Card",
                      "Are you sure you want to delete this card?",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: () => deleteMutation.mutate(card.id),
                        },
                      ],
                    )
                  }
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Full QR Modal */}
      <Modal
        visible={!!activeCard}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveCard(null)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.card,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            <View style={styles.modalHandle} />
            {activeCard && (
              <>
                <Text
                  style={[styles.modalTitle, { color: colors.foreground }]}
                >
                  {activeCard.data?.name || profile?.name || user?.name}
                </Text>
                <Text
                  style={[
                    styles.modalSubtitle,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {activeCard.data?.title || profile?.title?.name || ""}
                </Text>

                <View style={styles.modalQrWrap}>
                  <View
                    style={[
                      styles.qrBox,
                      {
                        backgroundColor: "#fff",
                        shadowColor: colors.primary,
                      },
                    ]}
                  >
                    <QRCode
                      value={buildCardUrl(activeCard.slug, activeCard.id)}
                      size={240}
                      color="#0a0a0a"
                      backgroundColor="#fff"
                    />
                  </View>
                </View>

                <Text
                  style={[
                    styles.modalUrl,
                    { color: colors.mutedForeground },
                  ]}
                  numberOfLines={1}
                >
                  {buildCardUrl(activeCard.slug, activeCard.id)}
                </Text>

                <View style={styles.modalActions}>
                  <Button
                    variant="secondary"
                    size="md"
                    onPress={() => setActiveCard(null)}
                  >
                    Close
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    onPress={() => handleShare(activeCard)}
                  >
                    Share Card
                  </Button>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Create Card Modal */}
      <Modal
        visible={creating}
        animationType="slide"
        transparent
        onRequestClose={() => setCreating(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.card,
                paddingBottom: Math.max(insets.bottom, 16),
                maxHeight: "90%",
              },
            ]}
          >
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              New Business Card
            </Text>
            <Text
              style={[styles.modalSubtitle, { color: colors.mutedForeground }]}
            >
              Fill in your details to generate a QR card.
            </Text>

            <ScrollView
              style={{ maxHeight: 380, marginTop: 16 }}
              showsVerticalScrollIndicator={false}
            >
              <FormField
                label="Full Name"
                value={form.name}
                onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                colors={colors}
              />
              <FormField
                label="Title / Position"
                value={form.title}
                onChange={(v) => setForm((f) => ({ ...f, title: v }))}
                colors={colors}
              />
              <FormField
                label="Department"
                value={form.department}
                onChange={(v) => setForm((f) => ({ ...f, department: v }))}
                colors={colors}
              />
              <FormField
                label="Phone"
                value={form.phone}
                onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                colors={colors}
                keyboardType="phone-pad"
              />
              <FormField
                label="Email"
                value={form.email}
                onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                colors={colors}
                keyboardType="email-address"
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                variant="secondary"
                size="md"
                onPress={() => setCreating(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                loading={createMutation.isPending}
                onPress={() => createMutation.mutate()}
                disabled={!form.name.trim()}
              >
                Generate Card
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function FeaturedCard({
  card,
  colors,
  user,
  profile,
  onShare,
  onView,
}: {
  card: QRCardItem;
  colors: any;
  user: any;
  profile: QRUserProfile | undefined;
  onShare: () => void;
  onView: () => void;
}) {
  const data = card.data || {};
  const name = data.name || profile?.name || user?.name || "—";
  const title = data.title || profile?.title?.name || "";
  const dept = data.department || "";
  const phone = data.phone || "";
  const email = data.email || profile?.email || user?.email || "";
  const url = buildCardUrl(card.slug, card.id);

  return (
    <Pressable onPress={onView}>
      <LinearGradient
        colors={[colors.primary, `${colors.primary}E6`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.featuredCard}
      >
        <View style={styles.featuredTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.featuredName} numberOfLines={1}>
              {name}
            </Text>
            {title ? (
              <Text style={styles.featuredTitle} numberOfLines={1}>
                {title}
              </Text>
            ) : null}
            {dept ? (
              <Text style={styles.featuredDept} numberOfLines={1}>
                {dept}
              </Text>
            ) : null}
          </View>
          <View style={styles.qrSmallWrap}>
            <QRCode
              value={url}
              size={88}
              color="#0a0a0a"
              backgroundColor="#fff"
            />
          </View>
        </View>

        <View style={styles.featuredDivider} />

        <View style={styles.featuredMetaRow}>
          {phone ? (
            <View style={styles.metaItem}>
              <Feather name="phone" size={13} color="rgba(255,255,255,0.85)" />
              <Text style={styles.metaText} numberOfLines={1}>
                {phone}
              </Text>
            </View>
          ) : null}
          {email ? (
            <View style={styles.metaItem}>
              <Feather name="mail" size={13} color="rgba(255,255,255,0.85)" />
              <Text style={styles.metaText} numberOfLines={1}>
                {email}
              </Text>
            </View>
          ) : null}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function CardListItem({
  card,
  colors,
  onView,
  onShare,
  onDelete,
}: {
  card: QRCardItem;
  colors: any;
  onView: () => void;
  onShare: () => void;
  onDelete: () => void;
}) {
  const data = card.data || {};
  const url = buildCardUrl(card.slug, card.id);

  return (
    <Card style={styles.listCard}>
      <Pressable
        onPress={onView}
        style={({ pressed }) => [
          styles.listCardInner,
          pressed && { opacity: 0.7 },
        ]}
      >
        <View
          style={[styles.listQrWrap, { backgroundColor: "#fff" }]}
        >
          <QRCode
            value={url}
            size={56}
            color="#0a0a0a"
            backgroundColor="#fff"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[styles.listCardName, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {data.name || "Untitled"}
          </Text>
          {data.title ? (
            <Text
              style={[
                styles.listCardSub,
                { color: colors.mutedForeground },
              ]}
              numberOfLines={1}
            >
              {data.title}
            </Text>
          ) : null}
          <Text
            style={[
              styles.listCardDate,
              { color: colors.mutedForeground },
            ]}
          >
            Created {new Date(card.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.listCardActions}>
          <Pressable onPress={onShare} hitSlop={8} style={styles.iconAction}>
            <Feather name="share-2" size={18} color={colors.primary} />
          </Pressable>
          <Pressable onPress={onDelete} hitSlop={8} style={styles.iconAction}>
            <Feather name="trash-2" size={18} color={colors.destructive} />
          </Pressable>
        </View>
      </Pressable>
    </Card>
  );
}

function ActionTile({
  icon,
  label,
  colors,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  colors: any;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionTile,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View
        style={[
          styles.actionTileIcon,
          { backgroundColor: `${colors.primary}15` },
        ]}
      >
        <Feather name={icon} size={20} color={colors.primary} />
      </View>
      <Text style={[styles.actionTileLabel, { color: colors.foreground }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function FormField({
  label,
  value,
  onChange,
  colors,
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  colors: any;
  keyboardType?: any;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
        style={[
          styles.fieldInput,
          {
            borderColor: colors.border,
            backgroundColor: colors.secondary,
            color: colors.foreground,
          },
        ]}
        placeholderTextColor={colors.mutedForeground}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  content: { padding: 16, gap: 14, marginTop: -16 },
  featuredCard: {
    borderRadius: 20,
    padding: 18,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
  },
  featuredTop: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  featuredName: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
  featuredTitle: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  featuredDept: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  qrSmallWrap: {
    backgroundColor: "#fff",
    padding: 6,
    borderRadius: 10,
  },
  featuredDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginVertical: 14,
  },
  featuredMetaRow: { gap: 6 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  actionTile: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  actionTileIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTileLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  emptyCard: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 18,
    borderWidth: 1,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 6,
  },
  emptyMessage: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 18,
    lineHeight: 18,
  },
  cardsListSection: { marginTop: 18 },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionCount: { fontSize: 12, fontFamily: "Inter_400Regular" },
  listCard: { marginBottom: 10 },
  listCardInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  listQrWrap: {
    padding: 4,
    borderRadius: 8,
  },
  listCardName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  listCardSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  listCardDate: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  listCardActions: { flexDirection: "row", gap: 4 },
  iconAction: { padding: 8 },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    paddingHorizontal: 20,
    paddingTop: 8,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.18)",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 4,
  },
  modalQrWrap: {
    alignItems: "center",
    marginVertical: 24,
  },
  qrBox: {
    padding: 16,
    borderRadius: 18,
    elevation: 6,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
  },
  modalUrl: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },

  // Form
  field: { marginBottom: 12 },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginBottom: 6,
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
});
