import { useState } from "react";
import {
  FlatList,
  Pressable,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { Lock } from "lucide-react-native";
import type { Channel, ChannelId } from "@openslaq/shared";
import type { DmConversation } from "@openslaq/client-core";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Input } from "@/components/ui/Input";
import { buildDestinationItems, type DestinationItem } from "@/lib/destination-items";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (id: ChannelId, name: string) => void;
  channels: Channel[];
  dms: DmConversation[];
}

export function ChannelPickerModal({ visible, onClose, onSelect, channels, dms }: Props) {
  const { theme } = useMobileTheme();
  const [filterText, setFilterText] = useState("");

  const items: DestinationItem[] = buildDestinationItems(channels, dms);

  const filtered = filterText
    ? items.filter((item) => item.name.toLowerCase().includes(filterText.toLowerCase()))
    : items;

  const handleSelect = (item: DestinationItem) => {
    setFilterText("");
    onSelect(item.id, item.name);
  };

  const handleClose = () => {
    setFilterText("");
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={handleClose} title="Select Channel" maxHeight="70%" testID="channel-picker-modal">
      <Input
        testID="channel-picker-filter"
        placeholder="Filter channels..."
        placeholderTextColor={theme.colors.textFaint}
        value={filterText}
        onChangeText={setFilterText}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.filterInput}
      />
      <FlatList
        testID="channel-picker-list"
        data={filtered}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable
            testID={`channel-picker-item-${item.id}`}
            accessibilityRole="button"
            accessibilityLabel={`Select ${item.name}`}
            accessibilityHint="Selects this channel as a filter"
            onPress={() => handleSelect(item)}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
              paddingHorizontal: 16,
              paddingVertical: 12,
              flexDirection: "row",
              alignItems: "center",
            })}
          >
            <View style={styles.iconContainer}>
              {item.type === "private" ? (
                <Lock size={14} color={theme.colors.textFaint} />
              ) : (
                <Text style={[styles.prefixText, { color: theme.colors.textFaint }]}>{item.type === "dm" ? "@" : "#"}</Text>
              )}
            </View>
            <Text
              style={[styles.itemName, { color: theme.colors.textPrimary }]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
          </Pressable>
        )}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  filterInput: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  iconContainer: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  prefixText: {
    fontSize: 14,
  },
  itemName: {
    fontSize: 16,
    flex: 1,
  },
});
