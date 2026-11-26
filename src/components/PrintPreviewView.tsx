import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Printer,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { Affaire, AppSettings } from '../types/project';
import {
  computeAffairePhysicalStats,
  computeDelayMetrics,
  formatDateFR,
  formatDatePVLetters,
  formatNumber,
} from '../utils/formatters';
import {
  applyDynamicPrintPageCss,
  ColorMode,
  createPdfBlobUrl,
  createPrintableHtmlBlobUrl,
  exportSheetToPdf,
  isEmbeddedIframe,
  MarginPreset,
  PaperFormat,
  PrintOptions,
  PrintOrientation,
  triggerNativePrint,
} from '../utils/pdfExport';

export type PrintDocType =
  | 'devis'
  | 'attachement'
  | 'aft'
  | 'dgd'
  | 'delai'
  | 'pv'
  | 'materiel'
  | 'dechets';

interface PrintPreviewViewProps {
  affaire: Affaire;
  settings: AppSettings;
  initialDocType?: PrintDocType;
  initialSitId?: string;
  autoPrintSignal?: number;
  onDocTypeChange?: (doc: PrintDocType) => void;
}

const LOGO_URL = '/assets/aistudio/LOGO__00bdc765.jpeg';

const DOC_FILE_PREFIX: Record<PrintDocType, string> = {
  devis: 'Devis_Consistances',
  attachement: 'Feuille_Attachement',
  aft: 'Avis_Fin_Travaux_AFT',
  dgd: 'Decompte_General_Definitif_DGD',
  delai: 'Fiche_Delai_Execution',
  pv: 'PV_Reception_Provisoire',
  materiel: 'Fiche_Controle_Materiel',
  dechets: 'Annexe1_Depose_Dechets',
};

