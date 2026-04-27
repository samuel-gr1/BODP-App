import { Stack } from "expo-router";

export default function ApproverLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: "Back",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Approver Dashboard",
        }}
      />
      <Stack.Screen
        name="[submissionId]"
        options={{
          title: "Review Submission",
        }}
      />
    </Stack>
  );
}
