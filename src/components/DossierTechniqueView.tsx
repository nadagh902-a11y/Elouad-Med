import React, { useMemo, useState } from 'react';
import { Plus, Printer, Trash2 } from 'lucide-react';
import {
  Affaire,
  AffaireStatus,
  AppSettings,
  MaterialControlItem,
  WasteDepositItem,
} from '../types/project';
import {
  computeAffairePhysicalStats,
  computeDelayMetrics,
  formatDateFR,
  formatDatePVLetters,
  formatNumber,
} from '../utils/formatters';
import { PrintDocType } from './PrintPreviewView';

interface DossierTechniqueViewProps {
  affaire: Affaire;
  settings?: AppSettings;
  onChange: (updated: Affaire) => void;
  onPrintDoc?: (doc: PrintDocType) => void;
}

type SubTab = 'identite' | 'delai' | 'pv' | 'materiel' | 'aft' | 'dgd';

const SUBTAB_TO_PRINT_DOC: Record<SubTab, PrintDocType> = {
  identite: 'devis',
  delai: 'delai',
  pv: 'pv',
  materiel: 'dechets',
  aft: 'aft',
  dgd: 'dgd',
};

const SUBTAB_PRINT_LABEL: Record<SubTab, string> = {
  identite: 'Imprimer Fiche Étude',
  delai: 'Imprimer Fiche Délai',
  pv: 'Imprimer PV Réception',
  materiel: 'Imprimer Annexe 1 Déchets',
  aft: 'Imprimer AFT',
  dgd: 'Imprimer DGD',
};

