import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  sendDefaultPii: true,
  tracesSampleRate: 0,
  enableNativeCrashHandling: false,
  enableNativeNagger: false,
});

export { Sentry };
