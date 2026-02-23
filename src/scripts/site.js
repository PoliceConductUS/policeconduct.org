import "bootstrap/dist/js/bootstrap.bundle.min.js";
import AOS from "aos";
import "aos/dist/aos.css";

const initBetaBanner = () => {
  const storageKey = "ipc_beta_banner_dismissed_v1";
  const banner = document.querySelector(".beta-banner");
  if (!banner) {
    return;
  }
  try {
    if (localStorage.getItem(storageKey) === "1") {
      banner.remove();
      return;
    }
  } catch (err) {
    // Ignore localStorage errors.
  }

  const closeButton = banner.querySelector(".btn-close");
  if (closeButton) {
    closeButton.addEventListener("click", () => {
      try {
        localStorage.setItem(storageKey, "1");
      } catch (err) {
        // Ignore localStorage errors.
      }
      banner.remove();
    });
  }
};

const initHeaderScroll = () => {
  const header = document.querySelector(".navbar");
  if (!header) {
    return;
  }
  const addClassOnScroll = () => header.classList.add("scrolled", "shadow-sm");
  const removeClassOnScroll = () =>
    header.classList.remove("scrolled", "shadow-sm");
  const onScroll = () => {
    if (window.scrollY > 10) {
      addClassOnScroll();
    } else {
      removeClassOnScroll();
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
};

const initAos = () => {
  if (document.documentElement.dataset.aosInit) {
    return;
  }
  AOS.init({
    duration: 800,
    once: true,
  });
  document.documentElement.dataset.aosInit = "1";
};

const createSubmissionSuccessMarkup = () =>
  `<div>
    <p class="mb-1"><strong>Submission received.</strong></p>
    <p class="mb-1">Submission ID: <code data-submission-id></code></p>
    <p class="mb-0">Save this ID in a safe place. It cannot be recovered or displayed again. You can print this page and use this ID for follow-up questions or change requests.</p>
    <div class="mt-3 d-flex flex-wrap gap-2">
      <button type="button" class="btn btn-sm btn-outline-dark" data-print-submission>Print</button>
      <button type="button" class="btn btn-sm btn-dark" data-dismiss-submit-success>Reset</button>
    </div>
  </div>`;

const BLOCKED_SUBMIT_FALLBACK =
  "If you cannot submit this form, print this page and email it to hello@policeconduct.org.";

let recaptchaReadyPromise = null;

const withBlockedFallback = (message) =>
  `${message} ${BLOCKED_SUBMIT_FALLBACK}`.trim();

const setSubmitBusy = (button, isBusy, busyLabel = "Submitting...") => {
  if (!button) {
    return;
  }
  if (isBusy) {
    if (!button.dataset.originalHtml) {
      button.dataset.originalHtml = button.innerHTML;
    }
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>${busyLabel}`;
    return;
  }

  button.removeAttribute("aria-busy");
  if (button.dataset.originalHtml) {
    button.innerHTML = button.dataset.originalHtml;
    delete button.dataset.originalHtml;
  }
  button.disabled = false;
};

const getRecaptchaToken = async (action) => {
  const siteKey = String(window.__RECAPTCHA_SITE_KEY__ || "").trim();
  if (!siteKey || !window.grecaptcha || !window.grecaptcha.enterprise) {
    throw new Error(withBlockedFallback("reCAPTCHA is not configured."));
  }

  if (!recaptchaReadyPromise) {
    recaptchaReadyPromise = new Promise((resolve) => {
      window.grecaptcha.enterprise.ready(() => resolve());
    });
  }
  await recaptchaReadyPromise;

  const token = await window.grecaptcha.enterprise.execute(siteKey, { action });
  if (!token) {
    throw new Error(withBlockedFallback("Unable to validate reCAPTCHA."));
  }
  return token;
};

const prewarmRecaptcha = () => {
  const siteKey = String(window.__RECAPTCHA_SITE_KEY__ || "").trim();
  if (!siteKey || !window.grecaptcha || !window.grecaptcha.enterprise) {
    return;
  }
  if (!recaptchaReadyPromise) {
    recaptchaReadyPromise = new Promise((resolve) => {
      window.grecaptcha.enterprise.ready(() => resolve());
    });
  }
};

const ensureSubmissionUi = ({ form, submitButton, onReset }) => {
  let inlineSuccess = form.querySelector("[data-form-submit-success]");
  if (!inlineSuccess) {
    inlineSuccess = document.createElement("div");
    inlineSuccess.setAttribute("data-form-submit-success", "true");
    inlineSuccess.className = "alert alert-success rounded-0 mt-3 d-none";
    inlineSuccess.setAttribute("role", "status");
    inlineSuccess.innerHTML = createSubmissionSuccessMarkup();
    form.appendChild(inlineSuccess);
  }

  if (inlineSuccess.dataset.submitUiBound !== "1") {
    const dismissButton = inlineSuccess.querySelector(
      "[data-dismiss-submit-success]",
    );
    const printButton = inlineSuccess.querySelector("[data-print-submission]");

    dismissButton?.addEventListener("click", function () {
      inlineSuccess.classList.add("d-none");
      form.reset();
      if (typeof onReset === "function") {
        onReset();
      }
      form.dataset.submitLocked = "false";
      setSubmitBusy(submitButton, false);
    });

    printButton?.addEventListener("click", function () {
      window.print();
    });

    inlineSuccess.dataset.submitUiBound = "1";
  }

  return { inlineSuccess };
};

window.__IPC_FORMS__ = {
  ...(window.__IPC_FORMS__ || {}),
  blockedSubmitFallback: BLOCKED_SUBMIT_FALLBACK,
  withBlockedFallback,
  setSubmitBusy,
  prewarmRecaptcha,
  getRecaptchaToken,
  ensureSubmissionUi,
};

initBetaBanner();
initHeaderScroll();
initAos();
