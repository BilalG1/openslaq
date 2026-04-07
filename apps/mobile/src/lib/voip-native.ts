import { NativeModules, NativeEventEmitter, Platform } from "react-native";

const { VoipCallModule } = NativeModules;

export const isVoipAvailable = Platform.OS === "ios" && !!VoipCallModule;

if (Platform.OS === "ios") {
  console.log("[voip-native] VoipCallModule available:", !!VoipCallModule);
  if (VoipCallModule) {
    console.log("[voip-native] endCall:", typeof VoipCallModule.endCall);
    console.log("[voip-native] getVoipToken:", typeof VoipCallModule.getVoipToken);
    // Test calling getVoipToken to see if it works
    VoipCallModule.getVoipToken().then(
      (token: string | null) => console.log("[voip-native] cached token:", token),
      (err: Error) => console.log("[voip-native] getVoipToken error:", err.message),
    );
  }
}

export function getVoipEmitter() {
  if (!isVoipAvailable) return null;
  return new NativeEventEmitter(VoipCallModule);
}

export function endCall(uuid: string) {
  if (!isVoipAvailable) return;
  VoipCallModule.endCall(uuid);
}

export function reportCallConnected(uuid: string) {
  if (!isVoipAvailable) return;
  VoipCallModule.reportCallConnected(uuid);
}
