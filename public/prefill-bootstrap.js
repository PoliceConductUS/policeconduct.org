(function () {
  const hasSessionStorage = function () {
    return (
      typeof window !== "undefined" &&
      typeof window.sessionStorage !== "undefined"
    );
  };

  const setFlashPrefill = function (key, payload) {
    if (!hasSessionStorage()) {
      return false;
    }
    try {
      window.sessionStorage.setItem(key, JSON.stringify(payload));
      return true;
    } catch (_error) {
      return false;
    }
  };

  const readAndConsumeFlashPrefill = function (key) {
    if (!hasSessionStorage()) {
      return null;
    }
    try {
      const raw = window.sessionStorage.getItem(key);
      if (!raw) {
        return null;
      }
      window.sessionStorage.removeItem(key);
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return null;
      }
      return parsed;
    } catch (_error) {
      return null;
    }
  };

  const getPrefillErrorArea = function (key) {
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

  const setFieldValue = function (field, value) {
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

  const prefillFields = function ({ key, root = document, consume = true }) {
    if (!key) {
      return { applied: false, missing: [], payload: null };
    }
    const payload = consume ? readAndConsumeFlashPrefill(key) : null;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return { applied: false, missing: [], payload: null };
    }

    const missing = [];
    for (const [name, value] of Object.entries(payload)) {
      const fields = Array.from(root.querySelectorAll("[name]")).filter(
        (field) => field.getAttribute("name") === name,
      );
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

  window.__IPC_PREFILL__ = {
    ...(window.__IPC_PREFILL__ || {}),
    set: setFlashPrefill,
    readAndConsume: readAndConsumeFlashPrefill,
    prefillFields,
  };
})();
