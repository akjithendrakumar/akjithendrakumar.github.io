# akjithendrakumar.github.io

Static portfolio and blog site hosted on GitHub Pages.

## What this repo contains

| Path | Purpose |
| --- | --- |
| `index.html`, `resume.html` | Portfolio and resume pages |
| `blog/index.html` | Blog listing page |
| `blog/post.html` | Legacy redirect handler for old `?src=` links |
| `assets/styles.css`, `assets/script.js` | Shared styles and JS |
| `scripts/generate.js` | Generator — invoked by content repo workflows, not here |
| `blog/posts/index.json` | Generated post index (read by the blog listing page) |
| `blog/thoughts/`, `blog/articles/` | Generated static post pages |
| `rss.xml`, `assets/og/` | Generated RSS feed and OG images |
| `assets/resume.pdf` | Generated resume PDF |
| `data/portfolio.json` | Injected at build time by the portfolio-data workflow |

## Blog post URLs

Posts are served at `/blog/{category}/{slug}/` — for example:

- `/blog/thoughts/introducing-the-blog/`
- `/blog/articles/modern-ci-cd-patterns-for-reliable-delivery/`

The slug comes from the `slug` frontmatter field in the source markdown, or is derived from the post title.

## Content workflows

This repo does **not** generate its own content. Generation is triggered by two private repos:

- **[blog-content](https://github.com/akjithendrakumar/blog-content)** — markdown posts → `blog/thoughts/`, `blog/articles/`, `blog/posts/index.json`, `rss.xml`, `assets/og/`
- **[portfolio-data](https://github.com/akjithendrakumar/portfolio-data)** — `portfolio.json` → `index.html`, `resume.html`, `assets/resume.pdf`

## Deployment

The `generate-and-deploy.yml` workflow deploys to GitHub Pages on every push to `main`. It stages a clean artifact — excluding `scripts/`, `node_modules/`, `README.md`, and any leftover markdown in `blog/posts/` — then deploys it via the GitHub Pages action.

To enable Pages: Settings → Pages → Source: GitHub Actions.
