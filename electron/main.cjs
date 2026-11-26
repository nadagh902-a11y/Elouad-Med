const { app, BrowserWindow } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function startLocalStaticServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const reqPath = (req.url || '/').split('?')[0];
      let filePath = path.join(DIST_DIR, reqPath === '/' ? 'index.html' : reqPath);
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(DIST_DIR, 'index.html');
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      });
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, port: addr.port });
    });
  });
}

let serverRef = null;

app.whenReady().then(async () => {
  const { server, port } = await startLocalStaticServer();
  serverRef = server;

  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 680,
    title: 'Chiffrage & Attachement — Travaux Électriques',
    icon: path.join(__dirname, '..', 'public', 'chiffrage.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadURL(`http://127.0.0.1:${port}/`);
});

app.on('window-all-closed', () => {
  if (serverRef) {
    try {
      serverRef.close();
    } catch {}
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
