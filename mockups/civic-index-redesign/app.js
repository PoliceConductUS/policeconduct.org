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
    setStatus(`Opening ${option.textContent} →`);
    window.setTimeout(() => {
      window.location.href = option.value;
    }, 220);
  });
})();
