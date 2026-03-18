import { db } from "./index";
import { eq } from "drizzle-orm";
import { marketplaceListings } from "../marketplace/schema";
import { drafts } from "../messages/draft-schema";
import { scheduledMessages } from "../messages/scheduled-schema";
import { workspaces } from "../workspaces/schema";
import { channels } from "../channels/schema";
import { users } from "../users/schema";
import { messages } from "../messages/schema";
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
      slug: "linear-bot",
      name: "Linear Notifications",
      description: "Get Linear issue, comment, project, and cycle notifications in your channels.",
      longDescription:
        "Connect your Linear teams to OpenSlaq channels. Receive real-time notifications for issues, comments, projects, and cycles.\n\n**Features:**\n- Issue created/updated/assigned alerts\n- Comment notifications\n- Project status updates\n- Cycle start/complete tracking\n- Per-channel team subscriptions",
      category: "devtools",
      avatarUrl: "https://linear.app/favicon.ico",
      requestedScopes: ["chat:write", "channels:read"],
      requestedEvents: [],
      webhookUrl: "https://bots.openslaq.dev/linear/webhook",
      redirectUri: "https://bots.openslaq.dev/linear/oauth/callback",
    },
    {
      slug: "sentry-bot",
      name: "Sentry Alerts",
      description: "Get Sentry error, metric, and deploy notifications in your channels.",
      longDescription:
        "Connect your Sentry projects to OpenSlaq channels. Receive real-time notifications for issues, metric alerts, and deployments.\n\n**Features:**\n- Issue created/resolved/regression/escalating alerts\n- Metric alert threshold notifications\n- Deploy tracking\n- Per-channel project subscriptions",
      category: "devtools",
      avatarUrl: "https://sentry.io/favicon.ico",
      requestedScopes: ["chat:write", "channels:read"],
      requestedEvents: [],
      webhookUrl: "https://bots.openslaq.dev/sentry/webhook",
      redirectUri: "https://bots.openslaq.dev/sentry/oauth/callback",
    },
    {
      slug: "vercel-bot",
      name: "Vercel Notifications",
      description: "Get Vercel deployment, project, domain, and alert notifications in your channels.",
      longDescription:
        "Connect your Vercel projects to OpenSlaq channels. Receive real-time notifications for deployments, project changes, domain updates, and alerts.\n\n**Features:**\n- Deployment created/ready/succeeded/error/canceled alerts\n- Project created/removed notifications\n- Domain added tracking\n- Alert triggered notifications\n- Per-channel project subscriptions",
      category: "devtools",
      avatarUrl: "https://vercel.com/favicon.ico",
      requestedScopes: ["chat:write", "channels:read"],
      requestedEvents: [],
      webhookUrl: "https://bots.openslaq.dev/vercel/webhook",
      redirectUri: "https://bots.openslaq.dev/vercel/oauth/callback",
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

  // --- Seed outbox data (drafts + scheduled messages) ---
  console.log("Seed: inserting outbox data...");

  const [workspace] = await db.select().from(workspaces).limit(1);
  if (workspace) {
    const workspaceChannels = await db
      .select()
      .from(channels)
      .where(eq(channels.workspaceId, workspace.id))
      .limit(3);
    const [user] = await db.select().from(users).limit(1);
    const existingMessages = await db.select().from(messages).limit(2);

    if (user && workspaceChannels.length > 0) {
      const ch1 = workspaceChannels[0]!;
      const ch2 = workspaceChannels[1] ?? ch1;
      const ch3 = workspaceChannels[2] ?? ch1;

      // Insert 4 drafts
      const draftData = [
        { channelId: ch1.id, userId: user.id, content: "Hey team, I wanted to share the Q1 metrics dashboard. Let me know your thoughts." },
        { channelId: ch2.id, userId: user.id, content: "Quick question about the deployment pipeline" },
        { channelId: ch3.id, userId: user.id, content: "Here's a longer draft with more detail about the upcoming feature launch. We need to coordinate across multiple teams including design, engineering, and marketing to ensure a smooth rollout. Key milestones include:\n\n1. Design review completion\n2. API integration testing\n3. Marketing material preparation" },
        {
          channelId: ch1.id,
          userId: user.id,
          content: "Good point, I'll look into that approach",
          parentMessageId: existingMessages[0]?.id ?? undefined,
        },
      ];

      for (const d of draftData) {
        if (!d.parentMessageId && !d.channelId) continue;
        await db
          .insert(drafts)
          .values({
            channelId: d.channelId,
            userId: d.userId,
            content: d.content,
            ...(d.parentMessageId ? { parentMessageId: d.parentMessageId } : {}),
          })
          .onConflictDoNothing();
      }
      console.log("  → 4 drafts inserted");

      // Insert 6 scheduled messages
      const now = new Date();
      const futureDate1 = new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2 hours
      const futureDate2 = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +1 day
      const pastDate1 = new Date(now.getTime() - 3 * 60 * 60 * 1000); // -3 hours
      const pastDate2 = new Date(now.getTime() - 48 * 60 * 60 * 1000); // -2 days
      const failedDate1 = new Date(now.getTime() - 1 * 60 * 60 * 1000); // -1 hour
      const failedDate2 = new Date(now.getTime() - 6 * 60 * 60 * 1000); // -6 hours

      const scheduledData = [
        // 2x pending
        {
          channelId: ch1.id,
          userId: user.id,
          content: "Don't forget standup at 10am tomorrow!",
          scheduledFor: futureDate1,
          status: "pending" as const,
        },
        {
          channelId: ch2.id,
          userId: user.id,
          content: "Weekly reminder: please update your project status in the tracker.",
          scheduledFor: futureDate2,
          status: "pending" as const,
        },
        // 2x sent
        {
          channelId: ch1.id,
          userId: user.id,
          content: "Good morning team! Here are today's priorities.",
          scheduledFor: pastDate1,
          status: "sent" as const,
          sentMessageId: existingMessages[0]?.id ?? null,
        },
        {
          channelId: ch3.id,
          userId: user.id,
          content: "Meeting notes from yesterday's sync posted in the shared doc.",
          scheduledFor: pastDate2,
          status: "sent" as const,
          sentMessageId: existingMessages[1]?.id ?? null,
        },
        // 2x failed
        {
          channelId: ch2.id,
          userId: user.id,
          content: "Deployment complete! All services are green.",
          scheduledFor: failedDate1,
          status: "failed" as const,
          failureReason: "Channel was archived before message could be sent",
        },
        {
          channelId: ch1.id,
          userId: user.id,
          content: "PR review needed: https://github.com/example/repo/pull/42",
          scheduledFor: failedDate2,
          status: "failed" as const,
          failureReason: "Rate limit exceeded, please try again",
        },
      ];

      for (const s of scheduledData) {
        await db.insert(scheduledMessages).values({
          channelId: s.channelId,
          userId: s.userId,
          content: s.content,
          scheduledFor: s.scheduledFor,
          status: s.status,
          ...(s.sentMessageId ? { sentMessageId: s.sentMessageId } : {}),
          ...(s.failureReason ? { failureReason: s.failureReason } : {}),
        });
      }
      console.log("  → 6 scheduled messages inserted");
    } else {
      console.log("  → Skipped: no users or channels found");
    }
  } else {
    console.log("  → Skipped: no workspace found");
  }

  console.log("Seed: done.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