export const DossierTechniqueView: React.FC<DossierTechniqueViewProps> = ({
  affaire,
  settings,
  onChange,
  onPrintDoc,
}) => {
  const [subTab, setSubTab] = useState<SubTab>('identite');

  const stats = useMemo(() => computeAffairePhysicalStats(affaire), [affaire]);
  const delayMetrics = useMemo(() => computeDelayMetrics(affaire), [affaire]);

  const addMaterialControl = () => {
    const item: MaterialControlItem = {
      id: 'mc-' + Date.now(),
      designation: '',
      fabricant: '',
      distributeur: '',
      factureAchat: '',
      dateFacture: new Date().toISOString().slice(0, 10),
      controleVisuel: true,
      controleMarquage: false,
      controleDimensionnel: false,
    };
    onChange({
      ...affaire,
      materialControls: [...affaire.materialControls, item],
    });
  };

  const updateMaterialControl = (
    id: string,
    patch: Partial<MaterialControlItem>
  ) => {
    onChange({
      ...affaire,
      materialControls: affaire.materialControls.map((m) =>
        m.id === id ? { ...m, ...patch } : m
      ),
    });
  };

  const removeMaterialControl = (id: string) => {
    onChange({
      ...affaire,
      materialControls: affaire.materialControls.filter((m) => m.id !== id),
    });
  };

  const addWasteDeposit = () => {
    const commandeDefault = affaire.marcheNumero
      ? `${affaire.marcheNumero}${affaire.marcheDate ? ` du ${formatDateFR(affaire.marcheDate)}` : ''}`
      : '';
    const item: WasteDepositItem = {
      id: 'wd-' + Date.now(),
      intituleAffaire: affaire.objet || '',
      codeGdo: affaire.numeroAffaire || '',
      ap: affaire.imputation || '',
      commandeRef: commandeDefault,
      etp: affaire.entreprise || '',
      designation: '',
      uniteDeposee: 0,
      uniteReintegree: 0,
      longueurML: 0,
      poidsEquivalentKg: 0,
      poidsKg: 0,
      dateDepot: new Date().toISOString().slice(0, 10),
    };
    onChange({
      ...affaire,
      wasteDeposits: [...affaire.wasteDeposits, item],
    });
  };

  const updateWasteDeposit = (
    id: string,
    patch: Partial<WasteDepositItem>
  ) => {
    onChange({
      ...affaire,
      wasteDeposits: affaire.wasteDeposits.map((w) =>
        w.id === id ? { ...w, ...patch } : w
      ),
    });
  };

  const removeWasteDeposit = (id: string) => {
    onChange({
      ...affaire,
      wasteDeposits: affaire.wasteDeposits.filter((w) => w.id !== id),
    });
  };

  return (
    <div className="space-y-5">
      {/* Segmented Sub-navigation */}
      <div className="bg-white border border-slate-200 rounded-lg p-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {(
            [
              ['identite', 'Identification, ODS & Réception'],
              ['delai', "Fiche de Délai d'Exécution"],
              ['pv', 'PV Réception Provisoire'],
              ['materiel', 'Contrôle Matériel & Déchets'],
              ['aft', 'Avis de Fin des Travaux (AFT)'],
              ['dgd', 'Décompte Général Définitif (DGD)'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSubTab(key)}
              className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                subTab === key
                  ? 'bg-blue-700 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {onPrintDoc && (
          <button
            type="button"
            onClick={() => onPrintDoc(SUBTAB_TO_PRINT_DOC[subTab])}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            {SUBTAB_PRINT_LABEL[subTab]}
          </button>
        )}
      </div>

      {/* 1. Identification & ODS */}
      {subTab === 'identite' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">
                1. Identification de l&apos;affaire &amp; Marché
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600">Statut :</span>
                <select
                  value={affaire.status}
                  onChange={(e) =>
                    onChange({
                      ...affaire,
                      status: e.target.value as AffaireStatus,
                    })
                  }
                  className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-600"
                >
                  <option value="etude">En étude</option>
                  <option value="en_cours">En cours d&apos;exécution</option>
                  <option value="reception_provisoire">Réception provisoire</option>
                  <option value="cloture_dgd">Clôturée (DGD)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  N° d&apos;Affaire
                </label>
                <input
                  type="text"
                  value={affaire.numeroAffaire}
                  onChange={(e) =>
                    onChange({ ...affaire, numeroAffaire: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Code Client
                </label>
                <input
                  type="text"
                  value={affaire.codeClient}
                  onChange={(e) =>
                    onChange({ ...affaire, codeClient: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Imputation
                </label>
                <input
                  type="text"
                  value={affaire.imputation}
                  onChange={(e) =>
                    onChange({ ...affaire, imputation: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Lot N°
                </label>
                <input
                  type="text"
                  value={affaire.lotNumero}
                  onChange={(e) =>
                    onChange({ ...affaire, lotNumero: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Objet / Libellé de l&apos;affaire
                </label>
                <input
                  type="text"
                  value={affaire.objet}
                  onChange={(e) =>
                    onChange({ ...affaire, objet: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Nature de l&apos;affaire
                </label>
                <input
                  type="text"
                  value={affaire.natureAffaire}
                  onChange={(e) =>
                    onChange({ ...affaire, natureAffaire: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Demandeur
                </label>
                <input
                  type="text"
                  value={affaire.demandeur}
                  onChange={(e) =>
                    onChange({ ...affaire, demandeur: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Lieux des Travaux
                </label>
                <input
                  type="text"
                  value={affaire.lieuTravaux}
                  onChange={(e) =>
                    onChange({ ...affaire, lieuTravaux: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Commune
                </label>
                <input
                  type="text"
                  value={affaire.commune}
                  onChange={(e) =>
                    onChange({ ...affaire, commune: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Wilaya
                </label>
                <input
                  type="text"
                  value={affaire.wilaya}
                  onChange={(e) =>
                    onChange({ ...affaire, wilaya: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-200">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Entreprise de Réalisation
                </label>
                <input
                  type="text"
                  value={affaire.entreprise}
                  onChange={(e) =>
                    onChange({ ...affaire, entreprise: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm font-medium border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  N° Étude
                </label>
                <input
                  type="text"
                  value={affaire.etudeNumero}
                  onChange={(e) =>
                    onChange({ ...affaire, etudeNumero: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Date Étude
                </label>
                <input
                  type="date"
                  value={affaire.dateEtude}
                  onChange={(e) =>
                    onChange({ ...affaire, dateEtude: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Marché / Commande N°
                </label>
                <input
                  type="text"
                  value={affaire.marcheNumero}
                  onChange={(e) =>
                    onChange({ ...affaire, marcheNumero: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Date Marché / Commande
                </label>
                <input
                  type="date"
                  value={affaire.marcheDate}
                  onChange={(e) =>
                    onChange({ ...affaire, marcheDate: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  ODS N°
                </label>
                <input
                  type="text"
                  value={affaire.odsNumero}
                  onChange={(e) =>
                    onChange({ ...affaire, odsNumero: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Date ODS
                </label>
                <input
                  type="date"
                  value={affaire.odsDate}
                  onChange={(e) =>
                    onChange({ ...affaire, odsDate: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Consultation N°
                </label>
                <input
                  type="text"
                  value={affaire.consultationNumero}
                  onChange={(e) =>
                    onChange({ ...affaire, consultationNumero: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  PV COPEO N°
                </label>
                <input
                  type="text"
                  value={affaire.pvCopeoNumero}
                  onChange={(e) =>
                    onChange({ ...affaire, pvCopeoNumero: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  PV Réception Provisoire N°
                </label>
                <input
                  type="text"
                  value={affaire.pvReceptionNumero}
                  onChange={(e) =>
                    onChange({ ...affaire, pvReceptionNumero: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Date PV Réception Provisoire
                </label>
                <input
                  type="date"
                  value={affaire.pvReceptionDate}
                  onChange={(e) =>
                    onChange({ ...affaire, pvReceptionDate: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Signataires */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-900">
              Signataires &amp; Émargement
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Agent d&apos;Étude
                </label>
                <input
                  type="text"
                  value={affaire.signatories.agentEtude}
                  onChange={(e) =>
                    onChange({
                      ...affaire,
                      signatories: {
                        ...affaire.signatories,
                        agentEtude: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Surveillant de Travaux
                </label>
                <input
                  type="text"
                  value={affaire.signatories.surveillantTravaux}
                  onChange={(e) =>
                    onChange({
                      ...affaire,
                      signatories: {
                        ...affaire.signatories,
                        surveillantTravaux: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Contrôleur des Travaux
                </label>
                <input
                  type="text"
                  value={affaire.signatories.controleurTravaux}
                  onChange={(e) =>
                    onChange({
                      ...affaire,
                      signatories: {
                        ...affaire.signatories,
                        controleurTravaux: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Chef de Service
                </label>
                <input
                  type="text"
                  value={affaire.signatories.chefService}
                  onChange={(e) =>
                    onChange({
                      ...affaire,
                      signatories: {
                        ...affaire.signatories,
                        chefService: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Chef DEET
                </label>
                <input
                  type="text"
                  value={affaire.signatories.chefDEET}
                  onChange={(e) =>
                    onChange({
                      ...affaire,
                      signatories: {
                        ...affaire.signatories,
                        chefDEET: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Fiche de Délai d'Exécution — Format identique Sonelgaz */}
      {subTab === 'delai' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-6 lg:p-10 max-w-[920px] mx-auto shadow-xs text-slate-900">
            {/* Official Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-400 pb-3 mb-5">
              <div className="flex items-center gap-3 flex-1">
                <img
                  src="/assets/aistudio/LOGO__00bdc765.jpeg"
                  alt="Logo Sonelgaz"
                  className="h-12 w-auto object-contain shrink-0"
                />
                <div className="flex-1 leading-tight">
                  <div className="text-sm font-bold text-cyan-700">
                    الشركة الجزائرية للكهرباء والغاز-التوزيع
                  </div>
                  <div className="text-[11px] font-semibold text-cyan-700">
                    {settings?.organisme || "Société algérienne de l'électricité et du gaz - Distribution"}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-4 text-[10px] text-cyan-700">
                    <span>{settings?.direction || 'Direction de Distribution de Tlemcen'}</span>
                    <span className="text-slate-500">
                      N° .......... · Année {affaire.delaySheet.t0DateDebut ? affaire.delaySheet.t0DateDebut.slice(0, 4) : '........'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-[11px] font-mono text-slate-500 whitespace-nowrap">
                Affaire : {affaire.numeroAffaire}
              </div>
            </div>

            <h2 className="text-center text-lg font-bold tracking-wide uppercase mb-6">
              FICHE DE DELAI D&apos;EXECUTION
            </h2>

            {/* Contract Identification Lines */}
            <div className="space-y-1.5 text-xs mb-6">
              <div>
                <span className="font-semibold">Société Contractante :</span>{' '}
                <span>{settings?.direction || 'Direction de Distribution de Tlemcen'}</span>
              </div>
              <div>
                <span className="font-semibold">Structure Contractante :</span>{' '}
                <span>{settings?.division || "Division Etudes d'Exécution et Travaux"}</span>
              </div>
              <div>
                <span className="font-semibold">Contractant :</span>{' '}
                <span className="font-bold uppercase">{affaire.entreprise || '—'}</span>
              </div>
              <div>
                <span>Marché/Commande/Lettre de Commande n°</span>{' '}
                <span className="font-mono font-medium ml-2">
                  MARCHE N° : {affaire.marcheNumero || '—'}
                  {affaire.marcheDate ? ` du ${formatDateFR(affaire.marcheDate)}` : ''}
                </span>
              </div>
              <div className="pt-1 font-bold text-sm text-slate-950">
                {affaire.objet}
              </div>
            </div>

            {/* Numbered Rows with Right-Aligned Boxed Inputs (Identical Design) */}
            <div className="space-y-2.5 text-xs">
              <div className="grid grid-cols-[1fr_56px_150px] items-center gap-3">
                <div>1. Date contractuelle de commencement des travaux</div>
                <div className="text-center font-mono text-slate-700">(T0)</div>
                <input
                  type="date"
                  value={affaire.delaySheet.t0DateDebut}
                  onChange={(e) =>
                    onChange({
                      ...affaire,
                      delaySheet: {
                        ...affaire.delaySheet,
                        t0DateDebut: e.target.value,
                      },
                    })
                  }
                  className="w-full px-2 py-1 text-center font-mono text-xs border border-slate-800 bg-white focus:outline-none focus:border-blue-700"
                />
              </div>

              <div className="grid grid-cols-[1fr_56px_150px] items-center gap-3">
                <div>2. Délai d&apos;exécution contractuelle en jours calendaires</div>
                <div className="text-center font-mono text-slate-700">(D1)</div>
                <input
                  type="number"
                  min="0"
                  value={affaire.delaySheet.d1DelaiJours}
                  onChange={(e) =>
                    onChange({
                      ...affaire,
                      delaySheet: {
                        ...affaire.delaySheet,
                        d1DelaiJours: parseInt(e.target.value, 10) || 0,
                      },
                    })
                  }
                  className="w-full px-2 py-1 text-center num-cell text-xs border border-slate-800 bg-white focus:outline-none focus:border-blue-700"
                />
              </div>

              <div className="pt-1">
                <div>3. Prolongation de délai en jours calendaires :</div>
              </div>

              <div className="grid grid-cols-[1fr_56px_150px] items-center gap-3 pl-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span>- Par avenant (indiquer les Références)</span>
                  <input
                    type="text"
                    placeholder="Réf. avenant..."
                    value={affaire.delaySheet.d2RefAvenant}
                    onChange={(e) =>
                      onChange({
                        ...affaire,
                        delaySheet: {
                          ...affaire.delaySheet,
                          d2RefAvenant: e.target.value,
                        },
                      })
                    }
                    className="px-2 py-0.5 text-[11px] border-b border-dotted border-slate-400 bg-transparent focus:outline-none focus:border-blue-700 min-w-[140px]"
                  />
                </div>
                <div className="text-center font-mono text-slate-700">(D2)</div>
                <input
                  type="number"
                  min="0"
                  value={affaire.delaySheet.d2ProlongationAvenant}
                  onChange={(e) =>
                    onChange({
                      ...affaire,
                      delaySheet: {
                        ...affaire.delaySheet,
                        d2ProlongationAvenant: parseInt(e.target.value, 10) || 0,
                      },
                    })
                  }
                  className="w-full px-2 py-1 text-center num-cell text-xs border border-slate-800 bg-white focus:outline-none focus:border-blue-700"
                />
              </div>

              <div className="grid grid-cols-[1fr_56px_150px] items-center gap-3 pl-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span>- Par décision de responsable du marché (indiquer les références)</span>
                  <input
                    type="text"
                    placeholder="Réf. décision..."
                    value={affaire.delaySheet.d2PrimeRefDecision}
                    onChange={(e) =>
                      onChange({
                        ...affaire,
                        delaySheet: {
                          ...affaire.delaySheet,
                          d2PrimeRefDecision: e.target.value,
                        },
                      })
                    }
                    className="px-2 py-0.5 text-[11px] border-b border-dotted border-slate-400 bg-transparent focus:outline-none focus:border-blue-700 min-w-[140px]"
                  />
                </div>
                <div className="text-center font-mono text-slate-700">(D2&apos;)</div>
                <input
                  type="number"
                  min="0"
                  value={affaire.delaySheet.d2PrimeProlongationDecision}
                  onChange={(e) =>
                    onChange({
                      ...affaire,
                      delaySheet: {
                        ...affaire.delaySheet,
                        d2PrimeProlongationDecision:
                          parseInt(e.target.value, 10) || 0,
                      },
                    })
                  }
                  className="w-full px-2 py-1 text-center num-cell text-xs border border-slate-800 bg-white focus:outline-none focus:border-blue-700"
                />
              </div>

              <div className="grid grid-cols-[1fr_56px_150px] items-center gap-3">
                <div>
                  4. Date calendaire de fin théorique du délai d&apos;exécution y compris prolongations accordés D2 et D2&apos;
                </div>
                <div className="text-center font-mono text-slate-700">(T1)</div>
                <div className="w-full px-2 py-1 text-center font-mono text-xs border border-slate-800 bg-slate-50 font-medium">
                  {formatDateFR(delayMetrics.t1DateFinTheorique)}
                </div>
              </div>

              <div className="grid grid-cols-[1fr_56px_150px] items-center gap-3">
                <div>5. Date réelle calendaire d&apos;exécution complète du contrat</div>
                <div className="text-center font-mono text-slate-700">(T2)</div>
                <input
                  type="date"
                  value={affaire.delaySheet.t2DateFinReelle}
                  onChange={(e) =>
                    onChange({
                      ...affaire,
                      delaySheet: {
                        ...affaire.delaySheet,
                        t2DateFinReelle: e.target.value,
                      },
                    })
                  }
                  className="w-full px-2 py-1 text-center font-mono text-xs border border-slate-800 bg-white focus:outline-none focus:border-blue-700"
                />
              </div>

              <div className="grid grid-cols-[1fr_56px_150px] items-center gap-3">
                <div>6. Ecart constater en jours entre la date T2 et la date T1</div>
                <div className="text-center font-mono text-slate-700">(A)</div>
                <div
                  className={`w-full px-2 py-1 text-center num-cell text-xs font-bold border border-slate-800 bg-slate-50 ${
                    delayMetrics.ecartJoursA > 0
                      ? 'text-amber-800'
                      : 'text-emerald-800'
                  }`}
                >
                  {delayMetrics.ecartJoursA}
                </div>
              </div>

              <div className="pl-6 pt-1 text-slate-800">Si A &gt; 0, Préciser :</div>

              <div className="grid grid-cols-[1fr_56px_150px] items-center gap-3 pl-6">
                <div>- Nombre de jours imputables à la structure concerné</div>
                <div className="text-center font-mono text-slate-700">(P1)</div>
                <input
                  type="number"
                  min="0"
                  value={affaire.delaySheet.p1JoursStructure}
                  onChange={(e) =>
                    onChange({
                      ...affaire,
                      delaySheet: {
                        ...affaire.delaySheet,
                        p1JoursStructure: parseInt(e.target.value, 10) || 0,
                      },
                    })
                  }
                  className="w-full px-2 py-1 text-center num-cell text-xs border border-slate-800 bg-white focus:outline-none focus:border-blue-700"
                />
              </div>

              <div className="grid grid-cols-[1fr_56px_150px] items-center gap-3 pl-6">
                <div>- Nombre de jours imputables au contractant</div>
                <div className="text-center font-mono text-slate-700">(P2)</div>
                <input
                  type="number"
                  min="0"
                  value={affaire.delaySheet.p2JoursContractant}
                  onChange={(e) =>
                    onChange({
                      ...affaire,
                      delaySheet: {
                        ...affaire.delaySheet,
                        p2JoursContractant: parseInt(e.target.value, 10) || 0,
                      },
                    })
                  }
                  className="w-full px-2 py-1 text-center num-cell text-xs border border-slate-800 bg-white focus:outline-none focus:border-blue-700"
                />
              </div>

              <div className="grid grid-cols-[1fr_56px_150px] items-center gap-3 pt-1">
                <div>7. Taux de pénalité appliqué (en pourcentage)</div>
                <div className="text-center font-mono text-slate-700">(P)</div>
                <div className="w-full px-2 py-1 text-center num-cell text-xs font-bold border border-slate-800 bg-slate-50">
                  {delayMetrics.tauxPenaliteTotalPct.toFixed(2)} %
                </div>
              </div>

              {/* Signatures section matching PDF */}
              <div className="pt-4 space-y-12">
                <div>8. Signature du responsable de l&apos;affaire :</div>
                <div className="text-center">
                  8. Signature du responsable habilité détenteur du pouvoir d&apos;engagement
                </div>
              </div>
            </div>
          </div>

          {/* Paramètres du barème de pénalité */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 max-w-[920px] mx-auto flex flex-wrap items-center justify-between gap-4 text-xs">
            <span className="font-medium text-slate-700">
              Paramètres de calcul du taux de pénalité (P) :
            </span>
            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex items-center gap-2 text-slate-600">
                Taux / jour (%) :
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={affaire.delaySheet.tauxPenaliteJourPct}
                  onChange={(e) =>
                    onChange({
                      ...affaire,
                      delaySheet: {
                        ...affaire.delaySheet,
                        tauxPenaliteJourPct: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-24 px-2 py-1 text-right num-cell border border-slate-200 rounded"
                />
              </label>
              <label className="inline-flex items-center gap-2 text-slate-600">
                Plafond (%) :
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={affaire.delaySheet.plafondPenalitePct}
                  onChange={(e) =>
                    onChange({
                      ...affaire,
                      delaySheet: {
                        ...affaire.delaySheet,
                        plafondPenalitePct: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-24 px-2 py-1 text-right num-cell border border-slate-200 rounded"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 2bis. Procès-Verbal de Réception Provisoire — Format identique */}
      {subTab === 'pv' && (
        <div className="space-y-4">
          {/* Quick Edit Controls Bar */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 max-w-[920px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                N° PV Réception
              </label>
              <input
                type="text"
                placeholder="ex: 190/26"
                value={affaire.pvReceptionNumero}
                onChange={(e) =>
                  onChange({ ...affaire, pvReceptionNumero: e.target.value })
                }
                className="w-full px-2.5 py-1.5 font-mono border border-slate-200 rounded"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Date du PV
              </label>
              <input
                type="date"
                value={affaire.pvReceptionDate}
                onChange={(e) =>
                  onChange({ ...affaire, pvReceptionDate: e.target.value })
                }
                className="w-full px-2.5 py-1.5 font-mono border border-slate-200 rounded"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Nous soussigné (Délégué)
              </label>
              <input
                type="text"
                placeholder="ex: Smahi Mohammed"
                value={affaire.pvDelegueNom ?? affaire.signatories.surveillantTravaux}
                onChange={(e) =>
                  onChange({ ...affaire, pvDelegueNom: e.target.value })
                }
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Délégué par
              </label>
              <input
                type="text"
                placeholder="ex: Mr Dahane Abdelkader"
                value={affaire.pvDeleguePar ?? affaire.signatories.chefService}
                onChange={(e) =>
                  onChange({ ...affaire, pvDeleguePar: e.target.value })
                }
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Réserves
              </label>
              <input
                type="text"
                placeholder="RAS"
                value={affaire.pvReceptionReserves}
                onChange={(e) =>
                  onChange({ ...affaire, pvReceptionReserves: e.target.value })
                }
                className="w-full px-2.5 py-1.5 font-semibold border border-slate-200 rounded"
              />
            </div>
          </div>

          {/* Identical Sonelgaz PV Document Canvas */}
          <div className="bg-white border border-slate-200 rounded-lg p-8 lg:p-12 max-w-[920px] mx-auto shadow-xs text-slate-950">
            {/* Top Header */}
            <div className="flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-3 mb-4">
              <div className="flex items-center gap-3 flex-1">
                <img
                  src="/assets/aistudio/LOGO__00bdc765.jpeg"
                  alt="Logo Sonelgaz"
                  className="h-12 w-auto object-contain shrink-0"
                />
                <div className="leading-tight">
                  <div className="text-sm font-bold text-cyan-700">
                    الشركة الجزائرية للكهرباء والغاز-التوزيع
                  </div>
                  <div className="text-xs font-bold text-cyan-700">
                    {settings?.organisme || "Société algérienne de l'électricité et du gaz - Distribution"}
                  </div>
                  <div className="text-[11px] text-cyan-700">
                    {settings?.direction || 'Direction de Distribution de Tlemcen'}
                  </div>
                </div>
              </div>
              <div className="border border-slate-300 px-3 py-1 text-[10px] text-slate-600 min-w-[130px]">
                <div>N° : {affaire.pvReceptionNumero || '.....................'}</div>
                <div>
                  Année : {affaire.pvReceptionDate ? affaire.pvReceptionDate.slice(0, 4) : '........'}
                </div>
              </div>
            </div>

            <div className="text-xs space-y-1 mb-6">
              <div>Concession de Distribution de {affaire.wilaya || settings?.wilayaDefaut || 'Tlemcen'}</div>
              <div>{settings?.division || "Division Etudes d'Execution et Travaux"}</div>
              <div className="pt-1 font-bold text-sm">
                Affaire : {affaire.objet}
              </div>
              <div className="pt-1 font-mono text-xs">
                N° : {affaire.pvReceptionNumero || '.....................'}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4 pl-10 pt-1">
                <div>
                  Commande, Avenant n° : <span className="font-mono">{affaire.marcheNumero || '—'}</span>
                </div>
                <div className="pr-8">
                  Approuve le : <span className="font-mono">{formatDateFR(affaire.marcheDate)}</span>
                </div>
              </div>
            </div>

            <h2 className="text-center text-base font-bold tracking-wide uppercase my-6">
              PROCES-VERBAL DE RECEPTION PROVISOIRE N° {affaire.pvReceptionNumero || '..........'}
            </h2>

            {/* Right-shifted PV Body exactly matching pv_exemple_78294f2b.pdf */}
            <div className="md:pl-44 space-y-4 text-xs leading-relaxed">
              <div>{formatDatePVLetters(affaire.pvReceptionDate)}</div>

              <div>
                Nous soussigné,{' '}
                <span className="font-bold">
                  {affaire.pvDelegueNom || affaire.signatories.surveillantTravaux || '.....................'}
                </span>{' '}
                délégué par{' '}
                <span className="font-bold">
                  {affaire.pvDeleguePar || affaire.signatories.chefService || '.....................'}
                </span>{' '}
                en <span className="font-bold">la présence</span> de l&apos;entrepreneur dument appelé.
              </div>

              <div>
                Nous nous somme transportés <span className="font-bold">sur les lieux</span>, pour examiner les travaux de :
                <div className="font-bold mt-0.5">{affaire.objet}</div>
              </div>

              <div>
                Executés par :{' '}
                <span className="font-bold uppercase">
                  {affaire.entreprise || '—'}
                </span>{' '}
                , entrepreneur.
              </div>

              <div>
                Nous avons reconnu que ces travaux sont terminés, et qu&apos;ils peuvent être reçues provisoirement, sous les réserves suivantes :
              </div>

              {/* 4 Dotted Lines with centered Reserves / RAS */}
              <div className="relative py-2 my-2">
                <div className="space-y-4">
                  <div className="border-b border-dotted border-slate-700" />
                  <div className="border-b border-dotted border-slate-700" />
                  <div className="border-b border-dotted border-slate-700" />
                  <div className="border-b border-dotted border-slate-700" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="px-4 text-2xl font-bold tracking-[0.25em] text-slate-900">
                    {affaire.pvReceptionReserves || 'RAS'}
                  </span>
                </div>
              </div>

              <div>En foi de quoi, nous avons dressé le présent procés verbal.</div>

              <div>
                A {affaire.wilaya ? affaire.wilaya.charAt(0).toUpperCase() + affaire.wilaya.slice(1).toLowerCase() : 'Tlemcen'}, le{' '}
                <span className="font-mono">{formatDateFR(affaire.pvReceptionDate)}</span>.
              </div>
            </div>

            {/* Exact Signature Block */}
            <div className="mt-10 text-xs">
              <div className="flex items-start justify-between px-6 sm:px-14">
                <div>Accepté par l&apos;entrepreneur</div>
                <div>Responsable de Structure contractante</div>
              </div>
              <div className="mt-14 text-right pr-6 sm:pr-14">
                Vu par la hiéarchie habilitée (*)
              </div>
              <div className="mt-16 text-[10px] text-slate-700">
                (*) La hiéarchie détentrice du pouvoir d&apos;engagement
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Contrôle Matériel & Dépose Déchets */}
      {subTab === 'materiel' && (
        <div className="space-y-6">
          {/* Fiche de contrôle matériel */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Fiche de Contrôle Matériel Électricité
                </h2>
                <p className="text-xs text-slate-500">
                  Traçabilité des matériels agréés, fabricants, factures d&apos;achat et types de contrôle.
                </p>
              </div>
              <button
                type="button"
                onClick={addMaterialControl}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter matériel
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                    <th className="py-2.5 px-3 min-w-[200px]">Désignation du matériel</th>
                    <th className="py-2.5 px-3">Fabricant / Distributeur</th>
                    <th className="py-2.5 px-3">N° Facture d&apos;achat</th>
                    <th className="py-2.5 px-3">Date facture</th>
                    <th className="py-2.5 px-3 text-center">Visuel</th>
                    <th className="py-2.5 px-3 text-center">Marquage</th>
                    <th className="py-2.5 px-3 text-center">Dimensionnel</th>
                    <th className="py-2.5 px-3 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {affaire.materialControls.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-8 text-center text-slate-500"
                      >
                        Aucun matériel contrôlé enregistré.
                      </td>
                    </tr>
                  ) : (
                    affaire.materialControls.map((mc) => (
                      <tr key={mc.id} className="hover:bg-slate-50/70">
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={mc.designation}
                            placeholder="ex: Câble MT/S 1x185/30kv"
                            onChange={(e) =>
                              updateMaterialControl(mc.id, {
                                designation: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1 border border-slate-200 rounded"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={mc.fabricant}
                            placeholder="ex: SARL Lux Energie"
                            onChange={(e) =>
                              updateMaterialControl(mc.id, {
                                fabricant: e.target.value,
                                distributeur: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1 border border-slate-200 rounded"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={mc.factureAchat}
                            placeholder="ex: FV 2500817"
                            onChange={(e) =>
                              updateMaterialControl(mc.id, {
                                factureAchat: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1 font-mono border border-slate-200 rounded"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="date"
                            value={mc.dateFacture}
                            onChange={(e) =>
                              updateMaterialControl(mc.id, {
                                dateFacture: e.target.value,
                              })
                            }
                            className="px-2 py-1 font-mono border border-slate-200 rounded"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={mc.controleVisuel}
                            onChange={(e) =>
                              updateMaterialControl(mc.id, {
                                controleVisuel: e.target.checked,
                              })
                            }
                            className="h-4 w-4 accent-blue-700"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={mc.controleMarquage}
                            onChange={(e) =>
                              updateMaterialControl(mc.id, {
                                controleMarquage: e.target.checked,
                              })
                            }
                            className="h-4 w-4 accent-blue-700"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={mc.controleDimensionnel}
                            onChange={(e) =>
                              updateMaterialControl(mc.id, {
                                controleDimensionnel: e.target.checked,
                              })
                            }
                            className="h-4 w-4 accent-blue-700"
                          />
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => removeMaterialControl(mc.id)}
                            className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fiche de dépose et stockage des déchets (Annexe 1 identique D_charge_d10e57e8.pdf) */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Annexe 1 : Fiche de Dépose et de Stockage des Déchets
                </h2>
                <p className="text-xs text-slate-500">
                  Par l&apos;entreprise sous-traitante — Décharge magasin, longueurs ML, poids équivalent et poids pesé réintégré.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="font-medium">Décharge N° :</span>
                  <input
                    type="text"
                    placeholder="ex: 12/2026"
                    value={affaire.dechargeNumero || ''}
                    onChange={(e) =>
                      onChange({ ...affaire, dechargeNumero: e.target.value })
                    }
                    className="w-28 px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-lg"
                  />
                </label>
                <label className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="font-medium">Date :</span>
                  <input
                    type="date"
                    value={affaire.dechargeDate || ''}
                    onChange={(e) =>
                      onChange({ ...affaire, dechargeDate: e.target.value })
                    }
                    className="px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-lg"
                  />
                </label>
                <button
                  type="button"
                  onClick={addWasteDeposit}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter matériel déposé
                </button>
                {onPrintDoc && (
                  <button
                    type="button"
                    onClick={() => onPrintDoc('dechets')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5 text-blue-700" />
                    Imprimer Annexe 1
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                    <th className="py-2.5 px-2.5 text-center w-12">N° Ordre</th>
                    <th className="py-2.5 px-2.5 min-w-[190px]">Intitulé de l&apos;affaire</th>
                    <th className="py-2.5 px-2.5 min-w-[110px]">Code GDO</th>
                    <th className="py-2.5 px-2.5 min-w-[90px]">AP</th>
                    <th className="py-2.5 px-2.5 min-w-[130px]">N° date 3° tranche / commande</th>
                    <th className="py-2.5 px-2.5 min-w-[140px]">ETP</th>
                    <th className="py-2.5 px-2.5 min-w-[200px]">Désignation du Matériel</th>
                    <th className="py-2.5 px-2.5 text-right min-w-[100px]">Unité déposée</th>
                    <th className="py-2.5 px-2.5 text-right min-w-[100px]">Unité réintégrée</th>
                    <th className="py-2.5 px-2.5 text-right min-w-[105px]">Longueur ML</th>
                    <th className="py-2.5 px-2.5 text-right min-w-[115px]">Poids Équiv. (Kg)</th>
                    <th className="py-2.5 px-2.5 text-right min-w-[115px]">Poids Pesé réint. (kg)</th>
                    <th className="py-2.5 px-2.5 min-w-[130px]">Date entrée en stock</th>
                    <th className="py-2.5 px-2.5 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {affaire.wasteDeposits.length === 0 ? (
                    <tr>
                      <td
                        colSpan={14}
                        className="py-8 text-center text-slate-500"
                      >
                        Aucun matériel déposé enregistré.
                      </td>
                    </tr>
                  ) : (
                    affaire.wasteDeposits.map((wd, idx) => (
                      <tr key={wd.id} className="hover:bg-slate-50/70">
                        <td className="py-2 px-2.5 text-center num-cell text-slate-500 font-medium">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={wd.intituleAffaire ?? affaire.objet}
                            onChange={(e) =>
                              updateWasteDeposit(wd.id, {
                                intituleAffaire: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1 border border-slate-200 rounded"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={wd.codeGdo ?? affaire.numeroAffaire}
                            placeholder="Code GDO"
                            onChange={(e) =>
                              updateWasteDeposit(wd.id, {
                                codeGdo: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1 font-mono border border-slate-200 rounded"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={wd.ap ?? affaire.imputation}
                            placeholder="AP"
                            onChange={(e) =>
                              updateWasteDeposit(wd.id, {
                                ap: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1 font-mono border border-slate-200 rounded"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={
                              wd.commandeRef ??
                              (affaire.marcheNumero
                                ? `${affaire.marcheNumero}${affaire.marcheDate ? ` du ${formatDateFR(affaire.marcheDate)}` : ''}`
                                : '')
                            }
                            placeholder="N° / date"
                            onChange={(e) =>
                              updateWasteDeposit(wd.id, {
                                commandeRef: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1 font-mono border border-slate-200 rounded"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={wd.etp ?? affaire.entreprise}
                            placeholder="Entreprise"
                            onChange={(e) =>
                              updateWasteDeposit(wd.id, {
                                etp: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1 border border-slate-200 rounded"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={wd.designation}
                            placeholder="ex: Câble 3x34,4 NAHS"
                            onChange={(e) =>
                              updateWasteDeposit(wd.id, {
                                designation: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1 border border-slate-200 rounded font-medium"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="0"
                            value={wd.uniteDeposee}
                            onChange={(e) =>
                              updateWasteDeposit(wd.id, {
                                uniteDeposee: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full min-w-[96px] px-2 py-1.5 text-right num-cell border border-slate-200 rounded"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="0"
                            value={wd.uniteReintegree}
                            onChange={(e) =>
                              updateWasteDeposit(wd.id, {
                                uniteReintegree:
                                  parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full min-w-[96px] px-2 py-1.5 text-right num-cell border border-slate-200 rounded"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="0"
                            value={wd.longueurML}
                            onChange={(e) =>
                              updateWasteDeposit(wd.id, {
                                longueurML: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full min-w-[96px] px-2 py-1.5 text-right num-cell border border-slate-200 rounded"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="0"
                            value={wd.poidsEquivalentKg ?? 0}
                            onChange={(e) =>
                              updateWasteDeposit(wd.id, {
                                poidsEquivalentKg:
                                  parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full min-w-[100px] px-2 py-1.5 text-right num-cell border border-slate-200 rounded"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="0"
                            value={wd.poidsKg}
                            onChange={(e) =>
                              updateWasteDeposit(wd.id, {
                                poidsKg: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full min-w-[100px] px-2 py-1.5 text-right num-cell border border-slate-200 rounded"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="date"
                            value={wd.dateDepot}
                            onChange={(e) =>
                              updateWasteDeposit(wd.id, {
                                dateDepot: e.target.value,
                              })
                            }
                            className="px-2 py-1 font-mono border border-slate-200 rounded"
                          />
                        </td>
                        <td className="py-2 px-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeWasteDeposit(wd.id)}
                            className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. Avis de Fin des Travaux (AFT) */}
      {subTab === 'aft' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-slate-200">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  N° Avis de Fin des Travaux (AFT)
                </label>
                <input
                  type="text"
                  placeholder="ex: 79/26"
                  value={affaire.aftNumero}
                  onChange={(e) =>
                    onChange({ ...affaire, aftNumero: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Date AFT
                </label>
                <input
                  type="date"
                  value={affaire.aftDate}
                  onChange={(e) =>
                    onChange({ ...affaire, aftDate: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Réserves PV Réception
                </label>
                <input
                  type="text"
                  value={affaire.pvReceptionReserves}
                  onChange={(e) =>
                    onChange({
                      ...affaire,
                      pvReceptionReserves: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <h3 className="text-sm font-semibold text-slate-900">
              4. Caractéristiques Techniques (AFT)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* POSTES */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-2.5">
                <div className="text-xs font-semibold text-slate-700 pb-2 border-b border-slate-200">
                  POSTES
                </div>
                {(
                  [
                    ['posteNature', 'Nature'],
                    ['posteTension', 'Tension'],
                    ['posteNumero', 'Numéro'],
                    ['postePuissance', 'Puissance'],
                    ['posteTerreNeutre', 'Terre du neutre'],
                  ] as const
                ).map(([field, label]) => (
                  <div key={field}>
                    <label className="block text-[11px] text-slate-500 mb-0.5">
                      {label}
                    </label>
                    <input
                      type="text"
                      value={affaire.techSpecs[field]}
                      onChange={(e) =>
                        onChange({
                          ...affaire,
                          techSpecs: {
                            ...affaire.techSpecs,
                            [field]: e.target.value,
                          },
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded"
                    />
                  </div>
                ))}
              </div>

              {/* RACC. BT */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-2.5">
                <div className="text-xs font-semibold text-slate-700 pb-2 border-b border-slate-200">
                  RACC. BT
                </div>
                {(
                  [
                    ['raccBtPosteDp', 'N° Poste DP'],
                    ['raccBtTension', 'Tension'],
                    ['raccBtPoseCableLe', 'Pose câble le'],
                    ['raccBtMiseSousTensLe', 'Mise sous tens. le'],
                    ['raccBtNbreBrts', 'Nbre Brts / Compteurs'],
                  ] as const
                ).map(([field, label]) => (
                  <div key={field}>
                    <label className="block text-[11px] text-slate-500 mb-0.5">
                      {label}
                    </label>
                    <input
                      type="text"
                      value={affaire.techSpecs[field]}
                      onChange={(e) =>
                        onChange({
                          ...affaire,
                          techSpecs: {
                            ...affaire.techSpecs,
                            [field]: e.target.value,
                          },
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded"
                    />
                  </div>
                ))}
              </div>

              {/* RACC. HTA */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-2.5">
                <div className="text-xs font-semibold text-slate-700 pb-2 border-b border-slate-200">
                  RACC. HTA
                </div>
                {(
                  [
                    ['raccHtaTension', 'Tension'],
                    ['raccHtaPoseCableLe', 'Pose câble le'],
                    ['raccHtaMiseSousTensLe', 'Mise sous tens. le'],
                  ] as const
                ).map(([field, label]) => (
                  <div key={field}>
                    <label className="block text-[11px] text-slate-500 mb-0.5">
                      {label}
                    </label>
                    <input
                      type="text"
                      value={affaire.techSpecs[field]}
                      onChange={(e) =>
                        onChange({
                          ...affaire,
                          techSpecs: {
                            ...affaire.techSpecs,
                            [field]: e.target.value,
                          },
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                5. Observations (AFT)
              </label>
              <textarea
                rows={2}
                value={affaire.observationsAFT}
                onChange={(e) =>
                  onChange({ ...affaire, observationsAFT: e.target.value })
                }
                placeholder="ex: R.A.S"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-6 py-3.5 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">
                3. Consistances physiques (Qté Devis vs Qté Réalisée)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-2.5 px-4">Désignation Travaux</th>
                    <th className="py-2.5 px-3 min-w-[76px] text-center whitespace-nowrap">Unité</th>
                    <th className="py-2.5 px-4 text-right">Qté Devis</th>
                    <th className="py-2.5 px-4 text-right">Qté Réalisée</th>
                    <th className="py-2.5 px-4 text-right">Écart</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {affaire.items.map((item) => {
                    const qDevis = Math.max(
                      item.qteDevisMO,
                      item.qteDevisFourn
                    );
                    const cum = stats.cumul[item.id] || {
                      qteFourn: 0,
                      qteMO: 0,
                    };
                    const qReal = Math.max(cum.qteMO, cum.qteFourn);
                    const diff = qReal - qDevis;
                    return (
                      <tr key={item.id}>
                        <td className="py-2.5 px-4 font-medium text-slate-900">
                          {item.designation}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 font-mono font-semibold text-slate-800 bg-slate-100 border border-slate-200 rounded">
                            {item.unite}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right num-cell text-slate-700">
                          {formatNumber(qDevis)}
                        </td>
                        <td className="py-2.5 px-4 text-right num-cell font-semibold text-slate-900">
                          {formatNumber(qReal)}
                        </td>
                        <td
                          className={`py-2.5 px-4 text-right num-cell font-medium ${
                            diff > 0
                              ? 'text-amber-700'
                              : diff < 0
                                ? 'text-slate-500'
                                : 'text-emerald-700'
                          }`}
                        >
                          {diff > 0 ? `+${formatNumber(diff)}` : formatNumber(diff)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. Décompte Général Définitif (DGD) — Consistances physiques */}
      {subTab === 'dgd' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-5 border-b border-slate-200">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  N° Décompte Général Définitif (DGD)
                </label>
                <input
                  type="text"
                  placeholder="ex: DGD-194/26"
                  value={affaire.dgdNumero}
                  onChange={(e) =>
                    onChange({ ...affaire, dgdNumero: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Date du DGD
                </label>
                <input
                  type="date"
                  value={affaire.dgdDate}
                  onChange={(e) =>
                    onChange({ ...affaire, dgdDate: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Famille</th>
                    <th className="py-2.5 px-3">Nature d&apos;ouvrage</th>
                    <th className="py-2.5 px-3">Ouvrage</th>
                    <th className="py-2.5 px-2 min-w-[76px] text-center whitespace-nowrap">Unité</th>
                    <th className="py-2.5 px-3 text-right">Qté Devis</th>
                    <th className="py-2.5 px-3 text-right">Qté Réalisée</th>
                    <th className="py-2.5 px-3 text-right">Écart</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {affaire.items.map((item) => {
                    const cum = stats.cumul[item.id] || {
                      qteFourn: 0,
                      qteMO: 0,
                    };
                    const qDevis = Math.max(
                      item.qteDevisMO,
                      item.qteDevisFourn
                    );
                    const qReal = Math.max(cum.qteMO, cum.qteFourn);
                    const ecart = qReal - qDevis;
                    return (
                      <tr key={item.id}>
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {item.rcnTp}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {item.famille}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {item.natureOuvrage}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">
                          {item.designation}
                        </td>
                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 font-mono font-semibold text-slate-800 bg-slate-100 border border-slate-200 rounded">
                            {item.unite}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right num-cell text-slate-600">
                          {formatNumber(qDevis)}
                        </td>
                        <td className="py-2.5 px-3 text-right num-cell font-semibold text-slate-900">
                          {formatNumber(qReal)}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right num-cell font-medium ${
                            ecart > 0
                              ? 'text-amber-700'
                              : ecart < 0
                                ? 'text-slate-500'
                                : 'text-emerald-700'
                          }`}
                        >
                          {ecart > 0
                            ? `+${formatNumber(ecart)}`
                            : formatNumber(ecart)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 text-xs">
            <div className="px-4 py-1">
              <div className="text-slate-500">Postes au DGD</div>
              <div className="mt-1 text-lg font-semibold text-slate-900 num-cell">
                {stats.totalPostes} ouvrages
              </div>
            </div>
            <div className="px-4 py-1">
              <div className="text-slate-500">Linéaire total réalisé</div>
              <div className="mt-1 text-lg font-semibold text-blue-700 num-cell">
                {formatNumber(stats.totalRealiseML, 2)} ML
              </div>
            </div>
            <div className="px-4 py-1">
              <div className="text-slate-500">Unités / Ensembles réalisés</div>
              <div className="mt-1 text-lg font-semibold text-slate-900 num-cell">
                {formatNumber(stats.totalRealiseUnit, 2)} U
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
