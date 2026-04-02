import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { routes } from "@/lib/routes";

export default function MessageRedirect() {
  const { workspaceSlug, channelId, messageId } = useLocalSearchParams<{
    workspaceSlug: string;
    channelId: string;
    messageId: string;
  }>();
  const router = useRouter();

  useEffect(() => {
    if (workspaceSlug && channelId) {
      // Navigate to the channel; thread opening is handled by the channel screen
      router.replace(routes.channel(workspaceSlug, channelId));
    }
  }, [workspaceSlug, channelId, messageId, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
});
