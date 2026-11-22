module.exports = (req, res) => {
  const key = process.env.POSTHOG_PUBLIC_KEY;
  const host = process.env.POSTHOG_HOST;

  if (!key || !host) {
    if (process.env.NODE_ENV !== "production") {
      if (!key) console.warn("POSTHOG_PUBLIC_KEY variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_PUBLIC_KEY is configured");
      if (!host) console.warn("POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_HOST is configured");
    }
    return res.status(204).end();
  }

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ key, host });
};
