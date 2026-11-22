const { PostHog } = require("posthog-node");

let logClient;

function getLogClient() {
  if (logClient !== undefined) return logClient;

  const key = process.env.POSTHOG_PUBLIC_KEY;
  const host = process.env.POSTHOG_HOST;
  if (!key || !host) {
    if (process.env.NODE_ENV !== "production") {
      if (!key) console.warn("POSTHOG_PUBLIC_KEY variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_PUBLIC_KEY is configured");
      if (!host) console.warn("POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_HOST is configured");
    }
    logClient = null;
    return logClient;
  }

  logClient = new PostHog(key, {
    host,
    enableExceptionAutocapture: true,
    logs: { serviceName: "americana-legends-cup-api" },
    flushAt: 1,
    flushInterval: 0,
    requestTimeout: 2000,
    fetchRetryCount: 0,
  });
  return logClient;
}

function log(level, body, attributes = {}) {
  const client = getLogClient();
  if (client) client.logger[level](body, attributes);
}

async function flushLogs() {
  const client = getLogClient();
  if (client) await client.flush().catch(() => {});
}

module.exports = { log, flushLogs };
