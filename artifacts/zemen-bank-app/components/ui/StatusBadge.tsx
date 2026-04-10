import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

type Status =
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED"
  | "PENDING"
  | "PROPOSED"
  | "INCOMPLETE"
  | string;

interface StatusBadgeProps {
  status: Status;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const colors = useColors();

  const getStatusStyle = () => {
    switch (status) {
      case "SCHEDULED":
        return { bg: colors.infoLight, text: colors.info };
      case "IN_PROGRESS":
        return { bg: colors.warningLight, text: colors.warning };
      case "COMPLETED":
      case "APPROVED":
        return { bg: colors.successLight, text: colors.success };
      case "CANCELLED":
      case "REJECTED":
      case "EXPIRED":
        return { bg: colors.errorLight, text: colors.destructive };
      case "DRAFT":
      case "INCOMPLETE":
        return { bg: colors.secondary, text: colors.mutedForeground };
      case "SUBMITTED":
      case "UNDER_REVIEW":
      case "PENDING":
      case "PROPOSED":
        return { bg: colors.warningLight, text: colors.warning };
      default:
        return { bg: colors.secondary, text: colors.mutedForeground };
    }
  };

  const { bg, text } = getStatusStyle();
  const label = status.replace(/_/g, " ");

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text
        style={[
          styles.text,
          { color: text, fontSize: size === "sm" ? 10 : 12 },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    alignSelf: "flex-start",
  },
  text: {
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});
