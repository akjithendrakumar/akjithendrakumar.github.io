const fs = require('fs-extra');
const path = require('path');
const matter = require('gray-matter');
const puppeteer = require('puppeteer');

const ROOT = path.join(__dirname, '..');
const BLOG_DIR = path.join(ROOT, 'blog');
const POSTS_DIR = path.join(BLOG_DIR, 'posts');
const POSTS_INDEX = path.join(POSTS_DIR, 'index.json');
const RSS_OUT = path.join(ROOT, 'rss.xml');
const OG_DIR = path.join(ROOT, 'assets', 'og');
const GENERATED_CATEGORY_DIRS = ['thoughts', 'articles', 'whitepapers'];
const SITE_URL = 'https://akjithendrakumar.github.io';

async function main() {
  await fs.ensureDir(OG_DIR);
  await cleanGeneratedPostDirs();

  const files = await collectMarkdownFiles(POSTS_DIR);
  const posts = [];

  for (const file of files) {
    const full = path.join(POSTS_DIR, file);
    const raw = await fs.readFile(full, 'utf8');
    const parsed = matter(raw);

    let title = parsed.data.title;
    if (!title) {
      const headingMatch = raw.match(/^#\s+(.+)$/m);
      title = headingMatch ? headingMatch[1].trim() : path.basename(file, '.md');
    }

    const date = parsed.data.date || inferDateFromFilename(path.basename(file)) || new Date().toISOString().slice(0, 10);
    const category = parsed.data.category || 'Articles';
    const tags = Array.isArray(parsed.data.tags) ? parsed.data.tags : [];
    const keywords = Array.isArray(parsed.data.keywords) ? parsed.data.keywords : [];
    const excerpt = parsed.data.excerpt || extractExcerpt(parsed.content);
    const content = parsed.content.trim();
    const webPath = toWebPath(file);
    const src = `posts/${webPath}`;
    const slug = parsed.data.slug || slugify(title);
    const route = buildRoute(category, date, slug);
    const absoluteUrl = `${SITE_URL}${route}`;

    posts.push({
      title,
      date,
      category,
      tags,
      keywords,
      excerpt,
      content,
      slug,
      src,
      route,
      url: route,
      absoluteUrl,
      legacyUrl: `/blog/post.html?src=${encodeURIComponent(src)}`,
      published: isPublished(date),
    });
  }

  posts.sort((a, b) => b.date.localeCompare(a.date));
  await fs.writeFile(POSTS_INDEX, JSON.stringify(posts, null, 2));
  console.log('Wrote', POSTS_INDEX);

  await writeStaticPostPages(posts);
  await writeRss(posts);
  await writeOgImagesAndResume(posts);
}

async function cleanGeneratedPostDirs() {
  for (const dir of GENERATED_CATEGORY_DIRS) {
    await fs.remove(path.join(BLOG_DIR, dir));
  }
}

async function writeStaticPostPages(posts) {
  for (const post of posts) {
    if (!post.published) continue;

    const targetDir = path.join(ROOT, post.route.replace(/^\//, ''));
    await fs.ensureDir(targetDir);
    await fs.writeFile(path.join(targetDir, 'index.html'), renderPostPage(post));
    console.log('Wrote page', path.join(targetDir, 'index.html'));
  }
}

async function writeRss(posts) {
  const publishedPosts = posts.filter((post) => post.published);
  let rss = `<?xml version="1.0" encoding="utf-8"?>\n<rss version="2.0">\n  <channel>\n    <title>Jithendra Kumar — Blog</title>\n    <link>${SITE_URL}</link>\n    <description>Blog posts about cloud architecture, DevOps, and MLOps.</description>\n    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n`;

  for (const post of publishedPosts) {
    rss += `    <item>\n      <title>${escapeXml(post.title)}</title>\n      <link>${escapeXml(post.absoluteUrl)}</link>\n      <pubDate>${new Date(post.date).toUTCString()}</pubDate>\n      <description>${escapeXml(post.excerpt)}</description>\n      <guid>${escapeXml(post.absoluteUrl)}</guid>\n    </item>\n`;
  }

  rss += '  </channel>\n</rss>\n';
  await fs.writeFile(RSS_OUT, rss);
  console.log('Wrote', RSS_OUT);
}

async function writeOgImagesAndResume(posts) {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });

  try {
    for (const post of posts) {
      const ogPath = path.join(OG_DIR, `${post.slug}.png`);
      const page = await browser.newPage();
      await page.setViewport({ width: 1200, height: 630 });
      await page.setContent(ogSvg(post.title, post.date));
      await page.screenshot({ path: ogPath });
      await page.close();
      console.log('Wrote OG', ogPath);
    }

    const resumeHtml = `file://${path.join(ROOT, 'resume.html').replace(/\\/g, '/')}`;
    const resumePage = await browser.newPage();
    await resumePage.goto(resumeHtml, { waitUntil: 'networkidle0' });
    await resumePage.emulateMediaType('print');
    const outPdf = path.join(ROOT, 'assets', 'resume.pdf');
    await resumePage.pdf({
      path: outPdf,
      format: 'A4',
      printBackground: false,
      margin: { top: '18mm', bottom: '18mm', left: '16mm', right: '16mm' },
    });
    console.log('Wrote PDF', outPdf);
    await resumePage.close();
  } finally {
    await browser.close();
  }
}

async function collectMarkdownFiles(rootDir, currentDir = rootDir) {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue;

    const absolutePath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectMarkdownFiles(rootDir, absolutePath));
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    files.push(path.relative(rootDir, absolutePath));
  }

  return files;
}

