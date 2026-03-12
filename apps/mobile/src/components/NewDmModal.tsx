import { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Check, X } from "lucide-react-native";
import {
  listWorkspaceMembers,
  createDm,
  createGroupDm,
  getErrorMessage,
} from "@openslaq/client-core";
import type { WorkspaceMember, OperationDeps } from "@openslaq/client-core";
import { useMobileTheme } from "@/theme/ThemeProvider";

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: (channelId: string) => void;
  workspaceSlug: string;
  currentUserId: string;
  deps: OperationDeps;
}

export function NewDmModal({
  visible,
  onClose,
  onCreated,
  workspaceSlug,
  currentUserId,
  deps,
}: Props) {
  const { theme } = useMobileTheme();
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

  const filtered = members
    .filter((m) => m.id !== currentUserId)
    .filter(
      (m) =>
        !filterText ||
        m.displayName.toLowerCase().includes(filterText.toLowerCase()) ||
        m.email.toLowerCase().includes(filterText.toLowerCase()),
    );

  const toggleMember = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectedMembers = members.filter((m) => selectedIds.includes(m.id));

  const handleGo = async () => {
    if (selectedIds.length === 0) return;
    setCreating(true);
    setError(null);
    try {
      if (selectedIds.length === 1) {
        const dm = await createDm(deps, {
          workspaceSlug,
          targetUserId: selectedIds[0],
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

  const buttonLabel =
    selectedIds.length <= 1
      ? "Go"
      : `Start Group DM (${selectedIds.length} people)`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable
        testID="new-dm-backdrop"
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          justifyContent: "flex-end",
        }}
        onPress={handleClose}
      >
        <Pressable
          testID="new-dm-modal"
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
            New Message
          </Text>
          {selectedMembers.length > 0 && (
            <View
              testID="selected-chips"
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                paddingHorizontal: 16,
                marginBottom: 8,
                gap: 6,
              }}
            >
              <Text style={{ color: theme.colors.textFaint, fontSize: 14, alignSelf: "center", marginRight: 4 }}>
                To:
              </Text>
              {selectedMembers.map((m) => (
                <Pressable
                  key={m.id}
                  testID={`selected-chip-${m.id}`}
                  onPress={() => toggleMember(m.id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: theme.colors.surfaceSecondary,
                    borderRadius: 12,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}
                >
                  <Text style={{ fontSize: 14, color: theme.colors.textPrimary }}>
                    {m.displayName}
                  </Text>
                  <X size={14} color={theme.colors.textFaint} style={{ marginLeft: 4 }} />
                </Pressable>
              ))}
            </View>
          )}
          <TextInput
            testID="new-dm-filter"
            placeholder="Search people..."
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
          {loading && (
            <ActivityIndicator
              testID="new-dm-loading"
              style={{ marginVertical: 20 }}
              color={theme.brand.primary}
            />
          )}
          {error && (
            <Text
              testID="new-dm-error"
              style={{
                color: theme.colors.dangerText,
                paddingHorizontal: 16,
                marginBottom: 8,
              }}
            >
              {error}
            </Text>
          )}
          {creating && (
            <View
              testID="new-dm-creating"
              style={{ alignItems: "center", marginVertical: 20 }}
            >
              <ActivityIndicator size="small" color={theme.brand.primary} />
              <Text
                style={{
                  color: theme.colors.textFaint,
                  marginTop: 8,
                  fontSize: 14,
                }}
              >
                Opening conversation...
              </Text>
            </View>
          )}
          {!loading && !error && !creating && (
            <ScrollView
              testID="new-dm-member-list"
              keyboardShouldPersistTaps="handled"
            >
              {filtered.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 20 }}>
                  <Text style={{ color: theme.colors.textFaint, fontSize: 14 }}>
                    No members found
                  </Text>
                </View>
              ) : (
                filtered.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <Pressable
                      key={item.id}
                      testID={`new-dm-member-${item.id}`}
                      onPress={() => toggleMember(item.id)}
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.7 : 1,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        flexDirection: "row",
                        alignItems: "center",
                      })}
                    >
                      <View
                        testID={`new-dm-checkbox-${item.id}`}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          borderWidth: 2,
                          borderColor: isSelected ? theme.brand.primary : theme.colors.borderDefault,
                          backgroundColor: isSelected ? theme.brand.primary : "transparent",
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 12,
                        }}
                      >
                        {isSelected && (
                          <Check size={12} color="#fff" />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{ fontSize: 16, color: theme.colors.textPrimary }}
                          numberOfLines={1}
                        >
                          {item.displayName}
                        </Text>
                        <Text
                          style={{
                            fontSize: 13,
                            color: theme.colors.textFaint,
                            marginTop: 2,
                          }}
                          numberOfLines={1}
                        >
                          {item.email}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          )}
          {selectedIds.length > 0 && !creating && (
            <Pressable
              testID="new-dm-go-button"
              onPress={handleGo}
              style={({ pressed }) => ({
                opacity: pressed ? 0.8 : 1,
                backgroundColor: theme.brand.primary,
                marginHorizontal: 16,
                marginTop: 8,
                borderRadius: 8,
                paddingVertical: 12,
                alignItems: "center",
              })}
            >
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
                {buttonLabel}
              </Text>
            </Pressable>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
