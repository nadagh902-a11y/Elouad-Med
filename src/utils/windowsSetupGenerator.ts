import JSZip from 'jszip';
import { InstallPasswordConfig } from '../types/project';
import { ES5_SHA256_SOURCE } from './installPassword';

function sanitizeHttpUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.origin.replace(/["'<>\\]/g, '');
    }
  } catch {
    // ignore invalid URL
  }
  return 'https://ais-pre-iw632mamaleowjwlj22irh-1018009237034.europe-west2.run.app';
}

function buildSetupHta(
  appUrl: string,
  passwordConfig?: InstallPasswordConfig
): string {
  const safeUrl = sanitizeHttpUrl(appUrl);
  const pwdSalt = passwordConfig ? passwordConfig.salt.replace(/[^a-f0-9]/gi, '') : '';
  const pwdHash = passwordConfig ? passwordConfig.hash.replace(/[^a-f0-9]/gi, '') : '';
  const pwdIters = passwordConfig ? Math.max(1, Math.floor(passwordConfig.iterations)) : 0;
  const hasPassword = Boolean(pwdSalt && pwdHash && pwdIters > 0);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta http-equiv="X-UA-Compatible" content="IE=9" />
<title>Installation — Chiffrage &amp; Attachement</title>
<HTA:APPLICATION
  ID="SetupChiffrage"
  APPLICATIONNAME="Setup Chiffrage &amp; Attachement"
  BORDER="dialog"
  BORDERSTYLE="normal"
  CAPTION="yes"
  CONTEXTMENU="no"
  ICON="Chiffrage.ico"
  MAXIMIZEBUTTON="no"
  MINIMIZEBUTTON="yes"
  SCROLL="no"
  SHOWINTASKBAR="yes"
  SINGLEINSTANCE="yes"
  SYSMENU="yes"
  VERSION="1.0"
/>
<style>
  * { box-sizing: border-box; font-family: "Segoe UI", Tahoma, sans-serif; }
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #f1f5f9; color: #0f172a; }
  .wizard { display: flex; flex-direction: column; height: 100%; }
  .header {
    background: #1d4ed8;
    color: #ffffff;
    padding: 18px 22px;
    border-bottom: 3px solid #1e40af;
  }
  .header h1 { margin: 0; font-size: 17px; font-weight: 600; }
  .header p { margin: 4px 0 0 0; font-size: 12px; color: #dbeafe; }
  .body { flex: 1; padding: 20px 24px; background: #ffffff; font-size: 13px; line-height: 1.5; }
  .box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 12px 14px;
    margin-top: 12px;
    font-size: 12px;
  }
  .pwd-box {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 6px;
    padding: 12px 14px;
    margin-top: 14px;
  }
  .field-label { font-weight: 600; font-size: 12px; color: #334155; margin-top: 10px; display: block; }
  .path-box, .pwd-input {
    width: 100%;
    padding: 7px 10px;
    margin-top: 5px;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    background: #ffffff;
    font-size: 12px;
    color: #1e293b;
  }
  .path-box { background: #f8fafc; font-family: Consolas, monospace; font-size: 11px; }
  .pwd-error {
    margin-top: 7px;
    color: #b91c1c;
    font-size: 11.5px;
    font-weight: 600;
    display: none;
  }
  .check-row { margin-top: 10px; font-size: 12.5px; }
  .check-row input { vertical-align: middle; margin-right: 6px; }
  .progress-wrap {
    margin-top: 18px;
    width: 100%;
    height: 18px;
    background: #e2e8f0;
    border-radius: 9px;
    overflow: hidden;
  }
  .progress-bar {
    height: 100%;
    width: 0%;
    background: #1d4ed8;
  }
  .status-text { margin-top: 8px; font-size: 12px; color: #475569; }
  .footer {
    background: #f1f5f9;
    border-top: 1px solid #cbd5e1;
    padding: 12px 22px;
    text-align: right;
  }
  .btn {
    padding: 7px 18px;
    font-size: 12.5px;
    font-weight: 600;
    border-radius: 5px;
    cursor: pointer;
    margin-left: 8px;
    border: 1px solid #cbd5e1;
    background: #ffffff;
    color: #0f172a;
  }
  .btn-primary {
    background: #1d4ed8;
    border-color: #1e40af;
    color: #ffffff;
  }
  .btn-primary:hover { background: #1e40af; }
  .hidden { display: none; }
</style>
<script type="text/javascript">
  ${ES5_SHA256_SOURCE}

  var APP_URL = "${safeUrl}";
  var HAS_PASSWORD = ${hasPassword ? 'true' : 'false'};
  var PWD_SALT = "${pwdSalt}";
  var PWD_HASH = "${pwdHash}";
  var PWD_ITERS = ${pwdIters};
  var currentStep = 1;
  var shell = null;
  var fso = null;
  var installDir = "";

  function initSetup() {
    try {
      window.resizeTo(560, 490);
      var left = Math.max(0, Math.floor((screen.availWidth - 560) / 2));
      var top = Math.max(0, Math.floor((screen.availHeight - 490) / 2));
      window.moveTo(left, top);
      shell = new ActiveXObject("WScript.Shell");
      fso = new ActiveXObject("Scripting.FileSystemObject");
      var localApp = shell.ExpandEnvironmentStrings("%LocalAppData%");
      installDir = localApp + "\\\\ChiffrageSonelgaz";
      document.getElementById("installPathInput").value = installDir;
      if (HAS_PASSWORD) {
        var inp = document.getElementById("installPwdInput");
        if (inp) inp.focus();
      }
    } catch (e) {
      alert("Erreur initialisation Setup : " + e.message);
    }
  }

  function showStep(step) {
    currentStep = step;
    document.getElementById("step1").className = step === 1 ? "" : "hidden";
    document.getElementById("step2").className = step === 2 ? "" : "hidden";
    document.getElementById("step3").className = step === 3 ? "" : "hidden";
    document.getElementById("step4").className = step === 4 ? "" : "hidden";

    document.getElementById("btnBack").style.display = (step === 2) ? "inline-block" : "none";
    document.getElementById("btnNext").style.display = (step === 1) ? "inline-block" : "none";
    document.getElementById("btnInstall").style.display = (step === 2) ? "inline-block" : "none";
    document.getElementById("btnCancel").style.display = (step < 3) ? "inline-block" : "none";
    document.getElementById("btnFinish").style.display = (step === 4) ? "inline-block" : "none";
  }

  function constantTimeEqual(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    var diff = 0;
    for (var i = 0; i < a.length; i++) {
      diff = diff | (a.charCodeAt(i) ^ b.charCodeAt(i));
    }
    return diff === 0;
  }

  function handleNextFromStep1() {
    if (!HAS_PASSWORD) {
      showStep(2);
      return;
    }
    var inp = document.getElementById("installPwdInput");
    var err = document.getElementById("pwdError");
    var entered = inp ? inp.value : "";
    if (!entered) {
      err.innerText = "Veuillez saisir le mot de passe d'installation.";
      err.style.display = "block";
      return;
    }
    var candidate = deriveDigestHex(entered, PWD_SALT, PWD_ITERS);
    if (!constantTimeEqual(candidate, PWD_HASH)) {
      err.innerText = "Mot de passe incorrect. Installation refusee.";
      err.style.display = "block";
      if (inp) {
        inp.value = "";
        inp.focus();
      }
      return;
    }
    err.style.display = "none";
    showStep(2);
  }

  function handlePwdKeyDown(e) {
    var key = e ? (e.keyCode || e.which) : 0;
    if (key === 13) {
      handleNextFromStep1();
      return false;
    }
    return true;
  }

  function getScriptFolder() {
    var p = decodeURIComponent(window.location.pathname);
    if (p.charAt(0) === "/" && p.charAt(2) === ":") {
      p = p.substring(1);
    }
    p = p.replace(/\\//g, "\\\\");
    return fso.GetParentFolderName(p);
  }

  function setProgress(pct, msg) {
    document.getElementById("progressBar").style.width = pct + "%";
    document.getElementById("statusText").innerText = msg;
  }

  function runInstallation() {
    showStep(3);
    setProgress(15, "Creation du dossier d'installation...");

    setTimeout(function () {
      try {
        installDir = document.getElementById("installPathInput").value;
        if (!fso.FolderExists(installDir)) {
          fso.CreateFolder(installDir);
        }

        setProgress(35, "Copie de l'icone de l'application...");
        var srcDir = getScriptFolder();
        var srcIco = srcDir + "\\\\Chiffrage.ico";
        var dstIco = installDir + "\\\\Chiffrage.ico";
        if (fso.FileExists(srcIco)) {
          fso.CopyFile(srcIco, dstIco, true);
        }

        setProgress(45, "Copie de l'application autonome hors-ligne...");
        var srcAppHtml = srcDir + "\\\\Chiffrage_App.html";
        var dstAppHtml = installDir + "\\\\Chiffrage_App.html";
        var hasLocalHtml = fso.FileExists(srcAppHtml);
        if (hasLocalHtml) {
          fso.CopyFile(srcAppHtml, dstAppHtml, true);
        }

        setProgress(65, "Creation du lanceur autonome hors-ligne...");
        var launcherPath = installDir + "\\\\Lancer_Chiffrage.vbs";
        var vbsLines = [
          'Set sh = CreateObject("WScript.Shell")',
          'Set fso = CreateObject("Scripting.FileSystemObject")',
          'appDir = fso.GetParentFolderName(WScript.ScriptFullName)',
          'appHtml = appDir & "\\\\Chiffrage_App.html"',
          'profileDir = appDir & "\\\\AppProfile"',
          'If Not fso.FolderExists(profileDir) Then fso.CreateFolder(profileDir)',
          'pf86 = sh.ExpandEnvironmentStrings("%ProgramFiles(x86)%")',
          'pf = sh.ExpandEnvironmentStrings("%ProgramFiles%")',
          'localApp = sh.ExpandEnvironmentStrings("%LocalAppData%")',
          'candidates = Array( _',
          '  pf86 & "\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe", _',
          '  pf & "\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe", _',
          '  localApp & "\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe", _',
          '  pf & "\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe", _',
          '  pf86 & "\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe", _',
          '  localApp & "\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe" _',
          ')',
          'browserExe = ""',
          'For Each p In candidates',
          '  If fso.FileExists(p) Then',
          '    browserExe = p',
          '    Exit For',
          '  End If',
          'Next',
          'If fso.FileExists(appHtml) Then',
          '  targetUrl = "file:///" & Replace(Replace(Replace(appHtml, "\\\\", "/"), " ", "%20"), "#", "%23")',
          '  If browserExe <> "" Then',
          '    cmd = Chr(34) & browserExe & Chr(34) & " --app=" & Chr(34) & targetUrl & Chr(34) & " --user-data-dir=" & Chr(34) & profileDir & Chr(34)',
          '    sh.Run cmd, 1, False',
          '  Else',
          '    sh.Run Chr(34) & appHtml & Chr(34), 1, False',
          '  End If',
          'Else',
          '  If browserExe <> "" Then',
          '    cmd = Chr(34) & browserExe & Chr(34) & " --app=" & Chr(34) & "' + APP_URL + '" & Chr(34) & " --user-data-dir=" & Chr(34) & profileDir & Chr(34)',
          '    sh.Run cmd, 1, False',
          '  Else',
          '    sh.Run Chr(34) & "' + APP_URL + '" & Chr(34), 1, False',
          '  End If',
          'End If'
        ];
        var vbsFile = fso.CreateTextFile(launcherPath, true, false);
        vbsFile.Write(vbsLines.join("\\r\\n"));
        vbsFile.Close();

        var uninstPath = installDir + "\\\\Desinstaller.vbs";
        var uninstLines = [
          'Set sh = CreateObject("WScript.Shell")',
          'Set fso = CreateObject("Scripting.FileSystemObject")',
          'desk = sh.SpecialFolders("Desktop") & "\\\\Chiffrage & Attachement.lnk"',
          'prog = sh.SpecialFolders("Programs") & "\\\\Chiffrage & Attachement.lnk"',
          'If fso.FileExists(desk) Then fso.DeleteFile desk, True',
          'If fso.FileExists(prog) Then fso.DeleteFile prog, True',
          'MsgBox "Les raccourcis Chiffrage & Attachement ont ete supprimes.", 64, "Desinstallation"'
        ];
        var unFile = fso.CreateTextFile(uninstPath, true, false);
        unFile.Write(uninstLines.join("\\r\\n"));
        unFile.Close();

        setProgress(85, "Creation de l'icone sur le Bureau...");
        if (document.getElementById("chkDesktop").checked) {
          var desktopPath = shell.SpecialFolders("Desktop") + "\\\\Chiffrage & Attachement.lnk";
          var scDesk = shell.CreateShortcut(desktopPath);
          scDesk.TargetPath = "wscript.exe";
          scDesk.Arguments = '"' + launcherPath + '"';
          scDesk.WorkingDirectory = installDir;
          if (fso.FileExists(dstIco)) {
            scDesk.IconLocation = dstIco + ",0";
          }
          scDesk.Description = "Chiffrage & Attachement - Travaux Electriques";
          scDesk.Save();
        }

        if (document.getElementById("chkStartMenu").checked) {
          var progPath = shell.SpecialFolders("Programs") + "\\\\Chiffrage & Attachement.lnk";
          var scProg = shell.CreateShortcut(progPath);
          scProg.TargetPath = "wscript.exe";
          scProg.Arguments = '"' + launcherPath + '"';
          scProg.WorkingDirectory = installDir;
          if (fso.FileExists(dstIco)) {
            scProg.IconLocation = dstIco + ",0";
          }
          scProg.Description = "Chiffrage & Attachement - Travaux Electriques";
          scProg.Save();
        }

        setProgress(100, "Installation terminee avec succes !");
        setTimeout(function () {
          showStep(4);
        }, 350);
      } catch (err) {
        alert("Erreur lors de l'installation : " + err.message);
        showStep(2);
      }
    }, 200);
  }

  function finishSetup() {
    try {
      if (document.getElementById("chkLaunch").checked) {
        var launcherPath = installDir + "\\\\Lancer_Chiffrage.vbs";
        shell.Run('wscript.exe "' + launcherPath + '"', 1, false);
      }
    } catch (e) {}
    window.close();
  }
</script>
</head>
<body onload="initSetup()">
<div class="wizard">
  <div class="header">
    <h1>Assistant d'installation — Chiffrage &amp; Attachement</h1>
    <p>Gestion des Consistances Physiques, Attachements, Délais, AFT, PV &amp; DGD</p>
  </div>

  <div class="body">
    <div id="step1">
      <p><strong>Bienvenue dans l'assistant d'installation sur votre PC.</strong></p>
      <p>Cet assistant va installer l'application autonome <strong>Chiffrage &amp; Attachement</strong> (100% hors ligne) avec son icône sur votre Bureau Windows.</p>
      ${
        hasPassword
          ? `<div class="pwd-box">
        <label class="field-label" style="margin-top:0; color:#1e3a8a;" for="installPwdInput">Mot de passe d'installation requis :</label>
        <input id="installPwdInput" type="password" class="pwd-input" placeholder="Saisissez le mot de passe d'installation..." onkeydown="return handlePwdKeyDown(event)" />
        <div id="pwdError" class="pwd-error"></div>
      </div>`
          : `<div class="box">
        <strong>Fonctionnement 100% hors ligne :</strong><br />
        L'application complète est installée directement sur votre disque dur. Elle fonctionne immédiatement sans connexion Internet et sans compte en ligne, avec impression directe sur votre imprimante.
      </div>`
      }
    </div>

    <div id="step2" class="hidden">
      <p><strong>Configuration de l'installation :</strong></p>
      <label class="field-label" for="installPathInput">Dossier d'installation :</label>
      <input id="installPathInput" type="text" class="path-box" />

      <div class="check-row">
        <label><input id="chkDesktop" type="checkbox" checked="checked" /> Créer une icône sur le Bureau Windows</label>
      </div>
      <div class="check-row">
        <label><input id="chkStartMenu" type="checkbox" checked="checked" /> Ajouter au Menu Démarrer</label>
      </div>
    </div>

    <div id="step3" class="hidden">
      <p><strong>Installation en cours, veuillez patienter...</strong></p>
      <div class="progress-wrap">
        <div id="progressBar" class="progress-bar"></div>
      </div>
      <div id="statusText" class="status-text">Préparation...</div>
    </div>

    <div id="step4" class="hidden">
      <p><strong>Installation terminée !</strong></p>
      <p>L'application autonome <strong>Chiffrage &amp; Attachement</strong> a été installée sur votre PC et son icône a été ajoutée sur votre Bureau.</p>
      <div class="check-row">
        <label><input id="chkLaunch" type="checkbox" checked="checked" /> Lancer l'application maintenant</label>
      </div>
    </div>
  </div>

  <div class="footer">
    <button id="btnCancel" type="button" class="btn" onclick="window.close()">Annuler</button>
    <button id="btnBack" type="button" class="btn" style="display:none" onclick="showStep(1)">&lt; Précédent</button>
    <button id="btnNext" type="button" class="btn btn-primary" onclick="handleNextFromStep1()">Suivant &gt;</button>
    <button id="btnInstall" type="button" class="btn btn-primary" style="display:none" onclick="runInstallation()">Installer</button>
    <button id="btnFinish" type="button" class="btn btn-primary" style="display:none" onclick="finishSetup()">Terminer</button>
  </div>
</div>
</body>
</html>`;
}

function buildBatchLauncher(): string {
  return `@echo off
setlocal
if exist "%~dp0Setup_Chiffrage_Sonelgaz.hta" (
  start "" mshta.exe "%~dp0Setup_Chiffrage_Sonelgaz.hta"
) else (
  echo Setup_Chiffrage_Sonelgaz.hta introuvable dans ce dossier.
  pause
)
endlocal
`;
}

export async function downloadWindowsSetupPack(
  appUrl: string,
  passwordConfig?: InstallPasswordConfig
): Promise<void> {
  const zip = new JSZip();

  zip.file(
    'Setup_Chiffrage_Sonelgaz.hta',
    buildSetupHta(appUrl, passwordConfig)
  );
  zip.file(
    'Installer_Chiffrage.bat',
    buildBatchLauncher().replace(/\n/g, '\r\n')
  );
  zip.file(
    'LISEZMOI.txt',
    [
      'INSTALLATION SUR PC WINDOWS — CHIFFRAGE & ATTACHEMENT (100% HORS LIGNE)',
      '========================================================================',
      '',
      '1. Faites un clic droit sur ce fichier ZIP -> "Extraire tout..."',
      '2. Ouvrez le dossier extrait et double-cliquez sur :',
      '   -> Setup_Chiffrage_Sonelgaz.hta (Assistant graphique Windows)',
      '   (ou sur Installer_Chiffrage.bat)',
      passwordConfig
        ? '3. Saisissez votre mot de passe d\'installation, puis Suivant -> Installer.'
        : '3. Cliquez sur Suivant -> Installer -> Terminer.',
      '4. Une icone "Chiffrage & Attachement" apparait sur votre Bureau.',
      '5. L\'application complete (Chiffrage_App.html) est installee localement',
      '   sur votre PC : elle fonctionne immediatement sans Internet ni compte.',
    ].join('\r\n')
  );

  try {
    const icoRes = await fetch('/chiffrage.ico');
    if (icoRes.ok) {
      const icoBuf = await icoRes.arrayBuffer();
      zip.file('Chiffrage.ico', icoBuf);
    }
  } catch {
    // Fallback without ico if unreachable
  }

  try {
    const offlineRes = await fetch('/offline-chiffrage.html');
    if (offlineRes.ok) {
      const offlineHtml = await offlineRes.text();
      zip.file('Chiffrage_App.html', offlineHtml);
    }
  } catch {
    // Fallback to APP_URL if offline HTML cannot be fetched
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Setup_Chiffrage_Sonelgaz_PC.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
