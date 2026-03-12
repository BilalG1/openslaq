import { db } from "./index";
import { marketplaceListings } from "../marketplace/schema";
import { createHash, randomBytes } from "node:crypto";

async function seed() {
  console.log("Seed: inserting marketplace listings...");

  const listings = [
    {
      slug: "standup-bot",
      name: "Standup Bot",
      description: "Automated daily standups — collects updates from your team async.",
      longDescription:
        "Standup Bot sends daily prompts to team members and aggregates responses into a summary posted to a channel of your choice. Configure the schedule, questions, and target channel from the bot settings.\n\n**Features:**\n- Customizable standup questions\n- Scheduled prompts via DM\n- Summary posted to a channel\n- Skip weekends option",
      category: "productivity",
      requestedScopes: ["chat:write", "chat:read", "users:read", "channels:read"],
      requestedEvents: ["message:new"],
      webhookUrl: "https://bots.openslaq.dev/standup/webhook",
      redirectUri: "https://bots.openslaq.dev/standup/oauth/callback",
    },
    {
      slug: "welcome-bot",
      name: "Welcome Bot",
      description: "Greet new members with a customizable welcome message.",
      longDescription:
        "Welcome Bot automatically sends a friendly DM to every new workspace member. Customize the message template and optionally post an announcement in a public channel.\n\n**Features:**\n- Personalized welcome DMs\n- Public join announcements\n- Customizable message templates",
      category: "productivity",
      requestedScopes: ["chat:write", "users:read", "channels:read"],
      requestedEvents: ["channel:member-added"],
      webhookUrl: "https://bots.openslaq.dev/welcome/webhook",
      redirectUri: "https://bots.openslaq.dev/welcome/oauth/callback",
    },
    {
      slug: "github-bot",
      name: "GitHub Notifications",
      description: "Get GitHub push, PR, and issue notifications in your channels.",
      longDescription:
        "Connect your GitHub repositories to OpenSlaq channels. Receive real-time notifications for pushes, pull requests, issues, and CI/CD status updates.\n\n**Features:**\n- Push notifications\n- PR opened/merged/closed alerts\n- Issue tracking\n- CI/CD status updates\n- Per-channel repo subscriptions",
      category: "devtools",
      avatarUrl: "https://github.githubassets.com/favicons/favicon.svg",
      requestedScopes: ["chat:write", "channels:read"],
      requestedEvents: [],
      webhookUrl: "https://bots.openslaq.dev/github/webhook",
      redirectUri: "https://bots.openslaq.dev/github/oauth/callback",
    },
    {
      slug: "poll-bot",
      name: "Poll Bot",
      description: "Create quick polls and surveys in any channel.",
      longDescription:
        "Poll Bot lets you create polls with multiple options directly in chat. Team members vote with reactions and results are tallied automatically.\n\n**Features:**\n- Multiple choice polls\n- Anonymous voting option\n- Auto-closing polls with deadlines\n- Results summary",
      category: "productivity",
      requestedScopes: ["chat:write", "chat:read", "reactions:read"],
      requestedEvents: ["message:new", "reaction:updated", "interaction"],
      webhookUrl: "https://bots.openslaq.dev/poll/webhook",
      redirectUri: "https://bots.openslaq.dev/poll/oauth/callback",
    },
  ];

  for (const listing of listings) {
    const clientId = `mkt_${crypto.randomUUID()}`;
    const clientSecretRaw = randomBytes(32).toString("base64url");
    const clientSecretHash = createHash("sha256").update(clientSecretRaw).digest("hex");

    await db
      .insert(marketplaceListings)
      .values({
        ...listing,
        clientId,
        clientSecret: clientSecretHash,
      })
      .onConflictDoNothing({ target: marketplaceListings.slug });

    console.log(`  → ${listing.name} (${listing.slug})`);
  }

  console.log("Seed: done.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
