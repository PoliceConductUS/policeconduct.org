import * as Sentry from "@sentry/astro";

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

const FORM_LOAD_ERROR_MESSAGE = `
  <p class="mb-2"><strong>An error occurred while loading this page, and we have already reported it.</strong></p>
  <p class="mb-2">If the form fields are visible, you can still fill them out, print the page, and email it to hello@policeconduct.org.</p>
  <p class="mb-0">To report additional details, please click "Report issue" at the bottom of the page.</p>
`;

type RecaptchaEnterprise = {
  ready(callback: () => void): void;
  execute(siteKey: string, options: { action: string }): Promise<string>;
};

declare global {
  interface Window {
    __IPC_PREFILL__?: {
      readAndConsume?: (key: string) => Record<string, unknown> | null;
      prefillFields?: (options: {
        key: string;
        root?: ParentNode;
      }) => { payload?: Record<string, unknown> | null } | null;
    };
    grecaptcha?: {
      enterprise: RecaptchaEnterprise;
    };
  }
}

let recaptchaReadyPromise: Promise<void> | null = null;
let recaptchaScriptPromise: Promise<RecaptchaEnterprise> | null = null;
const recaptchaSiteKey = String(
  import.meta.env.RECAPTCHA_SITE_KEY || "",
).trim();

type SubmitData = Record<string, FormDataEntryValue | FormDataEntryValue[]>;
type FlattenedPrimitive = string | string[];
interface FlattenedObject {
  [key: string]: FlattenedValue;
}
interface FlattenedArray extends Array<FlattenedValue> {}
type FlattenedValue = FlattenedPrimitive | FlattenedObject | FlattenedArray;
type FlattenedContainer = FlattenedObject | FlattenedArray;

type SubmitPayloadArgs = {
  beforeSubmitResult: unknown;
  data: SubmitData;
  form: HTMLFormElement;
  formData: FormData;
  formName: string;
  recaptchaToken: string;
};

type SubmitSuccessArgs = {
  form: HTMLFormElement;
  inlineSuccess: HTMLElement;
  recaptchaToken: string;
  response: Response;
  result: unknown;
  submissionId: string;
  submitButton: HTMLButtonElement | null;
};

type SubmitJsonFormOptions = {
  event?: Event;
  form: HTMLFormElement;
  formName: string;
  recaptchaAction: string;
  submitButton?: HTMLButtonElement | null;
  onReset?: () => void | Promise<void>;
  onBeforeValidate?: () => void | Promise<void>;
  validate?: () => boolean | Promise<boolean>;
  onInvalid?: () => void | Promise<void>;
  onBeforeSubmit?: () => unknown | Promise<unknown>;
  buildPayload?: (args: SubmitPayloadArgs) => unknown | Promise<unknown>;
  onSuccess?: (args: SubmitSuccessArgs) => void | Promise<void>;
};

const parseFieldName = (name: string) =>
  Array.from(name.matchAll(/([^[.\]]+)|\[(.*?)\]/g))
    .map((match) => match[1] ?? match[2] ?? "")
    .filter(Boolean)
    .map((segment) => (/^\d+$/.test(segment) ? Number(segment) : segment));

export const flattenFormData = (
  formData: FormData,
  ...structuredRoots: string[]
) => {
  const data: Record<string, FlattenedValue> = {};

  const setValue = (
    target: FlattenedContainer,
    path: Array<string | number>,
    value: string,
  ) => {
    let current: FlattenedContainer = target;

    path.forEach((segment, index) => {
      const isLast = index === path.length - 1;
      const nextSegment = path[index + 1];

      if (isLast) {
        if (Array.isArray(current) && typeof segment === "number") {
          current[segment] = value;
          return;
        }

        const objectCurrent = current as FlattenedObject;
        const objectKey = String(segment);
        const existingValue = objectCurrent[objectKey];
        if (existingValue === undefined) {
          objectCurrent[objectKey] = value;
          return;
        }

        if (Array.isArray(existingValue)) {
          existingValue.push(value);
          return;
        }

        objectCurrent[objectKey] = [String(existingValue), value];
        return;
      }

      const nextValueIsArray = typeof nextSegment === "number";

      if (Array.isArray(current) && typeof segment === "number") {
        const existingValue = current[segment];

        if (
          existingValue == null ||
          typeof existingValue === "string" ||
          (Array.isArray(existingValue) && !nextValueIsArray)
        ) {
          current[segment] = nextValueIsArray ? [] : {};
        }

        current = current[segment] as FlattenedContainer;
        return;
      }

      const objectCurrent = current as FlattenedObject;
      const objectKey = String(segment);
      const existingValue = objectCurrent[objectKey];

      if (
        existingValue == null ||
        typeof existingValue === "string" ||
        (Array.isArray(existingValue) && !nextValueIsArray)
      ) {
        objectCurrent[objectKey] = nextValueIsArray ? [] : {};
      }

      current = objectCurrent[objectKey] as FlattenedContainer;
    });
  };

  formData.forEach((value, name) => {
    const stringValue = String(value);
    const [root] = parseFieldName(name);

    if (typeof root === "string" && structuredRoots.includes(root)) {
      setValue(data, parseFieldName(name), stringValue);
      return;
    }

    const existingValue = data[name];
    if (existingValue === undefined) {
      data[name] = stringValue;
      return;
    }

    if (Array.isArray(existingValue)) {
      existingValue.push(stringValue);
      return;
    }

    data[name] = [String(existingValue), stringValue];
  });

  return data;
};

