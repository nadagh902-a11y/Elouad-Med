import { Affaire, WorkItem } from '../types/project';

export function formatNumber(value: number, decimals = 2): string {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(safe);
}

export function formatDateFR(isoDate?: string): string {
  if (!isoDate) return '—';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(isoDate)) return isoDate;
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
}

const FRENCH_MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

function yearToFrenchWords(year: number): string {
  if (year < 2000 || year > 2099) return String(year);
  const rem = year - 2000;
  if (rem === 0) return 'deux mille';
  const units = [
    '',
    'un',
    'deux',
    'trois',
    'quatre',
    'cinq',
    'six',
    'sept',
    'huit',
    'neuf',
    'dix',
    'onze',
    'douze',
    'treize',
    'quatorze',
    'quinze',
    'seize',
    'dix-sept',
    'dix-huit',
    'dix-neuf',
  ];
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];
  let words = '';
  if (rem < 20) {
    words = units[rem];
  } else if (rem < 70) {
    const t = Math.floor(rem / 10);
    const u = rem % 10;
    words = u === 0 ? tens[t] : u === 1 ? `${tens[t]} et un` : `${tens[t]}-${units[u]}`;
  } else if (rem < 80) {
    const u = rem - 60;
    words = u === 11 ? 'soixante et onze' : `soixante-${units[u]}`;
  } else {
    const u = rem - 80;
    words = u === 0 ? 'quatre-vingts' : `quatre-vingt-${units[u]}`;
  }
  return `deux mille ${words}`;
}

export function formatDatePVLetters(isoDate?: string): string {
  if (!isoDate) return "L'an ..........................., le ....................";
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (Number.isNaN(year) || Number.isNaN(monthIdx) || Number.isNaN(day) || monthIdx < 0 || monthIdx > 11) {
    return isoDate;
  }
  const dayLabel = day === 1 ? '1er' : String(day);
  return `L'an ${yearToFrenchWords(year)}, le ${dayLabel} ${FRENCH_MONTHS[monthIdx]}.`;
}

export function addDaysISO(isoDate: string, days: number): string {
  if (!isoDate) return '';
  const d = new Date(isoDate + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function diffDaysISO(dateStart: string, dateEnd: string): number {
  if (!dateStart || !dateEnd) return 0;
  const start = new Date(dateStart + 'T00:00:00');
  const end = new Date(dateEnd + 'T00:00:00');
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function getItemDevisQty(item: WorkItem): number {
  return Math.max(item.qteDevisFourn || 0, item.qteDevisMO || 0);
}

export function computeCumulativeRealized(
  affaire: Affaire,
  upToIndex?: number
): Record<string, { qteFourn: number; qteMO: number }> {
  const result: Record<string, { qteFourn: number; qteMO: number }> = {};
  for (const item of affaire.items) {
    result[item.id] = { qteFourn: 0, qteMO: 0 };
  }
  const limit =
    upToIndex === undefined
      ? affaire.attachements.length
      : Math.min(upToIndex + 1, affaire.attachements.length);

  for (let i = 0; i < limit; i++) {
    const sit = affaire.attachements[i];
    for (const item of affaire.items) {
      const entry = sit.entries[item.id];
      if (entry) {
        result[item.id].qteFourn += entry.qteFourn || 0;
        result[item.id].qteMO += entry.qteMO || 0;
      }
    }
  }
  return result;
}

export function computeDelayMetrics(affaire: Affaire): {
  t1DateFinTheorique: string;
  ecartJoursA: number;
  tauxPenaliteTotalPct: number;
} {
  const ds = affaire.delaySheet;
  const totalDelai =
    (ds.d1DelaiJours || 0) +
    (ds.d2ProlongationAvenant || 0) +
    (ds.d2PrimeProlongationDecision || 0);
  const t1DateFinTheorique = addDaysISO(ds.t0DateDebut, totalDelai);
  const ecartJoursA =
    ds.t2DateFinReelle && t1DateFinTheorique
      ? diffDaysISO(t1DateFinTheorique, ds.t2DateFinReelle)
      : 0;
  const joursPenalisables = Math.max(0, ds.p2JoursContractant || 0);
  const rawPct = joursPenalisables * (ds.tauxPenaliteJourPct || 0);
  const tauxPenaliteTotalPct = Math.min(rawPct, ds.plafondPenalitePct || 10);

  return {
    t1DateFinTheorique,
    ecartJoursA,
    tauxPenaliteTotalPct,
  };
}

export function computeAffairePhysicalStats(affaire: Affaire) {
  const cumul = computeCumulativeRealized(affaire);
  let postesSoldes = 0;
  let postesDepassement = 0;
  let postesEnAttente = 0;
  let sumProgress = 0;
  let totalDevisML = 0;
  let totalRealiseML = 0;
  let totalDevisUnit = 0;
  let totalRealiseUnit = 0;

  for (const item of affaire.items) {
    const c = cumul[item.id] || { qteFourn: 0, qteMO: 0 };
    const qDevis = getItemDevisQty(item);
    const qReal = Math.max(c.qteFourn, c.qteMO);

    if (item.unite === 'ML') {
      totalDevisML += qDevis;
      totalRealiseML += qReal;
    } else {
      totalDevisUnit += qDevis;
      totalRealiseUnit += qReal;
    }

    const fOver = c.qteFourn > (item.qteDevisFourn || 0) + 0.001;
    const mOver = c.qteMO > (item.qteDevisMO || 0) + 0.001;
    if (fOver || mOver) {
      postesDepassement++;
    }

    if (qDevis > 0) {
      const ratio = Math.min(1, qReal / qDevis);
      sumProgress += ratio;
      if (qReal >= qDevis - 0.001) {
        postesSoldes++;
      } else if (qReal === 0) {
        postesEnAttente++;
      }
    } else if (qReal > 0) {
      sumProgress += 1;
      postesSoldes++;
    }
  }

  const avancementPct =
    affaire.items.length > 0 ? (sumProgress / affaire.items.length) * 100 : 0;

  return {
    totalPostes: affaire.items.length,
    postesSoldes,
    postesDepassement,
    postesEnAttente,
    avancementPct,
    totalDevisML,
    totalRealiseML,
    totalDevisUnit,
    totalRealiseUnit,
    cumul,
  };
}

export function exportAffaireToCSV(affaire: Affaire): void {
  const stats = computeAffairePhysicalStats(affaire);
  const headers = [
    'Chapitre',
    'RCN/TP',
    'Famille',
    'Nature Ouvrage',
    'Designation',
    'Unite',
    'Qte Devis Fourn',
    'Qte Devis MO',
    'Qte Realisee Fourn',
    'Qte Realisee MO',
    'Ecart Fourn',
    'Ecart MO',
  ];

  const rows = affaire.items.map((item) => {
    const r = stats.cumul[item.id] || { qteFourn: 0, qteMO: 0 };
    const ecartF = r.qteFourn - (item.qteDevisFourn || 0);
    const ecartM = r.qteMO - (item.qteDevisMO || 0);
    return [
      item.chapitre,
      item.rcnTp,
      item.famille,
      item.natureOuvrage,
      `"${(item.designation || '').replace(/"/g, '""')}"`,
      item.unite,
      (item.qteDevisFourn || 0).toFixed(2),
      (item.qteDevisMO || 0).toFixed(2),
      r.qteFourn.toFixed(2),
      r.qteMO.toFixed(2),
      ecartF.toFixed(2),
      ecartM.toFixed(2),
    ].join(';');
  });

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Consistances_Attachement_${affaire.numeroAffaire.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
