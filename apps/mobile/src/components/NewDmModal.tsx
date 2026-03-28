import { useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { TextInput } from "react-native";
import { Check, Hash, Lock, X } from "lucide-react-native";
import {
  listWorkspaceMembers,
  createDm,
  createGroupDm,
  getErrorMessage,
} from "@openslaq/client-core";
import type { WorkspaceMember, OperationDeps } from "@openslaq/client-core";
import { asUserId, type ChannelId, type UserId } from "@openslaq/shared";
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Input } from "@/components/ui/Input";
import { TRANSPARENT, WHITE } from "@/theme/constants";

type ListItem =
  | { kind: "channel"; id: ChannelId; name: string; isPrivate: boolean }
  | { kind: "user"; id: UserId; displayName: string; email: string };

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: (channelId: ChannelId) => void;
  onChannelSelected?: (channelId: ChannelId) => void;
  workspaceSlug: string;
  currentUserId: UserId;
  deps: OperationDeps;
}

export function NewDmModal({
  visible,
  onClose,
  onCreated,
  onChannelSelected,
  workspaceSlug,
  currentUserId,
  deps,
}: Props) {
  const { theme } = useMobileTheme();
  const { state } = useChatStore();
  const filterRef = useRef<TextInput>(null);
  const [filterText, setFilterText] = useState("");
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setError(null);
    listWorkspaceMembers({ api: deps.api, auth: deps.auth }, workspaceSlug)
      .then(setMembers)
      .catch((err) => setError(getErrorMessage(err, "Failed to load members")))
      .finally(() => setLoading(false));
  }, [visible, deps.api, deps.auth, workspaceSlug]);

  // Autofocus search input on open
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => filterRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const channels = state.channels
    .filter((ch) => !ch.isArchived)
    .map((ch): ListItem => ({
      kind: "channel",
      id: ch.id,
      name: ch.name,
      isPrivate: ch.type === "private",
    }));

  const users = members
    .filter((m) => m.id !== currentUserId)
    .map((m): ListItem => ({
      kind: "user",
      id: asUserId(m.id),
      displayName: m.displayName,
      email: m.email,
    }));

  const query = filterText.toLowerCase();
  const allItems: ListItem[] = [...channels, ...users];
  const filtered = allItems.filter((item) => {
    if (!query) return true;
    if (item.kind === "channel") {
      return item.name.toLowerCase().includes(query);
    }
    return (
      item.displayName.toLowerCase().includes(query) ||
      item.email.toLowerCase().includes(query)
    );
  });

  const toggleMember = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectedMembers = members.filter((m) => selectedIds.includes(m.id));

  const handleGo = async () => {
    if (selectedIds.length === 0) return;
    const targetId = selectedIds[0];
    if (!targetId) return;
    setCreating(true);
    setError(null);
    try {
      if (selectedIds.length === 1) {
        const dm = await createDm(deps, {
          workspaceSlug,
          targetUserId: targetId,
        });
        if (dm) {
          setFilterText("");
          setSelectedIds([]);
          onCreated(dm.channel.id);
        } else {
          setError("Failed to create conversation");
        }
      } else {
        const groupDm = await createGroupDm(deps, {
          workspaceSlug,
          memberIds: selectedIds,
        });
        if (groupDm) {
          setFilterText("");
          setSelectedIds([]);
          onCreated(groupDm.channel.id);
        } else {
          setError("Failed to create group conversation");
        }
      }
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create conversation"));
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setFilterText("");
    setSelectedIds([]);
    setError(null);
    onClose();
  };

  const handleChannelTap = (channelId: ChannelId) => {
    if (onChannelSelected) {
      onChannelSelected(channelId);
    }
    handleClose();
  };

  const buttonLabel =
    selectedIds.length <= 1
      ? "Open"
      : `Start Group DM (${selectedIds.length} people)`;

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.kind === "channel") {
      return (
        <Pressable
          testID={`new-dm-channel-${item.id}`}
          accessibilityRole="button"
          accessibilityLabel={item.name}
          accessibilityHint="Opens this channel"
          onPress={() => handleChannelTap(item.id)}
          style={({ pressed }) => [
            styles.memberRow,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <View style={styles.channelPrefix}>
            {item.isPrivate ? (
              <Lock size={16} color={theme.colors.textFaint} />
            ) : (
              <Hash size={16} color={theme.colors.textFaint} />
            )}
          </View>
          <Text
            style={[styles.channelName, { color: theme.colors.textPrimary }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
        </Pressable>
      );
    }

    const isSelected = selectedIds.includes(item.id);
    return (
      <Pressable
        testID={`new-dm-member-${item.id}`}
        accessibilityRole="button"
        accessibilityLabel={item.displayName}
        accessibilityHint={isSelected ? "Deselects this person" : "Selects this person"}
        onPress={() => toggleMember(item.id)}
        style={({ pressed }) => [
          styles.memberRow,
          { opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <View style={styles.memberInfo}>
          <Text
            style={[styles.memberName, { color: theme.colors.textPrimary }]}
            numberOfLines={1}
          >
            {item.displayName}
          </Text>
          <Text
            style={[styles.memberEmail, { color: theme.colors.textFaint }]}
            numberOfLines={1}
          >
            {item.email}
          </Text>
        </View>
        <View
          testID={`new-dm-checkbox-${item.id}`}
          style={[
            styles.checkbox,
            {
              borderColor: isSelected ? theme.brand.primary : theme.colors.borderDefault,
              backgroundColor: isSelected ? theme.brand.primary : TRANSPARENT,
            },
          ]}
        >
          {isSelected && <Check size={12} color={WHITE} />}
        </View>
      </Pressable>
    );
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title="New Message"
      fullHeight
      swipeToDismiss
      testID="new-dm-modal"
    >
      {selectedMembers.length > 0 && (
        <View testID="selected-chips" style={styles.chipsRow}>
          <Text style={[styles.toLabel, { color: theme.colors.textFaint }]}>
            To:
          </Text>
          {selectedMembers.map((m) => (
            <Pressable
              key={m.id}
              testID={`selected-chip-${m.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${m.displayName}`}
              accessibilityHint="Removes this person from the selection"
              onPress={() => toggleMember(m.id)}
              style={[styles.chip, { backgroundColor: theme.colors.surfaceSecondary }]}
            >
              <Text style={[styles.chipText, { color: theme.colors.textPrimary }]}>
                {m.displayName}
              </Text>
              <X size={14} color={theme.colors.textFaint} style={styles.chipClose} />
            </Pressable>
          ))}
        </View>
      )}
      <Input
        ref={filterRef}
        testID="new-dm-filter"
        placeholder="Search channels and people..."
        placeholderTextColor={theme.colors.textFaint}
        value={filterText}
        onChangeText={setFilterText}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.filterInput}
      />
      {loading && (
        <ActivityIndicator
          testID="new-dm-loading"
          style={styles.loadingSpinner}
          color={theme.brand.primary}
        />
      )}
      {error && (
        <Text
          testID="new-dm-error"
          style={[styles.errorText, { color: theme.colors.dangerText }]}
        >
          {error}
        </Text>
      )}
      {creating && (
        <View testID="new-dm-creating" style={styles.creatingContainer}>
          <ActivityIndicator size="small" color={theme.brand.primary} />
          <Text
            style={[styles.creatingText, { color: theme.colors.textFaint }]}
          >
            Opening conversation...
          </Text>
        </View>
      )}
      {!loading && !error && !creating && (
        <FlatList
          testID="new-dm-member-list"
          data={filtered}
          keyExtractor={(item) => `${item.kind}-${item.id}`}
          keyboardShouldPersistTaps="handled"
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.colors.textFaint }]}>
                {filterText ? "No results found" : "No channels or members"}
              </Text>
            </View>
          }
        />
      )}
      {selectedIds.length > 0 && !creating && (
        <Pressable
          testID="new-dm-go-button"
          accessibilityRole="button"
          accessibilityLabel={buttonLabel}
          accessibilityHint="Opens the conversation"
          onPress={handleGo}
          style={({ pressed }) => [
            styles.goButton,
            {
              opacity: pressed ? 0.8 : 1,
              backgroundColor: theme.brand.primary,
            },
          ]}
        >
          <Text style={styles.goButtonLabel}>{buttonLabel}</Text>
        </Pressable>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 6,
  },
  toLabel: {
    fontSize: 14,
    alignSelf: "center",
    marginRight: 4,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: {
    fontSize: 14,
  },
  chipClose: {
    marginLeft: 4,
  },
  filterInput: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  loadingSpinner: {
    marginVertical: 20,
  },
  errorText: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  creatingContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  creatingText: {
    marginTop: 8,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 14,
  },
  memberRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  channelPrefix: {
    width: 22,
    alignItems: "center",
    marginRight: 12,
  },
  channelName: {
    fontSize: 16,
    flex: 1,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
  },
  memberEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  goButton: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  goButtonLabel: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "600",
  },
});
