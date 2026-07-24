/**
 * server.js — خادم محلي لمطعم DUO
 * ────────────────────────────────────────────────────────────
 * يشغّل شيئين معاً على كمبيوتر المحل:
 *   1) خادم ويب يقدّم ملفات الموقع (المنيو + لوحة التحكم) عبر HTTP على الشبكة المحلية.
 *   2) خادم إشارة PeerJS محلي (PeerServer) للربط بين الأيبادين بدون إنترنت.
 *
 * التشغيل:  npm install  ثم  npm start
 * ثم افتح على كل أيباد:  http://<IP-الكمبيوتر>:9000/
 */

const path    = require('path');
const os      = require('os');
const express = require('express');
const { ExpressPeerServer } = require('peer');

const PORT = process.env.PORT || 9000;

const app = express();

/* ── تقديم ملفات الموقع (المجلد الأب) ── */
const SITE_DIR = path.join(__dirname, '..');
app.use(express.static(SITE_DIR));

/* ── بدء خادم HTTP ── */
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('\n══════════════════════════════════════════════');
  console.log('  خادم DUO المحلي يعمل الآن ✓');
  console.log('══════════════════════════════════════════════');
  console.log('  افتح الموقع على كل أيباد على أحد العناوين:');
  printAddresses(PORT);
  console.log('  إعداد لوحة التحكم ← ربط الأجهزة ← خادم متقدّم:');
  console.log(`     Host  = <نفس IP الكمبيوتر أعلاه>`);
  console.log(`     Port  = ${PORT}`);
  console.log(`     Path  = /peerjs`);
  console.log(`     HTTPS = غير مفعّل`);
  console.log('══════════════════════════════════════════════\n');
});

/* ── خادم إشارة PeerJS المحلي على المسار /peerjs ── */
const peerServer = ExpressPeerServer(server, {
  path: '/',
  allow_discovery: true,
});
app.use('/peerjs', peerServer);

peerServer.on('connection', c => console.log('[peer] اتصل:',   c.getId()));
peerServer.on('disconnect', c => console.log('[peer] انفصل:', c.getId()));

/* ── طباعة عناوين IP المحلية ── */
function printAddresses(port) {
  const nets = os.networkInterfaces();
  let found = false;
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`     → http://${net.address}:${port}/`);
        found = true;
      }
    }
  }
  if (!found) console.log(`     → http://localhost:${port}/`);
}
