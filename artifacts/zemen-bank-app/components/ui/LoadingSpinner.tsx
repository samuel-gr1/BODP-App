import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export function LoadingSpinner({ size = "large" }: { size?: "small" | "large" }) {
  const colors = useColors();
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
});
