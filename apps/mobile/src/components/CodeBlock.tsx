import { memo } from "react";
import { View, Text, ScrollView } from "react-native";
import SyntaxHighlighter from "react-native-syntax-highlighter";
import { atomOneDark, atomOneLight } from "react-syntax-highlighter/styles/hljs";
import { useMobileTheme } from "@/theme/ThemeProvider";

interface Props {
  language?: string;
  children: string;
}

function CodeBlockInner({ language, children }: Props) {
  const { mode, theme } = useMobileTheme();
  const isDark = mode === "dark";
  const highlighterStyle = isDark ? atomOneDark : atomOneLight;
  const lang = language ?? "text";

  return (
    <View
      testID="code-block"
      style={{
        borderRadius: 6,
        overflow: "hidden",
        marginVertical: 4,
        borderWidth: 1,
        borderColor: theme.colors.borderDefault,
      }}
    >
      {language && (
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 4,
            backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
          }}
        >
          <Text style={{ fontSize: 11, color: theme.colors.textFaint }}>{language}</Text>
        </View>
      )}
      <SyntaxHighlighter
        language={lang}
        style={highlighterStyle}
        fontSize={13}
        highlighter="hljs"
        customStyle={{
          padding: 10,
          margin: 0,
          backgroundColor: isDark ? "#282c34" : "#fafafa",
        }}
        {...({ PreTag: ScrollView, CodeTag: ScrollView } as Record<string, unknown>)}
      >
        {children}
      </SyntaxHighlighter>
    </View>
  );
}

export const CodeBlock = memo(CodeBlockInner);
