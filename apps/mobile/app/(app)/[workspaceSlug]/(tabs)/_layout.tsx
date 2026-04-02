import { Tabs } from "expo-router";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { HomeIcon, DmsIcon, MoreIcon } from "@/components/ui/TabIcons";

export default function TabsLayout() {
  const { theme } = useMobileTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.borderDefault,
          borderTopWidth: 0.5,
        },
        tabBarActiveTintColor: theme.brand.primary,
        tabBarInactiveTintColor: theme.colors.textFaint,
      }}
    >
      <Tabs.Screen
        name="(channels)"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <HomeIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="(dms)"
        options={{
          title: "DMs",
          tabBarIcon: ({ color, size }) => <DmsIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, size }) => <MoreIcon color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
