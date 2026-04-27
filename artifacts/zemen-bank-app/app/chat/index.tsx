import { Redirect } from "expo-router";
import React from "react";

export default function ChatIndexRedirect() {
  return <Redirect href="/(tabs)/chat" />;
}
