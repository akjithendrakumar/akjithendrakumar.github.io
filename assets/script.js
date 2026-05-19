document.addEventListener("DOMContentLoaded", () => {
  const year = document.getElementById("year");
  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  const resumeAction = document.getElementById("resume-action");
  if (resumeAction) {
    applyResumeStatus(resumeAction);
  }

  initSectionRouter();
  initShareBars();
});

// ---------------------------------------------------------------------------
// Section router — smooth scroll + scroll-position-based active nav highlight
// ---------------------------------------------------------------------------

function initSectionRouter() {
  const sections = Array.from(document.querySelectorAll("section[id]"));
  const navLinks = document.querySelectorAll(
    ".site-nav a[href^=\"#\"], .site-nav-desktop a[href^=\"#\"]"
  );

  if (!sections.length) return;

  // Clear any stale hidden state from previous page loads
  sections.forEach(s => { s.hidden = false; });
  const hero = document.querySelector(".hero");
  if (hero) hero.hidden = false;

  let isProgrammatic = false;
  let scrollEndTimer = null;
  let rafId = null;
  let activeId = null;

  function setActive(id) {
    if (id === activeId) return;
    activeId = id;
    navLinks.forEach(link => {
      const href = link.getAttribute("href").slice(1);
      link.classList.toggle("is-active", !!id && href === id);
    });
  }

  function getHeaderHeight() {
    return document.querySelector(".site-header")?.offsetHeight || 80;
  }

  // Compute which section the user is currently reading based on scroll position.
  // A section becomes "active" as soon as its top edge passes a trigger line
  // just below the sticky header. The last qualifying section wins.
  function computeActive() {
    const scrollY = window.scrollY;
    const trigger = scrollY + getHeaderHeight() + 32;
    let current = null;
    for (const s of sections) {
      const top = s.getBoundingClientRect().top + scrollY;
      if (top <= trigger) current = s.id;
    }
    setActive(current);
  }

  // During a programmatic (click-initiated) scroll, suppress the scroll listener
  // so the active state doesn't flicker. Re-sync once scrolling settles.
  function beginProgrammaticScroll(id, doScroll) {
    isProgrammatic = true;
    clearTimeout(scrollEndTimer);
    setActive(id);
    doScroll();

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(scrollEndTimer);
      isProgrammatic = false;
      computeActive();
    };

    // scrollend fires in Chrome 114+, Firefox 109+, Safari 16.4+
    if ("onscrollend" in window) {
      window.addEventListener("scrollend", finish, { once: true });
    }
    // Fallback timeout covers older browsers and cases where scrollend never fires
    scrollEndTimer = setTimeout(finish, 1100);
  }

  // Attach click handlers to every hash link on the page
  document.querySelectorAll("a[href^=\"#\"]").forEach(link => {
    link.addEventListener("click", e => {
      const id = link.getAttribute("href").slice(1);
      e.preventDefault();

      if (!id || id === "top") {
        beginProgrammaticScroll(null, () => window.scrollTo({ top: 0, behavior: "smooth" }));
        history.pushState(null, "", location.pathname);
        return;
      }

      const target = document.getElementById(id);
      if (target) {
        beginProgrammaticScroll(id, () =>
          target.scrollIntoView({ behavior: "smooth", block: "start" })
        );
        history.pushState(null, "", `#${id}`);
      }
    });
  });

  // Natural scrolling — RAF-throttled to avoid layout thrash
  window.addEventListener("scroll", () => {
    if (isProgrammatic) return;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(computeActive);
  }, { passive: true });

  // Back / forward navigation
  window.addEventListener("popstate", () => {
    const id = location.hash.slice(1);
    if (!id || id === "top") {
      beginProgrammaticScroll(null, () => window.scrollTo({ top: 0, behavior: "smooth" }));
    } else {
      const target = document.getElementById(id);
      if (target) {
        beginProgrammaticScroll(id, () =>
          target.scrollIntoView({ behavior: "smooth", block: "start" })
        );
      }
    }
  });

  // On initial page load, scroll to hash if present; otherwise compute from position
  const initId = location.hash.slice(1);
  if (initId && initId !== "top") {
    const target = document.getElementById(initId);
    if (target) {
      setActive(initId);
      setTimeout(() =>
        beginProgrammaticScroll(initId, () =>
          target.scrollIntoView({ behavior: "smooth", block: "start" })
        ), 150);
    }
  } else {
    computeActive();
  }
}

