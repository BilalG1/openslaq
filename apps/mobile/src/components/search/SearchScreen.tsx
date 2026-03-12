import { useState, useRef, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { SearchResultItem } from "@openslaq/shared";
import { ArrowLeft, X } from "lucide-react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { useSearch } from "@/hooks/useSearch";
import { FilterChips } from "./FilterChips";
import { SearchResultItem as ResultRow } from "./SearchResultItem";
import { ChannelPickerModal } from "./ChannelPickerModal";
import { MemberPickerModal } from "./MemberPickerModal";
import { DatePickerModal } from "./DatePickerModal";

export function SearchScreen() {
  const { workspaceSlug } = useLocalSearchParams<{ workspaceSlug: string }>();
  const router = useRouter();
  const { theme } = useMobileTheme();
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

  // Track display labels for active filters
  const [channelLabel, setChannelLabel] = useState<string | undefined>();
  const [memberLabel, setMemberLabel] = useState<string | undefined>();

  const handleBack = () => {
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
        router.push(`/(app)/${workspaceSlug}/thread/${item.parentMessageId}`);
      } else if (item.channelType === "dm") {
        router.push(`/(app)/${workspaceSlug}/(tabs)/(channels)/dm/${item.channelId}`);
      } else {
        router.push(`/(app)/${workspaceSlug}/(tabs)/(channels)/${item.channelId}`);
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

  const renderFooter = () => {
    if (!loading || results.length === 0) return null;
    return (
      <ActivityIndicator
        testID="search-loading-more"
        style={{ paddingVertical: 16 }}
        color={theme.brand.primary}
      />
    );
  };

  const hasQuery = filters.q.trim().length > 0;
  const showEmpty = !hasQuery && results.length === 0 && !loading;
  const showNoResults = hasQuery && results.length === 0 && !loading && !error;
  const showInitialLoading = loading && results.length === 0;

  return (
    <SafeAreaView testID="search-screen" style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.borderDefault,
        }}
      >
        <Pressable testID="search-back-button" onPress={handleBack} hitSlop={8} style={{ padding: 4 }}>
          <ArrowLeft size={24} color={theme.brand.primary} />
        </Pressable>
        <TextInput
          ref={inputRef}
          testID="search-input"
          placeholder="Search messages..."
          placeholderTextColor={theme.colors.textFaint}
          value={filters.q}
          onChangeText={(text) => updateFilters({ q: text })}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={{
            flex: 1,
            fontSize: 16,
            color: theme.colors.textPrimary,
            paddingHorizontal: 8,
            paddingVertical: 8,
          }}
        />
        {filters.q.length > 0 && (
          <Pressable testID="search-clear-button" onPress={handleClear} hitSlop={8} style={{ padding: 4 }}>
            <X size={18} color={theme.colors.textFaint} />
          </Pressable>
        )}
      </View>

      {/* Filter chips */}
      <FilterChips chips={chipDefs} />

      {/* Results */}
      {showEmpty && (
        <View testID="search-empty-state" style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Text style={{ fontSize: 16, color: theme.colors.textFaint, textAlign: "center" }}>
            Search messages across channels
          </Text>
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
        <View testID="search-error" style={{ padding: 16 }}>
          <Text style={{ color: theme.colors.dangerText, textAlign: "center" }}>{error}</Text>
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
            style={{ fontSize: 12, color: theme.colors.textFaint, paddingHorizontal: 16, paddingVertical: 4 }}
          >
            {total} result{total !== 1 ? "s" : ""}
          </Text>
          <FlatList
            testID="search-results-list"
            data={results}
            keyExtractor={(item) => item.messageId}
            renderItem={({ item }) => <ResultRow item={item} onPress={handleResultPress} />}
            onEndReached={hasMore ? loadMore : undefined}
            onEndReachedThreshold={0.3}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            ListFooterComponent={renderFooter}
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
    </SafeAreaView>
  );
}
