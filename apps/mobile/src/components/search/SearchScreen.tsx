import { useState, useRef, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
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
import { useChatStore } from "@/contexts/ChatStoreProvider";
import { HeadlineRenderer } from "./HeadlineRenderer";
import { ChannelPickerModal } from "./ChannelPickerModal";
import { MemberPickerModal } from "./MemberPickerModal";
import { DatePickerModal } from "./DatePickerModal";
import { routes } from "@/lib/routes";
import { formatRelativeTime } from "@/lib/time";

import { WHITE, SEARCH_BAR_BG, CHIP_ACTIVE_BG, CHIP_INACTIVE_BG } from "@/theme/constants";
const SEARCH_ICON_COLOR = "#999";
const SEARCH_TEXT_COLOR = "#1D1C1D";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  return name.trim()[0]?.toUpperCase() ?? "?";
}

export function SearchScreen() {
  const { workspaceSlug } = useLocalSearchParams<{ workspaceSlug: string }>();
  const router = useRouter();
  const { dispatch } = useChatStore();
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
    recentSearches,
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
      dispatch({
        type: "navigation/setScrollTarget",
        scrollTarget: {
          channelId: item.channelId,
          messageId: item.messageId,
          highlightMessageId: item.messageId,
          parentMessageId: item.parentMessageId ?? null,
        },
      });

      if (item.parentMessageId) {
        router.push(routes.thread(workspaceSlug!, item.parentMessageId));
      } else if (item.channelType === "dm") {
        router.push(routes.dm(workspaceSlug!, item.channelId));
      } else {
        router.push(routes.channel(workspaceSlug!, item.channelId));
      }
    },
    [dispatch, router, workspaceSlug],
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
    <View testID="search-screen" style={[styles.screenContainer, { backgroundColor: theme.colors.surface }]}>
      {/* Dark header area */}
      <View style={{ backgroundColor: theme.colors.headerBg, paddingTop: insets.top }}>
        {/* Search input row */}
        <View style={styles.inputRow}>
          <View style={styles.searchBarContainer}>
            <Search size={16} color={SEARCH_ICON_COLOR} />
            <TextInput
              ref={inputRef}
              testID="search-input"
              accessibilityLabel="Search messages"
              accessibilityHint="Type to search messages"
              placeholder="Search messages..."
              placeholderTextColor={SEARCH_ICON_COLOR}
              value={filters.q}
              onChangeText={(text) => updateFilters({ q: text })}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              style={styles.searchInput}
            />
            {filters.q.length > 0 && (
              <Pressable
                testID="search-clear-button"
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                accessibilityHint="Clears the search text"
                onPress={handleClear}
                hitSlop={8}
              >
                <X size={16} color={SEARCH_ICON_COLOR} />
              </Pressable>
            )}
          </View>
          <Pressable
            onPress={handleCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancel search"
            accessibilityHint="Closes the search screen"
            hitSlop={8}
            style={styles.cancelButton}
          >
            <Text style={[styles.cancelText, { color: theme.colors.headerText }]}>Cancel</Text>
          </Pressable>
        </View>

        {/* Filter chips on dark background */}
        <ScrollView
          testID="filter-chips"
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScrollContent}
          style={styles.chipScrollView}
        >
          {chipDefs.map((chip) => {
            const active = Boolean(chip.value);
            return (
              <View key={chip.key} style={styles.chipRow}>
                <Pressable
                  testID={`filter-chip-${chip.key}`}
                  accessibilityRole="button"
                  accessibilityLabel={chip.value ?? chip.label}
                  accessibilityHint={active ? "Tap to change filter" : `Tap to filter by ${chip.label}`}
                  onPress={chip.onPress}
                  style={[
                    styles.chipPressable,
                    { backgroundColor: active ? CHIP_ACTIVE_BG : CHIP_INACTIVE_BG },
                  ]}
                >
                  <Text
                    style={active ? styles.chipTextActive : styles.chipText}
                    numberOfLines={1}
                  >
                    {chip.value ?? chip.label}
                  </Text>
                  {active && (
                    <Pressable
                      testID={`filter-chip-clear-${chip.key}`}
                      accessibilityRole="button"
                      accessibilityLabel={`Clear ${chip.label} filter`}
                      accessibilityHint="Removes this filter"
                      onPress={() => chip.onClear()}
                      hitSlop={8}
                      style={styles.chipClearButton}
                    >
                      <X size={12} color={WHITE} />
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
        <View style={styles.emptyContainer}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            Recent searches
          </Text>
          {recentSearches.length === 0 ? (
            <Text style={[styles.emptyHint, { color: theme.colors.textFaint }]}>
              Try searching for messages
            </Text>
          ) : (
            <View style={styles.recentSearchesList}>
              {recentSearches.map((query) => (
                <Pressable
                  key={query}
                  testID={`recent-search-${query}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Search for ${query}`}
                  accessibilityHint="Taps to search for this query"
                  onPress={() => updateFilters({ q: query })}
                  style={styles.recentSearchRow}
                >
                  <Search size={14} color={theme.colors.textFaint} />
                  <Text style={[styles.recentSearchText, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                    {query}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            Browse
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScrollView}>
            {[
              { label: "Channels", icon: <Hash size={24} color={theme.colors.textSecondary} />, route: routes.browse(workspaceSlug!) },
              { label: "People", icon: <AtSign size={24} color={theme.colors.textSecondary} />, route: `/(app)/${workspaceSlug}/(tabs)/(dms)` },
              { label: "Files", icon: <Paperclip size={24} color={theme.colors.textSecondary} />, route: routes.files(workspaceSlug!) },
            ].map((item) => (
              <Pressable
                key={item.label}
                testID={`browse-card-${item.label.toLowerCase()}`}
                accessibilityRole="button"
                accessibilityLabel={`Browse ${item.label}`}
                accessibilityHint={`Navigate to ${item.label}`}
                onPress={() => router.push(item.route as any)}
                style={[styles.browseCard, { backgroundColor: theme.colors.surfaceSecondary }]}
              >
                <View style={styles.browseCardIcon}>{item.icon}</View>
                <Text style={[styles.browseCardLabel, { color: theme.colors.textSecondary }]}>
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
          style={styles.loadingIndicator}
          size="large"
          color={theme.brand.primary}
        />
      )}

      {error && (
        <View testID="search-error" style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.dangerText }]}>{error}</Text>
          <Pressable
            testID="search-retry"
            accessibilityRole="button"
            accessibilityLabel="Retry search"
            accessibilityHint="Retries the failed search"
            onPress={() => updateFilters({ q: filters.q })}
          >
            <Text style={[styles.retryText, { color: theme.brand.primary }]}>Retry</Text>
          </Pressable>
        </View>
      )}

      {showNoResults && (
        <View testID="search-no-results" style={styles.noResultsContainer}>
          <Text style={[styles.noResultsText, { color: theme.colors.textFaint }]}>
            No results found
          </Text>
        </View>
      )}

      {results.length > 0 && (
        <>
          <Text
            testID="search-result-count"
            style={[styles.resultCount, { color: theme.colors.textFaint }]}
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
                accessibilityRole="button"
                accessibilityLabel={`Message from ${item.userDisplayName}`}
                accessibilityHint="Opens this message"
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
                <View style={[styles.resultAvatar, { backgroundColor: theme.colors.avatarFallbackBg }]}>
                  <Text style={[styles.resultAvatarText, { color: theme.colors.avatarFallbackText }]}>
                    {getInitials(item.userDisplayName)}
                  </Text>
                </View>
                <View style={styles.resultContent}>
                  <View style={styles.resultHeaderRow}>
                    <Text
                      style={[styles.resultChannelName, { color: theme.colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {item.channelType !== "dm" ? "# " : ""}{item.channelName}
                    </Text>
                    <Text style={[styles.resultTimestamp, { color: theme.colors.textFaint }]}>
                      {formatRelativeTime(item.createdAt)}
                    </Text>
                  </View>
                  <Text
                    style={[styles.resultSenderName, { color: theme.colors.textPrimary }]}
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

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SEARCH_BAR_BG,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: SEARCH_TEXT_COLOR,
    paddingHorizontal: 8,
    paddingVertical: 0,
  },
  cancelButton: {
    marginLeft: 12,
  },
  cancelText: {
    fontSize: 16,
  },
  chipScrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 8,
  },
  chipScrollView: {
    flexGrow: 0,
  },
  chipRow: {
    flexDirection: "row",
  },
  chipPressable: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: {
    fontSize: 13,
    color: WHITE,
    fontWeight: "400",
  },
  chipTextActive: {
    fontSize: 13,
    color: WHITE,
    fontWeight: "600",
  },
  chipClearButton: {
    marginLeft: 6,
  },
  emptyContainer: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emptyHint: {
    fontSize: 15,
    marginBottom: 24,
  },
  recentSearchesList: {
    marginBottom: 24,
  },
  recentSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 10,
  },
  recentSearchText: {
    fontSize: 15,
    flex: 1,
  },
  browseCard: {
    width: 100,
    height: 80,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  browseCardIcon: {
    marginBottom: 4,
  },
  browseCardLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  loadingIndicator: {
    marginTop: 32,
  },
  errorContainer: {
    padding: 16,
    alignItems: "center",
  },
  errorText: {
    textAlign: "center",
    marginBottom: 12,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
  },
  noResultsContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  noResultsText: {
    fontSize: 16,
    textAlign: "center",
  },
  resultCount: {
    fontSize: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 2,
  },
  resultAvatarText: {
    fontSize: 14,
    fontWeight: "600",
  },
  resultContent: {
    flex: 1,
  },
  resultHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  resultChannelName: {
    fontSize: 13,
    flex: 1,
  },
  resultTimestamp: {
    fontSize: 12,
    marginLeft: 8,
  },
  resultSenderName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
});
