import type { GlobalNotificationPreferences } from "@openslaq/shared";
import { authorizedRequest } from "../api/api-client";
import type { ApiDeps } from "./types";

export async function registerPushToken(
  deps: ApiDeps,
  token: string,
  platform: "ios" = "ios",
): Promise<void> {
  const { api, auth } = deps;

  await authorizedRequest(auth, (headers) =>
    api.api["push-tokens"].$post({ json: { token, platform } }, { headers }),
  );
}

export async function unregisterPushToken(
  deps: ApiDeps,
  token: string,
): Promise<void> {
  const { api, auth } = deps;

  await authorizedRequest(auth, (headers) =>
    api.api["push-tokens"].$delete({ json: { token } }, { headers }),
  );
}

export async function getGlobalNotificationPrefs(
  deps: ApiDeps,
): Promise<GlobalNotificationPreferences> {
  const { api, auth } = deps;

  const response = await authorizedRequest(auth, (headers) =>
    api.api.users.me["notification-preferences"].$get({}, { headers }),
  );
  return (await response.json()) as GlobalNotificationPreferences;
}

export async function updateGlobalNotificationPrefs(
  deps: ApiDeps,
  prefs: Partial<GlobalNotificationPreferences>,
): Promise<GlobalNotificationPreferences> {
  const { api, auth } = deps;

  const response = await authorizedRequest(auth, (headers) =>
    api.api.users.me["notification-preferences"].$put(
      { json: prefs },
      { headers },
    ),
  );
  return (await response.json()) as GlobalNotificationPreferences;
}
