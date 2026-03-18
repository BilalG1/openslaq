import { useState } from "react";
import {
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { Lock } from "lucide-react-native";
import type { Channel } from "@openslaq/shared";
import type { DmConversation } from "@openslaq/client-core";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Input } from "@/components/ui/Input";
import { buildDestinationItems, type DestinationItem } from "@/lib/destination-items";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (id: string, name: string) => void;
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
        style={{
          marginHorizontal: 16,
          marginBottom: 8,
        }}
      />
      <FlatList
        testID="channel-picker-list"
        data={filtered}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable
            testID={`channel-picker-item-${item.id}`}
            onPress={() => handleSelect(item)}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
              paddingHorizontal: 16,
              paddingVertical: 12,
              flexDirection: "row",
              alignItems: "center",
            })}
          >
            <View style={{ width: 24, alignItems: "center", justifyContent: "center" }}>
              {item.type === "private" ? (
                <Lock size={14} color={theme.colors.textFaint} />
              ) : (
                <Text style={{ fontSize: 14, color: theme.colors.textFaint }}>{item.type === "dm" ? "@" : "#"}</Text>
              )}
            </View>
            <Text
              style={{ fontSize: 16, color: theme.colors.textPrimary, flex: 1 }}
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
