// Bundles the Lucide icons used by scenes.html into build/icons.js
import fs from 'fs';
const names = ['user','store','building-2','rocket','globe','package','shopping-cart','file-text','zap','receipt','scale',
 'chart-column','shield-check','refresh-cw','life-buoy','search','sparkles','message-square','layers','database','cpu','brain',
 'landmark','coins','badge-check','percent','key-round','award','map-pin','network','boxes','briefcase','bot','trending-up',
 'triangle-alert','activity','users','wallet','gauge','link','plus','check','cloud','server','box','handshake','palette',
 'blocks','code-xml','compass','target','fingerprint','book-open','wrench','list-checks','store','circle-check-big','arrow-right'];
const out = {};
for (const n of names) {
  const f = `node_modules/lucide-static/icons/${n}.svg`;
  if (!fs.existsSync(f)) { console.error('missing', n); continue; }
  out[n] = fs.readFileSync(f, 'utf8').replace(/<!--.*?-->/s, '').replace(/\s+/g, ' ').replace(/class="[^"]*"/, '').replace(/width="24" height="24"/, '').trim();
}
fs.mkdirSync('build', { recursive: true });
fs.writeFileSync('build/icons.js', 'window.ICONS=' + JSON.stringify(out) + ';');
console.log(Object.keys(out).length, 'icons');
