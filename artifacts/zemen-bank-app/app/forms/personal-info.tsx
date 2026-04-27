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
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApi } from "@/hooks/useApi";
import { useColors } from "@/hooks/useColors";
import { useForm } from "@/context/FormContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const SOURCE_OF_FUNDS = [
  "Salary",
  "Business Income",
  "Investment Returns",
  "Inheritance",
  "Gift",
  "Loan",
  "Other",
];

interface BankEntry {
  bankName: string;
  accountNumber: string;
}

export default function PersonalInfoScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { request } = useApi();
  const { submission, getSection, updateSection } = useForm();
  const qc = useQueryClient();
  
  const section = getSection("PERSONAL_INFO");
  const [sourceOfFunds, setSourceOfFunds] = useState("");
  const [otherSource, setOtherSource] = useState("");
  const [banks, setBanks] = useState<BankEntry[]>([{ bankName: "", accountNumber: "" }]);

  useEffect(() => {
    if (section?.answers) {
      setSourceOfFunds(section.answers.sourceOfFunds || "");
      setOtherSource(section.answers.otherSource || "");
      setBanks(section.answers.banks?.length > 0 ? section.answers.banks : [{ bankName: "", accountNumber: "" }]);
    }
  }, [section]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!submission?.id) throw new Error("No active submission");
      return request("/form-sections", {
        method: "POST",
        body: JSON.stringify({
          sectionName: "PERSONAL_INFO",
          answers: {
            sourceOfFunds,
            otherSource: sourceOfFunds === "Other" ? otherSource : undefined,
            banks: banks.filter(b => b.bankName.trim()),
          },
          submissionId: submission.id,
        }),
      });
    },
    onSuccess: () => {
      updateSection("PERSONAL_INFO", { sourceOfFunds, otherSource, banks });
      qc.invalidateQueries({ queryKey: ["submissions"] });
      router.back();
    },
  });

  const addBank = () => {
    setBanks([...banks, { bankName: "", accountNumber: "" }]);
  };

  const updateBank = (index: number, field: keyof BankEntry, value: string) => {
    const newBanks = [...banks];
    newBanks[index][field] = value;
    setBanks(newBanks);
  };

  const removeBank = (index: number) => {
    setBanks(banks.filter((_, i) => i !== index));
  };

  const paddingBottom = Platform.OS === "web" ? 34 : insets.bottom + 24;

  return (
    <>
      <Stack.Screen
        options={{
          title: "Personal Information",
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
                Section 2 of 5: Source of funds and financial institutions
              </Text>
            </View>
          </Card>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Source of Funds <Text style={{ color: colors.destructive }}>*</Text>
            </Text>
            <View style={[styles.selectContainer, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
              {SOURCE_OF_FUNDS.map((source) => (
                <Pressable
                  key={source}
                  style={[
                    styles.selectOption,
                    sourceOfFunds === source && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setSourceOfFunds(source)}
                >
                  <Text
                    style={[
                      styles.selectText,
                      { color: sourceOfFunds === source ? "#fff" : colors.foreground },
                    ]}
                  >
                    {source}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {sourceOfFunds === "Other" && (
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Specify Other Source</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.secondary, color: colors.foreground }]}
                placeholder="Enter source of funds"
                placeholderTextColor={colors.mutedForeground}
                value={otherSource}
                onChangeText={setOtherSource}
              />
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Financial Institutions</Text>
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              List banks where you hold accounts
            </Text>
            
            {banks.map((bank, index) => (
              <Card key={index} style={[styles.bankCard, { borderColor: colors.border }]}>
                <View style={styles.bankRow}>
                  <View style={styles.bankInputs}>
                    <TextInput
                      style={[styles.bankInput, { borderColor: colors.border, backgroundColor: colors.secondary, color: colors.foreground }]}
                      placeholder="Bank Name"
                      placeholderTextColor={colors.mutedForeground}
                      value={bank.bankName}
                      onChangeText={(text) => updateBank(index, "bankName", text)}
                    />
                    <TextInput
                      style={[styles.bankInput, { borderColor: colors.border, backgroundColor: colors.secondary, color: colors.foreground }]}
                      placeholder="Account Number (Optional)"
                      placeholderTextColor={colors.mutedForeground}
                      value={bank.accountNumber}
                      onChangeText={(text) => updateBank(index, "accountNumber", text)}
                      keyboardType="number-pad"
                    />
                  </View>
                  {banks.length > 1 && (
                    <Pressable onPress={() => removeBank(index)} style={styles.removeBtn}>
                      <Feather name="trash-2" size={18} color={colors.destructive} />
                    </Pressable>
                  )}
                </View>
              </Card>
            ))}
            
            <Button variant="outline" size="sm" onPress={addBank} style={styles.addBtn}>
              <Feather name="plus" size={14} color={colors.primary} />
              Add Bank
            </Button>
          </View>

          <View style={styles.actions}>
            <Button
              variant="primary"
              size="md"
              onPress={() => saveMutation.mutate()}
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
  fieldGroup: { gap: 8 },
  label: { fontSize: 14, fontFamily: "Inter_500Medium" },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: -4 },
  selectContainer: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  selectOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  selectText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    height: 48,
  },
  bankCard: { marginBottom: 8 },
  bankRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  bankInputs: { flex: 1, gap: 8 },
  bankInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  removeBtn: { padding: 4 },
  addBtn: { marginTop: 4 },
  actions: { marginTop: 8, gap: 8 },
});
