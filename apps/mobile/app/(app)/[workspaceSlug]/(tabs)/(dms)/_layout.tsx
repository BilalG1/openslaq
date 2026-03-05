import { Stack } from "expo-router";

export default function DmsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Direct Messages" }} />
    </Stack>
  );
}
