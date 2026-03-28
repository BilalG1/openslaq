import { useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useServer } from "@/contexts/ServerContext";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { GoogleIcon, GitHubIcon, AppleIcon } from "@/components/ui/BrandIcons";
import { ChevronLeft } from "lucide-react-native";
import { env } from "@/lib/env";
import type { MobileTheme } from "@openslaq/shared";

type AuthStep = "email" | "otp" | "custom-server" | "builtin-signin" | "builtin-signup";

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return fallback;
}

export default function SignInScreen() {
  const { sendOtp, verifyOtp, signInWithApple, signInWithOAuth, signInWithPassword, signUp, devQuickSignIn } = useAuth();
  const { activeServer, isCloudServer, addServer, resetToCloud } = useServer();
  const { theme } = useMobileTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [nonce, setNonce] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const styles = makeStyles(theme);

  const isBuiltinAuth = activeServer.authType === "builtin";

  const handleSendOtp = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const n = await sendOtp(email.trim());
      setNonce(n);
      setStep("otp");
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to send code"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await verifyOtp(otpCode.trim(), nonce);
    } catch (err) {
      setError(extractErrorMessage(err, "Verification failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: string) => {
    setLoading(true);
    setError(null);
    try {
      await signInWithOAuth(provider);
    } catch (err) {
      setError(extractErrorMessage(err, "OAuth failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithApple();
    } catch (err) {
      setError(extractErrorMessage(err, "Apple sign-in failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleDevQuickSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await devQuickSignIn();
    } catch (err) {
      setError(extractErrorMessage(err, "Dev sign-in failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleConnectServer = async () => {
    if (!serverUrl.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await addServer(serverUrl.trim());
      // After adding, the server is now active — reset to appropriate auth step
      setStep("email");
      setServerUrl("");
    } catch (err) {
      setError(extractErrorMessage(err, "Could not connect to server"));
    } finally {
      setLoading(false);
    }
  };

  const handleBackToCloud = async () => {
    setError(null);
    await resetToCloud();
    setStep("email");
  };

  const handleBuiltinSignIn = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);
    try {
      await signInWithPassword(email.trim(), password);
    } catch (err) {
      setError(extractErrorMessage(err, "Sign-in failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleBuiltinSignUp = async () => {
    if (!email.trim() || !password || !displayName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await signUp(email.trim(), password, displayName.trim());
    } catch (err) {
      setError(extractErrorMessage(err, "Sign-up failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === "custom-server") {
      setStep("email");
      setServerUrl("");
    } else if (step === "builtin-signup") {
      setStep("builtin-signin");
    } else {
      setStep("email");
      setOtpCode("");
      setNonce("");
    }
    setError(null);
  };

  // --- Custom server URL input ---
  if (step === "custom-server") {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.kav}>
        <View testID="custom-server-screen" style={styles.inner}>
          <Text style={styles.title}>Custom Server</Text>
          <Text style={styles.subtitle}>Enter your server URL</Text>

          {error && (
            <View testID="error-view" style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Input
            testID="server-url-input"
            style={styles.inputMargin}
            placeholder="https://openslaq.example.com"
            value={serverUrl}
            onChangeText={setServerUrl}
            autoCapitalize="none"
            keyboardType="url"
            editable={!loading}
          />

          <Button
            testID="connect-server-button"
            label="Connect"
            onPress={handleConnectServer}
            disabled={loading || !serverUrl.trim()}
            style={styles.buttonMargin}
          />

          {loading && <ActivityIndicator color={theme.brand.primary} style={styles.buttonMargin} />}

          <Pressable testID="back-button" onPress={handleBack} disabled={loading} accessibilityRole="button" accessibilityLabel="Back" accessibilityHint="Goes back to previous step">
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // --- Builtin auth (email/password) for self-hosted servers ---
  if (isBuiltinAuth) {
    const isSignUp = step === "builtin-signup";
    return (
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.kav}>
        <View testID="builtin-auth-screen" style={styles.inner}>
          <Text style={styles.title}>{isSignUp ? "Create Account" : "Sign In"}</Text>
          <Text style={styles.subtitle}>{activeServer.url}</Text>

          {error && (
            <View testID="error-view" style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {isSignUp && (
            <Input
              testID="display-name-input"
              style={styles.inputMargin}
              placeholder="Display name"
              value={displayName}
              onChangeText={setDisplayName}
              editable={!loading}
            />
          )}

          <Input
            testID="email-input"
            style={styles.inputMargin}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            editable={!loading}
          />

          <Input
            testID="password-input"
            style={styles.inputMargin}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />

          <Button
            testID="submit-button"
            label={isSignUp ? "Create Account" : "Sign In"}
            onPress={isSignUp ? handleBuiltinSignUp : handleBuiltinSignIn}
            disabled={loading}
            style={[styles.buttonMargin, loading && styles.loadingOpacity]}
          />

          {loading && <ActivityIndicator color={theme.brand.primary} style={styles.buttonMargin} />}

          <Pressable
            testID="toggle-signup-button"
            onPress={() => {
              setStep(isSignUp ? "builtin-signin" : "builtin-signup");
              setError(null);
            }}
            accessibilityRole="button"
          >
            <Text style={styles.backText}>
              {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </Text>
          </Pressable>
        </View>
        <Pressable
          testID="back-to-cloud-button"
          onPress={handleBackToCloud}
          accessibilityRole="button"
          accessibilityLabel="Back"
          accessibilityHint="Returns to cloud sign in"
          style={[styles.backButton, { top: insets.top + 8 }]}
        >
          <ChevronLeft size={28} color={theme.colors.textPrimary} />
        </Pressable>
      </KeyboardAvoidingView>
    );
  }

  // --- Stack Auth sign-in (default / cloud) ---
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.kav}
    >
      <View testID="sign-in-screen" style={styles.inner}>

        {__DEV__ && env.EXPO_PUBLIC_E2E_TEST_SECRET && (
          <Pressable
            testID="dev-quick-sign-in"
            onPress={handleDevQuickSignIn}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Dev Quick Sign In"
            accessibilityHint="Signs in with test credentials"
            style={[styles.devButton, loading && styles.loadingOpacity]}
          >
            <Text style={styles.devButtonText}>
              Dev Quick Sign In
            </Text>
          </Pressable>
        )}

        <Text style={styles.title}>
          OpenSlaq
        </Text>
        <Text style={styles.subtitle}>
          {step === "email"
            ? "Sign in to your workspace"
            : `Enter the code sent to ${email}`}
        </Text>

        {error && (
          <View testID="error-view" style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {step === "email" ? (
          <>
            <Input
              testID="email-input"
              style={styles.inputMargin}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              editable={!loading}
            />

            <Button
              testID="submit-button"
              label="Continue"
              onPress={handleSendOtp}
              disabled={loading}
              style={[styles.buttonMargin, loading && styles.loadingOpacity]}
            />
          </>
        ) : (
          <>
            <Input
              testID="otp-input"
              style={styles.inputMargin}
              placeholder="Verification code"
              value={otpCode}
              onChangeText={setOtpCode}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />

            <Button
              testID="verify-button"
              label="Verify"
              onPress={handleVerifyOtp}
              disabled={loading}
              style={[styles.buttonMargin, loading && styles.loadingOpacity]}
            />

            <Pressable testID="back-button" onPress={handleBack} disabled={loading} accessibilityRole="button" accessibilityLabel="Back" accessibilityHint="Goes back to email entry">
              <Text style={styles.backText}>
                Back
              </Text>
            </Pressable>
          </>
        )}

        {loading && <ActivityIndicator color={theme.brand.primary} style={styles.buttonMargin} />}

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <Button
          label="Continue with Google"
          icon={<GoogleIcon />}
          onPress={() => handleOAuth("google")}
          disabled={loading}
          variant="outline"
          style={styles.buttonMargin}
        />

        <Button
          label="Continue with GitHub"
          icon={<GitHubIcon color={theme.colors.textPrimary} />}
          onPress={() => handleOAuth("github")}
          disabled={loading}
          variant="outline"
          style={styles.buttonMargin}
        />

        {Platform.OS === "ios" && (
          <Button
            testID="apple-sign-in"
            label="Continue with Apple"
            icon={<AppleIcon color={theme.colors.textPrimary} />}
            onPress={handleAppleSignIn}
            disabled={loading}
            variant="outline"
          />
        )}

        {/* Custom server button — small, at the bottom */}
        {isCloudServer && (
          <Pressable
            testID="custom-server-button"
            onPress={() => { setStep("custom-server"); setError(null); }}
            style={styles.customServerButton}
            accessibilityRole="button"
            accessibilityLabel="Custom server"
            accessibilityHint="Connect to a self-hosted server"
          >
            <Text style={styles.customServerText}>Custom server</Text>
          </Pressable>
        )}
      </View>
      {!isCloudServer && (
        <Pressable
          testID="back-to-cloud-button"
          onPress={handleBackToCloud}
          accessibilityRole="button"
          accessibilityLabel="Back"
          accessibilityHint="Returns to cloud sign in"
          style={[styles.backButton, { top: insets.top + 8 }]}
        >
          <ChevronLeft size={28} color={theme.colors.textPrimary} />
        </Pressable>
      )}
    </KeyboardAvoidingView>
  );
}

const makeStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    kav: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    inner: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 32,
    },
    devButton: {
      backgroundColor: theme.colors.warningBg,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    devButtonText: {
      color: theme.colors.warningText,
      fontWeight: "600",
      textAlign: "center",
      fontSize: 14,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 30,
      fontWeight: "bold",
      textAlign: "center",
      marginBottom: 8,
    },
    subtitle: {
      color: theme.colors.textMuted,
      textAlign: "center",
      marginBottom: 32,
    },
    errorBox: {
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      backgroundColor: theme.colors.dangerBg,
      borderColor: theme.colors.dangerBorder,
      borderWidth: 1,
    },
    errorText: {
      fontSize: 14,
      color: theme.colors.dangerText,
    },
    inputMargin: {
      marginBottom: 16,
    },
    buttonMargin: {
      marginBottom: 12,
    },
    loadingOpacity: {
      opacity: 0.7,
    },
    backText: {
      textAlign: "center",
      fontSize: 14,
      color: theme.brand.primary,
    },
    dividerRow: {
      marginVertical: 24,
      flexDirection: "row",
      alignItems: "center",
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.borderDefault,
    },
    dividerText: {
      marginHorizontal: 16,
      fontSize: 14,
      color: theme.colors.textFaint,
    },
    customServerButton: {
      marginTop: 24,
      alignSelf: "center",
    },
    customServerText: {
      fontSize: 13,
      color: theme.colors.textMuted,
    },
    backButton: {
      position: "absolute" as const,
      left: 12,
      zIndex: 10,
      padding: 4,
    },
  });
