export interface PushToken {
  id: string;
  userId: string;
  token: string;
  platform: "ios";
  createdAt: string;
  updatedAt: string;
}

export interface GlobalNotificationPreferences {
  pushEnabled: boolean;
  soundEnabled: boolean;
}

export interface RegisterPushTokenRequest {
  token: string;
  platform: "ios";
}
