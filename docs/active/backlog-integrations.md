# Integrations Backlog (Active)

How to use this doc:
- Track first-party integration bots for software teams.
- Keep only open or in-progress work here.
- Move completed initiatives to an archive snapshot.

## I-001: GitHub Bot
- Status: Open
- Impact: Critical
- Owner: Platform team
- Estimate: Medium
- Dependencies: Bot platform (done), GitHub OAuth app / webhook setup
- Summary: First-party GitHub integration that posts PR, issue, CI, and deploy events into channels.
- Acceptance criteria:
  - Users can connect a GitHub org/repo to a channel via `/github subscribe owner/repo`.
  - PR opened, merged, review requested, and review submitted events post to subscribed channels.
  - CI status (checks pass/fail) posts to subscribed channels.
  - Messages include action buttons: "View PR", "Review", "Merge".
  - Users can filter which event types they receive per channel.

## I-002: Incident / PagerDuty Bot
- Status: Open
- Impact: High
- Owner: Platform team
- Estimate: Medium
- Dependencies: Bot platform (done), PagerDuty API v2
- Summary: Alert and on-call integration for incident management workflows.
- Acceptance criteria:
  - Alerts firing and resolving post to a configured channel.
  - Messages include "Acknowledge" and "Resolve" action buttons that write back to PagerDuty.
  - On-call schedule can be queried via `/oncall` slash command.
  - Escalation policy changes post updates to the channel.

## I-003: Sentry Bot
- Status: Open
- Impact: High
- Owner: Platform team
- Estimate: Medium
- Dependencies: Bot platform (done), Sentry internal integration / webhook setup
- Summary: Error monitoring integration that posts Sentry issue alerts into channels.
- Acceptance criteria:
  - New and regression issue alerts post to a configured channel with title, stacktrace preview, and link.
  - Messages include "Assign", "Ignore", and "Resolve" action buttons that write back to Sentry.
  - Users can configure alert rules (e.g. only critical/error level) per channel.
  - `/sentry link` connects a Sentry project to the current channel.

## I-004: CI/CD Bot (GitHub Actions / Generic)
- Status: Open
- Impact: Medium
- Owner: Platform team
- Estimate: Low
- Dependencies: Bot platform (done); can share infra with GitHub Bot (I-001)
- Summary: Dedicated CI/CD notifications for build and deploy pipelines.
- Acceptance criteria:
  - Build started, passed, and failed events post to subscribed channels.
  - Deploy started and completed events post with environment and commit info.
  - Messages link to the run/deploy log.
  - Can be folded into GitHub Bot (I-001) if scope stays small, or standalone for non-GitHub CI providers.

## I-005: Linear / Jira Bot
- Status: Open
- Impact: Medium
- Owner: Platform team
- Estimate: Medium
- Dependencies: Bot platform (done), Linear API / Jira webhook setup
- Summary: Issue tracker integration for project management notifications.
- Acceptance criteria:
  - Issue created, status changed, and completed events post to subscribed channels.
  - Messages include issue title, assignee, status, and link.
  - `/linear` or `/jira` slash command can look up an issue by key.
  - Users can filter notifications by project/team and event type.

## I-006: Standup Bot
- Status: Open
- Impact: Medium
- Owner: Platform team
- Estimate: Low
- Dependencies: Bot platform (done), scheduled message / cron infrastructure
- Summary: Automated async standup prompts and response collection.
- Acceptance criteria:
  - Admins can configure a standup schedule (days, time, timezone) for a channel.
  - Bot DMs participants with standup questions at the scheduled time.
  - Responses are collected and posted as a summary thread in the channel.
  - Participants who haven't responded get a reminder after a configurable window.

## I-007: RSS / Webhook Bridge Bot
- Status: Open
- Impact: Low
- Owner: Platform team
- Estimate: Low
- Dependencies: Bot platform (done)
- Summary: Generic inbound webhook and RSS feed bridge for services without a dedicated integration.
- Acceptance criteria:
  - Users can subscribe a channel to an RSS/Atom feed URL via `/feed subscribe <url>`.
  - New feed items post to the channel with title, summary, and link.
  - A generic inbound webhook URL can be generated per channel for arbitrary POST payloads.
  - Payload templates are configurable so users can format messages from arbitrary JSON.
