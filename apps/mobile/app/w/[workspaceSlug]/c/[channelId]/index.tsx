import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { routes } from "@/lib/routes";

export default function ChannelRedirect() {
  const { workspaceSlug, channelId } = useLocalSearchParams<{
    workspaceSlug: string;
    channelId: string;
  }>();
  const router = useRouter();

  useEffect(() => {
    if (workspaceSlug && channelId) {
      router.replace(routes.channel(workspaceSlug, channelId));
    }
  }, [workspaceSlug, channelId, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
});
