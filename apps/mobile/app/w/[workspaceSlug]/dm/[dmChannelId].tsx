import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { routes } from "@/lib/routes";

export default function DmRedirect() {
  const { workspaceSlug, dmChannelId } = useLocalSearchParams<{
    workspaceSlug: string;
    dmChannelId: string;
  }>();
  const router = useRouter();

  useEffect(() => {
    if (workspaceSlug && dmChannelId) {
      router.replace(routes.dm(workspaceSlug, dmChannelId));
    }
  }, [workspaceSlug, dmChannelId, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
});
