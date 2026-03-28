import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  StyleSheet,
} from "react-native";
import { listWorkspaceMembers } from "@openslaq/client-core";
import { asUserId, type UserId } from "@openslaq/shared";
import type { WorkspaceMember } from "@openslaq/client-core";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { useAuth } from "@/contexts/AuthContext";
import { useServer } from "@/contexts/ServerContext";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Input } from "@/components/ui/Input";
import { useFetchData } from "@/hooks/useFetchData";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (userId: UserId, displayName: string) => void;
  workspaceSlug: string;
}

export function MemberPickerModal({ visible, onClose, onSelect, workspaceSlug }: Props) {
  const { theme } = useMobileTheme();
  const { authProvider } = useAuth();
  const { apiClient: api } = useServer();
  const [filterText, setFilterText] = useState("");
  const { data: members, loading, error } = useFetchData({
    fetchFn: () => listWorkspaceMembers({ api, auth: authProvider }, workspaceSlug),
    deps: [authProvider, workspaceSlug],
    enabled: visible,
    initialValue: [] as WorkspaceMember[],
  });

  const filtered = filterText
    ? members.filter((m) => m.displayName.toLowerCase().includes(filterText.toLowerCase()))
    : members;

  const handleSelect = (member: WorkspaceMember) => {
    setFilterText("");
    onSelect(asUserId(member.id), member.displayName);
  };

  const handleClose = () => {
    setFilterText("");
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={handleClose} title="Select Person" maxHeight="70%" testID="member-picker-modal">
      <Input
        testID="member-picker-filter"
        placeholder="Filter people..."
        placeholderTextColor={theme.colors.textFaint}
        value={filterText}
        onChangeText={setFilterText}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.filterInput}
      />
      {loading && (
        <ActivityIndicator
          testID="member-picker-loading"
          style={styles.loadingIndicator}
          color={theme.brand.primary}
        />
      )}
      {error && (
        <Text
          testID="member-picker-error"
          style={[styles.errorText, { color: theme.colors.dangerText }]}
        >
          {error}
        </Text>
      )}
      {!loading && !error && (
        <FlatList
          testID="member-picker-list"
          data={filtered}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              testID={`member-picker-item-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Select ${item.displayName}`}
              accessibilityHint="Selects this person as a filter"
              onPress={() => handleSelect(item)}
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
                paddingHorizontal: 16,
                paddingVertical: 12,
              })}
            >
              <Text
                style={[styles.memberName, { color: theme.colors.textPrimary }]}
                numberOfLines={1}
              >
                {item.displayName}
              </Text>
            </Pressable>
          )}
        />
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  filterInput: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  loadingIndicator: {
    marginVertical: 20,
  },
  errorText: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  memberName: {
    fontSize: 16,
  },
});