function inferDateFromFilename(file) {
  const match = file.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function isPublished(dateString, now = new Date()) {
  if (!dateString) return true;
  const parts = dateString.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return true;
  const [year, month, day] = parts;
  const publishAt = new Date(year, month - 1, day, 0, 0, 0, 0);
  return now.getTime() >= publishAt.getTime();
}

function toWebPath(file) {
  return file.split(path.sep).join('/');
}

function extractExcerpt(content) {
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    if (!line.startsWith('#')) return line.slice(0, 160);
  }
  return '';
}

function escapeXml(value) {
  return (value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeHtml(value) {
  return (value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugify(value) {
  return (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'post';
}

function slugifyCategory(category) {
  const normalized = slugify(category);
  if (normalized === 'thought') return 'thoughts';
  if (normalized === 'article') return 'articles';
  if (normalized === 'whitepaper') return 'whitepapers';
  return normalized || 'articles';
}

function buildRoute(category, date, slug) {
  const [year, month, day] = date.split('-');
  return `/blog/${slugifyCategory(category)}/${year}/${month}/${day}/${slug}/`;
}

function ogSvg(title, date) {
  const escaped = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `
  <html><head><meta charset="utf-8"></head><body>
  <div style="width:1200px;height:630px;display:flex;align-items:center;justify-content:center;background:#0b2f2a;color:white;font-family:IBM Plex Sans,Arial,sans-serif;">
    <div style="padding:48px;max-width:1050px;">
      <div style="font-size:28px;opacity:0.9;margin-bottom:12px">Jithendra Kumar — Blog</div>
      <div style="font-size:48px;font-weight:700;line-height:1.05">${escaped(title)}</div>
      <div style="margin-top:20px;font-size:20px;opacity:0.9">${escaped(date)}</div>
    </div>
  </div>
  </body></html>`;
}

function renderPostPage(post) {
  const postJson = JSON.stringify(post).replace(/</g, '\\u003c');
  const title = escapeHtml(`${post.title} — Jithendra Kumar`);
  const description = escapeHtml(post.excerpt || post.title);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <link href="/assets/styles.css" rel="stylesheet" />
</head>
<body>
  <header class="site-header">
    <div class="container nav-wrap">
      <a class="brand" href="/">
        <span class="brand-mark" aria-hidden="true">J</span>
        <span class="brand-copy">
          <span class="brand-name">Jithendra Kumar</span>
          <span class="brand-meta">Cloud · DevOps · Platform</span>
        </span>
      </a>
      <nav class="site-nav site-nav-mobile" aria-label="Primary navigation">
        <a href="/">Home</a>
        <a href="/resume.html">Resume</a>
        <a href="/blog/">All Posts</a>
        <a href="/blog/?type=thoughts">Thoughts</a>
        <a href="/blog/?type=whitepapers">Whitepapers</a>
      </nav>
    </div>
  </header>

  <div class="site-layout">
    <aside class="sidebar" aria-label="Sidebar navigation">
      <div class="container">
        <nav class="site-nav-desktop">
          <a href="/">Home</a>
          <a href="/resume.html">Resume</a>
          <a href="/blog/">All Posts</a>
          <a href="/blog/?type=thoughts">Thoughts</a>
          <a href="/blog/?type=whitepapers">Whitepapers</a>
        </nav>
      </div>
    </aside>

    <main class="section">
      <div class="container">
        <div id="post-root" class="card-grid">
          <article class="achievement-card">
            <div id="post-content">Loading post…</div>
          </article>
          <aside id="share-panel" style="display:none; margin-top:1rem;">
            <div class="panel-card">
              <p class="panel-label">Share</p>
              <h3 id="share-title">Share this post</h3>
              <div class="share-bar" id="post-share-bar" style="margin-top:0.75rem">
                <a id="share-linkedin" class="share-btn" href="#" target="_blank" rel="noopener noreferrer">LinkedIn</a>
                <a id="share-twitter" class="share-btn" href="#" target="_blank" rel="noopener noreferrer">X / Twitter</a>
                <a id="share-whatsapp" class="share-btn" href="#" target="_blank" rel="noopener noreferrer">WhatsApp</a>
                <a id="share-telegram" class="share-btn" href="#" target="_blank" rel="noopener noreferrer">Telegram</a>
                <a id="share-signal" class="share-btn" href="#">Signal</a>
                <a id="share-email" class="share-btn" href="#">Email</a>
                <button id="share-copy" class="share-btn" type="button">Copy Link</button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  </div>

  <footer class="site-footer">
    <div class="container footer-wrap">
      <p>© <span id="year"></span> Jithendra Kumar. Built for GitHub Pages.</p>
    </div>
  </footer>

  <script id="post-data" type="application/json">${postJson}</script>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script src="/assets/script.js"></script>
  <script>
    function escapeInlineHtml(value) {
      return value.replace(/[&<>]/g, function (ch) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[ch];
      });
    }

    function renderPost() {
      const post = JSON.parse(document.getElementById('post-data').textContent);
      const markdown = post.content || '';
      const html = window.marked
        ? marked.parse(markdown)
        : '<pre>' + escapeInlineHtml(markdown) + '</pre>';

      document.getElementById('post-content').innerHTML = html;
      document.getElementById('share-panel').style.display = 'block';
      document.getElementById('share-title').textContent = post.title;

      const pageUrl = window.location.href;
      const url = encodeURIComponent(pageUrl);
      const title = encodeURIComponent(post.title);
      const hashtags = (post.tags || []).map(function (tag) {
        return '%23' + String(tag).replace(/[^a-zA-Z0-9]/g, '');
      }).join('%20');
      const tweetText = hashtags ? title + '%20' + hashtags : title;

      document.getElementById('share-linkedin').href =
        'https://www.linkedin.com/sharing/share-offsite/?url=' + url;
      document.getElementById('share-twitter').href =
        'https://x.com/intent/tweet?url=' + url + '&text=' + tweetText;
      document.getElementById('share-whatsapp').href =
        'https://wa.me/?text=' + title + '%20' + url;
      document.getElementById('share-telegram').href =
        'https://t.me/share/url?url=' + url + '&text=' + title;
      document.getElementById('share-email').href =
        'mailto:?subject=' + title + '&body=' + encodeURIComponent('Check out this post: ' + pageUrl);

      // Signal and Copy both copy the link to clipboard
      ['share-signal', 'share-copy'].forEach(function (id) {
        document.getElementById(id).addEventListener('click', function (e) {
          e.preventDefault();
          var btn = document.getElementById(id);
          navigator.clipboard.writeText(pageUrl).then(function () {
            var orig = btn.textContent;
            btn.textContent = 'Copied!';
            btn.classList.add('is-copied');
            setTimeout(function () {
              btn.textContent = orig;
              btn.classList.remove('is-copied');
            }, 2000);
          });
        });
      });
    }

    document.addEventListener('DOMContentLoaded', renderPost);
  </script>
</body>
</html>`;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
