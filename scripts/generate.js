const fs = require('fs-extra');
const path = require('path');
const matter = require('gray-matter');
const puppeteer = require('puppeteer');

async function main() {
  const postsDir = path.join(__dirname, '..', 'blog', 'posts');
  const outIndex = path.join(__dirname, '..', 'blog', 'posts', 'index.json');
  const rssOut = path.join(__dirname, '..', 'rss.xml');
  const ogDir = path.join(__dirname, '..', 'assets', 'og');
  await fs.ensureDir(ogDir);

  const files = await collectMarkdownFiles(postsDir);
  const posts = [];

  for (const file of files) {
    const full = path.join(postsDir, file);
    const raw = await fs.readFile(full, 'utf8');
    const parsed = matter(raw);
    let title = parsed.data.title;
    if (!title) {
      const m = raw.match(/^#\s+(.+)$/m);
      title = m ? m[1].trim() : path.basename(file, '.md');
    }
    const date = parsed.data.date || inferDateFromFilename(path.basename(file)) || new Date().toISOString().slice(0,10);
    const category = parsed.data.category || 'Articles';
    const tags = parsed.data.tags || [];
    const keywords = parsed.data.keywords || [];
    const excerpt = parsed.data.excerpt || extractExcerpt(parsed.content);
    const webPath = toWebPath(file);
    const src = `posts/${webPath}`;
    posts.push({ title, date, category, tags, keywords, excerpt, src, url: `post.html?src=posts/${webPath}` });
  }

  posts.sort((a,b)=> b.date.localeCompare(a.date));
  await fs.writeFile(outIndex, JSON.stringify(posts, null, 2));
  console.log('Wrote', outIndex);

  // generate rss
  const siteUrl = 'https://akjithendrakumar.github.io';
  let rss = `<?xml version="1.0" encoding="utf-8"?>\n<rss version="2.0">\n  <channel>\n    <title>Jithendra Kumar — Blog</title>\n    <link>${siteUrl}</link>\n    <description>Blog posts about cloud architecture, DevOps, and MLOps.</description>\n    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n`;
  for (const p of posts) {
    rss += `    <item>\n      <title>${escapeXml(p.title)}</title>\n      <link>${siteUrl}/blog/${p.url}</link>\n      <pubDate>${new Date(p.date).toUTCString()}</pubDate>\n      <description>${escapeXml(p.excerpt)}</description>\n      <guid>${siteUrl}/blog/${p.url}</guid>\n    </item>\n`;
  }
  rss += '  </channel>\n</rss>\n';
  await fs.writeFile(rssOut, rss);
  console.log('Wrote', rssOut);

  // generate OG images and resume PDF using Puppeteer
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  try {
    for (const p of posts) {
      const slug = path.basename(p.src, '.md');
      const ogPath = path.join(ogDir, `${slug}.png`);
      const html = ogSvg(p.title, p.date);
      const page = await browser.newPage();
      await page.setViewport({ width: 1200, height: 630 });
      await page.setContent(html);
      await page.screenshot({ path: ogPath });
      await page.close();
      console.log('Wrote OG', ogPath);
    }

    // generate resume PDF from resume.html
    const resumeHtml = `file://${path.join(__dirname,'..','resume.html').replace(/\\/g, '/')}`;
    const page = await browser.newPage();
    await page.goto(resumeHtml, { waitUntil: 'networkidle0' });
    const outPdf = path.join(__dirname, '..', 'assets', 'resume.pdf');
    await page.pdf({ path: outPdf, format: 'A4', printBackground: true });
    console.log('Wrote PDF', outPdf);
    await page.close();
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
  const m = file.match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function toWebPath(file) {
  return file.split(path.sep).join('/');
}

function extractExcerpt(content) {
  const lines = content.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  for (const l of lines) {
    if (!l.startsWith('#')) return l.slice(0,160);
  }
  return '';
}

function escapeXml(s){
  return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function ogSvg(title, date){
  const esc = (x)=>x.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return `
  <html><head><meta charset="utf-8"></head><body>
  <div style="width:1200px;height:630px;display:flex;align-items:center;justify-content:center;background:#0b2f2a;color:white;font-family:Inter,Arial,sans-serif;">
    <div style="padding:48px;max-width:1050px;">
      <div style="font-size:28px;opacity:0.9;margin-bottom:12px">Jithendra Kumar — Blog</div>
      <div style="font-size:48px;font-weight:700;line-height:1.05">${esc(title)}</div>
      <div style="margin-top:20px;font-size:20px;opacity:0.9">${esc(date)}</div>
    </div>
  </div>
  </body></html>`;
}

main().catch(e=>{ console.error(e); process.exit(1); });
