// Frame-accurate renderer: seeks the GSAP timeline in scenes.html and pipes frames to ffmpeg.
//   node render.mjs --stills 1,5,12        -> build/still-<t>.png (quick visual checks)
//   node render.mjs [--fps 30] [--workers 4] -> build/video-silent.mp4
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const here = path.dirname(new URL(import.meta.url).pathname);
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1]]), a), []));
const TL = JSON.parse(fs.readFileSync(path.join(here, 'build/timeline.json'), 'utf8'));
const FPS = +(args.fps || 30), WORKERS = +(args.workers || 4);
const url = 'file://' + path.join(here, 'scenes.html');

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') console.log('[page]', m.text()); });
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.addInitScript(tl => { window.TL = tl; }, TL);
  await page.goto(url);
  await page.waitForFunction(() => window.READY === true, null, { timeout: 30000 });
  return page;
}

const browser = await chromium.launch();
if (args.stills) {
  const page = await openPage(browser);
  for (const t of args.stills.split(',').map(Number)) {
    await page.evaluate(t => window.renderAt(t), t);
    await page.screenshot({ path: path.join(here, `build/still-${t}.png`) });
  }
  await browser.close();
  process.exit(0);
}

const total = Math.ceil(TL.total * FPS);
const per = Math.ceil(total / WORKERS);
const t0 = Date.now();
await Promise.all(Array.from({ length: WORKERS }, async (_, w) => {
  const a = w * per, b = Math.min(total, a + per);
  const page = await openPage(browser);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS), path.join(here, `build/seg${w}.mp4`)]);
  const done = new Promise(r => ff.on('close', r));
  // warm up from a little before the segment so seek state is identical to a linear play
  for (let f = Math.max(0, a - FPS); f < a; f += 5) await page.evaluate(t => window.renderAt(t), f / FPS);
  for (let f = a; f < b; f++) {
    await page.evaluate(t => window.renderAt(t), f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (w === 0 && f % 60 === 0) console.log(`frame ${f}/${b} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  ff.stdin.end(); await done;
}));
await browser.close();
fs.writeFileSync(path.join(here, 'build/segs.txt'), Array.from({ length: WORKERS }, (_, w) => `file 'seg${w}.mp4'`).join('\n'));
spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(here, 'build/segs.txt'), '-c', 'copy', path.join(here, 'build/video-silent.mp4')], { stdio: 'inherit' })
  .on('close', c => console.log('done', c, ((Date.now() - t0) / 1000).toFixed(0) + 's'));
