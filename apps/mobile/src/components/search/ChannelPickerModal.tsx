import { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Lock } from "lucide-react-native";
import type { Channel } from "@openslaq/shared";
import type { DmConversation } from "@openslaq/client-core";
import { useMobileTheme } from "@/theme/ThemeProvider";

interface PickerItem {
  id: string;
  name: string;
  type: "public" | "private" | "dm";
}

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

  const items: PickerItem[] = [
    ...channels.map((c) => ({ id: c.id, name: c.name, type: c.type as "public" | "private" })),
    ...dms.map((dm) => ({ id: dm.channel.id, name: dm.otherUser.displayName, type: "dm" as const })),
  ];

  const filtered = filterText
    ? items.filter((item) => item.name.toLowerCase().includes(filterText.toLowerCase()))
    : items;

  const handleSelect = (item: PickerItem) => {
    setFilterText("");
    onSelect(item.id, item.name);
  };

  const handleClose = () => {
    setFilterText("");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable
        testID="channel-picker-backdrop"
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
        onPress={handleClose}
      >
        <Pressable
          testID="channel-picker-modal"
          style={{
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingTop: 16,
            paddingBottom: 34,
            maxHeight: "70%",
          }}
          onPress={(e) => e.stopPropagation()}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: theme.colors.textPrimary,
              paddingHorizontal: 16,
              marginBottom: 12,
            }}
          >
            Select Channel
          </Text>
          <TextInput
            testID="channel-picker-filter"
            placeholder="Filter channels..."
            placeholderTextColor={theme.colors.textFaint}
            value={filterText}
            onChangeText={setFilterText}
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              borderWidth: 1,
              borderColor: theme.colors.borderDefault,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 16,
              color: theme.colors.textPrimary,
              backgroundColor: theme.colors.surfaceSecondary,
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
        </Pressable>
      </Pressable>
    </Modal>
  );
}
