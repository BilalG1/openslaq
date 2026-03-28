import { Text, StyleSheet } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";

interface Props {
  headline: string;
  style?: object;
}

interface Segment {
  text: string;
  highlighted: boolean;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseHeadline(html: string): Segment[] {
  const segments: Segment[] = [];
  const regex = /<mark>(.*?)<\/mark>/g;
  let lastIndex = 0;
  let match = regex.exec(html);

  while (match !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: decodeEntities(html.slice(lastIndex, match.index)), highlighted: false });
    }
    segments.push({ text: decodeEntities(match[1] ?? ""), highlighted: true });
    lastIndex = match.index + match[0].length;
    match = regex.exec(html);
  }

  if (lastIndex < html.length) {
    segments.push({ text: decodeEntities(html.slice(lastIndex)), highlighted: false });
  }

  if (segments.length === 0 && html.length > 0) {
    segments.push({ text: decodeEntities(html), highlighted: false });
  }

  return segments;
}

export function HeadlineRenderer({ headline, style }: Props) {
  const { theme } = useMobileTheme();
  const segments = parseHeadline(headline);

  return (
    <Text testID="headline-text" style={[styles.baseText, { color: theme.colors.textSecondary }, style]} numberOfLines={2}>
      {segments.map((segment, index) =>
        segment.highlighted ? (
          <Text
            key={index}
            testID="headline-mark"
            style={[styles.highlightedText, {
              backgroundColor: theme.brand.primary + "30",
              color: theme.colors.textPrimary,
            }]}
          >
            {segment.text}
          </Text>
        ) : (
          <Text key={index}>{segment.text}</Text>
        ),
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  baseText: {
    fontSize: 14,
  },
  highlightedText: {
    fontWeight: "600",
  },
});
