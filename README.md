# Portfolio site — Jithendra Kumar

This repository contains a static portfolio site and blog intended to be hosted on GitHub Pages.

Quick notes
- The site root is the repository root. GitHub Pages should publish directly from the `main` branch root.
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
- Use a fine-grained GitHub token for best security.
- Create a token with access to only this repository (`akjithendrakumar/akjithendrakumar.github.io`).
- Required repository permissions:
  - Contents: Read & write
  - Actions / Workflows: Read & write (optional only if workflow metadata or workflow run management is needed)
- Set a reasonable expiration, then copy the token once.
- Add the token as a single repository secret named `REPO_PAT` (Settings → Secrets and variables → Actions → New repository secret).
- The generator workflow uses `REPO_PAT` to commit generated files back to `main`.

Important: keep the PAT secret safe and rotate it if compromised. If you prefer not to use a PAT, you can instead allow `GITHUB_TOKEN` push access on the repository or organization settings.
Deployment
- The only publish workflow runs on pushes to `main`, which means changes should be tested locally first and only then merged to `main`.
- The publish workflow uses a single concurrency group on `main`, so if one deploy run is still active, later runs wait in the queue instead of overlapping or canceling the in-progress run.
- To enable Pages, go to repository Settings → Pages and select `Deploy from a branch`, then choose `main` and `/ (root)`.
