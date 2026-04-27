import { Stack } from "expo-router";
import { FormProvider } from "@/context/FormContext";

export default function FormsLayout() {
  return (
    <FormProvider>
      <Stack
        screenOptions={{
          headerShown: true,
          headerBackTitle: "Back",
        }}
      />
    </FormProvider>
  );
}
