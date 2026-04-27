import { Feather } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApi } from "@/hooks/useApi";
import { useColors } from "@/hooks/useColors";
import { useForm } from "@/context/FormContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type AnswerValue = "YES" | "NO" | null;

interface Question {
  id: string;
  question: string;
  description?: string;
}

const QUESTIONS: Question[] = [
  {
    id: "q1",
    question: "Have you ever been convicted of a criminal offense?",
    description: "Excluding minor traffic violations",
  },
  {
    id: "q2",
    question: "Have you ever been declared bankrupt or insolvent?",
    description: "Including any ongoing proceedings",
  },
  {
    id: "q3",
    question: "Have you ever been disqualified from serving as a director?",
    description: "By any court or regulatory authority",
  },
  {
    id: "q4",
    question: "Have you ever been the subject of a regulatory investigation?",
    description: "By any financial or banking authority",
  },
  {
    id: "q5",
    question: "Have you ever had a professional license revoked or suspended?",
    description: "Including legal, accounting, or financial licenses",
  },
  {
    id: "q6",
    question: "Have you been involved in any civil litigation in the past 5 years?",
    description: "As a defendant or respondent",
  },
  {
    id: "q7",
    question: "Do you have any outstanding tax obligations or disputes?",
    description: "With any tax authority",
  },
  {
    id: "q8",
    question: "Have you ever been denied entry to any country?",
    description: "For reasons other than visa requirements",
  },
  {
    id: "q9",
    question: "Are you currently under any bond or pending charges?",
    description: "In any jurisdiction",
  },
  {
    id: "q10",
    question: "Have you been subject to any asset freezing orders?",
    description: "Under any anti-money laundering regulations",
  },
  {
    id: "q11",
    question: "Have you been listed on any sanctions or watch lists?",
    description: "By UN, EU, OFAC, or other regulatory bodies",
  },
  {
    id: "q12",
    question: "Do you have any political exposure (PEP status)?",
    description: "Currently or in the past 5 years",
  },
  {
    id: "q13",
    question: "Have you been associated with any shell companies?",
    description: "Without substantial business operations",
  },
  {
    id: "q14",
    question: "Have you refused to provide information to authorities?",
    description: "When legally required to do so",
  },
  {
    id: "q15",
    question: "Do you confirm all information provided is true and accurate?",
    description: "False statements may result in legal consequences",
  },
];

