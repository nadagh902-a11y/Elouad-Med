import React, { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Lock,
  MonitorDown,
  Package,
  WifiOff,
  X,
} from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';
import { InstallPasswordConfig } from '../types/project';
import { verifyInstallPassword } from '../utils/installPassword';
import { downloadWindowsSetupPack } from '../utils/windowsSetupGenerator';
import { InstallPasswordManager } from './InstallPasswordManager';

interface PWAInstallButtonProps {
  onExportBackup: () => void;
  installPassword?: InstallPasswordConfig;
  onUpdateInstallPassword: (config: InstallPasswordConfig | undefined) => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  onExportBackup,
  installPassword,
  onUpdateInstallPassword,
}) => {
  const { isInstallable, isInstalled, isIOS, isOfflineReady, install } =
    usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [downloadingSetup, setDownloadingSetup] = useState(false);
  const [setupFeedback, setSetupFeedback] = useState<string | null>(null);
  const [pendingNativeInstall, setPendingNativeInstall] = useState(false);
  const [nativePwdInput, setNativePwdInput] = useState('');
  const [nativePwdError, setNativePwdError] = useState<string | null>(null);
  const [setupIsError, setSetupIsError] = useState(false);

  if (isInstalled) {
    return null;
  }

  const appUrl =
    typeof window !== 'undefined' ? window.location.origin : '';

  const handleDownloadSetup = async () => {
    setDownloadingSetup(true);
    setSetupFeedback(null);
    setSetupIsError(false);
    try {
      await downloadWindowsSetupPack(
        appUrl || 'https://ais-pre-iw632mamaleowjwlj22irh-1018009237034.europe-west2.run.app',
        installPassword
      );
      setSetupFeedback(
        installPassword
          ? "Pack Setup téléchargé avec votre mot de passe et vos dernières données."
          : "Pack Setup téléchargé avec vos dernières données (sans mot de passe)."
      );
    } catch (err) {
      setSetupIsError(true);
      setSetupFeedback(
        err instanceof Error
          ? err.message
          : 'Erreur lors de la préparation du pack. Actualisez la page (Ctrl+F5) et réessayez.'
      );
    } finally {
      setDownloadingSetup(false);
    }
  };

  const handleAction = async () => {
    setSetupFeedback(null);
    setNativePwdError(null);
    setNativePwdInput('');
    if (isInstallable) {
      if (installPassword) {
        setPendingNativeInstall(true);
        setShowGuide(true);
        return;
      }
      const accepted = await install();
      if (accepted) return;
    }
    setPendingNativeInstall(false);
    setShowGuide(true);
  };

  const handleVerifyNativeInstall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!installPassword) return;
    if (!verifyInstallPassword(nativePwdInput, installPassword)) {
      setNativePwdError("Mot de passe d'installation incorrect.");
      return;
    }
    setNativePwdError(null);
    setNativePwdInput('');
    setPendingNativeInstall(false);
    const accepted = await install();
    if (accepted) {
      setShowGuide(false);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleAction}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <span className="inline-flex items-center gap-2">
          <MonitorDown className="h-4 w-4 shrink-0" />
          Installer sur le PC (Hors ligne)
        </span>
        {isOfflineReady && (
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Cache hors-ligne actif" />
        )}
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Installer l&apos;application sur votre PC (Hors ligne)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Conception &amp; Réalisation :{' '}
                  <span className="font-semibold text-slate-700">
                    ELOUAD MOHAMMED
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPendingNativeInstall(false);
                  setShowGuide(false);
                }}
                className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm text-slate-700 overflow-y-auto">
              {pendingNativeInstall && installPassword && (
                <form
                  onSubmit={handleVerifyNativeInstall}
                  className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg space-y-2.5"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-950">
                    <Lock className="h-4 w-4 shrink-0" />
                    Saisissez votre mot de passe pour lancer l&apos;installation :
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      required
                      autoFocus
                      value={nativePwdInput}
                      onChange={(e) => setNativePwdInput(e.target.value)}
                      placeholder="Mot de passe d'installation..."
                      className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-amber-300 rounded-md"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md cursor-pointer whitespace-nowrap"
                    >
                      Installer
                    </button>
                  </div>
                  {nativePwdError && (
                    <p className="text-[11px] font-medium text-red-700">
                      {nativePwdError}
                    </p>
                  )}
                </form>
              )}

              {isIOS ? (
                <div className="space-y-2">
                  <p className="font-medium text-slate-900">
                    Installation sur iPhone / iPad :
                  </p>
                  <ol className="list-decimal pl-5 space-y-1.5 text-xs text-slate-600">
                    <li>
                      Appuyez sur le bouton <strong>Partager</strong> dans la barre Safari.
                    </li>
                    <li>
                      Faites défiler et choisissez <strong>Sur l&apos;écran d&apos;accueil</strong>.
                    </li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 leading-relaxed">
                    <strong>Mode hors-ligne activé :</strong> toutes vos affaires, désignations, feuilles d&apos;attachement, logos et exportations PDF sont enregistrés localement sur votre ordinateur et fonctionnent sans connexion Internet.
                  </div>

                  <InstallPasswordManager
                    passwordConfig={installPassword}
                    onUpdatePasswordConfig={(cfg) => {
                      setSetupFeedback(null);
                      onUpdateInstallPassword(cfg);
                    }}
                    compact
                  />

                  <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold text-blue-950">
                          Option 1 — Pack Setup Windows autonome (100% Hors ligne &amp; Icône Bureau)
                        </div>
                        <p className="text-[11px] text-blue-900 mt-0.5">
                          Installe l&apos;application complète directement sur votre PC (<strong>Setup_Chiffrage_Sonelgaz.hta</strong> + <strong>Chiffrage_App.html</strong> + icône Bureau). Fonctionne sans Internet, sans compte Google et sans erreur « Page not found »{installPassword ? ' (protégé par votre mot de passe)' : ''}.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadSetup}
                      disabled={downloadingSetup}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer disabled:opacity-60"
                    >
                      <Package className="h-4 w-4" />
                      {downloadingSetup
                        ? 'Préparation du Setup...'
                        : 'Télécharger le Setup Windows (.zip)'}
                    </button>
                    {setupFeedback && (
                      <p
                        className={`text-[11px] font-medium ${
                          setupIsError
                            ? 'text-red-700'
                            : installPassword
                              ? 'text-emerald-800'
                              : 'text-amber-800'
                        }`}
                      >
                        {setupFeedback}
                      </p>
                    )}
                  </div>

                  <div className="text-xs font-semibold text-slate-800 pt-1">
                    Option 2 — Installation directe via Chrome / Microsoft Edge :
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Remarque : l&apos;ouverture dans un autre navigateur nécessite d&apos;être connecté au même compte Google autorisé ; sinon utilisez de préférence l&apos;<strong>Option 1</strong> ci-dessus.
                  </p>
                  <ol className="list-decimal pl-5 space-y-2 text-xs text-slate-700">
                    <li>
                      Ouvrez l&apos;application dans un onglet direct de{' '}
                      <strong>Google Chrome</strong> ou <strong>Microsoft Edge</strong>{' '}
                      (en dehors de l&apos;aperçu intégré) :
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <a
                          href={appUrl || '/'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md whitespace-nowrap"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Ouvrir pour installer
                        </a>
                        <input
                          type="text"
                          readOnly
                          value={appUrl}
                          className="flex-1 min-w-[140px] px-2.5 py-1.5 text-[11px] font-mono bg-slate-50 border border-slate-200 rounded text-slate-800"
                        />
                        <button
                          type="button"
                          onClick={handleCopyUrl}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium bg-white border border-slate-200 rounded hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                        >
                          {copiedUrl ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                              Copié
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              Copier
                            </>
                          )}
                        </button>
                      </div>
                    </li>
                    <li>
                      Dans la barre d&apos;adresse de Chrome ou Edge (à droite), cliquez sur l&apos;icône{' '}
                      <strong>Installer</strong> (ou menu{' '}
                      <strong>⋮ → Applications / Caster, enregistrer et partager → Installer cette page en tant qu&apos;application</strong>).
                    </li>
                    <li>
                      Validez <strong>Installer</strong> : l&apos;application <strong>Chiffrage</strong> sera ajoutée sur votre <strong>Bureau Windows / Mac</strong> et fonctionnera hors connexion.
                    </li>
                  </ol>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onExportBackup();
                  }}
                  className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  Sauvegarder mes données (.json)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPendingNativeInstall(false);
                    setShowGuide(false);
                  }}
                  className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const isLocalFile =
    typeof window !== 'undefined' && window.location.protocol === 'file:';

  if (isOnline || isLocalFile) return null;

  return (
    <div className="no-print fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
      <WifiOff className="h-3.5 w-3.5" />
      Mode hors-ligne — Données locales actives
    </div>
  );
};
