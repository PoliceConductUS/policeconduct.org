import * as Sentry from "@sentry/astro";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import AOS from "aos";
import "aos/dist/aos.css";
import { readAndConsumeFlashPrefill, setFlashPrefill } from "#src/lib/prefill";

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

const initPrefillLinks = () => {
  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-prefill-key]");
    if (!target) {
      return;
    }
    const key = target.getAttribute("data-prefill-key");
    const payloadRaw = target.getAttribute("data-prefill-payload");
    if (!key || !payloadRaw) {
      return;
    }
    try {
      const payload = JSON.parse(payloadRaw);
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return;
      }
      setFlashPrefill(key, payload);
    } catch (_error) {
      // Ignore malformed payloads.
    }
  });
};

const getPrefillErrorArea = (key) => {
  let area = document.querySelector("[data-prefill-error-area]");
  if (!area) {
    area = document.createElement("div");
    area.setAttribute("data-prefill-error-area", "true");
    area.className = "d-none";
    document.body.appendChild(area);
  }
  area.setAttribute("data-prefill-last-key", key || "");
  return area;
};

const setFieldValue = (field, value) => {
  if (field instanceof HTMLInputElement) {
    const type = (field.type || "text").toLowerCase();
    if (type === "checkbox") {
      if (typeof value === "boolean") {
        field.checked = value;
        return true;
      }
      const normalized = String(value).trim().toLowerCase();
      field.checked =
        normalized === "true" ||
        normalized === "1" ||
        normalized === "yes" ||
        normalized === "on";
      return true;
    }
    if (type === "radio") {
      const expected = String(value ?? "").trim();
      if (field.value === expected) {
        field.checked = true;
      }
      return true;
    }
    if (!field.value.trim()) {
      field.value = String(value ?? "");
    }
    return true;
  }

  if (field instanceof HTMLTextAreaElement) {
    if (!field.value.trim()) {
      field.value = String(value ?? "");
    }
    return true;
  }

  if (field instanceof HTMLSelectElement) {
    field.value = String(value ?? "");
    return true;
  }

  return false;
};

const applyPrefillToFieldsByName = ({
  key,
  root = document,
  consume = true,
}) => {
  if (!key || !window.__IPC_PREFILL__) {
    return { applied: false, missing: [], payload: null };
  }
  const payload = consume ? window.__IPC_PREFILL__.readAndConsume?.(key) : null;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { applied: false, missing: [], payload: null };
  }

  const missing = [];
  for (const [name, value] of Object.entries(payload)) {
    const fields = Array.from(root.querySelectorAll(`[name="${name}"]`));
    if (fields.length === 0) {
      missing.push(name);
      continue;
    }
    for (const field of fields) {
      setFieldValue(field, value);
    }
  }

  const area = getPrefillErrorArea(key);
  if (missing.length > 0) {
    const details = {
      key,
      missing,
      payloadKeys: Object.keys(payload),
    };
    area.setAttribute("data-prefill-error", "true");
    area.textContent = JSON.stringify(details);
    console.error("Prefill field mismatch", details);
  } else {
    area.removeAttribute("data-prefill-error");
    area.textContent = "";
  }

  return { applied: true, missing, payload };
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

const ensureInlineError = (form) => {
  let inlineError = form.querySelector("[data-form-submit-error]");
  if (!inlineError) {
    inlineError = document.createElement("div");
    inlineError.setAttribute("data-form-submit-error", "true");
    inlineError.className = "alert alert-danger rounded-0 mt-3 d-none";
    inlineError.setAttribute("role", "alert");
    form.appendChild(inlineError);
  }
  return inlineError;
};

const serializeFormData = (formData) => {
  const data = {};
  formData.forEach((value, key) => {
    if (key === "form-name" || key === "g-recaptcha-response") {
      return;
    }
    if (key in data) {
      if (!Array.isArray(data[key])) {
        data[key] = [data[key]];
      }
      data[key].push(value);
    } else {
      data[key] = value;
    }
  });
  return data;
};

const normalizeSubmitErrorMessage = (error) => {
  const message =
    error instanceof Error && error.message
      ? error.message
      : "Unable to submit the form. Please try again.";
  return message.includes("hello@policeconduct.org")
    ? message
    : `${message} ${BLOCKED_SUBMIT_FALLBACK}`;
};

