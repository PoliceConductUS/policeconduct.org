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

initBetaBanner();
initHeaderScroll();
initAos();
