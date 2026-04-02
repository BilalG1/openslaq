import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  sendDefaultPii: true,
  tracesSampleRate: 0,
});

export { Sentry };

export function captureException(
  err: unknown,
  context?: { userId?: string; channelId?: string; workspaceId?: string; op?: string },
) {
  Sentry.withScope((scope) => {
    if (context?.userId) scope.setUser({ id: context.userId });
    if (context?.channelId) scope.setTag("channelId", context.channelId);
    if (context?.workspaceId) scope.setTag("workspaceId", context.workspaceId);
    if (context?.op) scope.setTag("op", context.op);
    Sentry.captureException(err);
  });
  console.error(`[${context?.op ?? "error"}]`, err);
}
