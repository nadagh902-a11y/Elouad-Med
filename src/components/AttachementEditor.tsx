import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { Affaire, AttachementLineEntry, AttachementSituation } from '../types/project';
import {
  computeCumulativeRealized,
  formatDateFR,
  formatNumber,
} from '../utils/formatters';

interface AttachementEditorProps {
  affaire: Affaire;
  onChange: (updated: Affaire) => void;
}

export const AttachementEditor: React.FC<AttachementEditorProps> = ({
  affaire,
  onChange,
}) => {
  const [activeSitId, setActiveSitId] = useState<string>(
    affaire.attachements[0]?.id || ''
  );
  const [confirmDeleteSitId, setConfirmDeleteSitId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (
      affaire.attachements.length > 0 &&
      !affaire.attachements.some((s) => s.id === activeSitId)
    ) {
      setActiveSitId(affaire.attachements[0].id);
    } else if (affaire.attachements.length === 0) {
      setActiveSitId('');
    }
  }, [affaire.attachements, activeSitId]);

  const activeIndex = affaire.attachements.findIndex(
    (s) => s.id === activeSitId
  );
  const activeSit =
    activeIndex >= 0 ? affaire.attachements[activeIndex] : undefined;

  const prevCumul = useMemo(() => {
    if (activeIndex <= 0) return {};
    return computeCumulativeRealized(affaire, activeIndex - 1);
  }, [affaire, activeIndex]);

  const activeCumul = useMemo(() => {
    if (activeIndex < 0) return {};
    return computeCumulativeRealized(affaire, activeIndex);
  }, [affaire, activeIndex]);

  const sitPhysicalStats = useMemo(() => {
    if (!activeSit) return null;
    let linesFilled = 0;
    let periodML = 0;
    let periodUnits = 0;
    let overCount = 0;
    let completedCount = 0;

    for (const item of affaire.items) {
      const e = activeSit.entries[item.id];
      const qF = e?.qteFourn || 0;
      const qM = e?.qteMO || 0;
      if (qF > 0 || qM > 0) {
        linesFilled++;
        const maxQ = Math.max(qF, qM);
        if (item.unite === 'ML') periodML += maxQ;
        else periodUnits += maxQ;
      }

      const cum = activeCumul[item.id] || { qteFourn: 0, qteMO: 0 };
      if (
        cum.qteFourn > (item.qteDevisFourn || 0) + 0.001 ||
        cum.qteMO > (item.qteDevisMO || 0) + 0.001
      ) {
        overCount++;
      } else if (
        Math.abs(cum.qteFourn - (item.qteDevisFourn || 0)) < 0.001 &&
        Math.abs(cum.qteMO - (item.qteDevisMO || 0)) < 0.001 &&
        ((item.qteDevisFourn || 0) > 0 || (item.qteDevisMO || 0) > 0)
      ) {
        completedCount++;
      }
    }

    return {
      linesFilled,
      periodML,
      periodUnits,
      overCount,
      completedCount,
    };
  }, [affaire.items, activeSit, activeCumul]);

  const createSituation = () => {
    const nextNum =
      affaire.attachements.length > 0
        ? Math.max(...affaire.attachements.map((s) => s.numero)) + 1
        : 1;
    const newSit: AttachementSituation = {
      id: 'att-' + Date.now(),
      numero: nextNum,
      titre: `Feuille d'Attachement N° ${nextNum}`,
      date: new Date().toISOString().slice(0, 10),
      estFinale: false,
      deduirePrecedentes: nextNum > 1,
      noteSpeciale: nextNum > 1 ? 'NB : à déduire la situation précédente' : '',
      retenueGarantiePct: 0,
      entries: {},
    };
    onChange({
      ...affaire,
      attachements: [...affaire.attachements, newSit],
    });
    setActiveSitId(newSit.id);
  };

  const updateActiveSituation = (patch: Partial<AttachementSituation>) => {
    if (!activeSit) return;
    onChange({
      ...affaire,
      attachements: affaire.attachements.map((s) =>
        s.id === activeSit.id ? { ...s, ...patch } : s
      ),
    });
  };

  const updateLineEntry = (
    itemId: string,
    patch: Partial<AttachementLineEntry>
  ) => {
    if (!activeSit) return;
    const prevEntry = activeSit.entries[itemId] || {
      itemId,
      qteFourn: 0,
      qteMO: 0,
      observation: '',
    };
    updateActiveSituation({
      entries: {
        ...activeSit.entries,
        [itemId]: { ...prevEntry, ...patch },
      },
    });
  };

  const autoCompleteRemaining = () => {
    if (!activeSit) return;
    const nextEntries: Record<string, AttachementLineEntry> = {
      ...activeSit.entries,
    };
    for (const item of affaire.items) {
      const prev = prevCumul[item.id] || { qteFourn: 0, qteMO: 0 };
      const remFourn = Math.max(0, (item.qteDevisFourn || 0) - prev.qteFourn);
      const remMO = Math.max(0, (item.qteDevisMO || 0) - prev.qteMO);
      nextEntries[item.id] = {
        itemId: item.id,
        qteFourn: remFourn,
        qteMO: remMO,
        observation: nextEntries[item.id]?.observation || '',
      };
    }
    updateActiveSituation({ entries: nextEntries });
  };

  const resetActiveEntries = () => {
    if (!activeSit) return;
    updateActiveSituation({ entries: {} });
  };

  const deleteSituation = (id: string) => {
    const next = affaire.attachements.filter((s) => s.id !== id);
    onChange({ ...affaire, attachements: next });
    setConfirmDeleteSitId(null);
  };

  if (affaire.items.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg py-12 px-6 text-center">
        <ClipboardCheck className="h-10 w-10 text-slate-300 mx-auto" />
        <h3 className="mt-3 text-sm font-semibold text-slate-900">
          Aucun poste à attacher
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Ajoutez d&apos;abord les articles dans l&apos;onglet Consistances / Devis avant de saisir les quantités d&apos;attachement.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Situation Selector Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {affaire.attachements.length === 0 ? (
            <span className="text-sm text-slate-500">
              Aucune feuille d&apos;attachement enregistrée pour cette affaire.
            </span>
          ) : (
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {affaire.attachements.map((sit) => (
                <button
                  key={sit.id}
                  type="button"
                  onClick={() => setActiveSitId(sit.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    sit.id === activeSitId
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  N° {sit.numero} · {formatDateFR(sit.date)}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={createSituation}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          Nouvelle Feuille d&apos;Attachement
        </button>
      </div>

      {!activeSit ? (
        <div className="bg-white border border-slate-200 rounded-lg py-12 px-6 text-center">
          <ClipboardCheck className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="mt-3 text-sm font-semibold text-slate-900">
            Démarrez le suivi chantier
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Créez une première feuille d&apos;attachement pour enregistrer les quantités réalisées (Fourn. &amp; M. en O.).
          </p>
          <button
            type="button"
            onClick={createSituation}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Créer la 1ère Feuille d&apos;Attachement
          </button>
        </div>
      ) : (
        <>
          {/* Situation Metadata & Helpers */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Intitulé de la feuille d&apos;attachement
                </label>
                <input
                  type="text"
                  value={activeSit.titre}
                  onChange={(e) =>
                    updateActiveSituation({ titre: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Date d&apos;attachement
                </label>
                <input
                  type="date"
                  value={activeSit.date}
                  onChange={(e) =>
                    updateActiveSituation({ date: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-blue-600"
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeSit.estFinale}
                    onChange={(e) =>
                      updateActiveSituation({ estFinale: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                  />
                  Attachement final / définitif
                </label>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <div className="flex-1">
                <input
                  type="text"
                  value={activeSit.noteSpeciale || ''}
                  onChange={(e) =>
                    updateActiveSituation({ noteSpeciale: e.target.value })
                  }
                  placeholder="Observation / Mention spéciale (ex: NB : à déduire la première situation)..."
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-600"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={autoCompleteRemaining}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  Solder le reste du devis (100%)
                </button>
                <button
                  type="button"
                  onClick={resetActiveEntries}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Remettre à 0
                </button>
                {confirmDeleteSitId === activeSit.id ? (
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => deleteSituation(activeSit.id)}
                      className="px-2.5 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 cursor-pointer"
                    >
                      Confirmer suppression
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteSitId(null)}
                      className="px-2 py-1.5 text-xs text-slate-600 cursor-pointer"
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteSitId(activeSit.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Supprimer
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Attachement Grid (Pure Physical Quantities) */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                    <th className="py-2.5 px-3 min-w-[88px]">Chapitre</th>
                    <th className="py-2.5 px-3 min-w-[250px]">Désignation</th>
                    <th className="py-2.5 px-2 min-w-[76px] text-center whitespace-nowrap">Unité</th>
                    <th className="py-2.5 px-2 min-w-[112px] text-right whitespace-nowrap">
                      Devis (F / MO)
                    </th>
                    {activeIndex > 0 && (
                      <th className="py-2.5 px-2 min-w-[112px] text-right whitespace-nowrap">
                        Préc. (F / MO)
                      </th>
                    )}
                    <th className="py-2.5 px-2 text-right min-w-[132px] w-32 whitespace-nowrap bg-blue-50/50 text-blue-900">
                      Fourn.
                    </th>
                    <th className="py-2.5 px-2 text-right min-w-[132px] w-32 whitespace-nowrap bg-blue-50/50 text-blue-900">
                      M. en O.
                    </th>
                    <th className="py-2.5 px-3 min-w-[116px] text-right whitespace-nowrap">
                      Cumul &amp; État
                    </th>
                    <th className="py-2.5 px-3 min-w-[160px]">Observ.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {affaire.items.map((item) => {
                    const entry = activeSit.entries[item.id] || {
                      itemId: item.id,
                      qteFourn: 0,
                      qteMO: 0,
                      observation: '',
                    };
                    const prev = prevCumul[item.id] || {
                      qteFourn: 0,
                      qteMO: 0,
                    };
                    const cum = activeCumul[item.id] || {
                      qteFourn: entry.qteFourn,
                      qteMO: entry.qteMO,
                    };

                    const overFourn = cum.qteFourn > item.qteDevisFourn + 0.001;
                    const overMO = cum.qteMO > item.qteDevisMO + 0.001;
                    const isOver = overFourn || overMO;
                    const isExact =
                      Math.abs(cum.qteFourn - item.qteDevisFourn) < 0.001 &&
                      Math.abs(cum.qteMO - item.qteDevisMO) < 0.001 &&
                      (item.qteDevisFourn > 0 || item.qteDevisMO > 0);

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="py-2.5 px-3 font-medium text-slate-600 whitespace-nowrap">
                          {item.chapitre}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">
                          {item.designation}
                        </td>
                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 font-mono font-semibold text-slate-800 bg-slate-100 border border-slate-200 rounded">
                            {item.unite}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right num-cell text-slate-600 whitespace-nowrap">
                          {formatNumber(item.qteDevisFourn, 0)} /{' '}
                          {formatNumber(item.qteDevisMO, 0)}
                        </td>
                        {activeIndex > 0 && (
                          <td className="py-2.5 px-2 text-right num-cell text-slate-500 whitespace-nowrap">
                            {formatNumber(prev.qteFourn, 0)} /{' '}
                            {formatNumber(prev.qteMO, 0)}
                          </td>
                        )}
                        <td className="py-2 px-2 bg-blue-50/20">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={entry.qteFourn}
                            onChange={(e) =>
                              updateLineEntry(item.id, {
                                qteFourn: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full min-w-[108px] px-2.5 py-1.5 text-right num-cell bg-white border border-slate-200 rounded focus:outline-none focus:border-blue-600"
                          />
                        </td>
                        <td className="py-2 px-2 bg-blue-50/20">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={entry.qteMO}
                            onChange={(e) =>
                              updateLineEntry(item.id, {
                                qteMO: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full min-w-[108px] px-2.5 py-1.5 text-right num-cell bg-white border border-slate-200 rounded focus:outline-none focus:border-blue-600"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="num-cell text-slate-800 font-medium">
                            {formatNumber(cum.qteFourn, 0)} /{' '}
                            {formatNumber(cum.qteMO, 0)}
                          </div>
                          {isOver ? (
                            <div className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-medium">
                              <AlertTriangle className="h-3 w-3" />
                              Dépassement
                            </div>
                          ) : isExact ? (
                            <div className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                              <CheckCircle2 className="h-3 w-3" />
                              100%
                            </div>
                          ) : null}
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={entry.observation || ''}
                            placeholder="Observ..."
                            onChange={(e) =>
                              updateLineEntry(item.id, {
                                observation: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-blue-600"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Physical Recap for Selected Attachement */}
          {sitPhysicalStats && (
            <div className="bg-white border border-slate-200 rounded-lg p-5 grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 text-xs">
              <div className="px-4 py-1">
                <div className="text-slate-500">Postes saisis (période)</div>
                <div className="mt-1 text-lg font-semibold text-slate-900 num-cell">
                  {sitPhysicalStats.linesFilled} / {affaire.items.length}
                </div>
              </div>
              <div className="px-4 py-1">
                <div className="text-slate-500">Linéaire période</div>
                <div className="mt-1 text-lg font-semibold text-blue-700 num-cell">
                  {formatNumber(sitPhysicalStats.periodML, 0)} ML
                </div>
              </div>
              <div className="px-4 py-1">
                <div className="text-slate-500">Unités / Ens. période</div>
                <div className="mt-1 text-lg font-semibold text-slate-900 num-cell">
                  {formatNumber(sitPhysicalStats.periodUnits, 0)} U
                </div>
              </div>
              <div className="px-4 py-1">
                <div className="text-slate-500">Postes soldés / Dépassements</div>
                <div className="mt-1 text-lg font-semibold text-slate-900 num-cell">
                  {sitPhysicalStats.completedCount} soldés
                  {sitPhysicalStats.overCount > 0 && (
                    <span className="text-amber-700 ml-2">
                      · {sitPhysicalStats.overCount} dép.
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
