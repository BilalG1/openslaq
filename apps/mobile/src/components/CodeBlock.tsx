import { memo, useMemo } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import SyntaxHighlighter from "react-native-syntax-highlighter";
import { atomOneDark, atomOneLight } from "react-syntax-highlighter/styles/hljs";
import type { MobileTheme } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";

interface Props {
  language?: string;
  children: string;
}

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    container: {
      borderRadius: 6,
      overflow: "hidden",
      marginVertical: 4,
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
    },
    languageHeader: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: theme.colors.codeHeaderBg,
    },
    languageLabel: {
      fontSize: 11,
      color: theme.colors.textFaint,
    },
    highlighterCustom: {
      padding: 10,
      margin: 0,
      backgroundColor: theme.colors.codeBg,
    },
  });

function CodeBlockInner({ language, children }: Props) {
  const { mode, theme } = useMobileTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const highlighterStyle = mode === "dark" ? atomOneDark : atomOneLight;
  const lang = language ?? "text";

  return (
    <View testID="code-block" style={styles.container}>
      {language && (
        <View style={styles.languageHeader}>
          <Text style={styles.languageLabel}>{language}</Text>
        </View>
      )}
      <SyntaxHighlighter
        language={lang}
        style={highlighterStyle}
        fontSize={13}
        highlighter="hljs"
        customStyle={styles.highlighterCustom}
        {...({ PreTag: ScrollView, CodeTag: ScrollView } as Record<string, unknown>)}
      >
        {children}
      </SyntaxHighlighter>
    </View>
  );
}

export const CodeBlock = memo(CodeBlockInner);
