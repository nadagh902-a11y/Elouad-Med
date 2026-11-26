import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { build } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distOfflineDir = path.join(rootDir, 'dist-offline');
const publicDir = path.join(rootDir, 'public');

async function main() {
  await build({
    configFile: path.join(rootDir, 'vite.offline.config.ts'),
  });

  const files = fs.readdirSync(distOfflineDir);
  const cssFiles = files.filter((f) => f.endsWith('.css'));
  const jsFiles = files.filter((f) => f.endsWith('.js'));

  if (jsFiles.length === 0) {
    throw new Error('Offline build produced no JS bundle.');
  }

  const cssContent = cssFiles
    .map((f) => fs.readFileSync(path.join(distOfflineDir, f), 'utf8'))
    .join('\n');

  let jsContent = jsFiles
    .map((f) => fs.readFileSync(path.join(distOfflineDir, f), 'utf8'))
    .join('\n');

  // Inline Sonelgaz logo as base64 data URI so file:// offline mode displays and exports PDFs cleanly
  const logoPath = path.join(publicDir, 'assets/aistudio/LOGO__00bdc765.jpeg');
  if (fs.existsSync(logoPath)) {
    const logoBase64 = fs.readFileSync(logoPath).toString('base64');
    const logoDataUri = `data:image/jpeg;base64,${logoBase64}`;
    jsContent = jsContent
      .split('/assets/aistudio/LOGO__00bdc765.jpeg')
      .join(logoDataUri);
  }

  // Prevent literal </script> inside bundled strings (such as HTA template literals) from closing the script tag
  const safeJsContent = jsContent.replace(/<\/(script)/gi, '<\\/$1');

  let faviconTag = '';
  const iconSvgPath = path.join(publicDir, 'icon.svg');
  if (fs.existsSync(iconSvgPath)) {
    const iconBase64 = fs.readFileSync(iconSvgPath).toString('base64');
    faviconTag = `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,${iconBase64}" />`;
  }

  const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Chiffrage &amp; Attachement — Travaux Électriques</title>
    ${faviconTag}
    <style>${cssContent}</style>
  </head>
  <body class="bg-slate-50 text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900">
    <div id="root"></div>
    <script>${safeJsContent}</script>
  </body>
</html>
`;

  const outPath = path.join(publicDir, 'offline-chiffrage.html');
  fs.writeFileSync(outPath, html, 'utf8');
  fs.rmSync(distOfflineDir, { recursive: true, force: true });

  const sizeKb = Math.round(fs.statSync(outPath).size / 1024);
  console.log(`Generated ${outPath} (${sizeKb} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
