import * as Sentry from "@sentry/astro";

const dsn = import.meta.env.PUBLIC_SENTRY_DSN.trim();
const environment = import.meta.env.PUBLIC_SENTRY_ENVIRONMENT.trim();
const release =
  (import.meta.env.PUBLIC_SENTRY_RELEASE || "").trim() || undefined;
const isProduction = environment === "production";
type Feedback = ReturnType<typeof Sentry.feedbackIntegration>;

let feedbackPromise: Promise<Feedback> | null = null;
let feedbackDialog: Awaited<ReturnType<Feedback["createForm"]>> | null = null;

const loadFeedback = () =>
  (feedbackPromise ??= import("./src/lib/client/sentry-feedback").then(
    ({ feedbackIntegration }) => {
      const feedback = feedbackIntegration({ autoInject: false });
      Sentry.addIntegration(feedback);
      return feedback;
    },
  ));

const loadReplay = () =>
  import("./src/lib/client/sentry-replay").then(({ replayIntegration }) => {
    Sentry.addIntegration(replayIntegration());
  });

declare global {
  interface Window {
    __IPC_SENTRY_FEEDBACK__?: {
      open: (options?: {
        email?: string;
        message?: string;
        name?: string;
      }) => Promise<void>;
    };
  }
}

Sentry.init({
  beforeSend(event) {
    const url = event.request?.url;

    if (typeof url === "string") {
      const protocol = new URL(url).protocol;

      if (protocol === "chrome-extension:" || protocol === "moz-extension:") {
        return null;
      }
    }

    return event;
  },
  dsn,
  environment,
  ...(release ? { release } : {}),
  integrations: [
    Sentry.consoleLoggingIntegration({
      levels: ["log", "warn", "error"],
    }),
    Sentry.browserProfilingIntegration(),
  ],
  profileLifecycle: "trace",
  profileSessionSampleRate: isProduction ? 0.1 : 1.0,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: isProduction ? 0.02 : 0.1,
  tracesSampleRate: isProduction ? 0.1 : 1.0,
});

const whenIdle = (callback: () => void) =>
  typeof window.requestIdleCallback === "function"
    ? window.requestIdleCallback(callback)
    : setTimeout(callback, 1);

if (document.readyState === "complete") {
  whenIdle(loadReplay);
} else {
  window.addEventListener("load", () => whenIdle(loadReplay), { once: true });
}

window.__IPC_SENTRY_FEEDBACK__ = {
  async open(options) {
    if (!feedbackDialog) {
      const feedback = await loadFeedback();
      feedbackDialog = await feedback.createForm({
        isEmailRequired: false,
        isNameRequired: false,
        messagePlaceholder:
          "Describe what happened, what you expected, and what page you were on.",
        showBranding: false,
        tags: {
          feedback_source: "site_link",
        },
        useSentryUser: {
          email: "never",
          name: "never",
        },
      });
    }

    feedbackDialog.appendToDom();
    feedbackDialog.open();

    const root = feedbackDialog.el as Element;

    if (options?.message) {
      const messageField = root?.querySelector(
        'textarea[name="message"]',
      ) as HTMLTextAreaElement | null;

      if (messageField && !messageField.value.trim()) {
        messageField.value = options.message;
      }
    }

    if (options?.name) {
      const nameField = root?.querySelector(
        'input[name="name"]',
      ) as HTMLInputElement | null;

      if (nameField && !nameField.value.trim()) {
        nameField.value = options.name;
      }
    }

    if (options?.email) {
      const emailField = root?.querySelector(
        'input[name="email"]',
      ) as HTMLInputElement | null;

      if (emailField && !emailField.value.trim()) {
        emailField.value = options.email;
      }
    }
  },
};
