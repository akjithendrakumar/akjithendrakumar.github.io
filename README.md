# Portfolio site — Jithendra Kumar

This repository contains a static portfolio site and blog intended to be hosted on GitHub Pages.

Quick notes
- The site root is the repository root. For GitHub Pages, you can publish from the `gh-pages` branch (workflow added) or adjust settings to publish from the root.
- Place your PDF resume at `assets/resume.pdf` to enable the download link on `resume.html`.

Blog workflow
- Write posts in Markdown under `blog/posts/`.
- Update `blog/posts/index.json` with metadata for each post (title, date, src, excerpt, tags).
- The site provides client-side search, tag filtering, pagination, and an RSS feed at `/rss.xml`.

Social sharing
- Each post includes a share panel with a ready-made LinkedIn post text you can customize. Click `Open LinkedIn share` to share the post URL or edit the text and click `Copy post text` to copy a customizable LinkedIn post to your clipboard.

Adding posts
- Add a Markdown file under `blog/posts/` and append a metadata entry to `blog/posts/index.json` with `title`, `date` (YYYY-MM-DD), `src` (path), `excerpt`, `tags` (array), and `url`.
- The `post.html` viewer will use that metadata to prefill share text and list posts on `blog/index.html`.

 Workflows and PAT setup
- If your organization or repo restricts `GITHUB_TOKEN` push permissions, create a Personal Access Token (PAT) with `repo` scope.
- Add the PAT to the repository secrets (Settings → Secrets → Actions) with the name `REPO_PAT` (used for committing generated files) and `DEPLOY_PAT` (used for deploying to Pages).
- The generator workflow uses `REPO_PAT` to push regenerated `index.json`, `rss.xml`, `assets/og/`, and `assets/resume.pdf` back to `main`.
- The Pages deploy workflow uses `DEPLOY_PAT` to publish to the `gh-pages` branch.

 Important: keep the PAT secret safe and rotate it if compromised. If you prefer, you can instead allow `GITHUB_TOKEN` pushes in your organization settings.
Deployment
- A GitHub Action (`.github/workflows/deploy.yml`) deploys the repo contents to the `gh-pages` branch when you push to `main`.
- To enable Pages, go to repository Settings → Pages and select `gh-pages` branch as the source.
