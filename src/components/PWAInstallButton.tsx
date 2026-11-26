import React, { useState } from 'react';
import { Check, Copy, Download, MonitorDown, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  onExportBackup: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  onExportBackup,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (isInstalled) {
    return null;
  }

  const appUrl =
    typeof window !== 'undefined' ? window.location.origin : '';

  const handleAction = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) return;
    }
    setShowGuide(true);
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
        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <MonitorDown className="h-4 w-4 shrink-0" />
        Installer sur le Bureau PC
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Installer l&apos;application sur votre Bureau PC
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm text-slate-700">
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
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Cette application est compatible hors-ligne (PWA). Pour créer un raccourci exécutable directement depuis votre <strong>Bureau Windows / Mac</strong> :
                  </p>

                  <ol className="list-decimal pl-5 space-y-2 text-xs text-slate-700">
                    <li>
                      Ouvrez l&apos;application dans un onglet dédié de{' '}
                      <strong>Google Chrome</strong> ou <strong>Microsoft Edge</strong>{' '}
                      (en dehors de l&apos;aperçu intégré) :
                      <div className="mt-1.5 flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={appUrl}
                          className="flex-1 px-2.5 py-1.5 text-[11px] font-mono bg-slate-50 border border-slate-200 rounded text-slate-800"
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
                              Copier le lien
                            </>
                          )}
                        </button>
                      </div>
                    </li>
                    <li>
                      Dans Chrome/Edge, cliquez sur l&apos;icône{' '}
                      <strong>Installer l&apos;application</strong> à droite de la barre d&apos;adresse (ou menu{' '}
                      <strong>⋮ → Caster, enregistrer et partager → Installer la page en tant qu&apos;application / Créer un raccourci</strong>).
                    </li>
                    <li>
                      Cochez <strong>« Ouvrir dans une fenêtre »</strong> : une icône{' '}
                      <strong>Chiffrage</strong> sera ajoutée automatiquement sur votre <strong>Bureau</strong> et fonctionnera même sans connexion internet.
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
                  Télécharger mes données (.json)
                </button>
                <button
                  type="button"
                  onClick={() => setShowGuide(false)}
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

  if (isOnline) return null;

  return (
    <div className="no-print fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
      <WifiOff className="h-3.5 w-3.5" />
      Mode hors-ligne — Données locales actives
    </div>
  );
};
