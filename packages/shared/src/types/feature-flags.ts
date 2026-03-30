export const FEATURE_FLAG_REGISTRY = {
  integrationGithub: { type: "boolean", default: "false", values: ["true", "false"] },
  integrationLinear: { type: "boolean", default: "false", values: ["true", "false"] },
  integrationSentry: { type: "boolean", default: "false", values: ["true", "false"] },
  integrationVercel: { type: "boolean", default: "false", values: ["true", "false"] },
  mobileMessageInput: { type: "variant", default: "default", values: ["default", "variant-a", "variant-b"] },
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAG_REGISTRY;

export type WorkspaceFeatureFlags = { [K in FeatureFlagKey]: string };

export const FEATURE_FLAG_KEYS = Object.keys(FEATURE_FLAG_REGISTRY) as FeatureFlagKey[];

export const PLUGIN_SLUG_TO_FLAG: Record<string, FeatureFlagKey> = {
  "github-bot": "integrationGithub",
  "linear-bot": "integrationLinear",
  "sentry-bot": "integrationSentry",
  "vercel-bot": "integrationVercel",
};

export function getFeatureFlagDefaults(): WorkspaceFeatureFlags {
  const defaults = {} as Record<string, string>;
  for (const key of FEATURE_FLAG_KEYS) {
    defaults[key] = FEATURE_FLAG_REGISTRY[key].default;
  }
  return defaults as WorkspaceFeatureFlags;
}

export function isValidFlagValue(key: string, value: string): boolean {
  const entry = FEATURE_FLAG_REGISTRY[key as FeatureFlagKey];
  if (!entry) return false;
  return (entry.values as readonly string[]).includes(value);
}

export function isFeatureFlagKey(key: string): key is FeatureFlagKey {
  return key in FEATURE_FLAG_REGISTRY;
}