export default function ProprietyTestScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { request } = useApi();
  const { submission, getSection, updateSection } = useForm();
  const qc = useQueryClient();
  
  const section = getSection("PROPRIETY_TEST");
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [explanations, setExplanations] = useState<Record<string, string>>({});

  useEffect(() => {
    if (section?.answers) {
      const ans: Record<string, AnswerValue> = {};
      const exp: Record<string, string> = {};
      QUESTIONS.forEach(q => {
        ans[q.id] = section.answers[q.id] || null;
        exp[q.id] = section.answers[`${q.id}_explanation`] || "";
      });
      setAnswers(ans);
      setExplanations(exp);
    }
  }, [section]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!submission?.id) throw new Error("No active submission");
      const payload: Record<string, any> = {};
      QUESTIONS.forEach(q => {
        payload[q.id] = answers[q.id];
        if (answers[q.id] === "YES" && explanations[q.id]) {
          payload[`${q.id}_explanation`] = explanations[q.id];
        }
      });
      
      return request("/form-sections", {
        method: "POST",
        body: JSON.stringify({
          sectionName: "PROPRIETY_TEST",
          answers: payload,
          submissionId: submission.id,
        }),
      });
    },
    onSuccess: () => {
      const payload: Record<string, any> = {};
      QUESTIONS.forEach(q => {
        payload[q.id] = answers[q.id];
        if (answers[q.id] === "YES") {
          payload[`${q.id}_explanation`] = explanations[q.id];
        }
      });
      updateSection("PROPRIETY_TEST", payload);
      qc.invalidateQueries({ queryKey: ["submissions"] });
      router.back();
    },
  });

  const setAnswer = (id: string, value: AnswerValue) => {
    setAnswers({ ...answers, [id]: value });
  };

  const setExplanation = (id: string, value: string) => {
    setExplanations({ ...explanations, [id]: value });
  };

  const allAnswered = QUESTIONS.every(q => answers[q.id] !== null && answers[q.id] !== undefined);
  const completionRate = Math.round((Object.keys(answers).filter(k => answers[k] !== null).length / QUESTIONS.length) * 100);

  const paddingBottom = Platform.OS === "web" ? 34 : insets.bottom + 24;

  return (
    <>
      <Stack.Screen
        options={{
          title: "Propriety Test",
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
              <Feather name="shield" size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoText, { color: colors.primary }]}>
                  Section 5 of 5: Fit and Proper Assessment
                </Text>
                <View style={[styles.progressBar, { backgroundColor: `${colors.primary}30`, marginTop: 8 }]}>
                  <View style={[styles.progressFill, { width: `${completionRate}%`, backgroundColor: colors.primary }]} />
                </View>
                <Text style={[styles.progressText, { color: colors.primary }]}>{completionRate}% Complete</Text>
              </View>
            </View>
          </Card>

          <Card style={[styles.warningCard, { backgroundColor: colors.warningLight, borderColor: "transparent" }]}>
            <View style={styles.warningRow}>
              <Feather name="alert-triangle" size={18} color={colors.warning} />
              <Text style={[styles.warningText, { color: colors.warning }]}>
                Answer all questions truthfully. Any "YES" answers require an explanation. False declarations may result in disqualification.
              </Text>
            </View>
          </Card>

          {QUESTIONS.map((q, index) => (
            <Card key={q.id} style={[styles.questionCard, { borderColor: colors.border }]}>
              <View style={styles.questionHeader}>
                <View style={[styles.questionNumber, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.questionNumberText, { color: colors.primary }]}>{index + 1}</Text>
                </View>
                <View style={styles.questionTextWrap}>
                  <Text style={[styles.questionText, { color: colors.foreground }]}>{q.question}</Text>
                  {q.description && (
                    <Text style={[styles.questionDesc, { color: colors.mutedForeground }]}>{q.description}</Text>
                  )}
                </View>
              </View>

              <View style={styles.answerRow}>
                <Pressable
                  style={[
                    styles.answerBtn,
                    answers[q.id] === "NO" && { backgroundColor: colors.success, borderColor: colors.success },
                    { borderColor: colors.border, backgroundColor: answers[q.id] === "NO" ? colors.success : colors.secondary },
                  ]}
                  onPress={() => setAnswer(q.id, "NO")}
                >
                  <Text
                    style={[
                      styles.answerBtnText,
                      { color: answers[q.id] === "NO" ? "#fff" : colors.foreground },
                    ]}
                  >
                    NO
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.answerBtn,
                    {
                      borderColor: answers[q.id] === "YES" ? colors.destructive : colors.border,
                      backgroundColor: answers[q.id] === "YES" ? colors.destructive : colors.secondary,
                    },
                  ]}
                  onPress={() => setAnswer(q.id, "YES")}
                >
                  <Text
                    style={[
                      styles.answerBtnText,
                      { color: answers[q.id] === "YES" ? "#fff" : colors.foreground },
                    ]}
                  >
                    YES
                  </Text>
                </Pressable>
              </View>

              {answers[q.id] === "YES" && (
                <View style={[styles.explanationBox, { backgroundColor: colors.errorLight }]}>
                  <Text style={[styles.explanationLabel, { color: colors.destructive }]}>
                    Explanation Required *
                  </Text>
                  <View style={[styles.explanationInput, { borderColor: colors.destructive, backgroundColor: colors.background }]}>
                    <Text style={[styles.explanationPlaceholder, { color: colors.mutedForeground }]}>
                      {explanations[q.id] || "Provide detailed explanation..."}
                    </Text>
                  </View>
                </View>
              )}
            </Card>
          ))}

          <View style={styles.actions}>
            <Button
              variant="primary"
              size="md"
              onPress={() => saveMutation.mutate()}
              loading={saveMutation.isPending}
              disabled={!allAnswered}
              fullWidth
            >
              {allAnswered ? "Complete Section" : `Answer All Questions (${completionRate}%)`}
            </Button>
            <Button
              variant="outline"
              size="md"
              onPress={() => router.back()}
              fullWidth
              style={{ marginTop: 8 }}
            >
              Save as Draft
            </Button>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12 },
  infoCard: { marginBottom: 4 },
  infoRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  progressBar: { height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 4, borderRadius: 2 },
  progressText: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 4 },
  warningCard: { marginBottom: 4 },
  warningRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  warningText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
  questionCard: { padding: 14 },
  questionHeader: { flexDirection: "row", gap: 12, marginBottom: 12 },
  questionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  questionNumberText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  questionTextWrap: { flex: 1 },
  questionText: { fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 20 },
  questionDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 16 },
  answerRow: { flexDirection: "row", gap: 10 },
  answerBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  answerBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  explanationBox: { marginTop: 12, padding: 12, borderRadius: 8 },
  explanationLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 6 },
  explanationInput: { borderWidth: 1, borderRadius: 8, padding: 10, minHeight: 60 },
  explanationPlaceholder: { fontSize: 13, fontFamily: "Inter_400Regular" },
  actions: { marginTop: 8, gap: 8, marginBottom: 16 },
});
