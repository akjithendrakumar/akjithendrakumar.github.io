# akjithendrakumar.github.io

Static portfolio and blog site hosted on GitHub Pages.

## What this repo contains

- Site source: `index.html`, `resume.html`, `blog/index.html`, `blog/post.html`
- Styles and scripts: `assets/styles.css`, `assets/script.js`
- Generator: `scripts/generate.js` (Node + Puppeteer — run by the content repo workflow)
- Generated output: `blog/thoughts/`, `blog/articles/`, `blog/posts/index.json`, `rss.xml`, `assets/og/`, `assets/resume.pdf`

## Blog content

Blog posts (Markdown source) live in the **private** repo [`akjithendrakumar/blog-content`](https://github.com/akjithendrakumar/blog-content).

To publish a post: add a `.md` file there and push. The `publish.yml` workflow in that repo handles generation and pushes the output here. This repo's deploy workflow then deploys to Pages automatically.

## Deployment

The `generate-and-deploy.yml` workflow runs on every push to `main`. It stages the site and deploys to GitHub Pages. No generation happens here — all content generation is handled by the content repo workflow.

To enable Pages: Settings → Pages → Source: GitHub Actions.
