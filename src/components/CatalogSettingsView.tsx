import React, { useMemo, useRef, useState } from 'react';
import {
  Download,
  Package,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  AppSettings,
  CatalogItem,
  WorkChapter,
  WorkUnit,
} from '../types/project';
import { downloadWindowsSetupPack } from '../utils/windowsSetupGenerator';
import { InstallPasswordManager } from './InstallPasswordManager';

interface CatalogViewProps {
  catalog: CatalogItem[];
  onUpsertItem: (item: CatalogItem) => void;
  onDeleteItem: (id: string) => void;
}

const CHAPTERS: WorkChapter[] = [
  'BTA',
  'BTS',
  'MTA',
  'MTS',
  'Branchements',
  'Poste',
  'Entretien',
  'TPR',
  'RCN',
  'Autre',
];
const UNITS: WorkUnit[] = ['ML', 'U', 'Un', 'Ens', 'M2', 'M3', 'Kg', 'Fft'];

export const CatalogView: React.FC<CatalogViewProps> = ({
  catalog,
  onUpsertItem,
  onDeleteItem,
}) => {
  const [search, setSearch] = useState('');
  const [chapter, setChapter] = useState<'ALL' | WorkChapter>('ALL');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter((c) => {
      if (chapter !== 'ALL' && c.chapitre !== chapter) return false;
      if (!q) return true;
      return (
        c.designation.toLowerCase().includes(q) ||
        c.famille.toLowerCase().includes(q) ||
        c.natureOuvrage.toLowerCase().includes(q)
      );
    });
  }, [catalog, search, chapter]);

  const addCatalogItem = () => {
    onUpsertItem({
      id: 'cat-' + Date.now(),
      chapitre: chapter === 'ALL' ? 'MTA' : chapter,
      rcnTp: 'RCN',
      famille: 'Raccordement HTA',
      natureOuvrage: '',
      designation: 'Nouvel ouvrage',
      unite: 'U',
      puFourniture: 0,
      puMainOeuvre: 0,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Bibliothèque des Ouvrages
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Référentiel des ouvrages HTA, BT, génie civil et dépose pour alimenter rapidement vos devis quantitatifs et feuilles d&apos;attachement.
          </p>
        </div>
        <button
          type="button"
          onClick={addCatalogItem}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Ajouter un ouvrage
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setChapter('ALL')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
                chapter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tous ({catalog.length})
            </button>
            {CHAPTERS.map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => setChapter(ch)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
                  chapter === ch
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {ch}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrer la bibliothèque..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-2.5 px-3 min-w-[116px] w-28">Chapitre</th>
                <th className="py-2.5 px-2 min-w-[84px] w-20">RCN / TP</th>
                <th className="py-2.5 px-3 min-w-[160px]">Famille</th>
                <th className="py-2.5 px-3 min-w-[160px]">Nature d&apos;ouvrage</th>
                <th className="py-2.5 px-3 min-w-[260px]">Désignation</th>
                <th className="py-2.5 px-2 min-w-[96px] w-24 text-center">Unité</th>
                <th className="py-2.5 px-3 min-w-[48px] w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70">
                  <td className="py-2 px-3">
                    <select
                      value={item.chapitre}
                      onChange={(e) =>
                        onUpsertItem({
                          ...item,
                          chapitre: e.target.value as WorkChapter,
                        })
                      }
                      className="w-full px-2 py-1 border border-slate-200 rounded bg-white"
                    >
                      {CHAPTERS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-2">
                    <select
                      value={item.rcnTp}
                      onChange={(e) =>
                        onUpsertItem({
                          ...item,
                          rcnTp: e.target.value as 'TPR' | 'RCN',
                        })
                      }
                      className="w-full px-1.5 py-1 border border-slate-200 rounded bg-white font-mono"
                    >
                      <option value="RCN">RCN</option>
                      <option value="TPR">TPR</option>
                    </select>
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={item.famille}
                      onChange={(e) =>
                        onUpsertItem({ ...item, famille: e.target.value })
                      }
                      className="w-full px-2 py-1 text-slate-700 border border-slate-200 rounded"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={item.natureOuvrage}
                      onChange={(e) =>
                        onUpsertItem({ ...item, natureOuvrage: e.target.value })
                      }
                      className="w-full px-2 py-1 text-slate-700 border border-slate-200 rounded"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={item.designation}
                      onChange={(e) =>
                        onUpsertItem({ ...item, designation: e.target.value })
                      }
                      className="w-full px-2 py-1 font-medium text-slate-900 border border-slate-200 rounded"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <select
                      value={item.unite}
                      onChange={(e) =>
                        onUpsertItem({
                          ...item,
                          unite: e.target.value as WorkUnit,
                        })
                      }
                      className="w-full min-w-[82px] px-2 py-1 border border-slate-200 rounded bg-white font-mono font-semibold text-slate-800"
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => onDeleteItem(item.id)}
                      className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

interface SettingsViewProps {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
  onExportJSON: () => void;
  onImportJSON: (text: string) => boolean;
  onResetDemo: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onChange,
  onExportJSON,
  onImportJSON,
  onResetDemo,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const ok = onImportJSON(text);
    setImportMessage(
      ok
        ? 'Sauvegarde restaurée avec succès.'
        : 'Fichier JSON invalide ou corrompu.'
    );
    e.target.value = '';
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Paramètres &amp; Sauvegarde
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Configurez l&apos;en-tête administratif utilisé sur vos impressions A4 et gérez vos sauvegardes locales.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-900">
          Structure &amp; En-tête des Documents
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Organisme / Société
            </label>
            <input
              type="text"
              value={settings.organisme}
              onChange={(e) =>
                onChange({ ...settings, organisme: e.target.value })
              }
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Direction / Concession
            </label>
            <input
              type="text"
              value={settings.direction}
              onChange={(e) =>
                onChange({ ...settings, direction: e.target.value })
              }
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Division / Service
            </label>
            <input
              type="text"
              value={settings.division}
              onChange={(e) =>
                onChange({ ...settings, division: e.target.value })
              }
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Wilaya par défaut
            </label>
            <input
              type="text"
              value={settings.wilayaDefaut}
              onChange={(e) =>
                onChange({ ...settings, wilayaDefaut: e.target.value })
              }
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-900">
          Sauvegarde &amp; Restauration des Données
        </h2>
        <p className="text-xs text-slate-600">
          Vos affaires et votre bibliothèque d&apos;ouvrages sont enregistrées automatiquement dans votre navigateur. Exportez régulièrement un fichier JSON pour archivage.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onExportJSON}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
          >
            <Download className="h-4 w-4" />
            Exporter Sauvegarde JSON
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
          >
            <Upload className="h-4 w-4" />
            Importer Sauvegarde JSON
          </button>

          {confirmReset ? (
            <div className="inline-flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onResetDemo();
                  setConfirmReset(false);
                  setImportMessage('Données initiales restaurées.');
                }}
                className="px-3 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer"
              >
                Confirmer réinitialisation
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-3 py-2 text-xs text-slate-600 cursor-pointer"
              >
                Annuler
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              Réinitialiser les dossiers exemples
            </button>
          )}
        </div>

        {importMessage && (
          <p className="text-xs font-medium text-blue-700">{importMessage}</p>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-900">
          Setup d&apos;installation Windows (Icône sur le Bureau &amp; Hors ligne)
        </h2>
        {typeof window !== 'undefined' && window.location.protocol === 'file:' ? (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 leading-relaxed">
            <strong>Application installée localement sur ce PC :</strong> cette copie fonctionne en mode 100% autonome hors ligne depuis votre disque dur, sans connexion Internet.
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-600 leading-relaxed">
              Définissez ou modifiez votre propre mot de passe d&apos;installation, puis téléchargez le pack PC autonome contenant l&apos;assistant <strong>Setup_Chiffrage_Sonelgaz.hta</strong>, l&apos;application complète hors ligne, l&apos;icône Windows et le créateur de raccourci sur le Bureau.
            </p>

            <InstallPasswordManager
              passwordConfig={settings.installPassword}
              onUpdatePasswordConfig={(cfg) => {
                setSetupMessage(null);
                onChange({ ...settings, installPassword: cfg });
              }}
            />

            <div className="space-y-2">
              <button
                type="button"
                onClick={async () => {
                  setSetupMessage(null);
                  await downloadWindowsSetupPack(
                    typeof window !== 'undefined' ? window.location.origin : '',
                    settings.installPassword
                  );
                  setSetupMessage(
                    settings.installPassword
                      ? "Setup Windows téléchargé avec votre mot de passe d'installation et l'application complète hors ligne."
                      : "Setup Windows téléchargé sans mot de passe. Définissez un mot de passe ci-dessus puis re-téléchargez pour le verrouiller."
                  );
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
              >
                <Package className="h-4 w-4" />
                Télécharger le Setup Windows (.zip)
              </button>
              {setupMessage && (
                <p
                  className={`text-xs font-medium ${
                    settings.installPassword ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {setupMessage}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
