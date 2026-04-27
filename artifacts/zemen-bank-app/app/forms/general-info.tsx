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
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const FIELDS = [
  { key: "bankName", label: "Bank Name", placeholder: "Zemen Bank", required: false },
  { key: "applicantType", label: "Applicant Type", placeholder: "Individual / Corporate", required: true },
  { key: "fullName", label: "Full Name", placeholder: "Enter your full name", required: true },
  { key: "dateOfBirth", label: "Date of Birth", placeholder: "YYYY-MM-DD", required: true },
  { key: "nationality", label: "Nationality", placeholder: "e.g., Ethiopian", required: true },
  { key: "idCardNumber", label: "ID Card Number", placeholder: "Enter ID number", required: false },
  { key: "idCardIssueDate", label: "ID Card Issue Date", placeholder: "YYYY-MM-DD", required: false },
  { key: "passportIssueDate", label: "Passport Issue Date", placeholder: "YYYY-MM-DD", required: false },
  { key: "taxPayerIdNumber", label: "Taxpayer ID (TIN)", placeholder: "Enter TIN", required: false },
  { key: "street", label: "Street Address", placeholder: "Enter street address", required: false },
  { key: "city", label: "City", placeholder: "e.g., Addis Ababa", required: false },
  { key: "telephoneNo", label: "Telephone Number", placeholder: "+251...", required: false },
  { key: "email", label: "Email Address", placeholder: "email@example.com", required: false, keyboardType: "email-address" },
  { key: "educationalQualification", label: "Educational Qualification", placeholder: "e.g., Bachelor's Degree", required: false },
  { key: "bankers", label: "Bankers", placeholder: "List your bankers", required: false },
] as const;

export default function GeneralInfoScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { request } = useApi();
  const { submission, getSection, updateSection } = useForm();
  const qc = useQueryClient();
  
  const section = getSection("GENERAL_INFO");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (section?.answers) {
      setAnswers(section.answers as Record<string, string>);
    }
  }, [section]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!submission?.id) throw new Error("No active submission");
      return request("/form-sections", {
        method: "POST",
        body: JSON.stringify({
          sectionName: "GENERAL_INFO",
          answers,
          submissionId: submission.id,
        }),
      });
    },
    onSuccess: () => {
      updateSection("GENERAL_INFO", answers);
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

  const paddingBottom = Platform.OS === "web" ? 34 : insets.bottom + 24;

  return (
    <>
      <Stack.Screen
        options={{
          title: "General Information",
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
                Section 1 of 5: Personal identification and contact details
              </Text>
            </View>
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
                    backgroundColor: colors.secondary,
                    color: colors.foreground,
                  },
                ]}
                placeholder={field.placeholder}
                placeholderTextColor={colors.mutedForeground}
                value={answers[field.key] || ""}
                onChangeText={(text) => updateField(field.key, text)}
                keyboardType={(field.keyboardType as any) || "default"}
                autoCapitalize={field.key === "email" ? "none" : "words"}
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
