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
});

function initSectionRouter() {
  const sections = Array.from(document.querySelectorAll("section[id]"));
  const navLinks = document.querySelectorAll(
    ".site-nav a[href^=\"#\"], .site-nav-desktop a[href^=\"#\"]"
  );

  if (!sections.length) return;

  sections.forEach(s => { s.hidden = false; });
  const hero = document.querySelector(".hero");
  if (hero) hero.hidden = false;

  // Suppresses observer updates during programmatic (click-driven) scrolls
  let isProgrammatic = false;
  let scrollEndTimer = null;

  function setActive(id) {
    navLinks.forEach(link => {
      const href = link.getAttribute("href").slice(1);
      link.classList.toggle("is-active", !!id && href === id);
    });
  }

  function beginProgrammaticScroll(id, doScroll) {
    isProgrammatic = true;
    clearTimeout(scrollEndTimer);
    setActive(id);
    doScroll();
    // After smooth scroll finishes, hand control back to the observer
    scrollEndTimer = setTimeout(() => { isProgrammatic = false; }, 900);
  }

  // Smooth scroll on nav click
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
        beginProgrammaticScroll(id, () => target.scrollIntoView({ behavior: "smooth", block: "start" }));
        history.pushState(null, "", `#${id}`);
      }
    });
  });

  // IntersectionObserver — only fires during natural (non-programmatic) scrolling
  const observer = new IntersectionObserver(entries => {
    if (isProgrammatic) return;
    entries.forEach(entry => {
      if (entry.isIntersecting) setActive(entry.target.id);
    });
  }, {
    rootMargin: "-15% 0px -75% 0px",
    threshold: 0
  });

  sections.forEach(s => observer.observe(s));

  // Clear active when hero scrolls back into view
  const heroObserver = new IntersectionObserver(entries => {
    if (isProgrammatic) return;
    if (entries[0].isIntersecting) setActive(null);
  }, { threshold: 0.1 });

  if (hero) heroObserver.observe(hero);

  // Back/forward navigation
  window.addEventListener("popstate", () => {
    const id = location.hash.slice(1);
    if (!id || id === "top") {
      beginProgrammaticScroll(null, () => window.scrollTo({ top: 0, behavior: "smooth" }));
    } else {
      const target = document.getElementById(id);
      if (target) beginProgrammaticScroll(id, () => target.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  });

  // Initial load with a hash in the URL
  const initId = location.hash.slice(1);
  if (initId && initId !== "top") {
    const target = document.getElementById(initId);
    if (target) {
      setActive(initId);
      setTimeout(() => {
        beginProgrammaticScroll(initId, () => target.scrollIntoView({ behavior: "smooth", block: "start" }));
      }, 120);
    }
  }
}

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
      resumeAction.href = url;
      resumeAction.removeAttribute("download");
      resumeAction.setAttribute("target", "_blank");
      resumeAction.setAttribute("rel", "noopener noreferrer");
      clearResumePendingState(resumeAction);
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
  } catch (error) {
    setResumeComingSoonState(resumeAction, "Download PDF");
  }
}

function resolveResumeConfigPath() {
  const currentPath = window.location.pathname || "/";
  return currentPath.includes("/blog/") ? "../assets/resume-status.json" : "assets/resume-status.json";
}

function defaultResumeLabel(mode) {
  if (mode === "local") return "Download PDF";
  if (mode === "external") return "Download PDF";
  return "Download PDF";
}


async function urlExists(url) {
  try {
    const response = await fetch(url, { method: "HEAD" });
    if (response.ok) return true;
  } catch (error) {
    // ignore and fall back to GET
  }

  try {
    const response = await fetch(url, { method: "GET" });
    return response.ok;
  } catch (error) {
    return false;
  }
}

function setResumeComingSoonState(resumeAction, label) {
  resumeAction.textContent = label || "Download PDF";
  resumeAction.href = "#";
  resumeAction.removeAttribute("download");
  resumeAction.removeAttribute("target");
  resumeAction.removeAttribute("rel");
  resumeAction.onclick = (e) => e.preventDefault();
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

function normalizeResumeUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host.includes("drive.google.com")) {
      const idFromFilePath = parsed.pathname.match(/\/file\/d\/([^/]+)/);
      const id = idFromFilePath?.[1] || parsed.searchParams.get("id");
      if (id) {
        return `https://drive.google.com/uc?export=download&id=${id}`;
      }
    }

    if (host.includes("1drv.ms") || host.includes("onedrive.live.com")) {
      parsed.searchParams.set("download", "1");
      return parsed.toString();
    }

    return parsed.toString();
  } catch (error) {
    return url;
  }
}
