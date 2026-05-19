document.addEventListener("DOMContentLoaded", () => {
  const year = document.getElementById("year");

  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  const resumeAction = document.getElementById("resume-action");
  const resumeNote = document.getElementById("resume-note");

  if (resumeAction && resumeNote) {
    applyResumeStatus(resumeAction, resumeNote);
  }
});

async function applyResumeStatus(resumeAction, resumeNote) {
  try {
    const response = await fetch(resolveResumeConfigPath());
    if (!response.ok) throw new Error("Unable to load resume config");

    const config = await response.json();
    const mode = config.mode || "coming_soon";
    const label = config.label || defaultResumeLabel(mode);
    const url = config.url || "assets/resume.pdf";
    const message = config.message || defaultResumeMessage(mode);

    resumeAction.textContent = label;
    resumeNote.textContent = message;

    if (mode === "local") {
      const exists = await urlExists(url);
      if (!exists) {
        setResumeComingSoonState(
          resumeAction,
          resumeNote,
          "Resume Coming Soon",
          "A local resume PDF is not available yet. The button will route to the placeholder status page for now."
        );
        return;
      }
      resumeAction.href = url;
      resumeAction.setAttribute("download", "");
      resumeAction.removeAttribute("target");
      resumeAction.removeAttribute("rel");
      clearResumePendingState(resumeAction);
      return;
    }

    if (mode === "external") {
      if (!url) {
        setResumeComingSoonState(
          resumeAction,
          resumeNote,
          "Resume Coming Soon",
          "An external resume link is not configured yet. The placeholder status page will be shown for now."
        );
        return;
      }
      resumeAction.href = url;
      resumeAction.removeAttribute("download");
      resumeAction.setAttribute("target", "_blank");
      resumeAction.setAttribute("rel", "noreferrer");
      clearResumePendingState(resumeAction);
      return;
    }

    setResumeComingSoonState(resumeAction, resumeNote, label, message);
  } catch (error) {
    setResumeComingSoonState(
      resumeAction,
      resumeNote,
      "Resume Coming Soon",
      "Resume configuration is unavailable right now. A placeholder status page will be shown instead."
    );
  }
}

function resolveResumeConfigPath() {
  const currentPath = window.location.pathname || "/";
  return currentPath.includes("/blog/") ? "../assets/resume-status.json" : "assets/resume-status.json";
}

function defaultResumeLabel(mode) {
  if (mode === "local") return "Download PDF";
  if (mode === "external") return "Open Resume";
  return "Resume Coming Soon";
}

function defaultResumeMessage(mode) {
  if (mode === "local") return "A local PDF is available for download.";
  if (mode === "external") return "The resume is currently hosted through an external link.";
  return "The resume is not uploaded yet. A status page will be shown until it is ready.";
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

function setResumeComingSoonState(resumeAction, resumeNote, label, message) {
  resumeAction.textContent = label || "Resume Coming Soon";
  resumeAction.href = "resume-coming-soon.html";
  resumeAction.removeAttribute("download");
  resumeAction.removeAttribute("target");
  resumeAction.removeAttribute("rel");
  resumeAction.dataset.defaultLabel = resumeAction.textContent;
  resumeAction.dataset.hoverLabel = "Coming Soon";
  resumeAction.classList.add("is-pending");
  resumeAction.onmouseenter = () => {
    resumeAction.textContent = resumeAction.dataset.hoverLabel || "Coming Soon";
  };
  resumeAction.onmouseleave = () => {
    resumeAction.textContent = resumeAction.dataset.defaultLabel || "Resume Coming Soon";
  };
  resumeNote.textContent = message;
}

function clearResumePendingState(resumeAction) {
  resumeAction.classList.remove("is-pending");
  resumeAction.onmouseenter = null;
  resumeAction.onmouseleave = null;
  delete resumeAction.dataset.defaultLabel;
  delete resumeAction.dataset.hoverLabel;
}
