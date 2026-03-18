import { describe, test, expect, mock, afterEach } from "bun:test";
import { render, screen, cleanup } from "../../test-utils";
import { IntegrationsTab } from "./IntegrationsTab";
import type { MarketplaceListing, WorkspaceFeatureFlags } from "@openslaq/shared";

const makeListing = (overrides: Partial<MarketplaceListing> & { id: string; slug: string; name: string }): MarketplaceListing =>
  ({
    published: true,
    description: "",
    avatarUrl: null,
    category: null,
    redirectUri: "",
    clientId: "",
    createdAt: "",
    updatedAt: "",
    ...overrides,
  }) as MarketplaceListing;

const githubListing = makeListing({ id: "1", slug: "github-bot", name: "GitHub Bot" });
const linearListing = makeListing({ id: "2", slug: "linear-bot", name: "Linear Bot" });
const pollListing = makeListing({ id: "3", slug: "poll-bot", name: "Poll Bot" });
const sentryListing = makeListing({ id: "4", slug: "sentry-bot", name: "Sentry Bot" });
const vercelListing = makeListing({ id: "5", slug: "vercel-bot", name: "Vercel Bot" });

const allListings = [githubListing, linearListing, pollListing, sentryListing, vercelListing];

const allDisabled: WorkspaceFeatureFlags = {
  integrationGithub: false,
  integrationLinear: false,
  integrationSentry: false,
  integrationVercel: false,
};

const allEnabled: WorkspaceFeatureFlags = {
  integrationGithub: true,
  integrationLinear: true,
  integrationSentry: true,
  integrationVercel: true,
};

const defaultProps = {
  listings: allListings,
  installedIds: new Set<string>(),
  installing: false,
  onInstall: mock(() => {}),
  onUninstall: mock(() => {}),
};

describe("IntegrationsTab", () => {
  afterEach(cleanup);

  test("listings with disabled flags are hidden", () => {
    render(<IntegrationsTab {...defaultProps} featureFlags={allDisabled} />);
    // Only non-gated listing should be visible in the listings section
    expect(screen.getByText("Poll Bot")).toBeTruthy();
    expect(screen.queryByText("GitHub Bot")).toBeNull();
    expect(screen.queryByText("Linear Bot")).toBeNull();
    expect(screen.queryByText("Sentry Bot")).toBeNull();
    expect(screen.queryByText("Vercel Bot")).toBeNull();
  });

  test("listings with enabled flags are visible", () => {
    render(<IntegrationsTab {...defaultProps} featureFlags={allEnabled} />);
    expect(screen.getByText("GitHub Bot")).toBeTruthy();
    expect(screen.getByText("Linear Bot")).toBeTruthy();
    expect(screen.getByText("Poll Bot")).toBeTruthy();
    expect(screen.getByText("Sentry Bot")).toBeTruthy();
    expect(screen.getByText("Vercel Bot")).toBeTruthy();
  });

  test("non-gated listings always appear", () => {
    render(<IntegrationsTab {...defaultProps} featureFlags={allDisabled} />);
    expect(screen.getByText("Poll Bot")).toBeTruthy();
  });

  test("partially enabled flags show correct listings", () => {
    const partialFlags: WorkspaceFeatureFlags = {
      integrationGithub: true,
      integrationLinear: false,
      integrationSentry: true,
      integrationVercel: false,
    };
    render(<IntegrationsTab {...defaultProps} featureFlags={partialFlags} />);
    expect(screen.getByText("GitHub Bot")).toBeTruthy();
    expect(screen.getByText("Sentry Bot")).toBeTruthy();
    expect(screen.getByText("Poll Bot")).toBeTruthy();
    expect(screen.queryByText("Linear Bot")).toBeNull();
    expect(screen.queryByText("Vercel Bot")).toBeNull();
  });

  test("shows count of visible integrations", () => {
    render(<IntegrationsTab {...defaultProps} featureFlags={allEnabled} />);
    expect(screen.getByText("Available Integrations (5)")).toBeTruthy();
  });

  test("shows correct count when some disabled", () => {
    render(<IntegrationsTab {...defaultProps} featureFlags={allDisabled} />);
    expect(screen.getByText("Available Integrations (1)")).toBeTruthy();
  });

  test("does not show flag toggle controls", () => {
    render(<IntegrationsTab {...defaultProps} featureFlags={allEnabled} />);
    expect(screen.queryByText("Integration Feature Flags")).toBeNull();
    expect(screen.queryByTestId("flag-toggle-integrationGithub")).toBeNull();
  });
});