const loadRecaptcha = async () => {
  if (!recaptchaSiteKey) {
    throw new Error(
      `reCAPTCHA is not configured. ${BLOCKED_SUBMIT_FALLBACK}`.trim(),
    );
  }

  if (window.grecaptcha?.enterprise) {
    return window.grecaptcha.enterprise;
  }

  if (!recaptchaScriptPromise) {
    recaptchaScriptPromise = new Promise<RecaptchaEnterprise>(
      (resolve, reject) => {
        const existingScript = document.querySelector(
          'script[data-ipc-recaptcha="true"]',
        );
        if (existingScript) {
          existingScript.addEventListener("load", () => {
            if (window.grecaptcha?.enterprise) {
              resolve(window.grecaptcha.enterprise);
              return;
            }
            reject(new Error("reCAPTCHA loaded without enterprise client."));
          });
          existingScript.addEventListener("error", () => {
            reject(new Error("Unable to load reCAPTCHA. Please try again."));
          });
          return;
        }

        const script = document.createElement("script");
        script.src = `https://www.google.com/recaptcha/enterprise.js?render=${encodeURIComponent(recaptchaSiteKey)}`;
        script.async = true;
        script.defer = true;
        script.dataset.ipcRecaptcha = "true";
        script.addEventListener("load", () => {
          if (window.grecaptcha?.enterprise) {
            resolve(window.grecaptcha.enterprise);
            return;
          }
          reject(new Error("reCAPTCHA loaded without enterprise client."));
        });
        script.addEventListener("error", () => {
          reject(new Error("Unable to load reCAPTCHA. Please try again."));
        });
        document.head.appendChild(script);
      },
    ).catch((error) => {
      recaptchaScriptPromise = null;
      throw error;
    });
  }

  await recaptchaScriptPromise;
  if (!window.grecaptcha?.enterprise) {
    throw new Error(
      `reCAPTCHA is not configured. ${BLOCKED_SUBMIT_FALLBACK}`.trim(),
    );
  }
  return window.grecaptcha.enterprise;
};

const getInlineError = (form: HTMLFormElement) => {
  let inlineError = form.querySelector<HTMLElement>("[data-form-submit-error]");
  if (!inlineError) {
    inlineError = document.createElement("div");
    inlineError.setAttribute("data-form-submit-error", "true");
    inlineError.className = "alert alert-danger rounded-0 mt-3 d-none";
    inlineError.setAttribute("role", "alert");
    form.appendChild(inlineError);
  }
  return inlineError;
};

const getValidationSummary = (form: HTMLFormElement) => {
  let summary = form.querySelector<HTMLElement>(
    "[data-form-validation-summary]",
  );
  if (!summary) {
    summary = document.createElement("div");
    summary.setAttribute("data-form-validation-summary", "true");
    summary.className = "alert alert-danger rounded-0 mb-4 d-none";
    summary.setAttribute("role", "alert");
    form.prepend(summary);
  }
  return summary;
};

const getFieldLabelText = (
  field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
) => {
  const labels = field.labels ? Array.from(field.labels) : [];
  const explicitLabel = labels
    .map((label) => label.textContent?.trim() || "")
    .find(Boolean);
  if (explicitLabel) {
    return explicitLabel.replace(/\s+/g, " ");
  }

  const closestLabel = field.closest("label")?.textContent?.trim();
  if (closestLabel) {
    return closestLabel.replace(/\s+/g, " ");
  }

  const ariaLabel = field.getAttribute("aria-label")?.trim();
  if (ariaLabel) {
    return ariaLabel;
  }

  return field.name || "the first highlighted field";
};