const reportFormError = (error, context = {}) => {
  const message =
    error instanceof Error && error.message
      ? error.message
      : "Unknown form submission error.";
  console.error("Form submission failed", {
    ...context,
    error,
    message,
  });
  Sentry.captureException(
    error instanceof Error ? error : new Error(String(message)),
    {
      extra: context,
      tags: {
        area: "form_submit",
        ...(context.formName ? { form_name: context.formName } : {}),
      },
    },
  );
};

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
    throw new Error(
      `reCAPTCHA is not configured. ${BLOCKED_SUBMIT_FALLBACK}`.trim(),
    );
  }

  if (!recaptchaReadyPromise) {
    recaptchaReadyPromise = new Promise((resolve) => {
      window.grecaptcha.enterprise.ready(() => resolve());
    });
  }
  await recaptchaReadyPromise;

  const token = await window.grecaptcha.enterprise.execute(siteKey, { action });
  if (!token) {
    throw new Error(
      `Unable to validate reCAPTCHA. ${BLOCKED_SUBMIT_FALLBACK}`.trim(),
    );
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

const submitJsonForm = async ({
  event,
  form,
  formName,
  recaptchaAction,
  submitButton = form?.querySelector('button[type="submit"]'),
  onReset,
  onBeforeValidate,
  validate,
  onInvalid,
  onBeforeSubmit,
  buildPayload,
  onSuccess,
}) => {
  const inlineError = ensureInlineError(form);
  const formsUi = window.__IPC_FORMS__;
  if (!formsUi || typeof formsUi.ensureSubmissionUi !== "function") {
    inlineError.textContent =
      "Unable to submit the form right now. Please refresh and try again. If you cannot submit this form, print this page and email it to hello@policeconduct.org.";
    inlineError.classList.remove("d-none");
    console.error("Form submission helper unavailable", { formName });
    Sentry.captureMessage("Form submission helper unavailable", {
      level: "error",
      tags: {
        area: "form_submit",
        ...(formName ? { form_name: formName } : {}),
      },
    });
    return false;
  }

  formsUi.prewarmRecaptcha?.();
  const { inlineSuccess } = formsUi.ensureSubmissionUi({
    form,
    submitButton,
    onReset,
  });

  let submissionCompleted = false;

  if (form.dataset.submitLocked === "true") {
    event?.preventDefault();
    return false;
  }

  event?.preventDefault();
  form.dataset.submitLocked = "true";
  formsUi.setSubmitBusy(submitButton, true);
  inlineError.classList.add("d-none");
  inlineError.textContent = "";
  inlineSuccess.classList.add("d-none");

  try {
    await onBeforeValidate?.();
    const customValid =
      typeof validate === "function" ? await validate() : true;

    if (!form.checkValidity() || !customValid) {
      event?.stopPropagation();
      form.classList.add("was-validated");
      await onInvalid?.();
      return false;
    }

    form.classList.add("was-validated");

    const beforeSubmitResult = await onBeforeSubmit?.();
    const formData = new FormData(form);
    const recaptchaToken = await formsUi.getRecaptchaToken(recaptchaAction);
    const data = serializeFormData(formData);
    const payload = (await buildPayload?.({
      beforeSubmitResult,
      data,
      form,
      formData,
      formName,
      recaptchaToken,
    })) || {
      data,
      formName,
      recaptchaToken,
    };

    const response = await fetch("/api/forms/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let message =
        "We could not submit your form right now. Please print this page and email it to hello@policeconduct.org so we have your submission while we fix the issue.";
      try {
        const errorPayload = await response.json();
        if (
          errorPayload &&
          typeof errorPayload.error === "string" &&
          errorPayload.error.trim()
        ) {
          message = errorPayload.error.trim();
        }
      } catch (_error) {
        // Ignore malformed error payloads.
      }
      throw new Error(message);
    }

    const result = await response.json();
    const submissionId =
      typeof result?.submissionId === "string" ? result.submissionId : "";
    if (!submissionId) {
      throw new Error(
        "Submission succeeded but no submission ID was returned.",
      );
    }

    form.classList.remove("was-validated");
    const submissionIdNode = inlineSuccess.querySelector(
      "[data-submission-id]",
    );
    if (submissionIdNode) {
      submissionIdNode.textContent = submissionId;
    }
    formsUi.setSubmitBusy(submitButton, false);
    if (submitButton) {
      submitButton.disabled = true;
    }
    inlineSuccess.classList.remove("d-none");
    inlineSuccess.scrollIntoView({ behavior: "smooth", block: "center" });
    await onSuccess?.({
      form,
      formsUi,
      inlineSuccess,
      recaptchaToken,
      response,
      result,
      submissionId,
      submitButton,
    });
    submissionCompleted = true;
    return true;
  } catch (error) {
    reportFormError(error, {
      formAction: form.getAttribute("action") || "",
      formName,
      pagePath: window.location.pathname,
      recaptchaAction,
    });
    inlineError.textContent = normalizeSubmitErrorMessage(error);
    inlineError.classList.remove("d-none");
    return false;
  } finally {
    if (!submissionCompleted) {
      formsUi.setSubmitBusy(submitButton, false);
      form.dataset.submitLocked = "false";
    }
  }
};

window.__IPC_FORMS__ = {
  ...(window.__IPC_FORMS__ || {}),
  blockedSubmitFallback: BLOCKED_SUBMIT_FALLBACK,
  ensureInlineError,
  normalizeSubmitErrorMessage,
  reportFormError,
  setSubmitBusy,
  prewarmRecaptcha,
  getRecaptchaToken,
  ensureSubmissionUi,
  serializeFormData,
  submitJsonForm,
};

window.__IPC_PREFILL__ = {
  ...(window.__IPC_PREFILL__ || {}),
  set: setFlashPrefill,
  readAndConsume: readAndConsumeFlashPrefill,
  applyToFieldsByName: applyPrefillToFieldsByName,
};

initBetaBanner();
initHeaderScroll();
initAos();
initPrefillLinks();
