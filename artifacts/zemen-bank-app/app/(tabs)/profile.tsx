import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { Card } from "@/components/ui/Card";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const paddingTop = Platform.OS === "web" ? 67 + 16 : insets.top + 16;
  const paddingBottom = Platform.OS === "web" ? 34 + 84 : 84;

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop }]}>
        <View style={[styles.avatar, { backgroundColor: colors.gold }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {getInitials(user?.name)}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={[styles.roleBadge, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
          <Text style={styles.roleText}>{user?.role}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Card style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ACCOUNT</Text>
          <ProfileRow icon="user" label="Full Name" value={user?.name ?? "-"} />
          <ProfileRow icon="mail" label="Email" value={user?.email ?? "-"} />
          <ProfileRow icon="shield" label="Role" value={user?.role ?? "-"} />
          <ProfileRow icon="hash" label="User ID" value={user?.id ? `${user.id.slice(0, 8)}...` : "-"} />
        </Card>

        <Card style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>MODULES</Text>
          <MenuRow
            icon="file-text"
            label="My Submissions"
            onPress={() => router.push("/(tabs)/forms")}
          />
          <MenuRow
            icon="calendar"
            label="My Meetings"
            onPress={() => router.push("/(tabs)/meetings")}
          />
          <MenuRow
            icon="credit-card"
            label="QR Business Card"
            onPress={() => router.push("/qr-card")}
          />
          <MenuRow
            icon="users"
            label="Related Parties"
            onPress={() => router.push("/related-parties")}
          />
        </Card>

        {(user?.role === "ADMIN" || user?.role === "APPROVER") && (
          <Card style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ADMIN</Text>
            <MenuRow
              icon="bar-chart-2"
              label="Meeting Analytics"
              onPress={() => router.push("/analytics")}
            />
            <MenuRow
              icon="users"
              label="User Management"
              onPress={() => {}}
            />
          </Card>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.logoutBtn,
            { backgroundColor: colors.errorLight, opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={handleLogout}
        >
          <Feather name="log-out" size={18} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive }]}>Sign Out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function ProfileRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={[styles.rowIcon, { backgroundColor: colors.secondary }]}>
        <Feather name={icon} size={14} color={colors.mutedForeground} />
      </View>
      <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.foreground }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      style={({ pressed }) => [styles.row, { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
      onPress={onPress}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.secondary }]}>
        <Feather name={icon} size={14} color={colors.primary} />
      </View>
      <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  header: { alignItems: "center", paddingBottom: 28 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { fontSize: 24, fontFamily: "Inter_700Bold", fontWeight: "700" },
  name: { color: "#fff", fontSize: 20, fontFamily: "Inter_700Bold", fontWeight: "700", marginBottom: 4 },
  email: { color: "rgba(255,255,255,0.75)", fontSize: 13, fontFamily: "Inter_400Regular" },
  roleBadge: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 100 },
  roleText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  content: { padding: 16, gap: 16 },
  section: { gap: 0 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  rowIcon: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  rowValue: { fontSize: 14, fontFamily: "Inter_500Medium", fontWeight: "500", maxWidth: 160 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
    borderRadius: 12,
  },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
});
