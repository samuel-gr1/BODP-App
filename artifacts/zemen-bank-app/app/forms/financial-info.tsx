import { Feather } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApi } from "@/hooks/useApi";
import { useColors } from "@/hooks/useColors";
import { useForm } from "@/context/FormContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const FIELDS = [
  { key: "totalAssets", label: "Total Assets (ETB)", placeholder: "0.00", required: true, numeric: true },
  { key: "totalLiabilities", label: "Total Liabilities (ETB)", placeholder: "0.00", required: true, numeric: true },
  { key: "annualIncome", label: "Annual Income (ETB)", placeholder: "0.00", required: false, numeric: true },
  { key: "netWorth", label: "Net Worth (ETB)", placeholder: "Calculated automatically", required: false, numeric: true, readOnly: true },
  { key: "annualExpenses", label: "Annual Expenses (ETB)", placeholder: "0.00", required: false, numeric: true },
  { key: "investmentPortfolio", label: "Investment Portfolio Value (ETB)", placeholder: "0.00", required: false, numeric: true },
  { key: "realEstateValue", label: "Real Estate Holdings (ETB)", placeholder: "0.00", required: false, numeric: true },
  { key: "cashAndDeposits", label: "Cash & Bank Deposits (ETB)", placeholder: "0.00", required: false, numeric: true },
  { key: "otherAssets", label: "Other Assets Description", placeholder: "Describe any significant other assets", required: false, numeric: false },
  { key: "outstandingLoans", label: "Outstanding Loans (ETB)", placeholder: "0.00", required: false, numeric: true },
] as const;

export default function FinancialInfoScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { request } = useApi();
  const { submission, getSection, updateSection } = useForm();
  const qc = useQueryClient();
  
  const section = getSection("FINANCIAL_INFORMATION");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (section?.answers) {
      setAnswers(section.answers as Record<string, string>);
    }
  }, [section]);

  // Auto-calculate net worth
  const totalAssets = parseFloat(answers.totalAssets) || 0;
  const totalLiabilities = parseFloat(answers.totalLiabilities) || 0;
  const netWorth = totalAssets - totalLiabilities;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!submission?.id) throw new Error("No active submission");
      return request("/form-sections", {
        method: "POST",
        body: JSON.stringify({
          sectionName: "FINANCIAL_INFORMATION",
          answers: { ...answers, netWorth: netWorth.toString() },
          submissionId: submission.id,
        }),
      });
    },
    onSuccess: () => {
      updateSection("FINANCIAL_INFORMATION", { ...answers, netWorth: netWorth.toString() });
      qc.invalidateQueries({ queryKey: ["submissions"] });
      router.back();
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};
    FIELDS.forEach(field => {
      if (field.required && !answers[field.key]?.trim()) {
        newErrors[field.key] = `${field.label} is required`;
      }
      if (field.numeric && answers[field.key] && isNaN(parseFloat(answers[field.key]))) {
        newErrors[field.key] = `${field.label} must be a valid number`;
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      saveMutation.mutate();
    }
  };

  const updateField = (key: string, value: string) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: "" }));
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("en-ET", { style: "currency", currency: "ETB" });
  };

  const paddingBottom = Platform.OS === "web" ? 34 : insets.bottom + 24;

  return (
    <>
      <Stack.Screen
        options={{
          title: "Financial Information",
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: "#fff",
        }}
      />
      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Card style={[styles.infoCard, { backgroundColor: colors.accent, borderColor: "transparent" }]}>
            <View style={styles.infoRow}>
              <Feather name="info" size={18} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.primary }]}>
                Section 4 of 5: Financial position and assets declaration
              </Text>
            </View>
          </Card>

          <Card style={[styles.summaryCard, { backgroundColor: colors.goldLight, borderColor: "transparent" }]}>
            <Text style={[styles.summaryLabel, { color: colors.gold }]}>Calculated Net Worth</Text>
            <Text style={[styles.summaryValue, { color: colors.gold }]}>{formatCurrency(netWorth)}</Text>
          </Card>

          {FIELDS.map((field) => (
            <View key={field.key} style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                {field.label}
                {field.required && <Text style={{ color: colors.destructive }}> *</Text>}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: errors[field.key] ? colors.destructive : colors.border,
                    backgroundColor: field.readOnly ? colors.muted : colors.secondary,
                    color: colors.foreground,
                  },
                ]}
                placeholder={field.placeholder}
                placeholderTextColor={colors.mutedForeground}
                value={field.readOnly ? netWorth.toString() : (answers[field.key] || "")}
                onChangeText={(text) => updateField(field.key, text)}
                keyboardType={field.numeric ? "decimal-pad" : "default"}
                editable={!field.readOnly}
              />
              {errors[field.key] && (
                <Text style={[styles.errorText, { color: colors.destructive }]}>
                  {errors[field.key]}
                </Text>
              )}
            </View>
          ))}

          <View style={styles.actions}>
            <Button
              variant="primary"
              size="md"
              onPress={handleSave}
              loading={saveMutation.isPending}
              fullWidth
            >
              Save & Continue
            </Button>
            <Button
              variant="outline"
              size="md"
              onPress={() => router.back()}
              fullWidth
              style={{ marginTop: 8 }}
            >
              Cancel
            </Button>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, gap: 16 },
  infoCard: { marginBottom: 8 },
  infoRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  summaryCard: { alignItems: "center", paddingVertical: 16 },
  summaryLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 4 },
  summaryValue: { fontSize: 24, fontFamily: "Inter_700Bold", fontWeight: "700" },
  fieldGroup: { gap: 6 },
  label: { fontSize: 14, fontFamily: "Inter_500Medium" },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    height: 48,
  },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  actions: { marginTop: 8, gap: 8 },
});
