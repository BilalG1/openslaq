import { useState, useRef, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { SearchResultItem } from "@openslaq/shared";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Search, X, Hash, AtSign, Paperclip } from "lucide-react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { useSearch } from "@/hooks/useSearch";
import { HeadlineRenderer } from "./HeadlineRenderer";
import { ChannelPickerModal } from "./ChannelPickerModal";
import { MemberPickerModal } from "./MemberPickerModal";
import { DatePickerModal } from "./DatePickerModal";
import { routes } from "@/lib/routes";
import { formatRelativeTime } from "@/lib/time";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.trim()[0]?.toUpperCase() ?? "?";
}

export function SearchScreen() {
  const { workspaceSlug } = useLocalSearchParams<{ workspaceSlug: string }>();
  const router = useRouter();
  const { theme } = useMobileTheme();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const {
    filters,
    updateFilters,
    results,
    total,
    loading,
    error,
    loadMore,
    hasMore,
    reset,
    channels,
    dms,
  } = useSearch(workspaceSlug);

  const [showChannelPicker, setShowChannelPicker] = useState(false);
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [channelLabel, setChannelLabel] = useState<string | undefined>();
  const [memberLabel, setMemberLabel] = useState<string | undefined>();

  const handleCancel = () => {
    reset();
    router.back();
  };

  const handleClear = () => {
    reset();
    inputRef.current?.focus();
  };

  const handleResultPress = useCallback(
    (item: SearchResultItem) => {
      if (item.parentMessageId) {
        router.push(routes.thread(workspaceSlug!, item.parentMessageId));
      } else if (item.channelType === "dm") {
        router.push(routes.dm(workspaceSlug!, item.channelId));
      } else {
        router.push(routes.channel(workspaceSlug!, item.channelId));
      }
    },
    [router, workspaceSlug],
  );

  const dateLabel =
    filters.fromDate || filters.toDate
      ? [filters.fromDate, filters.toDate].filter(Boolean).join(" - ")
      : undefined;

  const chipDefs = [
    {
      key: "channel",
      label: "Channel",
      value: channelLabel,
      onPress: () => setShowChannelPicker(true),
      onClear: () => {
        setChannelLabel(undefined);
        updateFilters({ channelId: undefined });
      },
    },
    {
      key: "person",
      label: "Person",
      value: memberLabel,
      onPress: () => setShowMemberPicker(true),
      onClear: () => {
        setMemberLabel(undefined);
        updateFilters({ userId: undefined });
      },
    },
    {
      key: "date",
      label: "Date",
      value: dateLabel,
      onPress: () => setShowDatePicker(true),
      onClear: () => updateFilters({ fromDate: undefined, toDate: undefined }),
    },
  ];

  const hasQuery = filters.q.trim().length > 0;
  const showEmpty = !hasQuery && results.length === 0 && !loading;
  const showNoResults = hasQuery && results.length === 0 && !loading && !error;
  const showInitialLoading = loading && results.length === 0;

  return (
    <View testID="search-screen" style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      {/* Dark header area */}
      <View style={{ backgroundColor: theme.colors.headerBg, paddingTop: insets.top }}>
        {/* Search input row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "rgba(255,255,255,0.95)",
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: 8,
            }}
          >
            <Search size={16} color="#999" />
            <TextInput
              ref={inputRef}
              testID="search-input"
              placeholder="Search messages..."
              placeholderTextColor="#999"
              value={filters.q}
              onChangeText={(text) => updateFilters({ q: text })}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              style={{
                flex: 1,
                fontSize: 16,
                color: "#1D1C1D",
                paddingHorizontal: 8,
                paddingVertical: 0,
              }}
            />
            {filters.q.length > 0 && (
              <Pressable testID="search-clear-button" onPress={handleClear} hitSlop={8}>
                <X size={16} color="#999" />
              </Pressable>
            )}
          </View>
          <Pressable onPress={handleCancel} hitSlop={8} style={{ marginLeft: 12 }}>
            <Text style={{ color: theme.colors.headerText, fontSize: 16 }}>Cancel</Text>
          </Pressable>
        </View>

        {/* Filter chips on dark background */}
        <ScrollView
          testID="filter-chips"
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 10, gap: 8 }}
          style={{ flexGrow: 0 }}
        >
          {chipDefs.map((chip) => {
            const active = Boolean(chip.value);
            return (
              <View key={chip.key} style={{ flexDirection: "row" }}>
                <Pressable
                  testID={`filter-chip-${chip.key}`}
                  onPress={chip.onPress}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                    backgroundColor: active
                      ? "rgba(255,255,255,0.35)"
                      : "rgba(255,255,255,0.15)",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      color: "#FFFFFF",
                      fontWeight: active ? "600" : "400",
                    }}
                    numberOfLines={1}
                  >
                    {chip.value ?? chip.label}
                  </Text>
                  {active && (
                    <Pressable
                      testID={`filter-chip-clear-${chip.key}`}
                      onPress={() => chip.onClear()}
                      hitSlop={8}
                      style={{ marginLeft: 6 }}
                    >
                      <X size={12} color="#FFFFFF" />
                    </Pressable>
                  )}
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Pre-search state */}
      {showEmpty && (
        <View style={{ flex: 1, padding: 20 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: theme.colors.textSecondary,
              marginBottom: 12,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Recent searches
          </Text>
          <Text style={{ fontSize: 15, color: theme.colors.textFaint, marginBottom: 24 }}>
            Try searching for messages
          </Text>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: theme.colors.textSecondary,
              marginBottom: 12,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Browse
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
            {[
              { label: "Channels", icon: <Hash size={24} color={theme.colors.textSecondary} />, route: routes.browse(workspaceSlug!) },
              { label: "People", icon: <AtSign size={24} color={theme.colors.textSecondary} />, route: `/(app)/${workspaceSlug}/(tabs)/(dms)` },
              { label: "Files", icon: <Paperclip size={24} color={theme.colors.textSecondary} />, route: routes.files(workspaceSlug!) },
            ].map((item) => (
              <Pressable
                key={item.label}
                testID={`browse-card-${item.label.toLowerCase()}`}
                onPress={() => router.push(item.route as any)}
                style={{
                  width: 100,
                  height: 80,
                  borderRadius: 12,
                  backgroundColor: theme.colors.surfaceSecondary,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                <View style={{ marginBottom: 4 }}>{item.icon}</View>
                <Text style={{ fontSize: 13, color: theme.colors.textSecondary, fontWeight: "500" }}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {showInitialLoading && (
        <ActivityIndicator
          testID="search-loading"
          style={{ marginTop: 32 }}
          size="large"
          color={theme.brand.primary}
        />
      )}

      {error && (
        <View testID="search-error" style={{ padding: 16, alignItems: "center" }}>
          <Text style={{ color: theme.colors.dangerText, textAlign: "center", marginBottom: 12 }}>{error}</Text>
          <Pressable testID="search-retry" onPress={() => updateFilters({ q: filters.q })}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: theme.brand.primary }}>Retry</Text>
          </Pressable>
        </View>
      )}

      {showNoResults && (
        <View testID="search-no-results" style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Text style={{ fontSize: 16, color: theme.colors.textFaint, textAlign: "center" }}>
            No results found
          </Text>
        </View>
      )}

      {results.length > 0 && (
        <>
          <Text
            testID="search-result-count"
            style={{ fontSize: 12, color: theme.colors.textFaint, paddingHorizontal: 16, paddingVertical: 8 }}
          >
            {total} result{total !== 1 ? "s" : ""}
          </Text>
          <FlatList
            testID="search-results-list"
            data={results}
            keyExtractor={(item) => item.messageId}
            renderItem={({ item }) => (
              <Pressable
                testID={`search-result-${item.messageId}`}
                onPress={() => handleResultPress(item)}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                  flexDirection: "row",
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderBottomWidth: 0.5,
                  borderBottomColor: theme.colors.borderDefault,
                })}
              >
                {/* Avatar circle */}
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: theme.colors.avatarFallbackBg,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                    marginTop: 2,
                  }}
                >
                  <Text style={{ color: theme.colors.avatarFallbackText, fontSize: 14, fontWeight: "600" }}>
                    {getInitials(item.userDisplayName)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
                    <Text
                      style={{ fontSize: 13, color: theme.colors.textSecondary, flex: 1 }}
                      numberOfLines={1}
                    >
                      {item.channelType !== "dm" ? "# " : ""}{item.channelName}
                    </Text>
                    <Text style={{ fontSize: 12, color: theme.colors.textFaint, marginLeft: 8 }}>
                      {formatRelativeTime(item.createdAt)}
                    </Text>
                  </View>
                  <Text
                    style={{ fontSize: 14, fontWeight: "600", color: theme.colors.textPrimary, marginBottom: 2 }}
                    numberOfLines={1}
                  >
                    {item.userDisplayName}
                  </Text>
                  <HeadlineRenderer headline={item.headline} />
                </View>
              </Pressable>
            )}
            onEndReached={hasMore ? loadMore : undefined}
            onEndReachedThreshold={0.3}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          />
        </>
      )}

      {/* Modals */}
      <ChannelPickerModal
        visible={showChannelPicker}
        onClose={() => setShowChannelPicker(false)}
        onSelect={(id, name) => {
          setChannelLabel(name);
          updateFilters({ channelId: id });
          setShowChannelPicker(false);
        }}
        channels={channels}
        dms={dms}
      />
      <MemberPickerModal
        visible={showMemberPicker}
        onClose={() => setShowMemberPicker(false)}
        onSelect={(userId, displayName) => {
          setMemberLabel(displayName);
          updateFilters({ userId });
          setShowMemberPicker(false);
        }}
        workspaceSlug={workspaceSlug}
      />
      <DatePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onApply={(fromDate, toDate) => {
          updateFilters({ fromDate, toDate });
          setShowDatePicker(false);
        }}
        initialFrom={filters.fromDate}
        initialTo={filters.toDate}
      />
    </View>
  );
}
