import { useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { GoogleIcon, GitHubIcon, AppleIcon } from "@/components/ui/BrandIcons";
import { env } from "@/lib/env";

type AuthStep = "email" | "otp";

export default function SignInScreen() {
  const { sendOtp, verifyOtp, signInWithApple, signInWithOAuth, devQuickSignIn } = useAuth();
  const { theme } = useMobileTheme();
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [nonce, setNonce] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const n = await sendOtp(email.trim());
      setNonce(n);
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code");
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
      setError(err instanceof Error ? err.message : "Verification failed");
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
      setError(err instanceof Error ? err.message : "OAuth failed");
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
      setError(err instanceof Error ? err.message : "Apple sign-in failed");
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
      setError(err instanceof Error ? err.message : "Dev sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep("email");
    setOtpCode("");
    setNonce("");
    setError(null);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: theme.colors.surface }}
    >
      <View testID="sign-in-screen" style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 32 }}>
        {__DEV__ && env.EXPO_PUBLIC_E2E_TEST_SECRET && (
          <Pressable
            testID="dev-quick-sign-in"
            onPress={handleDevQuickSignIn}
            disabled={loading}
            style={{
              backgroundColor: "#f59e0b",
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              opacity: loading ? 0.7 : 1,
            }}
          >
            <Text style={{ color: "#000", fontWeight: "600", textAlign: "center", fontSize: 14 }}>
              Dev Quick Sign In
            </Text>
          </Pressable>
        )}

        <Text style={{ color: theme.colors.textPrimary, fontSize: 30, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>
          OpenSlaq
        </Text>
        <Text style={{ color: theme.colors.textMuted, textAlign: 'center', marginBottom: 32 }}>
          {step === "email"
            ? "Sign in to your workspace"
            : `Enter the code sent to ${email}`}
        </Text>

        {error && (
          <View
            testID="error-view"
            style={{
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              backgroundColor: theme.colors.dangerBg,
              borderColor: theme.colors.dangerBorder,
              borderWidth: 1,
            }}
          >
            <Text style={{ fontSize: 14, color: theme.colors.dangerText }}>{error}</Text>
          </View>
        )}

        {step === "email" ? (
          <>
            <Input
              testID="email-input"
              style={{ marginBottom: 16 }}
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
              style={{ marginBottom: 12, opacity: loading ? 0.7 : 1 }}
            />
          </>
        ) : (
          <>
            <Input
              testID="otp-input"
              style={{ marginBottom: 16 }}
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
              style={{ marginBottom: 12, opacity: loading ? 0.7 : 1 }}
            />

            <Pressable testID="back-button" onPress={handleBack} disabled={loading}>
              <Text style={{ textAlign: 'center', fontSize: 14, color: theme.brand.primary }}>
                Back
              </Text>
            </Pressable>
          </>
        )}

        {loading && <ActivityIndicator color={theme.brand.primary} style={{ marginBottom: 12 }} />}

        <View style={{ marginVertical: 24, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.borderDefault }} />
          <Text style={{ marginHorizontal: 16, fontSize: 14, color: theme.colors.textFaint }}>or</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.borderDefault }} />
        </View>

        <Button
          label="Continue with Google"
          icon={<GoogleIcon />}
          onPress={() => handleOAuth("google")}
          disabled={loading}
          variant="outline"
          style={{ marginBottom: 12 }}
        />

        <Button
          label="Continue with GitHub"
          icon={<GitHubIcon color={theme.colors.textPrimary} />}
          onPress={() => handleOAuth("github")}
          disabled={loading}
          variant="outline"
          style={{ marginBottom: 12 }}
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
      </View>
    </KeyboardAvoidingView>
  );
}
