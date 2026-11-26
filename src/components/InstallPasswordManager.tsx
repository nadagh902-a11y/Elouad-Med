import React, { useEffect, useState } from 'react';
import { CheckCircle2, KeyRound, Lock, ShieldCheck, Trash2 } from 'lucide-react';
import { InstallPasswordConfig } from '../types/project';
import {
  createInstallPasswordConfig,
  verifyInstallPassword,
} from '../utils/installPassword';

interface InstallPasswordManagerProps {
  passwordConfig?: InstallPasswordConfig;
  onUpdatePasswordConfig: (config: InstallPasswordConfig | undefined) => void;
  compact?: boolean;
}

export const InstallPasswordManager: React.FC<InstallPasswordManagerProps> = ({
  passwordConfig,
  onUpdatePasswordConfig,
  compact = false,
}) => {
  const [mode, setMode] = useState<'idle' | 'create' | 'change' | 'remove'>(
    passwordConfig ? 'idle' : 'create'
  );
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!passwordConfig) {
      setMode('create');
    } else if (mode === 'create') {
      setMode('idle');
    }
  }, [passwordConfig, mode]);

  const resetInputs = () => {
    setCurrentPwd('');
    setNewPwd('');
    setConfirmPwd('');
    setError(null);
  };

  const handleSaveNewOrChange = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (passwordConfig && mode === 'change') {
      if (!verifyInstallPassword(currentPwd, passwordConfig)) {
        setError('Le mot de passe actuel est incorrect.');
        return;
      }
    }

    if (newPwd.trim().length < 4) {
      setError('Le mot de passe doit contenir au moins 4 caractères.');
      return;
    }

    if (newPwd !== confirmPwd) {
      setError('La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }

    const nextConfig = createInstallPasswordConfig(newPwd);
    onUpdatePasswordConfig(nextConfig);
    resetInputs();
    setMode('idle');
    setSuccessMsg(
      passwordConfig
        ? 'Mot de passe d’installation modifié. Re-téléchargez le Setup pour appliquer ce nouveau mot de passe.'
        : 'Mot de passe d’installation enregistré et prêt pour votre Setup.'
    );
  };

  const handleRemovePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!passwordConfig) return;
    if (!verifyInstallPassword(currentPwd, passwordConfig)) {
      setError('Le mot de passe actuel est incorrect.');
      return;
    }

    onUpdatePasswordConfig(undefined);
    resetInputs();
    setMode('create');
    setSuccessMsg('Mot de passe d’installation retiré.');
  };

  return (
    <div
      className={`border border-slate-200 rounded-lg bg-slate-50/70 ${
        compact ? 'p-3.5 space-y-2.5' : 'p-4 space-y-3'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {passwordConfig ? (
            <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" />
          ) : (
            <Lock className="h-4 w-4 text-slate-600 shrink-0" />
          )}
          <span className="text-xs font-semibold text-slate-900">
            {passwordConfig
              ? 'Mot de passe d’installation configuré'
              : 'Définir votre mot de passe d’installation'}
          </span>
        </div>

        {passwordConfig && mode === 'idle' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                resetInputs();
                setSuccessMsg(null);
                setMode('change');
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded cursor-pointer"
            >
              <KeyRound className="h-3 w-3" />
              Changer le mot de passe
            </button>
            <button
              type="button"
              onClick={() => {
                resetInputs();
                setSuccessMsg(null);
                setMode('remove');
              }}
              title="Retirer le mot de passe"
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer"
            >
              <Trash2 className="h-3 w-3" />
              Retirer
            </button>
          </div>
        )}
      </div>

      {successMsg && (
        <div className="flex items-start gap-1.5 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-2.5 py-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {(mode === 'create' || mode === 'change') && (
        <form onSubmit={handleSaveNewOrChange} className="space-y-2.5">
          {mode === 'change' && passwordConfig && (
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Mot de passe actuel
              </label>
              <input
                type="password"
                required
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                placeholder="Mot de passe actuel..."
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                {mode === 'change'
                  ? 'Nouveau mot de passe'
                  : 'Choisir un mot de passe (min. 4 caractères)'}
              </label>
              <input
                type="password"
                required
                minLength={4}
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="Nouveau mot de passe..."
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                required
                minLength={4}
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="Confirmer..."
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md"
              />
            </div>
          </div>

          {error && <p className="text-[11px] font-medium text-red-600">{error}</p>}

          <div className="flex items-center justify-end gap-2">
            {passwordConfig && (
              <button
                type="button"
                onClick={() => {
                  resetInputs();
                  setMode('idle');
                }}
                className="px-3 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-200/70 rounded cursor-pointer"
              >
                Annuler
              </button>
            )}
            <button
              type="submit"
              className="px-3.5 py-1.5 text-[11px] font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded cursor-pointer"
            >
              {mode === 'change'
                ? 'Mettre à jour le mot de passe'
                : 'Enregistrer le mot de passe'}
            </button>
          </div>
        </form>
      )}

      {mode === 'remove' && passwordConfig && (
        <form onSubmit={handleRemovePassword} className="space-y-2.5">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Confirmez avec le mot de passe actuel pour retirer la protection
            </label>
            <input
              type="password"
              required
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              placeholder="Mot de passe actuel..."
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md"
            />
          </div>
          {error && <p className="text-[11px] font-medium text-red-600">{error}</p>}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                resetInputs();
                setMode('idle');
              }}
              className="px-3 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-200/70 rounded cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 text-[11px] font-semibold text-white bg-red-600 hover:bg-red-700 rounded cursor-pointer"
            >
              Confirmer suppression
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
