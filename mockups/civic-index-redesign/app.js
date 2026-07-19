// Civic Index redesign mockup — progressive enhancement only.
// Wires the "Jump to a county" control folded into the stat strip.
(() => {
  const form = document.querySelector("[data-jump-form]");
  const select = document.querySelector("[data-jump-select]");
  const status = document.querySelector("[data-jump-status]");
  if (!form || !select) return;

  const setStatus = (text) => {
    if (status) status.textContent = text;
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const option = select.options[select.selectedIndex];
    if (!option || !option.value) {
      setStatus("Choose a county first.");
      return;
    }
    setStatus(`Opening ${option.textContent.trim()} →`);
    window.setTimeout(() => {
      window.location.href = option.value;
    }, 220);
  });
})();

// Record-list search (v4 sub-pages) — filters table rows client-side.
(() => {
  const input = document.querySelector("[data-list-search]");
  const body = document.querySelector("[data-list-rows]");
  if (!input || !body) return;

  const rows = Array.from(body.querySelectorAll("tr"));
  const count = document.querySelector("[data-list-count]");
  const total = count ? count.textContent : "";

  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    let shown = 0;
    rows.forEach((row) => {
      const hit = row.textContent.toLowerCase().includes(query);
      row.style.display = hit ? "" : "none";
      if (hit) shown += 1;
    });
    if (count) {
      count.textContent = query ? `${shown} of ${rows.length} shown` : total;
    }
  });
})();