export const PrintPreviewView: React.FC<PrintPreviewViewProps> = ({
  affaire,
  settings,
  initialDocType,
  initialSitId,
  autoPrintSignal = 0,
  onDocTypeChange,
}) => {
  const [docType, setDocType] = useState<PrintDocType>(
    initialDocType || 'attachement'
  );
  const [selectedSitId, setSelectedSitId] = useState<string>(
    initialSitId || affaire.attachements[0]?.id || ''
  );
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showOptionsBar, setShowOptionsBar] = useState(true);
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const [printOptions, setPrintOptions] = useState<PrintOptions>({
    paperFormat: 'a4',
    orientation:
      (initialDocType || 'attachement') === 'dechets'
        ? 'landscape'
        : 'portrait',
    margins: 'normal',
    scalePct: 100,
    colorMode: 'color',
  });
  const [printableBlobUrl, setPrintableBlobUrl] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isPreparingPdfLink, setIsPreparingPdfLink] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const sheetRef = useRef<HTMLDivElement | null>(null);
  const prevBlobUrlRef = useRef<string | null>(null);
  const prevPdfUrlRef = useRef<string | null>(null);
  const embedded = useMemo(() => isEmbeddedIframe(), []);

  useEffect(() => {
    if (initialDocType) {
      setDocType(initialDocType);
      setPrintOptions((prev) => ({
        ...prev,
        orientation: initialDocType === 'dechets' ? 'landscape' : 'portrait',
      }));
    }
  }, [initialDocType]);

  useEffect(() => {
    if (initialSitId) {
      setSelectedSitId(initialSitId);
    }
  }, [initialSitId]);

  useEffect(() => {
    applyDynamicPrintPageCss(printOptions);
  }, [printOptions]);

  useEffect(() => {
    return () => {
      if (prevBlobUrlRef.current) {
        URL.revokeObjectURL(prevBlobUrlRef.current);
        prevBlobUrlRef.current = null;
      }
      if (prevPdfUrlRef.current) {
        URL.revokeObjectURL(prevPdfUrlRef.current);
        prevPdfUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      if (!sheetRef.current) return;
      try {
        const title = `${DOC_FILE_PREFIX[docType]} - ${affaire.numeroAffaire}`;
        const url = await createPrintableHtmlBlobUrl(
          sheetRef.current,
          title,
          printOptions
        );
        if (!active) {
          URL.revokeObjectURL(url);
          return;
        }
        if (prevBlobUrlRef.current) {
          URL.revokeObjectURL(prevBlobUrlRef.current);
        }
        prevBlobUrlRef.current = url;
        setPrintableBlobUrl(url);
      } catch {
        // Ignore preview blob errors
      }
    }, 60);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [docType, selectedSitId, affaire, settings, printOptions]);

  const preparePdfViewerUrl = async () => {
    if (!sheetRef.current) return;
    setIsPreparingPdfLink(true);
    try {
      const url = await createPdfBlobUrl(sheetRef.current, printOptions);
      if (prevPdfUrlRef.current) {
        URL.revokeObjectURL(prevPdfUrlRef.current);
      }
      prevPdfUrlRef.current = url;
      setPdfBlobUrl(url);
    } catch {
      // fallback handled by Download button
    } finally {
      setIsPreparingPdfLink(false);
    }
  };

  useEffect(() => {
    if (!autoPrintSignal) return;
    const timer = window.setTimeout(async () => {
      const opened = await triggerNativePrint(printOptions);
      if (!opened) {
        setShowPrinterModal(true);
        void preparePdfViewerUrl();
      }
    }, 120);
    return () => window.clearTimeout(timer);
  }, [autoPrintSignal]);

  const handleSelectDocType = (next: PrintDocType) => {
    setDocType(next);
    setExportError(null);
    setPdfBlobUrl(null);
    setPrintOptions((prev) => ({
      ...prev,
      orientation: next === 'dechets' ? 'landscape' : 'portrait',
    }));
    onDocTypeChange?.(next);
  };

  const handlePrintNow = async () => {
    setExportError(null);
    const opened = await triggerNativePrint(printOptions);
    if (!opened) {
      setShowPrinterModal(true);
      void preparePdfViewerUrl();
    }
  };

  const handleOpenPrinterOptionsModal = () => {
    setShowPrinterModal(true);
    void preparePdfViewerUrl();
  };

  const handleCopyAppUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedUrl(true);
      window.setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleDownloadPdf = async () => {
    if (!sheetRef.current) return;
    setExportError(null);
    setIsExportingPdf(true);
    try {
      const sitSuffix =
        docType === 'attachement' && selectedSit
          ? `_N${selectedSit.numero}`
          : '';
      const fileName = `${DOC_FILE_PREFIX[docType]}_${affaire.numeroAffaire}${sitSuffix}.pdf`;
      await exportSheetToPdf(sheetRef.current, fileName, printOptions);
    } catch (err) {
      setExportError(
        err instanceof Error
          ? err.message
          : 'Erreur lors de la génération du PDF.'
      );
    } finally {
      setIsExportingPdf(false);
    }
  };

  const stats = useMemo(() => computeAffairePhysicalStats(affaire), [affaire]);
  const delayMetrics = useMemo(() => computeDelayMetrics(affaire), [affaire]);
  const selectedSit =
    affaire.attachements.find((s) => s.id === selectedSitId) ||
    affaire.attachements[0];

  const wilayaLabel = affaire.wilaya
    ? affaire.wilaya.charAt(0).toUpperCase() +
      affaire.wilaya.slice(1).toLowerCase()
    : 'Tlemcen';

  const docNumber =
    docType === 'aft' && affaire.aftNumero
      ? affaire.aftNumero
      : docType === 'dgd' && affaire.dgdNumero
        ? affaire.dgdNumero
        : docType === 'pv' && affaire.pvReceptionNumero
          ? affaire.pvReceptionNumero
          : affaire.etudeNumero || '...............';

  const docYear =
    docType === 'attachement' && selectedSit?.date
      ? selectedSit.date.slice(0, 4)
      : docType === 'aft' && affaire.aftDate
        ? affaire.aftDate.slice(0, 4)
        : docType === 'dgd' && affaire.dgdDate
          ? affaire.dgdDate.slice(0, 4)
          : docType === 'pv' && affaire.pvReceptionDate
            ? affaire.pvReceptionDate.slice(0, 4)
            : affaire.marcheDate
              ? affaire.marcheDate.slice(0, 4)
              : '........';

  return (
    <div className="space-y-5">
      {/* Controls bar (hidden on print) */}
      <div className="no-print bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
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
                  ['materiel', 'Contrôle Matériel'],
                  ['dechets', 'Dépose Déchets (Annexe 1)'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelectDocType(key)}
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

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrintNow}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              Imprimer ({printOptions.paperFormat.toUpperCase()}{' '}
              {printOptions.orientation === 'landscape' ? 'Paysage' : 'Portrait'})
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
            >
              {isExportingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isExportingPdf ? 'Génération PDF...' : 'Télécharger PDF'}
            </button>
            <button
              type="button"
              onClick={() => setShowOptionsBar((v) => !v)}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border whitespace-nowrap shrink-0 cursor-pointer ${
                showOptionsBar
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Options imprimante
            </button>
            {embedded && (
              <button
                type="button"
                onClick={handleOpenPrinterOptionsModal}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Dialogue imprimante
              </button>
            )}
          </div>
        </div>

        {/* Visible In-App Printer & Page Options Bar */}
        {showOptionsBar && (
          <div className="pt-3 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end text-xs">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Format papier
              </label>
              <select
                value={printOptions.paperFormat}
                onChange={(e) =>
                  setPrintOptions((p) => ({
                    ...p,
                    paperFormat: e.target.value as PaperFormat,
                  }))
                }
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
              >
                <option value="a4">A4 (210 × 297 mm)</option>
                <option value="a3">A3 (297 × 420 mm)</option>
                <option value="letter">Lettre US</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Orientation
              </label>
              <select
                value={printOptions.orientation}
                onChange={(e) =>
                  setPrintOptions((p) => ({
                    ...p,
                    orientation: e.target.value as PrintOrientation,
                  }))
                }
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Paysage</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Marges
              </label>
              <select
                value={printOptions.margins}
                onChange={(e) =>
                  setPrintOptions((p) => ({
                    ...p,
                    margins: e.target.value as MarginPreset,
                  }))
                }
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
              >
                <option value="normal">Normales (10 mm)</option>
                <option value="narrow">Étroites (5 mm)</option>
                <option value="wide">Larges (16 mm)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Échelle
              </label>
              <select
                value={printOptions.scalePct}
                onChange={(e) =>
                  setPrintOptions((p) => ({
                    ...p,
                    scalePct: parseInt(e.target.value, 10) || 100,
                  }))
                }
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
              >
                <option value={80}>80 %</option>
                <option value={85}>85 %</option>
                <option value={90}>90 %</option>
                <option value={95}>95 %</option>
                <option value={100}>100 % (Réel)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Couleur
              </label>
              <select
                value={printOptions.colorMode}
                onChange={(e) =>
                  setPrintOptions((p) => ({
                    ...p,
                    colorMode: e.target.value as ColorMode,
                  }))
                }
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
              >
                <option value="color">Couleur (Logo Sonelgaz)</option>
                <option value="grayscale">Noir &amp; Blanc</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              {printableBlobUrl && (
                <a
                  href={printableBlobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full text-center px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg whitespace-nowrap"
                >
                  Onglet imprimable
                </a>
              )}
            </div>
          </div>
        )}

        {exportError && (
          <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            {exportError}
          </div>
        )}
      </div>

      {/* Modal Dialogue d'impression si bloqué par le cadre d'aperçu */}
      {showPrinterModal && (
        <div className="no-print fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="h-4 w-4 text-blue-700" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Ouvrir les options de l&apos;imprimante
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPrinterModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs text-slate-700">
              <p className="leading-relaxed">
                Le cadre d&apos;aperçu web bloque l&apos;ouverture automatique de la fenêtre d&apos;impression par script. Utilisez l&apos;une des <strong>3 méthodes immédiates</strong> ci-dessous pour afficher toutes les options de votre imprimante :
              </p>

              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
                <div className="font-semibold text-blue-950">
                  1. Raccourci clavier immédiat : <kbd className="px-1.5 py-0.5 bg-white border border-blue-300 rounded font-mono text-[11px]">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-white border border-blue-300 rounded font-mono text-[11px]">P</kbd>
                </div>
                <p className="text-blue-900">
                  Ou faites un <strong>clic droit</strong> sur la fiche ci-dessous puis choisissez <strong>Imprimer...</strong> — la boîte de dialogue complète de votre imprimante s&apos;affichera immédiatement.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                {isPreparingPdfLink ? (
                  <div className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Préparation du PDF imprimable...
                  </div>
                ) : pdfBlobUrl ? (
                  <a
                    href={pdfBlobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
                  >
                    <FileText className="h-4 w-4" />
                    2. Ouvrir le PDF (avec bouton Imprimer)
                  </a>
                ) : null}

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isExportingPdf}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  3. Télécharger le PDF
                </button>
              </div>

              <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                <span>Pour imprimer en 1 clic sans blocage :</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyAppUrl}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                  >
                    {copiedUrl ? <Check className="h-3 w-3 text-emerald-700" /> : <Copy className="h-3 w-3" />}
                    {copiedUrl ? 'Lien copié' : 'Copier le lien'}
                  </button>
                  <a
                    href={typeof window !== 'undefined' ? window.location.href : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Ouvrir hors aperçu
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable A4 Sheet */}
      <div
        ref={sheetRef}
        style={{
          filter:
            printOptions.colorMode === 'grayscale'
              ? 'grayscale(100%)'
              : undefined,
        }}
        className={`print-sheet bg-white border border-slate-200 rounded-lg p-8 lg:p-10 mx-auto text-slate-950 shadow-xs ${
          printOptions.orientation === 'landscape'
            ? 'max-w-[1060px]'
            : 'max-w-[920px]'
        }`}
      >
        {/* Official Sonelgaz Header with Logo — identical placement to ATTACHEMENT_OTMANI & PDFs */}
        {docType !== 'dechets' && (
          <div className="border-b-2 border-slate-900 pb-3 mb-5 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <img
                src={LOGO_URL}
                alt="Logo Sonelgaz"
                className="h-14 w-auto object-contain shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm sm:text-base font-bold text-cyan-700 leading-tight">
                  الشركة الجزائرية للكهرباء والغاز-التوزيع
                </div>
                <div className="text-[11px] font-bold text-cyan-700 leading-tight">
                  {settings.organisme}
                </div>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-3 border-t border-cyan-200 pt-0.5 text-[10px] text-cyan-700">
                  <span className="font-medium">{settings.direction}</span>
                  <span className="text-slate-600 font-mono">
                    N° : {docNumber} · Année : {docYear}
                  </span>
                </div>
              </div>
            </div>

            {docType !== 'delai' && docType !== 'pv' && (
              <div className="text-right text-[11px] leading-snug shrink-0">
                <div className="font-medium text-slate-900">
                  Concession de Distribution de {wilayaLabel}
                </div>
                <div className="text-slate-700">{settings.division}</div>
                <div className="mt-1 font-mono text-[10px] text-slate-600">
                  Page : 1/1
                </div>
              </div>
            )}
          </div>
        )}

        {/* Generic Identification section for Devis, AFT, DGD (sans prix) */}
        {(docType === 'devis' || docType === 'aft' || docType === 'dgd') && (
          <>
            <div className="my-5 text-center">
              <h2 className="text-lg font-bold tracking-wide uppercase underline underline-offset-4">
                {docType === 'devis' && "FICHE D'ETUDE — CONSISTANCES PHYSIQUES"}
                {docType === 'aft' && 'AVIS DE FIN DES TRAVAUX ELECTRICITE'}
                {docType === 'dgd' && 'DECOMPTE GENERAL DEFINITIF'}
              </h2>
            </div>

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

        {/* FEUILLE D'ATTACHEMENT — Format identique ATTACHEMENT_OTMANI_8c6f7aa5.pdf & 6614_6 */}
        {docType === 'attachement' && (
          <div className="space-y-4">
            <h2 className="text-center text-xl font-bold tracking-wide uppercase my-4">
              FEUILLE D&apos;ATTACHEMENT
            </h2>

            <div className="text-xs space-y-1">
              <div className="text-sm font-bold">
                Affaire : {affaire.objet}
              </div>
              <div>
                Commande ou Lettre de commande N° :{' '}
                <span className="font-mono">
                  {affaire.marcheNumero || '—'}
                  {affaire.marcheDate
                    ? ` du ${formatDateFR(affaire.marcheDate)}`
                    : ''}
                </span>
              </div>
              <div>
                ODS N° : <span className="font-mono">{affaire.odsNumero || '—'}</span>
              </div>
              {(affaire.consultationNumero || affaire.pvCopeoNumero) && (
                <div>
                  Consultation N° : {affaire.consultationNumero || '—'} et PV COPEO N° :{' '}
                  {affaire.pvCopeoNumero || '—'}
                </div>
              )}
              <div className="pt-2 text-sm font-bold uppercase">
                ENTREPRISE : {affaire.entreprise || '—'}
              </div>
            </div>

            {!selectedSit ? (
              <p className="text-xs text-slate-600 italic">
                Aucune feuille d&apos;attachement enregistrée.
              </p>
            ) : (
              <>
                <table className="w-full border-collapse border border-slate-900 text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 font-bold">
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

                {/* Emargement exact selon PDF */}
                <div className="pt-10 print-avoid-break text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span>Emargement : (Nom et signature)</span>
                    <span>
                      Date : <span className="font-mono">{formatDateFR(selectedSit.date)}</span>
                    </span>
                  </div>
                  <table className="w-full border-collapse border border-slate-900 text-xs">
                    <thead>
                      <tr>
                        <th className="border border-slate-900 py-1.5 px-2 text-left font-normal w-1/3">
                          Surveillant des Travaux
                        </th>
                        <th className="border border-slate-900 py-1.5 px-2 text-left font-normal w-1/3">
                          Chef de Service
                        </th>
                        <th className="border border-slate-900 py-1.5 px-2 text-left font-normal w-1/3">
                          Responsable de l&apos;entreprise
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-slate-900 py-6 px-2 align-top">
                          {affaire.signatories.surveillantTravaux}
                        </td>
                        <td className="border border-slate-900 py-6 px-2 align-top">
                          {affaire.signatories.chefService}
                        </td>
                        <td className="border border-slate-900 py-6 px-2 align-top font-medium">
                          {affaire.entreprise}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
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
            <div className="text-xs space-y-1 mb-6">
              <div>Concession de Distribution de {wilayaLabel}</div>
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
                A {wilayaLabel}, le{' '}
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

        {/* FICHE DE CONTROLE MATERIEL ELECTRICITE */}
        {docType === 'materiel' && (
          <div className="space-y-4 text-slate-950">
            <div className="my-4 text-center">
              <h2 className="text-lg font-bold tracking-wide uppercase underline underline-offset-4">
                FICHE DE CONTROLE MATERIEL ELECTRICITE
              </h2>
            </div>

            <div className="text-xs space-y-1 mb-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                <div>
                  <span className="font-semibold">Affaire N° :</span>{' '}
                  <span className="font-mono">{affaire.numeroAffaire}</span>
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
                <div className="col-span-2">
                  <span className="font-semibold">Objet :</span>{' '}
                  <span className="font-semibold">{affaire.objet}</span>
                </div>
                <div>
                  <span className="font-semibold">Lieux des Travaux :</span>{' '}
                  {affaire.lieuTravaux || `${affaire.commune} / ${affaire.wilaya}`}
                </div>
                <div>
                  <span className="font-semibold">Entreprise :</span>{' '}
                  <span className="font-bold uppercase">
                    {affaire.entreprise || '—'}
                  </span>
                </div>
              </div>
            </div>

            <table className="w-full border-collapse border border-slate-900 text-[11px]">
              <thead>
                <tr className="bg-slate-100 font-bold">
                  <th className="border border-slate-900 py-1.5 px-1.5 text-center w-9">
                    N°
                  </th>
                  <th className="border border-slate-900 py-1.5 px-2 text-left">
                    Désignation du matériel
                  </th>
                  <th className="border border-slate-900 py-1.5 px-2 text-left">
                    Fabricant / Distributeur
                  </th>
                  <th className="border border-slate-900 py-1.5 px-2 text-left">
                    N° Facture d&apos;achat
                  </th>
                  <th className="border border-slate-900 py-1.5 px-2 text-center w-24">
                    Date facture
                  </th>
                  <th className="border border-slate-900 py-1.5 px-2.5 text-left w-36">
                    Types de contrôle
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({
                  length: Math.max(6, affaire.materialControls.length),
                }).map((_, idx) => {
                  const mc = affaire.materialControls[idx];
                  const renderCheckSquare = (checked: boolean, isEmptyRow = false) => (
                    <span
                      style={{
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact',
                      }}
                      className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-[2px] border-[1.5px] shrink-0 ${
                        checked
                          ? 'bg-blue-700 border-blue-700 text-white'
                          : isEmptyRow
                            ? 'bg-white border-slate-500'
                            : 'bg-white border-slate-800'
                      }`}
                    >
                      {checked && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                    </span>
                  );

                  const renderStackedControls = (
                    visuel: boolean,
                    marquage: boolean,
                    dimensionnel: boolean,
                    isEmptyRow = false
                  ) => (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        {renderCheckSquare(visuel, isEmptyRow)}
                        <span className="text-[10px] leading-none">Visuel</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {renderCheckSquare(marquage, isEmptyRow)}
                        <span className="text-[10px] leading-none">Marquage</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {renderCheckSquare(dimensionnel, isEmptyRow)}
                        <span className="text-[10px] leading-none">Dimensionnel</span>
                      </div>
                    </div>
                  );

                  if (!mc) {
                    return (
                      <tr key={`empty-mc-${idx}`}>
                        <td className="border border-slate-900 py-1.5 px-1.5 text-center text-slate-400 num-cell align-middle">
                          {idx + 1}
                        </td>
                        <td className="border border-slate-900 py-1.5 px-2">&nbsp;</td>
                        <td className="border border-slate-900 py-1.5 px-2">&nbsp;</td>
                        <td className="border border-slate-900 py-1.5 px-2">&nbsp;</td>
                        <td className="border border-slate-900 py-1.5 px-2">&nbsp;</td>
                        <td className="border border-slate-900 py-1.5 px-2.5 align-middle">
                          {renderStackedControls(false, false, false, true)}
                        </td>
                      </tr>
                    );
                  }
                  const fabDist = [mc.fabricant, mc.distributeur]
                    .filter((v, i, arr) => v && (i === 0 || v !== arr[0]))
                    .join(' / ');
                  return (
                    <tr key={mc.id}>
                      <td className="border border-slate-900 py-1.5 px-1.5 text-center num-cell align-middle">
                        {idx + 1}
                      </td>
                      <td className="border border-slate-900 py-1.5 px-2 font-medium align-middle">
                        {mc.designation}
                      </td>
                      <td className="border border-slate-900 py-1.5 px-2 align-middle">
                        {fabDist || '—'}
                      </td>
                      <td className="border border-slate-900 py-1.5 px-2 font-mono align-middle">
                        {mc.factureAchat || '—'}
                      </td>
                      <td className="border border-slate-900 py-1.5 px-2 text-center font-mono align-middle">
                        {formatDateFR(mc.dateFacture)}
                      </td>
                      <td className="border border-slate-900 py-1.5 px-2.5 align-middle">
                        {renderStackedControls(
                          mc.controleVisuel,
                          mc.controleMarquage,
                          mc.controleDimensionnel
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="pt-8 print-avoid-break">
              <table className="w-full border-collapse border border-slate-900 text-xs text-center">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-900 py-1.5 px-2 w-1/4">
                      L&apos;Entreprise
                    </th>
                    <th className="border border-slate-900 py-1.5 px-2 w-1/4">
                      Le Surveillant Travaux
                    </th>
                    <th className="border border-slate-900 py-1.5 px-2 w-1/4">
                      Le Contrôleur Travaux
                    </th>
                    <th className="border border-slate-900 py-1.5 px-2 w-1/4">
                      Le Chef de Service
                    </th>
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
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ANNEXE 1 : FICHE DE DEPOSE ET DE STOCKAGE DES DECHETS — Format identique D_charge_d10e57e8.pdf */}
        {docType === 'dechets' && (
          <div className="space-y-3 text-slate-950">
            {/* Top Logo + Arabic & French Title */}
            <div className="flex items-center gap-4 pb-2">
              <img
                src={LOGO_URL}
                alt="Logo Sonelgaz"
                className="h-12 w-auto object-contain shrink-0"
              />
              <div className="flex-1 text-center leading-snug">
                <div className="text-base font-bold">
                  الشركة الجزائرية للكهرباء والغاز-التوزيع
                </div>
                <div className="text-sm font-bold">
                  Société algérienne de l&apos;électricité et du gaz – Distribution
                </div>
              </div>
            </div>

            <div className="text-[11px] leading-snug space-y-0.5">
              <div>
                Annexe 1 : Fiche de dépose et stockage des déchets (par l&apos;entreprise sous traitante)
              </div>
              <div>1- Electricité et Gaz</div>
              <div className="flex items-center justify-between gap-4">
                <span>Région de Distribution Oran</span>
                <span className="pr-8">
                  Date :{' '}
                  <span className="font-mono">
                    {affaire.dechargeDate
                      ? formatDateFR(affaire.dechargeDate)
                      : '...........'}
                  </span>
                </span>
              </div>
              <div>Concession/Direction de Distribution {wilayaLabel}</div>
            </div>

            <div className="text-center py-2">
              <div className="text-sm font-bold uppercase tracking-wide">
                FICHE DE DEPOSE ET DE STOCKAGE DES DECHETS
              </div>
              <div className="text-xs font-bold">
                (par l&apos;entreprise sous traitante)
              </div>
            </div>

            <div className="text-xs font-medium pb-1">
              DECHARGE N°{' '}
              <span className="font-mono px-2">
                {affaire.dechargeNumero || '      '}
              </span>{' '}
              /20
            </div>

            <table className="w-full border-collapse border border-slate-950 text-[9.5px]">
              <thead>
                <tr className="text-center font-bold bg-white">
                  <th className="border border-slate-950 py-1.5 px-1 w-9">N° Ordre</th>
                  <th className="border border-slate-950 py-1.5 px-1.5 min-w-[110px]">
                    Intitulé de l&apos;affaire
                  </th>
                  <th className="border border-slate-950 py-1.5 px-1">Code GDO</th>
                  <th className="border border-slate-950 py-1.5 px-1">AP</th>
                  <th className="border border-slate-950 py-1.5 px-1 w-16">
                    N° date 3° tranche de commande
                  </th>
                  <th className="border border-slate-950 py-1.5 px-1">ETP</th>
                  <th className="border border-slate-950 py-1.5 px-1.5 min-w-[120px]">
                    Désignation du Matériel
                  </th>
                  <th className="border border-slate-950 py-1.5 px-1 w-12">
                    Unité déposée
                  </th>
                  <th className="border border-slate-950 py-1.5 px-1 w-12">
                    Unité réintégrée
                  </th>
                  <th className="border border-slate-950 py-1.5 px-1 w-12">
                    Longueur ML
                  </th>
                  <th className="border border-slate-950 py-1.5 px-1 w-14">
                    Longueur Poids Equivalent Kg
                  </th>
                  <th className="border border-slate-950 py-1.5 px-1 w-14">
                    Poids Pesé réintégré kg
                  </th>
                  <th className="border border-slate-950 py-1.5 px-1 w-16">
                    Date d&apos;entrée en stock
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({
                  length: Math.max(4, affaire.wasteDeposits.length),
                }).map((_, idx) => {
                  const wd = affaire.wasteDeposits[idx];
                  if (!wd) {
                    return (
                      <tr key={`empty-wd-${idx}`} className="h-9">
                        {Array.from({ length: 13 }).map((__, colIdx) => (
                          <td
                            key={colIdx}
                            className="border border-slate-950 py-1.5 px-1"
                          >
                            &nbsp;
                          </td>
                        ))}
                      </tr>
                    );
                  }
                  const commandeFallback = affaire.marcheNumero
                    ? `${affaire.marcheNumero}${affaire.marcheDate ? ` du ${formatDateFR(affaire.marcheDate)}` : ''}`
                    : '';
                  return (
                    <tr key={wd.id}>
                      <td className="border border-slate-950 py-1.5 px-1 text-center num-cell">
                        {idx + 1}
                      </td>
                      <td className="border border-slate-950 py-1.5 px-1.5">
                        {wd.intituleAffaire ?? affaire.objet}
                      </td>
                      <td className="border border-slate-950 py-1.5 px-1 font-mono">
                        {wd.codeGdo ?? affaire.numeroAffaire}
                      </td>
                      <td className="border border-slate-950 py-1.5 px-1 font-mono">
                        {wd.ap ?? affaire.imputation}
                      </td>
                      <td className="border border-slate-950 py-1.5 px-1 font-mono">
                        {wd.commandeRef ?? commandeFallback}
                      </td>
                      <td className="border border-slate-950 py-1.5 px-1">
                        {wd.etp ?? affaire.entreprise}
                      </td>
                      <td className="border border-slate-950 py-1.5 px-1.5 font-medium">
                        {wd.designation}
                      </td>
                      <td className="border border-slate-950 py-1.5 px-1 text-right num-cell">
                        {wd.uniteDeposee > 0 ? formatNumber(wd.uniteDeposee, 0) : ''}
                      </td>
                      <td className="border border-slate-950 py-1.5 px-1 text-right num-cell">
                        {wd.uniteReintegree > 0 ? formatNumber(wd.uniteReintegree, 0) : ''}
                      </td>
                      <td className="border border-slate-950 py-1.5 px-1 text-right num-cell">
                        {wd.longueurML > 0 ? formatNumber(wd.longueurML, 0) : ''}
                      </td>
                      <td className="border border-slate-950 py-1.5 px-1 text-right num-cell">
                        {(wd.poidsEquivalentKg || 0) > 0
                          ? formatNumber(wd.poidsEquivalentKg || 0, 1)
                          : ''}
                      </td>
                      <td className="border border-slate-950 py-1.5 px-1 text-right num-cell">
                        {wd.poidsKg > 0 ? formatNumber(wd.poidsKg, 1) : ''}
                      </td>
                      <td className="border border-slate-950 py-1.5 px-1 text-center font-mono">
                        {formatDateFR(wd.dateDepot)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Signature block exact selon D_charge_d10e57e8.pdf */}
            <div className="pt-10 print-avoid-break">
              <table className="w-full border-collapse border border-slate-950 text-[10px]">
                <tbody>
                  <tr>
                    <td className="border border-slate-950 px-2 pt-1.5 pb-12 align-top w-1/3">
                      L&apos;agent chargé du stock
                    </td>
                    <td className="border border-slate-950 px-2 pt-1.5 pb-12 align-top w-1/3">
                      <div>Le surveillant de travaux</div>
                      {affaire.signatories.surveillantTravaux && (
                        <div className="mt-2 font-medium">
                          {affaire.signatories.surveillantTravaux}
                        </div>
                      )}
                    </td>
                    <td className="border border-slate-950 px-2 pt-1.5 pb-12 align-top w-1/3">
                      <div>L&apos;Entreprise</div>
                      {affaire.entreprise && (
                        <div className="mt-2 font-medium">{affaire.entreprise}</div>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Generic 5-Column Signatures Grid for Devis, AFT, DGD */}
        {(docType === 'devis' || docType === 'aft' || docType === 'dgd') && (
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