const hideValidationSummary = (form: HTMLFormElement) => {
  const summary = form.querySelector<HTMLElement>(
    "[data-form-validation-summary]",
  );
  if (!summary) {
    return;
  }
  summary.classList.add("d-none");
  summary.replaceChildren();
};

const openAncestorDetails = (field: HTMLElement) => {
  let current: HTMLElement | null = field.parentElement;
  while (current) {
    if (current instanceof HTMLDetailsElement) {
      current.open = true;
    }
    current = current.parentElement;
  }
};

const showValidationSummary = (form: HTMLFormElement) => {
  const summary = getValidationSummary(form);
  const invalidFields = Array.from(
    form.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >("input, select, textarea"),
  ).filter((field) => {
    if (field.disabled || field.type === "hidden") {
      return false;
    }
    return !field.checkValidity();
  });

  if (invalidFields.length === 0) {
    hideValidationSummary(form);
    return null;
  }

  const lead = document.createElement("p");
  lead.className = "mb-1 fw-semibold";
  lead.textContent = `Please correct ${invalidFields.length} highlighted field${invalidFields.length === 1 ? "" : "s"} before submitting.`;

  const detail = document.createElement("p");
  detail.className = "mb-0";
  detail.textContent = `Start with ${getFieldLabelText(invalidFields[0])}.`;

  summary.replaceChildren(lead, detail);
  summary.classList.remove("d-none");

  return invalidFields[0];
};

const getSubmitData = (formData: FormData): SubmitData => {
  const data: SubmitData = {};
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

const getSubmitErrorMessage = (error: unknown) => {
  const message =
    error instanceof Error && error.message
      ? error.message
      : "Unable to submit the form. Please try again.";
  return message.includes("hello@policeconduct.org")
    ? message
    : `${message} ${BLOCKED_SUBMIT_FALLBACK}`;
};

const captureSubmitError = (
  error: unknown,
  context: Record<string, unknown> = {},
) => {
  const formNameTag =
    typeof context.formName === "string" && context.formName.trim()
      ? context.formName
      : undefined;
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
        ...(formNameTag ? { form_name: formNameTag } : {}),
      },
    },
  );
};

