import * as Haptics from "expo-haptics";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";
import { useColors } from "@/hooks/useColors";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

interface ButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export function Button({
  onPress,
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  style,
  fullWidth = false,
}: ButtonProps) {
  const colors = useColors();

  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const getBgColor = () => {
    if (disabled) return colors.muted;
    switch (variant) {
      case "primary": return colors.primary;
      case "secondary": return colors.secondary;
      case "outline": return "transparent";
      case "ghost": return "transparent";
      case "destructive": return colors.destructive;
    }
  };

  const getTextColor = () => {
    if (disabled) return colors.mutedForeground;
    switch (variant) {
      case "primary": return colors.primaryForeground;
      case "secondary": return colors.secondaryForeground;
      case "outline": return colors.primary;
      case "ghost": return colors.foreground;
      case "destructive": return colors.destructiveForeground;
    }
  };

  const getBorderColor = () => {
    if (variant === "outline") return colors.primary;
    if (variant === "secondary") return colors.border;
    return "transparent";
  };

  const getPadding = () => {
    switch (size) {
      case "sm": return { paddingVertical: 8, paddingHorizontal: 14 };
      case "md": return { paddingVertical: 12, paddingHorizontal: 20 };
      case "lg": return { paddingVertical: 16, paddingHorizontal: 28 };
    }
  };

  const getFontSize = () => {
    switch (size) {
      case "sm": return 13;
      case "md": return 15;
      case "lg": return 17;
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        getPadding(),
        {
          backgroundColor: getBgColor(),
          borderColor: getBorderColor(),
          borderWidth: variant === "outline" || variant === "secondary" ? 1 : 0,
          opacity: pressed && !disabled ? 0.8 : 1,
          alignSelf: fullWidth ? undefined : "flex-start",
          width: fullWidth ? "100%" : undefined,
        },
        style,
      ]}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <Text style={[styles.text, { color: getTextColor(), fontSize: getFontSize() }]}>
          {children}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  text: {
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
});
