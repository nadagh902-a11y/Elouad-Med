import React, { useMemo, useState } from 'react';
import {
  Copy,
  FileSpreadsheet,
  FolderOpen,
  Plus,
  Printer,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Affaire, AffaireStatus } from '../types/project';
import {
  computeAffairePhysicalStats,
  formatDateFR,
  formatNumber,
} from '../utils/formatters';

interface AffaireListViewProps {
  affaires: Affaire[];
  onOpenAffaire: (
    id: string,
    initialTab?: 'chiffrage' | 'attachement' | 'dossier' | 'print'
  ) => void;
  onCreateAffaire: (partial?: Partial<Affaire>) => Affaire;
  onDuplicateAffaire: (affaire: Affaire) => void;
  onDeleteAffaire: (id: string) => void;
}

const STATUS_LABELS: Record<AffaireStatus, string> = {
  etude: 'En étude',
  en_cours: 'En cours',
  reception_provisoire: 'Réception prov.',
  cloture_dgd: 'Clôturée DGD',
};

const STATUS_TEXT_COLOR: Record<AffaireStatus, string> = {
  etude: 'text-slate-600',
  en_cours: 'text-blue-700',
  reception_provisoire: 'text-amber-700',
  cloture_dgd: 'text-emerald-700',
};

export const AffaireListView: React.FC<AffaireListViewProps> = ({
  affaires,
  onOpenAffaire,
  onCreateAffaire,
  onDuplicateAffaire,
  onDeleteAffaire,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AffaireStatus>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const [newForm, setNewForm] = useState({
    numeroAffaire: '',
    natureAffaire: 'Raccordement',
    objet: '',
    demandeur: '',
    entreprise: '',
    commune: 'CHETOUANE',
    wilaya: 'TLEMCEN',
    marcheNumero: '',
    odsNumero: '',
  });

  const summary = useMemo(() => {
    let enCoursOuEtude = 0;
    let receptionOuCloture = 0;
    let totalAttachements = 0;
    let sumAvancement = 0;

    for (const aff of affaires) {
      if (aff.status === 'etude' || aff.status === 'en_cours') {
        enCoursOuEtude++;
      } else {
        receptionOuCloture++;
      }
      totalAttachements += aff.attachements.length;
      sumAvancement += computeAffairePhysicalStats(aff).avancementPct;
    }

    return {
      count: affaires.length,
      enCoursOuEtude,
      receptionOuCloture,
      totalAttachements,
      moyenneAvancement:
        affaires.length > 0 ? sumAvancement / affaires.length : 0,
    };
  }, [affaires]);

  const filteredAffaires = useMemo(() => {
    const q = search.trim().toLowerCase();
    return affaires.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (!q) return true;
      return (
        a.numeroAffaire.toLowerCase().includes(q) ||
        a.objet.toLowerCase().includes(q) ||
        a.entreprise.toLowerCase().includes(q) ||
        a.demandeur.toLowerCase().includes(q) ||
        a.commune.toLowerCase().includes(q)
      );
    });
  }, [affaires, search, statusFilter]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const created = onCreateAffaire({
      numeroAffaire:
        newForm.numeroAffaire.trim() ||
        `7226AT-${Math.floor(100 + Math.random() * 900)}`,
      natureAffaire: newForm.natureAffaire.trim() || 'Raccordement',
      objet: newForm.objet.trim() || 'Nouveau dossier travaux électriques',
      demandeur: newForm.demandeur.trim(),
      entreprise: newForm.entreprise.trim(),
      commune: newForm.commune.trim(),
      wilaya: newForm.wilaya.trim(),
      lieuTravaux: `${newForm.commune.trim()} / ${newForm.wilaya.trim()}`,
      marcheNumero: newForm.marcheNumero.trim(),
      odsNumero: newForm.odsNumero.trim(),
    });
    setShowNewModal(false);
    setNewForm({
      numeroAffaire: '',
      natureAffaire: 'Raccordement',
      objet: '',
      demandeur: '',
      entreprise: '',
      commune: 'CHETOUANE',
      wilaya: 'TLEMCEN',
      marcheNumero: '',
      odsNumero: '',
    });
    onOpenAffaire(created.id, 'chiffrage');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Portefeuille des Affaires
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Suivi des consistances physiques, feuilles d&apos;attachement (Fourn. &amp; M. en O.), délais d&apos;exécution, AFT et DGD.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Nouvelle Affaire
        </button>
      </div>

      {/* KPI Strip — 4-column full-width bar with hairline dividers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">Affaires suivies</div>
          <div className="mt-1.5 text-2xl font-semibold text-slate-900 num-cell">
            {summary.count}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Dossiers enregistrés
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">En étude / En cours</div>
          <div className="mt-1.5 text-2xl font-semibold text-blue-700 num-cell">
            {summary.enCoursOuEtude}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Chantiers actifs ou en préparation
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">Réceptionnées / Clôturées</div>
          <div className="mt-1.5 text-2xl font-semibold text-emerald-700 num-cell">
            {summary.receptionOuCloture}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            AFT / PV Réception / DGD
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">Feuilles d&apos;attachement</div>
          <div className="mt-1.5 text-2xl font-semibold text-slate-900 num-cell">
            {summary.totalAttachements}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Avancement moyen : {summary.moyenneAvancement.toFixed(0)} %
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white border border-slate-200 rounded-lg">
        <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                ['all', 'Toutes'],
                ['etude', 'En étude'],
                ['en_cours', 'En cours'],
                ['reception_provisoire', 'Réception prov.'],
                ['cloture_dgd', 'Clôturée DGD'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === key
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-80">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher N° affaire, entreprise, objet..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>
        </div>

        {/* Data Table */}
        {filteredAffaires.length === 0 ? (
          <div className="py-14 px-6 text-center">
            <FileSpreadsheet className="h-10 w-10 text-slate-300 mx-auto" />
            <h3 className="mt-3 text-sm font-semibold text-slate-900">
              Aucune affaire trouvée
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Modifiez vos filtres ou créez une nouvelle affaire pour démarrer la saisie des quantités.
            </p>
            <button
              type="button"
              onClick={() => setShowNewModal(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Créer une affaire
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4 whitespace-nowrap">Affaire &amp; Références</th>
                  <th className="py-3 px-4">Objet &amp; Entreprise</th>
                  <th className="py-3 px-4 whitespace-nowrap">Statut</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Consistance (ML / U)</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Postes soldés</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Avancement</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredAffaires.map((aff) => {
                  const stats = computeAffairePhysicalStats(aff);
                  const pct = Math.min(100, Math.max(0, stats.avancementPct));
                  return (
                    <tr
                      key={aff.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onOpenAffaire(aff.id, 'chiffrage')}
                          className="font-mono font-semibold text-blue-700 hover:underline text-left cursor-pointer"
                        >
                          {aff.numeroAffaire}
                        </button>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {aff.marcheNumero ? `Marché ${aff.marcheNumero}` : 'Sans marché'}
                          {aff.odsNumero ? ` · ODS ${aff.odsNumero}` : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-top max-w-md">
                        <div className="font-medium text-slate-900 line-clamp-1">
                          {aff.objet}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500 truncate">
                          {aff.entreprise || 'Entreprise non assignée'} · {aff.commune || aff.lieuTravaux}
                          {aff.dateEtude ? ` · ${formatDateFR(aff.dateEtude)}` : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <span className={`text-xs font-medium ${STATUS_TEXT_COLOR[aff.status]}`}>
                          {STATUS_LABELS[aff.status]}
                        </span>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {aff.attachements.length} attachement{aff.attachements.length > 1 ? 's' : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-top text-right num-cell text-xs text-slate-700 whitespace-nowrap">
                        <div>{formatNumber(stats.totalRealiseML, 0)} / {formatNumber(stats.totalDevisML, 0)} ML</div>
                        <div className="text-slate-500">{formatNumber(stats.totalRealiseUnit, 0)} / {formatNumber(stats.totalDevisUnit, 0)} U</div>
                      </td>
                      <td className="py-3.5 px-4 align-top text-right num-cell text-slate-900 whitespace-nowrap">
                        {stats.postesSoldes} / {stats.totalPostes}
                      </td>
                      <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                        <div className="inline-flex flex-col items-end gap-1 w-24">
                          <span className="num-cell text-xs font-medium text-slate-700">
                            {stats.avancementPct.toFixed(0)} %
                          </span>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onOpenAffaire(aff.id, 'chiffrage')}
                            title="Ouvrir le dossier"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer"
                          >
                            <FolderOpen className="h-3.5 w-3.5" />
                            Ouvrir
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenAffaire(aff.id, 'print')}
                            title="Imprimer / Exporter PDF"
                            className="p-1.5 text-blue-700 hover:text-blue-800 rounded-md hover:bg-blue-50 cursor-pointer"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDuplicateAffaire(aff)}
                            title="Dupliquer l'affaire"
                            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-100 cursor-pointer"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          {confirmDeleteId === aff.id ? (
                            <div className="inline-flex items-center gap-1 ml-1">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteAffaire(aff.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-2 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 cursor-pointer"
                              >
                                Confirmer
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                              >
                                Annuler
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(aff.id)}
                              title="Supprimer l'affaire"
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Affaire Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                Créer une nouvelle affaire
              </h2>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    N° d&apos;Affaire
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: 7226AT4E00142"
                    value={newForm.numeroAffaire}
                    onChange={(e) =>
                      setNewForm((f) => ({ ...f, numeroAffaire: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nature de l&apos;affaire
                  </label>
                  <select
                    value={newForm.natureAffaire}
                    onChange={(e) =>
                      setNewForm((f) => ({ ...f, natureAffaire: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  >
                    <option value="Raccordement">Raccordement</option>
                    <option value="Deplacement">Déplacement réseau</option>
                    <option value="Création Poste HTA/BT">Création Poste HTA/BT</option>
                    <option value="Extension Réseau">Extension Réseau</option>
                    <option value="Renforcement">Renforcement / Réhabilitation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Objet / Intitulé de l&apos;affaire
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Raccordement en électricité ..."
                  value={newForm.objet}
                  onChange={(e) =>
                    setNewForm((f) => ({ ...f, objet: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Demandeur / Client
                  </label>
                  <input
                    type="text"
                    placeholder="Nom du demandeur ou organisme"
                    value={newForm.demandeur}
                    onChange={(e) =>
                      setNewForm((f) => ({ ...f, demandeur: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Entreprise de réalisation (ETP)
                  </label>
                  <input
                    type="text"
                    placeholder="ex: ETP BOUGHRARA..."
                    value={newForm.entreprise}
                    onChange={(e) =>
                      setNewForm((f) => ({ ...f, entreprise: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Commune
                  </label>
                  <input
                    type="text"
                    value={newForm.commune}
                    onChange={(e) =>
                      setNewForm((f) => ({ ...f, commune: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Wilaya
                  </label>
                  <input
                    type="text"
                    value={newForm.wilaya}
                    onChange={(e) =>
                      setNewForm((f) => ({ ...f, wilaya: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    N° Marché / Cmd
                  </label>
                  <input
                    type="text"
                    placeholder="ex: 427"
                    value={newForm.marcheNumero}
                    onChange={(e) =>
                      setNewForm((f) => ({ ...f, marcheNumero: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    N° ODS
                  </label>
                  <input
                    type="text"
                    placeholder="ex: 791"
                    value={newForm.odsNumero}
                    onChange={(e) =>
                      setNewForm((f) => ({ ...f, odsNumero: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                >
                  Créer et ouvrir le dossier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