const setSubmitButtonBusy = (
  button: HTMLButtonElement | null | undefined,
  isBusy: boolean,
  busyLabel = "Submitting...",
) => {
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

const getRecaptchaToken = async (action: string) => {
  if (!recaptchaSiteKey) {
    throw new Error(
      `reCAPTCHA is not configured. ${BLOCKED_SUBMIT_FALLBACK}`.trim(),
    );
  }

  const enterprise = await loadRecaptcha();
  if (!recaptchaReadyPromise) {
    recaptchaReadyPromise = new Promise<void>((resolve, reject) => {
      try {
        enterprise.ready(() => resolve());
      } catch (error) {
        reject(error);
      }
    }).catch((error) => {
      recaptchaReadyPromise = null;
      throw error;
    });
  }
  await recaptchaReadyPromise;

  let token: string | null = null;
  try {
    token = await enterprise.execute(recaptchaSiteKey, { action });
  } catch (error) {
    throw new Error(
      `Unable to validate reCAPTCHA. ${BLOCKED_SUBMIT_FALLBACK}`.trim(),
      { cause: error },
    );
  }
  if (!token) {
    throw new Error(
      `Unable to validate reCAPTCHA. ${BLOCKED_SUBMIT_FALLBACK}`.trim(),
    );
  }
  return token;
};

export const initRecaptcha = () => {
  loadRecaptcha()
    .then((enterprise) => {
      if (!recaptchaReadyPromise) {
        recaptchaReadyPromise = new Promise<void>((resolve, reject) => {
          try {
            enterprise.ready(() => resolve());
          } catch (error) {
            reject(error);
          }
        }).catch((error) => {
          recaptchaReadyPromise = null;
          throw error;
        });
      }
      return recaptchaReadyPromise;
    })
    .catch(() => {});
};

export const showFormLoadError = ({
  formName,
  shell,
}: {
  formName: string;
  shell: HTMLElement | null;
}) => {
  const error = new Error(`Unable to locate the form named ${formName}.`);
  console.error("Form failed to initialize", {
    error,
    formName,
    pagePath: window.location.pathname,
  });
  Sentry.captureException(error, {
    extra: {
      formName,
      pagePath: window.location.pathname,
    },
    tags: {
      area: "form_init",
      form_name: formName,
    },
  });

  if (!shell) {
    return;
  }

  let inlineError = shell.querySelector<HTMLElement>("[data-form-load-error]");
  if (!inlineError) {
    inlineError = document.createElement("div");
    inlineError.setAttribute("data-form-load-error", "true");
    inlineError.className = "alert alert-danger rounded-0 mt-3";
    inlineError.setAttribute("role", "alert");
    shell.appendChild(inlineError);
  }
  inlineError.innerHTML = FORM_LOAD_ERROR_MESSAGE;
};

const getSubmitSuccess = ({
  form,
  submitButton,
  onReset,
}: {
  form: HTMLFormElement;
  submitButton: HTMLButtonElement | null | undefined;
  onReset?: () => void | Promise<void>;
}) => {
  let inlineSuccess = form.querySelector<HTMLElement>(
    "[data-form-submit-success]",
  );
  if (!inlineSuccess) {
    inlineSuccess = document.createElement("div");
    inlineSuccess.setAttribute("data-form-submit-success", "true");
    inlineSuccess.className = "alert alert-success rounded-0 mt-3 d-none";
    inlineSuccess.setAttribute("role", "status");
    inlineSuccess.innerHTML = createSubmissionSuccessMarkup();
    form.appendChild(inlineSuccess);
  }

  if (inlineSuccess.dataset.submitUiBound !== "1") {
    const dismissButton = inlineSuccess.querySelector<HTMLButtonElement>(
      "[data-dismiss-submit-success]",
    );
    const printButton = inlineSuccess.querySelector<HTMLButtonElement>(
      "[data-print-submission]",
    );

    dismissButton?.addEventListener("click", function () {
      inlineSuccess.classList.add("d-none");
      form.reset();
      if (typeof onReset === "function") {
        onReset();
      }
      form.dataset.submitLocked = "false";
      setSubmitButtonBusy(submitButton, false);
    });

    printButton?.addEventListener("click", function () {
      window.print();
    });

    inlineSuccess.dataset.submitUiBound = "1";
  }

  return { inlineSuccess };
};

export const submitJsonForm = async (options: SubmitJsonFormOptions) => {
  const {
    event,
    form,
    formName,
    recaptchaAction,
    submitButton = form.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    ),
    onReset,
    onBeforeValidate,
    validate,
    onInvalid,
    onBeforeSubmit,
    buildPayload,
    onSuccess,
  } = options;

  const inlineError = getInlineError(form);
  const { inlineSuccess } = getSubmitSuccess({
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
  setSubmitButtonBusy(submitButton, true);
  inlineError.classList.add("d-none");
  inlineError.textContent = "";
  inlineSuccess.classList.add("d-none");
  hideValidationSummary(form);

  try {
    await onBeforeValidate?.();
    const customValid =
      typeof validate === "function" ? await validate() : true;

    if (!form.checkValidity() || !customValid) {
      event?.stopPropagation();
      form.classList.add("was-validated");
      const firstInvalidField = showValidationSummary(form);
      await onInvalid?.();
      if (firstInvalidField) {
        openAncestorDetails(firstInvalidField);
        firstInvalidField.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        firstInvalidField.focus({ preventScroll: true });
      }
      return false;
    }

    form.classList.add("was-validated");

    const beforeSubmitResult = await onBeforeSubmit?.();
    const formData = new FormData(form);
    const recaptchaToken = await getRecaptchaToken(recaptchaAction);
    const data = getSubmitData(formData);
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
      typeof (result as { submissionId?: unknown })?.submissionId === "string"
        ? (result as { submissionId: string }).submissionId
        : "";
    if (!submissionId) {
      throw new Error(
        "Submission succeeded but no submission ID was returned.",
      );
    }

    form.classList.remove("was-validated");
    const submissionIdNode = inlineSuccess.querySelector<HTMLElement>(
      "[data-submission-id]",
    );
    if (submissionIdNode) {
      submissionIdNode.textContent = submissionId;
    }
    setSubmitButtonBusy(submitButton, false);
    if (submitButton) {
      submitButton.disabled = true;
    }
    inlineSuccess.classList.remove("d-none");
    inlineSuccess.scrollIntoView({ behavior: "smooth", block: "center" });
    await onSuccess?.({
      form,
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
    captureSubmitError(error, {
      formAction: form.getAttribute("action") || "",
      formName,
      pagePath: window.location.pathname,
      recaptchaAction,
    });
    inlineError.textContent = getSubmitErrorMessage(error);
    inlineError.classList.remove("d-none");
    return false;
  } finally {
    if (!submissionCompleted) {
      setSubmitButtonBusy(submitButton, false);
      form.dataset.submitLocked = "false";
    }
  }
};
