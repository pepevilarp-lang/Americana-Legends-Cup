(function () {
  const development = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === "file:";

  fetch("/api/posthog-config")
    .then(response => response.status === 204 ? null : response.json())
    .then(config => {
      if (!config) {
        if (development) throw new Error("POSTHOG_PUBLIC_KEY variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_PUBLIC_KEY is configured");
        return;
      }

      const script = document.createElement("script");
      script.async = true;
      script.src = `${config.host}/static/array.js`;
      script.onload = () => {
        window.posthog.init(config.key, {
          api_host: config.host,
          tracing_headers: [location.hostname],
          capture_exceptions: {
            capture_unhandled_errors: true,
            capture_unhandled_rejections: true,
            capture_console_errors: false
          }
        });
        window.dispatchEvent(new Event("posthog:ready"));
      };
      document.head.appendChild(script);
    })
    .catch(error => {
      if (development) console.error(error);
    });
}());