// ---------------------------------------------------------------------------
// Resume modal — preview PDF in-page before downloading
// ---------------------------------------------------------------------------

function createResumeModal() {
  const existing = document.getElementById("resume-modal");
  if (existing) return existing;

  const modal = document.createElement("div");
  modal.id = "resume-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", "Resume preview");
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-dialog">
      <div class="modal-header">
        <span class="modal-title">Resume Preview</span>
        <div class="modal-actions">
          <a id="modal-download-btn" class="btn btn-primary" href="#">Download PDF</a>
          <button id="modal-close-btn" class="btn btn-secondary" type="button">Close</button>
        </div>
      </div>
      <iframe id="modal-frame" title="Resume preview" src=""></iframe>
      <p class="modal-note">Preview not loading? Use the Download PDF button above.</p>
    </div>`;

  document.body.appendChild(modal);

  modal.querySelector(".modal-backdrop").addEventListener("click", closeResumeModal);
  modal.querySelector("#modal-close-btn").addEventListener("click", closeResumeModal);
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) closeResumeModal();
  });

  return modal;
}

function openResumeModal(url) {
  const modal = createResumeModal();
  const frame = document.getElementById("modal-frame");
  if (frame.src !== url) frame.src = url;
  const dlBtn = document.getElementById("modal-download-btn");
  dlBtn.href = url;
  dlBtn.setAttribute("download", "Jithendra-Kumar-Resume.pdf");
  modal.classList.add("is-open");
  document.body.classList.add("modal-open");
  // Push a dedicated history entry so Close/back returns here rather than leaving the site
  history.pushState({ resumeModal: true }, "", location.href);
}


function closeResumeModal() {
  const modal = document.getElementById("resume-modal");
  if (!modal || !modal.classList.contains("is-open")) return;
  // Hide first — then clear iframe so there is no flash of blank
  modal.classList.remove("is-open");
  document.body.classList.remove("modal-open");
  requestAnimationFrame(() => {
    const frame = document.getElementById("modal-frame");
    if (frame) frame.src = "";
  });
  // Pop the history entry that was pushed when the modal opened
  if (history.state && history.state.resumeModal) history.back();
}

// Browser back button while modal is open should close the modal, not navigate away
window.addEventListener("popstate", e => {
  const modal = document.getElementById("resume-modal");
  if (modal && modal.classList.contains("is-open") && !(e.state && e.state.resumeModal)) {
    modal.classList.remove("is-open");
    document.body.classList.remove("modal-open");
    requestAnimationFrame(() => {
      const frame = document.getElementById("modal-frame");
      if (frame) frame.src = "";
    });
  }
});

// ---------------------------------------------------------------------------
// Resume status
// ---------------------------------------------------------------------------

async function applyResumeStatus(resumeAction) {
  try {
    const response = await fetch(resolveResumeConfigPath());
    if (!response.ok) throw new Error("Unable to load resume config");

    const config = await response.json();
    const mode = config.mode || "coming_soon";
    const label = config.label || defaultResumeLabel(mode);
    const url = config.url || "assets/resume.pdf";

    resumeAction.textContent = label;

    if (mode === "local") {
      const exists = await urlExists(url);
      if (!exists) {
        setResumeComingSoonState(resumeAction, label || "Download PDF");
        return;
      }
      // PDF exists — open modal preview
      clearResumePendingState(resumeAction);
      resumeAction.textContent = label;
      resumeAction.href = "#";
      resumeAction.removeAttribute("download");
      resumeAction.removeAttribute("target");
      resumeAction.removeAttribute("rel");
      resumeAction.onclick = e => {
        e.preventDefault();
        openResumeModal(url);
      };
      return;
    }

    if (mode === "external") {
      if (!url) {
        setResumeComingSoonState(resumeAction, label || "Download PDF");
        return;
      }
      resumeAction.href = normalizeResumeUrl(url);
      resumeAction.removeAttribute("download");
      resumeAction.removeAttribute("target");
      resumeAction.removeAttribute("rel");
      clearResumePendingState(resumeAction);
      return;
    }

    setResumeComingSoonState(resumeAction, label);
  } catch {
    setResumeComingSoonState(resumeAction, "Download PDF");
  }
}

function resolveResumeConfigPath() {
  const currentPath = window.location.pathname || "/";
  return currentPath.includes("/blog/") ? "../assets/resume-status.json" : "assets/resume-status.json";
}

function defaultResumeLabel(mode) {
  if (mode === "local" || mode === "external") return "Download PDF";
  return "Download PDF";
}

async function urlExists(url) {
  try {
    const r = await fetch(url, { method: "HEAD" });
    if (r.ok) return true;
  } catch {
    // fall through to GET
  }
  try {
    const r = await fetch(url, { method: "GET" });
    return r.ok;
  } catch {
    return false;
  }
}

function setResumeComingSoonState(resumeAction, label) {
  resumeAction.textContent = label || "Download PDF";
  resumeAction.href = "#";
  resumeAction.removeAttribute("download");
  resumeAction.removeAttribute("target");
  resumeAction.removeAttribute("rel");
  resumeAction.onclick = e => e.preventDefault();
  resumeAction.dataset.defaultLabel = resumeAction.textContent;
  resumeAction.dataset.hoverLabel = "Uploading Soon";
  resumeAction.classList.add("is-pending");
  resumeAction.onmouseenter = () => {
    resumeAction.textContent = resumeAction.dataset.hoverLabel || "Uploading Soon";
  };
  resumeAction.onmouseleave = () => {
    resumeAction.textContent = resumeAction.dataset.defaultLabel || "Download PDF";
  };
}

function clearResumePendingState(resumeAction) {
  resumeAction.classList.remove("is-pending");
  resumeAction.onclick = null;
  resumeAction.onmouseenter = null;
  resumeAction.onmouseleave = null;
  delete resumeAction.dataset.defaultLabel;
  delete resumeAction.dataset.hoverLabel;
}

// ---------------------------------------------------------------------------
// Share bar — LinkedIn, X/Twitter, WhatsApp, Telegram, Signal, Email, Copy
// ---------------------------------------------------------------------------

function initShareBars() {
  document.querySelectorAll(".share-bar").forEach(bar => {
    const rawUrl = window.location.href;
    const url = encodeURIComponent(rawUrl);
    const title = encodeURIComponent(document.title);

    bar.querySelectorAll("[data-share]").forEach(btn => {
      const platform = btn.dataset.share;

      switch (platform) {
        case "linkedin":
          btn.href = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
          break;
        case "twitter":
          btn.href = `https://x.com/intent/tweet?url=${url}&text=${title}`;
          break;
        case "whatsapp":
          btn.href = `https://wa.me/?text=${title}%20${url}`;
          break;
        case "telegram":
          btn.href = `https://t.me/share/url?url=${url}&text=${title}`;
          break;
        case "signal":
          // Signal has no web share URL; copy the link so user can paste into Signal
          btn.addEventListener("click", e => {
            e.preventDefault();
            copyToClipboard(btn, rawUrl);
          });
          break;
        case "email":
          btn.href = `mailto:?subject=${title}&body=${encodeURIComponent("Check this out: " + rawUrl)}`;
          break;
        case "copy":
          btn.addEventListener("click", () => copyToClipboard(btn, rawUrl));
          break;
      }
    });
  });
}

function copyToClipboard(btn, text) {
  const original = btn.textContent;
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = "Copied!";
    btn.classList.add("is-copied");
    setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove("is-copied");
    }, 2000);
  }).catch(() => {
    // Fallback for browsers without clipboard API
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    btn.textContent = "Copied!";
    btn.classList.add("is-copied");
    setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove("is-copied");
    }, 2000);
  });
}

function normalizeResumeUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host.includes("drive.google.com")) {
      const idFromFilePath = parsed.pathname.match(/\/file\/d\/([^/]+)/);
      const id = idFromFilePath?.[1] || parsed.searchParams.get("id");
      if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
    }

    if (host.includes("1drv.ms") || host.includes("onedrive.live.com")) {
      parsed.searchParams.set("download", "1");
      return parsed.toString();
    }

    return parsed.toString();
  } catch {
    return url;
  }
}
