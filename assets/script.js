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
      resumeAction.href = url;
      resumeAction.setAttribute("download", "");
      resumeAction.removeAttribute("target");
      resumeAction.removeAttribute("rel");
      return;
    }

    if (mode === "external") {
      resumeAction.href = url;
      resumeAction.removeAttribute("download");
      resumeAction.setAttribute("target", "_blank");
      resumeAction.setAttribute("rel", "noreferrer");
      return;
    }

    resumeAction.href = "resume-coming-soon.html";
    resumeAction.removeAttribute("download");
    resumeAction.removeAttribute("target");
    resumeAction.removeAttribute("rel");
  } catch (error) {
    resumeAction.textContent = "Resume Coming Soon";
    resumeAction.href = "resume-coming-soon.html";
    resumeAction.removeAttribute("download");
    resumeNote.textContent = "Resume configuration is unavailable right now. A placeholder status page will be shown instead.";
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
