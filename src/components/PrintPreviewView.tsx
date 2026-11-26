import React, { useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import { Affaire, AppSettings } from '../types/project';
import {
  computeAffairePhysicalStats,
  computeDelayMetrics,
  formatDateFR,
  formatDatePVLetters,
  formatNumber,
} from '../utils/formatters';

interface PrintPreviewViewProps {
  affaire: Affaire;
  settings: AppSettings;
}

type DocType = 'devis' | 'attachement' | 'aft' | 'dgd' | 'delai' | 'pv';

export const PrintPreviewView: React.FC<PrintPreviewViewProps> = ({
  affaire,
  settings,
}) => {
  const [docType, setDocType] = useState<DocType>('attachement');
  const [selectedSitId, setSelectedSitId] = useState<string>(
    affaire.attachements[0]?.id || ''
  );

  const stats = useMemo(() => computeAffairePhysicalStats(affaire), [affaire]);
  const delayMetrics = useMemo(() => computeDelayMetrics(affaire), [affaire]);
  const selectedSit =
    affaire.attachements.find((s) => s.id === selectedSitId) ||
    affaire.attachements[0];

  return (
    <div className="space-y-5">
      {/* Controls bar (hidden on print) */}
      <div className="no-print bg-white border border-slate-200 rounded-lg p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                ['devis', "Fiche d'Étude / Devis"],
                ['attachement', "Feuille d'Attachement"],
                ['aft', 'Avis Fin Travaux (AFT)'],
                ['dgd', 'Décompte (DGD)'],
                ['delai', 'Fiche de Délai'],
                ['pv', 'PV Réception Provisoire'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setDocType(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  docType === key
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {docType === 'attachement' && affaire.attachements.length > 0 && (
            <select
              value={selectedSit?.id || ''}
              onChange={(e) => setSelectedSitId(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-white"
            >
              {affaire.attachements.map((s) => (
                <option key={s.id} value={s.id}>
                  Attachement N° {s.numero} ({formatDateFR(s.date)})
                </option>
              ))}
            </select>
          )}
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Printer className="h-4 w-4" />
          Imprimer / Exporter PDF (A4)
        </button>
      </div>

      {/* Printable A4 Sheet */}
      <div className="print-sheet bg-white border border-slate-200 rounded-lg p-8 lg:p-10 max-w-[920px] mx-auto text-slate-950 shadow-xs">
        {docType !== 'delai' && docType !== 'pv' && (
          <>
            {/* Official Header */}
            <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between gap-4">
              <div className="space-y-0.5 text-xs">
                <div className="font-bold text-sm text-blue-900">
                  {settings.organisme}
                </div>
                <div className="font-semibold text-slate-800">
                  {settings.direction}
                </div>
                <div className="text-slate-600">{settings.division}</div>
              </div>
              <div className="text-right text-xs space-y-0.5 whitespace-nowrap">
                <div className="font-medium">
                  {affaire.wilaya || settings.wilayaDefaut}, le :{' '}
                  <span className="font-mono">
                    {docType === 'attachement' && selectedSit
                      ? formatDateFR(selectedSit.date)
                      : docType === 'aft'
                        ? formatDateFR(affaire.aftDate)
                        : docType === 'dgd'
                          ? formatDateFR(affaire.dgdDate)
                          : formatDateFR(affaire.dateEtude)}
                  </span>
                </div>
                <div className="font-mono text-slate-600">
                  {docType === 'aft' && affaire.aftNumero
                    ? `N° : ${affaire.aftNumero}`
                    : docType === 'dgd' && affaire.dgdNumero
                      ? `N° : ${affaire.dgdNumero}`
                      : affaire.etudeNumero
                        ? `Étude N° : ${affaire.etudeNumero}`
                        : ''}
                </div>
              </div>
            </div>

            {/* Document Title */}
            <div className="my-6 text-center">
              <h2 className="text-lg font-bold tracking-wide uppercase underline underline-offset-4">
                {docType === 'devis' && "FICHE D'ETUDE — CONSISTANCES PHYSIQUES"}
                {docType === 'attachement' &&
                  `FEUILLE D'ATTACHEMENT${selectedSit ? ` — N° ${selectedSit.numero}` : ''}`}
                {docType === 'aft' && 'AVIS DE FIN DES TRAVAUX ELECTRICITE'}
                {docType === 'dgd' && 'DECOMPTE GENERAL DEFINITIF'}
              </h2>
            </div>

            {/* Section 1: Identification */}
            <div className="mb-5 text-xs space-y-1.5">
              <div className="font-bold text-sm underline mb-2">
                1. Identification de l&apos;affaire :
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                <div>
                  <span className="font-semibold">Affaire :</span>{' '}
                  <span className="font-mono">{affaire.numeroAffaire}</span>
                  {affaire.natureAffaire ? ` / ${affaire.natureAffaire}` : ''}
                </div>
                <div>
                  <span className="font-semibold">Lot N° :</span>{' '}
                  {affaire.lotNumero || '1'}
                  {affaire.imputation ? ` · Imputation : ${affaire.imputation}` : ''}
                </div>
                <div className="col-span-2 font-semibold">{affaire.objet}</div>
                <div>
                  <span className="font-semibold">Demandeur :</span>{' '}
                  {affaire.demandeur || '—'}
                </div>
                <div>
                  <span className="font-semibold">Lieux des Travaux :</span>{' '}
                  {affaire.lieuTravaux || `${affaire.commune} / ${affaire.wilaya}`}
                </div>
                <div>
                  <span className="font-semibold">Marché / Commande N° :</span>{' '}
                  <span className="font-mono">
                    {affaire.marcheNumero || '—'}
                    {affaire.marcheDate
                      ? ` du ${formatDateFR(affaire.marcheDate)}`
                      : ''}
                  </span>
                </div>
                <div>
                  <span className="font-semibold">ODS N° :</span>{' '}
                  <span className="font-mono">
                    {affaire.odsNumero || '—'}
                    {affaire.odsDate ? ` du ${formatDateFR(affaire.odsDate)}` : ''}
                  </span>
                </div>
                {(affaire.consultationNumero || affaire.pvCopeoNumero) && (
                  <div className="col-span-2">
                    <span className="font-semibold">Consultation N° :</span>{' '}
                    {affaire.consultationNumero || '—'} ·{' '}
                    <span className="font-semibold">PV COPEO N° :</span>{' '}
                    {affaire.pvCopeoNumero || '—'}
                  </div>
                )}
                <div>
                  <span className="font-semibold">Date Début des Travaux :</span>{' '}
                  <span className="font-mono">
                    {formatDateFR(affaire.delaySheet.t0DateDebut)}
                  </span>
                </div>
                <div>
                  <span className="font-semibold">Date Fin des Travaux :</span>{' '}
                  <span className="font-mono">
                    {formatDateFR(affaire.delaySheet.t2DateFinReelle)}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <span className="font-bold text-sm underline">2. Entreprise :</span>{' '}
                <span className="font-bold uppercase ml-2">
                  {affaire.entreprise || '—'}
                </span>
              </div>
            </div>
          </>
        )}

        {/* FICHE D'ETUDE / DEVIS QUANTITATIF (SANS PRIX) */}
        {docType === 'devis' && (
          <table className="w-full border-collapse border border-slate-900 text-[11px]">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-900 py-1.5 px-1.5 text-center">RCN/TP</th>
                <th className="border border-slate-900 py-1.5 px-2 text-left">Famille</th>
                <th className="border border-slate-900 py-1.5 px-2 text-left">Nature d&apos;ouvrage</th>
                <th className="border border-slate-900 py-1.5 px-2 text-left">Ouvrage / Désignation</th>
                <th className="border border-slate-900 py-1.5 px-1.5 text-center">Unité</th>
                <th className="border border-slate-900 py-1.5 px-2 text-right">Qté Fo</th>
                <th className="border border-slate-900 py-1.5 px-2 text-right">Qté Mo</th>
              </tr>
            </thead>
            <tbody>
              {affaire.items.map((it) => (
                <tr key={it.id}>
                  <td className="border border-slate-900 py-1 px-1.5 text-center">{it.rcnTp}</td>
                  <td className="border border-slate-900 py-1 px-2">{it.famille}</td>
                  <td className="border border-slate-900 py-1 px-2">{it.natureOuvrage}</td>
                  <td className="border border-slate-900 py-1 px-2">{it.designation}</td>
                  <td className="border border-slate-900 py-1 px-1.5 text-center">{it.unite}</td>
                  <td className="border border-slate-900 py-1 px-2 text-right num-cell">{formatNumber(it.qteDevisFourn)}</td>
                  <td className="border border-slate-900 py-1 px-2 text-right num-cell">{formatNumber(it.qteDevisMO)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* FEUILLE D'ATTACHEMENT (SANS PRIX) */}
        {docType === 'attachement' && (
          <div className="space-y-4">
            {!selectedSit ? (
              <p className="text-xs text-slate-600 italic">
                Aucune feuille d&apos;attachement enregistrée.
              </p>
            ) : (
              <>
                <table className="w-full border-collapse border border-slate-900 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-900 py-1.5 px-2 text-left">Chapitre</th>
                      <th className="border border-slate-900 py-1.5 px-2 text-left">Désignation</th>
                      <th className="border border-slate-900 py-1.5 px-1.5 text-center">Unité</th>
                      <th className="border border-slate-900 py-1.5 px-2 text-right">Fourn.</th>
                      <th className="border border-slate-900 py-1.5 px-2 text-right">M. en O.</th>
                      <th className="border border-slate-900 py-1.5 px-2 text-left">Observ.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {affaire.items.map((it) => {
                      const e = selectedSit.entries[it.id] || {
                        qteFourn: 0,
                        qteMO: 0,
                        observation: '',
                      };
                      return (
                        <tr key={it.id}>
                          <td className="border border-slate-900 py-1 px-2">{it.chapitre}</td>
                          <td className="border border-slate-900 py-1 px-2">{it.designation}</td>
                          <td className="border border-slate-900 py-1 px-1.5 text-center">{it.unite}</td>
                          <td className="border border-slate-900 py-1 px-2 text-right num-cell">
                            {e.qteFourn > 0 ? formatNumber(e.qteFourn, 0) : '---'}
                          </td>
                          <td className="border border-slate-900 py-1 px-2 text-right num-cell">
                            {e.qteMO > 0 ? formatNumber(e.qteMO, 0) : '---'}
                          </td>
                          <td className="border border-slate-900 py-1 px-2">
                            {e.observation || ''}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {selectedSit.noteSpeciale && (
                  <p className="text-xs font-semibold text-blue-900 pt-1">
                    {selectedSit.noteSpeciale}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* AVIS DE FIN DES TRAVAUX (AFT) */}
        {docType === 'aft' && (
          <div className="space-y-4">
            <div className="font-bold text-xs underline">
              3. Consistances physiques des travaux réalisés :
            </div>
            <table className="w-full border-collapse border border-slate-900 text-[11px]">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-900 py-1.5 px-2 text-left">Désignation Travaux</th>
                  <th className="border border-slate-900 py-1.5 px-2 text-center">Unité</th>
                  <th className="border border-slate-900 py-1.5 px-2 text-right">Qté Devis</th>
                  <th className="border border-slate-900 py-1.5 px-2 text-right">Qté Réalisée</th>
                </tr>
              </thead>
              <tbody>
                {affaire.items.map((it) => {
                  const qDevis = Math.max(it.qteDevisMO, it.qteDevisFourn);
                  const cum = stats.cumul[it.id] || { qteFourn: 0, qteMO: 0 };
                  const qReal = Math.max(cum.qteMO, cum.qteFourn);
                  return (
                    <tr key={it.id}>
                      <td className="border border-slate-900 py-1 px-2">{it.designation}</td>
                      <td className="border border-slate-900 py-1 px-2 text-center">{it.unite}</td>
                      <td className="border border-slate-900 py-1 px-2 text-right num-cell">{formatNumber(qDevis)}</td>
                      <td className="border border-slate-900 py-1 px-2 text-right num-cell font-semibold">{formatNumber(qReal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="font-bold text-xs underline pt-2">
              4. Caractéristiques Techniques
            </div>
            <table className="w-full border-collapse border border-slate-900 text-[11px]">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-900 py-1 px-2 text-center">POSTES</th>
                  <th className="border border-slate-900 py-1 px-2 text-center">RACC. BT</th>
                  <th className="border border-slate-900 py-1 px-2 text-center">RACC. HTA</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-900 py-1 px-2">Nature : {affaire.techSpecs.posteNature}</td>
                  <td className="border border-slate-900 py-1 px-2">N° Poste DP : {affaire.techSpecs.raccBtPosteDp}</td>
                  <td className="border border-slate-900 py-1 px-2">Tension : {affaire.techSpecs.raccHtaTension}</td>
                </tr>
                <tr>
                  <td className="border border-slate-900 py-1 px-2">Tension : {affaire.techSpecs.posteTension}</td>
                  <td className="border border-slate-900 py-1 px-2">Tension : {affaire.techSpecs.raccBtTension}</td>
                  <td className="border border-slate-900 py-1 px-2">Pose câble le : {formatDateFR(affaire.techSpecs.raccHtaPoseCableLe)}</td>
                </tr>
                <tr>
                  <td className="border border-slate-900 py-1 px-2">Numéro : {affaire.techSpecs.posteNumero}</td>
                  <td className="border border-slate-900 py-1 px-2">Pose câble le : {formatDateFR(affaire.techSpecs.raccBtPoseCableLe)}</td>
                  <td className="border border-slate-900 py-1 px-2">Mise sous tens. le : {formatDateFR(affaire.techSpecs.raccHtaMiseSousTensLe)}</td>
                </tr>
                <tr>
                  <td className="border border-slate-900 py-1 px-2">Puissance : {affaire.techSpecs.postePuissance}</td>
                  <td className="border border-slate-900 py-1 px-2">Mise sous tens. le : {formatDateFR(affaire.techSpecs.raccBtMiseSousTensLe)}</td>
                  <td className="border border-slate-900 py-1 px-2"></td>
                </tr>
                <tr>
                  <td className="border border-slate-900 py-1 px-2">Terre du neutre : {affaire.techSpecs.posteTerreNeutre}</td>
                  <td className="border border-slate-900 py-1 px-2">Nbre Brts / Compteurs : {affaire.techSpecs.raccBtNbreBrts}</td>
                  <td className="border border-slate-900 py-1 px-2"></td>
                </tr>
              </tbody>
            </table>

            <div className="text-xs pt-1">
              <span className="font-bold underline">5. Observations :</span>{' '}
              <span className="ml-2">{affaire.observationsAFT || 'R.A.S'}</span>
            </div>
          </div>
        )}

        {/* DGD (EXACT SONELGAZ PHYSICAL FORM — NO PRICES) */}
        {docType === 'dgd' && (
          <div className="space-y-4">
            <div className="font-bold text-xs underline">
              3. Consistances physiques des travaux réalisés :
            </div>
            <table className="w-full border-collapse border border-slate-900 text-[11px]">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-900 py-1.5 px-1.5">Type</th>
                  <th className="border border-slate-900 py-1.5 px-2">Famille</th>
                  <th className="border border-slate-900 py-1.5 px-2">Nature d&apos;ouvrage</th>
                  <th className="border border-slate-900 py-1.5 px-2">Ouvrage</th>
                  <th className="border border-slate-900 py-1.5 px-1.5 text-center">Unité</th>
                  <th className="border border-slate-900 py-1.5 px-2 text-right">Qté Réalisée</th>
                </tr>
              </thead>
              <tbody>
                {affaire.items.map((it) => {
                  const cum = stats.cumul[it.id] || { qteFourn: 0, qteMO: 0 };
                  const qReal = Math.max(cum.qteMO, cum.qteFourn);
                  return (
                    <tr key={it.id}>
                      <td className="border border-slate-900 py-1 px-1.5 text-center">{it.rcnTp}</td>
                      <td className="border border-slate-900 py-1 px-2">{it.famille}</td>
                      <td className="border border-slate-900 py-1 px-2">{it.natureOuvrage}</td>
                      <td className="border border-slate-900 py-1 px-2">{it.designation}</td>
                      <td className="border border-slate-900 py-1 px-1.5 text-center">{it.unite}</td>
                      <td className="border border-slate-900 py-1 px-2 text-right num-cell font-semibold">{formatNumber(qReal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* FICHE DE DELAI D'EXECUTION — Format identique Sonelgaz */}
        {docType === 'delai' && (
          <div className="space-y-5 text-slate-950">
            <div className="flex items-center gap-4 border-b border-slate-400 pb-3">
              <div className="h-12 w-12 border border-slate-800 bg-slate-100 flex flex-col items-center justify-center text-[10px] font-bold leading-tight">
                <span>سونلغاز</span>
                <span>sonelgaz</span>
              </div>
              <div className="flex-1 text-center">
                <div className="text-base font-bold text-slate-900">
                  الشركة الجزائرية للكهرباء والغاز - التوزيع
                </div>
                <div className="text-xs font-medium text-slate-700">
                  {settings.organisme}
                </div>
              </div>
            </div>

            <h2 className="text-center text-lg font-bold tracking-wide uppercase py-1">
              FICHE DE DELAI D&apos;EXECUTION
            </h2>

            <div className="space-y-1.5 text-xs">
              <div>
                <span className="font-semibold">Société Contractante :</span>{' '}
                {settings.direction}
              </div>
              <div>
                <span className="font-semibold">Structure Contractante :</span>{' '}
                {settings.division}
              </div>
              <div>
                <span className="font-semibold">Contractant :</span>{' '}
                <span className="font-bold uppercase">{affaire.entreprise || '—'}</span>
              </div>
              <div>
                Marché/Commande/Lettre de Commande n°{' '}
                <span className="font-mono ml-2">
                  MARCHE N° : {affaire.marcheNumero || '—'}
                  {affaire.marcheDate ? ` du ${formatDateFR(affaire.marcheDate)}` : ''}
                </span>
              </div>
              <div className="pt-1 font-bold text-sm">{affaire.objet}</div>
            </div>

            <div className="space-y-2.5 text-xs pt-2">
              <div className="grid grid-cols-[1fr_54px_140px] items-center gap-3">
                <div>1. Date contractuelle de commencement des travaux</div>
                <div className="text-center font-mono">(T0)</div>
                <div className="border border-slate-900 px-3 py-1 text-center font-mono">
                  {formatDateFR(affaire.delaySheet.t0DateDebut)}
                </div>
              </div>

              <div className="grid grid-cols-[1fr_54px_140px] items-center gap-3">
                <div>2. Délai d&apos;exécution contractuelle en jours calendaires</div>
                <div className="text-center font-mono">(D1)</div>
                <div className="border border-slate-900 px-3 py-1 text-center num-cell">
                  {affaire.delaySheet.d1DelaiJours}
                </div>
              </div>

              <div>3. Prolongation de délai en jours calendaires :</div>

              <div className="grid grid-cols-[1fr_54px_140px] items-center gap-3 pl-6">
                <div>
                  - Par avenant (indiquer les Références){' '}
                  {affaire.delaySheet.d2RefAvenant ? `: ${affaire.delaySheet.d2RefAvenant}` : ''}
                </div>
                <div className="text-center font-mono">(D2)</div>
                <div className="border border-slate-900 px-3 py-1 text-center num-cell">
                  {affaire.delaySheet.d2ProlongationAvenant}
                </div>
              </div>

              <div className="grid grid-cols-[1fr_54px_140px] items-center gap-3 pl-6">
                <div>
                  - Par décision de responsable du marché (indiquer les références){' '}
                  {affaire.delaySheet.d2PrimeRefDecision ? `: ${affaire.delaySheet.d2PrimeRefDecision}` : ''}
                </div>
                <div className="text-center font-mono">(D2&apos;)</div>
                <div className="border border-slate-900 px-3 py-1 text-center num-cell">
                  {affaire.delaySheet.d2PrimeProlongationDecision}
                </div>
              </div>

              <div className="grid grid-cols-[1fr_54px_140px] items-center gap-3">
                <div>
                  4. Date calendaire de fin théorique du délai d&apos;exécution y compris prolongations accordés D2 et D2&apos;
                </div>
                <div className="text-center font-mono">(T1)</div>
                <div className="border border-slate-900 px-3 py-1 text-center font-mono">
                  {formatDateFR(delayMetrics.t1DateFinTheorique)}
                </div>
              </div>

              <div className="grid grid-cols-[1fr_54px_140px] items-center gap-3">
                <div>5. Date réelle calendaire d&apos;exécution complète du contrat</div>
                <div className="text-center font-mono">(T2)</div>
                <div className="border border-slate-900 px-3 py-1 text-center font-mono">
                  {formatDateFR(affaire.delaySheet.t2DateFinReelle)}
                </div>
              </div>

              <div className="grid grid-cols-[1fr_54px_140px] items-center gap-3">
                <div>6. Ecart constater en jours entre la date T2 et la date T1</div>
                <div className="text-center font-mono">(A)</div>
                <div className="border border-slate-900 px-3 py-1 text-center num-cell font-semibold">
                  {delayMetrics.ecartJoursA}
                </div>
              </div>

              <div className="pl-6">Si A &gt; 0, Préciser :</div>

              <div className="grid grid-cols-[1fr_54px_140px] items-center gap-3 pl-6">
                <div>- Nombre de jours imputables à la structure concerné</div>
                <div className="text-center font-mono">(P1)</div>
                <div className="border border-slate-900 px-3 py-1 text-center num-cell">
                  {affaire.delaySheet.p1JoursStructure}
                </div>
              </div>

              <div className="grid grid-cols-[1fr_54px_140px] items-center gap-3 pl-6">
                <div>- Nombre de jours imputables au contractant</div>
                <div className="text-center font-mono">(P2)</div>
                <div className="border border-slate-900 px-3 py-1 text-center num-cell">
                  {affaire.delaySheet.p2JoursContractant}
                </div>
              </div>

              <div className="grid grid-cols-[1fr_54px_140px] items-center gap-3 pt-1">
                <div>7. Taux de pénalité appliqué (en pourcentage)</div>
                <div className="text-center font-mono">(P)</div>
                <div className="border border-slate-900 px-3 py-1 text-center num-cell font-semibold">
                  {delayMetrics.tauxPenaliteTotalPct.toFixed(2)} %
                </div>
              </div>
            </div>

            <div className="pt-6 space-y-20 text-xs print-avoid-break">
              <div>8. Signature du responsable de l&apos;affaire :</div>
              <div className="text-center">
                8. Signature du responsable habilité détenteur du pouvoir d&apos;engagement
              </div>
            </div>
          </div>
        )}

        {/* PROCES-VERBAL DE RECEPTION PROVISOIRE — Format identique pv_exemple_78294f2b.pdf */}
        {docType === 'pv' && (
          <div className="text-slate-950">
            <div className="flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 border border-slate-800 bg-slate-100 flex flex-col items-center justify-center text-[9px] font-bold leading-tight">
                  <span>سونلغاز</span>
                  <span>sonelgaz</span>
                </div>
                <div className="text-xs leading-tight">
                  <div className="font-bold text-cyan-800">
                    {settings.organisme}
                  </div>
                  <div className="text-[11px] text-cyan-700">
                    {settings.direction}
                  </div>
                </div>
              </div>
              <div className="border border-slate-400 px-3 py-1 text-[10px] min-w-[130px]">
                <div>N° : {affaire.pvReceptionNumero || '.....................'}</div>
                <div>
                  Année : {affaire.pvReceptionDate ? affaire.pvReceptionDate.slice(0, 4) : '........'}
                </div>
              </div>
            </div>

            <div className="text-xs space-y-1 mb-6">
              <div>Concession de Distribution de {affaire.wilaya || settings.wilayaDefaut}</div>
              <div>{settings.division}</div>
              <div className="pt-1 font-bold text-sm">
                Affaire : {affaire.objet}
              </div>
              <div className="pt-1 font-mono text-xs">
                N° : {affaire.pvReceptionNumero || '.....................'}
              </div>
              <div className="flex items-center justify-between gap-4 pl-10 pt-1">
                <div>
                  Commande, Avenant n° : <span className="font-mono">{affaire.marcheNumero || '—'}</span>
                </div>
                <div className="pr-8">
                  Approuve le : <span className="font-mono">{formatDateFR(affaire.marcheDate)}</span>
                </div>
              </div>
            </div>

            <h2 className="text-center text-base font-bold tracking-wide uppercase my-7">
              PROCES-VERBAL DE RECEPTION PROVISOIRE N° {affaire.pvReceptionNumero || '..........'}
            </h2>

            <div className="pl-[22%] space-y-4 text-xs leading-relaxed">
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

              <div className="relative py-2 my-2">
                <div className="space-y-4">
                  <div className="border-b border-dotted border-slate-800" />
                  <div className="border-b border-dotted border-slate-800" />
                  <div className="border-b border-dotted border-slate-800" />
                  <div className="border-b border-dotted border-slate-800" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="px-4 text-2xl font-bold tracking-[0.25em] text-slate-950">
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

            <div className="mt-12 text-xs print-avoid-break">
              <div className="flex items-start justify-between px-12">
                <div>Accepté par l&apos;entrepreneur</div>
                <div>Responsable de Structure contractante</div>
              </div>
              <div className="mt-16 text-right pr-12">
                Vu par la hiéarchie habilitée (*)
              </div>
              <div className="mt-20 text-[10px] text-slate-700">
                (*) La hiéarchie détentrice du pouvoir d&apos;engagement
              </div>
            </div>
          </div>
        )}

        {/* Generic 5-Column Signatures Grid for Devis, Attachement, AFT, DGD */}
        {docType !== 'delai' && docType !== 'pv' && (
          <div className="mt-8 print-avoid-break">
            <table className="w-full border-collapse border border-slate-900 text-xs text-center">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border border-slate-900 py-1.5 px-2">L&apos;Entreprise</th>
                  <th className="border border-slate-900 py-1.5 px-2">Le Surveillant Travaux</th>
                  <th className="border border-slate-900 py-1.5 px-2">Le Contrôleur Travaux</th>
                  <th className="border border-slate-900 py-1.5 px-2">Le Chef de Service</th>
                  <th className="border border-slate-900 py-1.5 px-2">Le Chef DEET</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-900 py-8 px-2 align-top font-medium">
                    {affaire.entreprise}
                  </td>
                  <td className="border border-slate-900 py-8 px-2 align-top">
                    {affaire.signatories.surveillantTravaux}
                  </td>
                  <td className="border border-slate-900 py-8 px-2 align-top">
                    {affaire.signatories.controleurTravaux}
                  </td>
                  <td className="border border-slate-900 py-8 px-2 align-top">
                    {affaire.signatories.chefService}
                  </td>
                  <td className="border border-slate-900 py-8 px-2 align-top">
                    {affaire.signatories.chefDEET}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
