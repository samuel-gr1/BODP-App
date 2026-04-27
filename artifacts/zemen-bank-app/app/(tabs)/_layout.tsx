import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Redirect, Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import { Platform, StyleSheet, Text, View, useColorScheme } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useApi } from "@/hooks/useApi";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="meetings">
        <Icon sf={{ default: "calendar", selected: "calendar" }} />
        <Label>Meetings</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="forms">
        <Icon sf={{ default: "doc.text", selected: "doc.text.fill" }} />
        <Label>Forms</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="chat">
        <Icon sf={{ default: "bubble.left", selected: "bubble.left.fill" }} />
        <Label>Chat</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="qr">
        <Icon sf={{ default: "qrcode", selected: "qrcode" }} />
        <Label>My QR</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="documents">
        <Icon sf={{ default: "folder", selected: "folder.fill" }} />
        <Label>Docs</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person.circle", selected: "person.circle.fill" }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const { request } = useApi();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread messages count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await request<{ unreadCount: number }>("/chats/unread-count", { method: "GET" });
        setUnreadCount(response.unreadCount || 0);
      } catch {
        // Silently fail - unread badge is not critical
      }
    };
    
    fetchUnreadCount();
    // Poll every 30 seconds for unread messages
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [request]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.tabBar,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.tabBar }]} />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: "Inter_500Medium",
          fontWeight: "500",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="house" tintColor={color} size={22} />
            ) : (
              <Feather name="home" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="meetings"
        options={{
          title: "Meetings",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="calendar" tintColor={color} size={22} />
            ) : (
              <Feather name="calendar" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="forms"
        options={{
          title: "Forms",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="doc.text" tintColor={color} size={22} />
            ) : (
              <Feather name="file-text" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              {isIOS ? (
                <SymbolView name="bubble.left" tintColor={color} size={22} />
              ) : (
                <Feather name="message-circle" size={22} color={color} />
              )}
              {unreadCount > 0 && !focused && (
                <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="qr"
        options={{
          title: "My QR",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="qrcode" tintColor={color} size={22} />
            ) : (
              <Feather name="grid" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: "Docs",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="folder" tintColor={color} size={22} />
            ) : (
              <Feather name="folder" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person.circle" tintColor={color} size={22} />
            ) : (
              <Feather name="user" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
});

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Redirect href="/login" />;

  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
