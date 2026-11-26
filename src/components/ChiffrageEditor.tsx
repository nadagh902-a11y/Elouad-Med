import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  ChevronDown,
  Download,
  PenLine,
  Plus,
  Printer,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  Affaire,
  CatalogItem,
  WorkChapter,
  WorkItem,
  WorkUnit,
} from '../types/project';
import {
  computeAffairePhysicalStats,
  exportAffaireToCSV,
  formatNumber,
} from '../utils/formatters';

interface ChiffrageEditorProps {
  affaire: Affaire;
  catalog: CatalogItem[];
  onChange: (updated: Affaire) => void;
  onAddCatalogItem?: (item: CatalogItem) => void;
  onPrint?: () => void;
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

interface DropdownAnchor {
  itemId: string;
  top: number;
  left: number;
  width: number;
  openUpward: boolean;
  showAllChapters: boolean;
  filterActive: boolean;
}

export const ChiffrageEditor: React.FC<ChiffrageEditorProps> = ({
  affaire,
  catalog,
  onChange,
  onAddCatalogItem,
  onPrint,
}) => {
  const [chapterFilter, setChapterFilter] = useState<'ALL' | WorkChapter>('ALL');
  const [showDetailedColumns, setShowDetailedColumns] = useState(true);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catSearch, setCatSearch] = useState('');
  const [catChapter, setCatChapter] = useState<'ALL' | WorkChapter>('ALL');
  const [selectedCatIds, setSelectedCatIds] = useState<Record<string, boolean>>({});

  // Manual article modal state
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualTargetItemId, setManualTargetItemId] = useState<string | null>(null);
  const [manualChapitre, setManualChapitre] = useState<WorkChapter>('MTA');
  const [manualRcnTp, setManualRcnTp] = useState<'RCN' | 'TPR'>('RCN');
  const [manualFamille, setManualFamille] = useState('');
  const [manualNature, setManualNature] = useState('');
  const [manualDesignation, setManualDesignation] = useState('');
  const [manualUnite, setManualUnite] = useState<WorkUnit>('U');
  const [manualQteFourn, setManualQteFourn] = useState<number>(1);
  const [manualQteMO, setManualQteMO] = useState<number>(1);
  const [manualSaveToCatalog, setManualSaveToCatalog] = useState<boolean>(true);
  const [manualError, setManualError] = useState<string | null>(null);

  // Inline designation picker state (portal-positioned to prevent table overflow clipping)
  const [dropdown, setDropdown] = useState<DropdownAnchor | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const inputRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!dropdown) return;

    const updatePosition = () => {
      const el = inputRefs.current[dropdown.itemId];
      if (!el) {
        setDropdown(null);
        return;
      }
      const rect = el.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < 290 && rect.top > 290;
      setDropdown((prev) =>
        prev
          ? {
              ...prev,
              top: openUpward ? rect.top - 4 : rect.bottom + 4,
              left: Math.max(12, Math.min(rect.left, window.innerWidth - Math.max(rect.width, 460) - 12)),
              width: Math.max(rect.width, 440),
              openUpward,
            }
          : null
      );
    };

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const anchorEl = inputRefs.current[dropdown.itemId];
      if (
        dropdownRef.current?.contains(target) ||
        anchorEl?.contains(target)
      ) {
        return;
      }
      setDropdown(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDropdown(null);
      }
    };

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dropdown?.itemId]);

  const openDesignationDropdown = (
    itemId: string,
    options?: { filterActive?: boolean; showAllChapters?: boolean }
  ) => {
    const el = inputRefs.current[itemId];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < 290 && rect.top > 290;
    const width = Math.max(rect.width, 440);
    setDropdown({
      itemId,
      top: openUpward ? rect.top - 4 : rect.bottom + 4,
      left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
      width,
      openUpward,
      showAllChapters: options?.showAllChapters ?? true,
      filterActive: options?.filterActive ?? false,
    });
  };

  const stats = useMemo(() => computeAffairePhysicalStats(affaire), [affaire]);

  const displayedItems = useMemo(() => {
    if (chapterFilter === 'ALL') return affaire.items;
    return affaire.items.filter((i) => i.chapitre === chapterFilter);
  }, [affaire.items, chapterFilter]);

  const filteredCatalog = useMemo(() => {
    const q = catSearch.trim().toLowerCase();
    return catalog.filter((c) => {
      if (catChapter !== 'ALL' && c.chapitre !== catChapter) return false;
      if (!q) return true;
      return (
        c.designation.toLowerCase().includes(q) ||
        c.famille.toLowerCase().includes(q) ||
        c.natureOuvrage.toLowerCase().includes(q)
      );
    });
  }, [catalog, catSearch, catChapter]);

  const activeDropdownItem = useMemo(
    () => (dropdown ? affaire.items.find((it) => it.id === dropdown.itemId) || null : null),
    [dropdown, affaire.items]
  );

  const inlineCatalogChoices = useMemo(() => {
    if (!dropdown || !activeDropdownItem) return [];
    const q = dropdown.filterActive
      ? activeDropdownItem.designation.trim().toLowerCase()
      : '';

    const matching = catalog.filter((c) => {
      if (!dropdown.showAllChapters && c.chapitre !== activeDropdownItem.chapitre) {
        return false;
      }
      if (!q) return true;
      return (
        c.designation.toLowerCase().includes(q) ||
        c.famille.toLowerCase().includes(q) ||
        c.natureOuvrage.toLowerCase().includes(q) ||
        c.chapitre.toLowerCase().includes(q)
      );
    });

    // Prioritize items matching the row's current chapter first
    return [...matching].sort((a, b) => {
      const aMatch = a.chapitre === activeDropdownItem.chapitre ? 0 : 1;
      const bMatch = b.chapitre === activeDropdownItem.chapitre ? 0 : 1;
      return aMatch - bMatch;
    });
  }, [catalog, dropdown, activeDropdownItem]);

  const chapterSummary = useMemo(() => {
    const map = new Map<string, { count: number; totalML: number; totalOther: number }>();
    for (const item of affaire.items) {
      const entry = map.get(item.chapitre) || { count: 0, totalML: 0, totalOther: 0 };
      entry.count++;
      const q = Math.max(item.qteDevisFourn || 0, item.qteDevisMO || 0);
      if (item.unite === 'ML') entry.totalML += q;
      else entry.totalOther += q;
      map.set(item.chapitre, entry);
    }
    return Array.from(map.entries());
  }, [affaire.items]);

  const updateItem = (itemId: string, patch: Partial<WorkItem>) => {
    onChange({
      ...affaire,
      items: affaire.items.map((it) =>
        it.id === itemId ? { ...it, ...patch } : it
      ),
    });
  };

  const applyCatalogChoiceToRow = (itemId: string, choice: CatalogItem) => {
    updateItem(itemId, {
      chapitre: choice.chapitre,
      rcnTp: choice.rcnTp,
      famille: choice.famille,
      natureOuvrage: choice.natureOuvrage,
      designation: choice.designation,
      unite: choice.unite,
    });
    setDropdown(null);
  };

  const openManualModal = (prefillItem?: WorkItem, prefillText?: string) => {
    setDropdown(null);
    setManualError(null);
    if (prefillItem) {
      setManualTargetItemId(prefillItem.id);
      setManualChapitre(prefillItem.chapitre);
      setManualRcnTp(prefillItem.rcnTp);
      setManualFamille(prefillItem.famille);
      setManualNature(prefillItem.natureOuvrage);
      setManualDesignation(prefillText ?? prefillItem.designation);
      setManualUnite(prefillItem.unite);
      setManualQteFourn(prefillItem.qteDevisFourn);
      setManualQteMO(prefillItem.qteDevisMO);
    } else {
      setManualTargetItemId(null);
      setManualChapitre(chapterFilter === 'ALL' ? 'MTA' : chapterFilter);
      setManualRcnTp('RCN');
      setManualFamille('');
      setManualNature('');
      setManualDesignation(prefillText || '');
      setManualUnite('U');
      setManualQteFourn(1);
      setManualQteMO(1);
    }
    setManualSaveToCatalog(Boolean(onAddCatalogItem));
    setShowManualModal(true);
  };

  const handleSaveManualArticle = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDesignation = manualDesignation.trim();
    if (!cleanDesignation) {
      setManualError('Veuillez saisir la désignation des travaux / ouvrage.');
      return;
    }

    const cleanFamille = manualFamille.trim() || 'Article manuel';
    const cleanNature = manualNature.trim();

    if (manualTargetItemId) {
      updateItem(manualTargetItemId, {
        chapitre: manualChapitre,
        rcnTp: manualRcnTp,
        famille: cleanFamille,
        natureOuvrage: cleanNature,
        designation: cleanDesignation,
        unite: manualUnite,
        qteDevisFourn: manualQteFourn,
        qteDevisMO: manualQteMO,
      });
    } else {
      const newItem: WorkItem = {
        id: 'it-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        chapitre: manualChapitre,
        rcnTp: manualRcnTp,
        famille: cleanFamille,
        natureOuvrage: cleanNature,
        designation: cleanDesignation,
        unite: manualUnite,
        qteDevisFourn: manualQteFourn,
        qteDevisMO: manualQteMO,
        puFourniture: 0,
        puMainOeuvre: 0,
      };
      onChange({
        ...affaire,
        items: [...affaire.items, newItem],
      });
    }

    if (manualSaveToCatalog && onAddCatalogItem) {
      const alreadyExists = catalog.some(
        (c) =>
          c.chapitre === manualChapitre &&
          c.designation.trim().toLowerCase() === cleanDesignation.toLowerCase()
      );
      if (!alreadyExists) {
        onAddCatalogItem({
          id: 'cat-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          chapitre: manualChapitre,
          rcnTp: manualRcnTp,
          famille: cleanFamille,
          natureOuvrage: cleanNature,
          designation: cleanDesignation,
          unite: manualUnite,
          puFourniture: 0,
          puMainOeuvre: 0,
        });
      }
    }

    setShowManualModal(false);
    setManualTargetItemId(null);
  };

  const addEmptyItem = () => {
    const newItem: WorkItem = {
      id: 'it-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      chapitre: chapterFilter === 'ALL' ? 'MTA' : chapterFilter,
      rcnTp: 'RCN',
      famille: 'Raccordement HTA',
      natureOuvrage: '',
      designation: '',
      unite: 'U',
      qteDevisFourn: 1,
      qteDevisMO: 1,
      puFourniture: 0,
      puMainOeuvre: 0,
    };
    onChange({
      ...affaire,
      items: [...affaire.items, newItem],
    });
  };

  const removeItem = (itemId: string) => {
    onChange({
      ...affaire,
      items: affaire.items.filter((it) => it.id !== itemId),
    });
  };

  const moveItem = (itemId: string, direction: -1 | 1) => {
    const idx = affaire.items.findIndex((it) => it.id === itemId);
    if (idx < 0) return;
    const target = idx + direction;
    if (target < 0 || target >= affaire.items.length) return;
    const next = [...affaire.items];
    const [removed] = next.splice(idx, 1);
    next.splice(target, 0, removed);
    onChange({ ...affaire, items: next });
  };

  const handleInsertCatalogItems = () => {
    const picked = catalog.filter((c) => selectedCatIds[c.id]);
    if (picked.length === 0) return;
    const created: WorkItem[] = picked.map((c, idx) => ({
      id: `it-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
      chapitre: c.chapitre,
      rcnTp: c.rcnTp,
      famille: c.famille,
      natureOuvrage: c.natureOuvrage,
      designation: c.designation,
      unite: c.unite,
      qteDevisFourn: c.rcnTp === 'TPR' && c.famille.includes('Dépose') ? 0 : 1,
      qteDevisMO: 1,
      puFourniture: 0,
      puMainOeuvre: 0,
    }));
    onChange({
      ...affaire,
      items: [...affaire.items, ...created],
    });
    setSelectedCatIds({});
    setShowCatalogModal(false);
  };

  const selectedCount = Object.values(selectedCatIds).filter(Boolean).length;

  return (
    <div className="space-y-5">
      {/* Action Toolbar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setChapterFilter('ALL')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                chapterFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tous ({affaire.items.length})
            </button>
            {CHAPTERS.filter((ch) =>
              affaire.items.some((i) => i.chapitre === ch)
            ).map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => setChapterFilter(ch)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  chapterFilter === ch
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {ch}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowDetailedColumns((v) => !v)}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {showDetailedColumns
              ? 'Masquer Famille / Nature'
              : 'Afficher Famille / Nature'}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onPrint && (
            <button
              type="button"
              onClick={onPrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 text-blue-700" />
              Imprimer Devis
            </button>
          )}
          <button
            type="button"
            onClick={() => exportAffaireToCSV(affaire)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            Exporter Excel (CSV)
          </button>
          <button
            type="button"
            onClick={() => setShowCatalogModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Ajouter depuis Bibliothèque
          </button>
          <button
            type="button"
            onClick={() => openManualModal()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <PenLine className="h-3.5 w-3.5" />
            Ajouter article manuellement
          </button>
          <button
            type="button"
            onClick={addEmptyItem}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Nouvelle ligne
          </button>
        </div>
      </div>

      {/* Consistances Quantitatives Table (Sans Prix) */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {displayedItems.length === 0 ? (
          <div className="py-12 px-6 text-center">
            <p className="text-sm font-medium text-slate-900">
              Aucun poste dans cette fiche de consistance / devis quantitatif.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Ajoutez des ouvrages depuis la Bibliothèque ou saisissez un article manuellement.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowCatalogModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 cursor-pointer"
              >
                <BookOpen className="h-4 w-4" />
                Ouvrir la Bibliothèque
              </button>
              <button
                type="button"
                onClick={() => openManualModal()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 cursor-pointer"
              >
                <PenLine className="h-4 w-4" />
                Ajouter article manuellement
              </button>
              <button
                type="button"
                onClick={addEmptyItem}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Ajouter une ligne
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                  <th className="py-2.5 px-2.5 min-w-[40px] w-10 text-center">#</th>
                  <th className="py-2.5 px-2 min-w-[104px] w-28">Chapitre</th>
                  {showDetailedColumns && (
                    <>
                      <th className="py-2.5 px-2 min-w-[80px] w-20">RCN / TP</th>
                      <th className="py-2.5 px-2 min-w-[160px]">Famille / Nature d&apos;ouvrage</th>
                    </>
                  )}
                  <th className="py-2.5 px-2 min-w-[280px]">
                    <div className="flex items-center justify-between gap-2">
                      <span>Désignation des Travaux / Ouvrage</span>
                      <button
                        type="button"
                        onClick={() => openManualModal()}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 cursor-pointer whitespace-nowrap"
                      >
                        <Plus className="h-3 w-3" />
                        Article manuel
                      </button>
                    </div>
                  </th>
                  <th className="py-2.5 px-2 min-w-[96px] w-24 text-center">Unité</th>
                  <th className="py-2.5 px-2 min-w-[132px] w-32 text-right">Qté Devis Fourn.</th>
                  <th className="py-2.5 px-2 min-w-[132px] w-32 text-right">Qté Devis M.O.</th>
                  <th className="py-2.5 px-3 min-w-[116px] w-28 text-right">Réalisé Cumulé</th>
                  <th className="py-2.5 px-2 min-w-[92px] w-24 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {displayedItems.map((item, idx) => {
                  const cum = stats.cumul[item.id] || { qteFourn: 0, qteMO: 0 };
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      <td className="py-2 px-2.5 text-center num-cell text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-2">
                        <select
                          value={item.chapitre}
                          onChange={(e) =>
                            updateItem(item.id, {
                              chapitre: e.target.value as WorkChapter,
                            })
                          }
                          className="w-full px-1.5 py-1 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-blue-600"
                        >
                          {CHAPTERS.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </td>
                      {showDetailedColumns && (
                        <>
                          <td className="py-2 px-2">
                            <select
                              value={item.rcnTp}
                              onChange={(e) =>
                                updateItem(item.id, {
                                  rcnTp: e.target.value as 'TPR' | 'RCN',
                                })
                              }
                              className="w-full px-1.5 py-1 text-xs bg-white border border-slate-200 rounded font-mono focus:outline-none focus:border-blue-600"
                            >
                              <option value="RCN">RCN</option>
                              <option value="TPR">TPR</option>
                            </select>
                          </td>
                          <td className="py-2 px-2 space-y-1">
                            <input
                              type="text"
                              value={item.famille}
                              placeholder="Famille"
                              onChange={(e) =>
                                updateItem(item.id, { famille: e.target.value })
                              }
                              className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-blue-600"
                            />
                            <input
                              type="text"
                              value={item.natureOuvrage}
                              placeholder="Nature d'ouvrage"
                              onChange={(e) =>
                                updateItem(item.id, {
                                  natureOuvrage: e.target.value,
                                })
                              }
                              className="w-full px-2 py-1 text-[11px] text-slate-600 bg-slate-50/70 border border-slate-200 rounded focus:outline-none focus:border-blue-600"
                            />
                          </td>
                        </>
                      )}
                      <td className="py-2 px-2">
                        <div
                          ref={(el) => {
                            inputRefs.current[item.id] = el;
                          }}
                          className="relative flex items-center"
                        >
                          <input
                            type="text"
                            value={item.designation}
                            placeholder="Saisir ou choisir un ouvrage..."
                            onFocus={() =>
                              openDesignationDropdown(item.id, {
                                filterActive: item.designation.trim().length > 0,
                                showAllChapters: true,
                              })
                            }
                            onChange={(e) => {
                              updateItem(item.id, { designation: e.target.value });
                              openDesignationDropdown(item.id, {
                                filterActive: true,
                                showAllChapters: true,
                              });
                            }}
                            className="w-full pl-2.5 pr-8 py-1.5 text-xs font-medium text-slate-900 bg-white border border-slate-200 rounded focus:outline-none focus:border-blue-600"
                          />
                          <button
                            type="button"
                            title="Choisir une désignation d'ouvrage"
                            onClick={() => {
                              if (dropdown?.itemId === item.id && !dropdown.filterActive) {
                                setDropdown(null);
                              } else {
                                openDesignationDropdown(item.id, {
                                  filterActive: false,
                                  showAllChapters: true,
                                });
                              }
                            }}
                            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                          >
                            <ChevronDown
                              className={`h-3.5 w-3.5 transition-transform ${
                                dropdown?.itemId === item.id ? 'rotate-180 text-blue-700' : ''
                              }`}
                            />
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <select
                          value={item.unite}
                          onChange={(e) =>
                            updateItem(item.id, {
                              unite: e.target.value as WorkUnit,
                            })
                          }
                          className="w-full min-w-[82px] px-2 py-1.5 text-xs font-mono font-semibold text-slate-800 bg-white border border-slate-200 rounded focus:outline-none focus:border-blue-600"
                        >
                          {UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.qteDevisFourn}
                          onChange={(e) =>
                            updateItem(item.id, {
                              qteDevisFourn: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full min-w-[108px] px-2.5 py-1.5 text-right text-xs num-cell bg-white border border-slate-200 rounded focus:outline-none focus:border-blue-600"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.qteDevisMO}
                          onChange={(e) =>
                            updateItem(item.id, {
                              qteDevisMO: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full min-w-[108px] px-2.5 py-1.5 text-right text-xs num-cell bg-white border border-slate-200 rounded focus:outline-none focus:border-blue-600"
                        />
                      </td>
                      <td className="py-2 px-3 text-right num-cell text-slate-700 whitespace-nowrap">
                        {formatNumber(cum.qteFourn, 0)} / {formatNumber(cum.qteMO, 0)}
                      </td>
                      <td className="py-2 px-2 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => moveItem(item.id, -1)}
                            title="Monter"
                            className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveItem(item.id, 1)}
                            title="Descendre"
                            className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            title="Supprimer la ligne"
                            className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
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

      {/* Physical Summary Panel by Chapter & Unit */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">
            Récapitulatif des Consistances Physiques
          </h3>
          <div className="text-xs text-slate-600">
            Total Devis :{' '}
            <span className="font-semibold text-slate-900 num-cell">
              {formatNumber(stats.totalDevisML, 0)} ML
            </span>
            {' · '}
            <span className="font-semibold text-slate-900 num-cell">
              {formatNumber(stats.totalDevisUnit, 0)} Unités / Ens.
            </span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {chapterSummary.map(([chap, info]) => (
            <div
              key={chap}
              className="border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50/50"
            >
              <div className="text-xs font-semibold text-slate-800">{chap}</div>
              <div className="mt-1 text-[11px] text-slate-500 num-cell">
                {info.count} ligne{info.count > 1 ? 's' : ''}
              </div>
              <div className="mt-0.5 text-xs font-mono text-slate-700">
                {info.totalML > 0 ? `${formatNumber(info.totalML, 0)} ML` : ''}
                {info.totalML > 0 && info.totalOther > 0 ? ' · ' : ''}
                {info.totalOther > 0 ? `${formatNumber(info.totalOther, 0)} U` : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ouvrages Library Picker Modal (Sans Prix) */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Bibliothèque des Ouvrages Électriques
                </h2>
                <p className="text-xs text-slate-500">
                  Sélectionnez les postes à insérer dans le devis quantitatif / étude.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCatalogModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={catSearch}
                  onChange={(e) => setCatSearch(e.target.value)}
                  placeholder="Rechercher câble, support, tranchée, dépose..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
              <select
                value={catChapter}
                onChange={(e) =>
                  setCatChapter(e.target.value as 'ALL' | WorkChapter)
                }
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
              >
                <option value="ALL">Tous les chapitres</option>
                {CHAPTERS.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="py-2.5 px-4 w-10"></th>
                    <th className="py-2.5 px-3">Chapitre</th>
                    <th className="py-2.5 px-3">Désignation</th>
                    <th className="py-2.5 px-3">Famille / Nature</th>
                    <th className="py-2.5 px-4 text-center">Unité</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {filteredCatalog.map((c) => {
                    const checked = !!selectedCatIds[c.id];
                    return (
                      <tr
                        key={c.id}
                        onClick={() =>
                          setSelectedCatIds((prev) => ({
                            ...prev,
                            [c.id]: !prev[c.id],
                          }))
                        }
                        className={`cursor-pointer transition-colors ${
                          checked ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2.5 px-4">
                          <div
                            className={`h-4 w-4 rounded border flex items-center justify-center ${
                              checked
                                ? 'bg-blue-700 border-blue-700 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {checked && <Check className="h-3 w-3" />}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-700 whitespace-nowrap">
                          {c.chapitre} · {c.rcnTp}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">
                          {c.designation}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {c.famille} · {c.natureOuvrage}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-center text-slate-700">
                          {c.unite}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-600">
                  {selectedCount} ouvrage{selectedCount > 1 ? 's' : ''} sélectionné{selectedCount > 1 ? 's' : ''}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowCatalogModal(false);
                    openManualModal(undefined, catSearch.trim());
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 cursor-pointer"
                >
                  <PenLine className="h-3.5 w-3.5" />
                  Ajouter un article manuellement
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowCatalogModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200/60 rounded-lg cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={selectedCount === 0}
                  onClick={handleInsertCatalogItems}
                  className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-40 rounded-lg cursor-pointer"
                >
                  Insérer dans le devis
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Article Creation Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Ajouter un article manuellement
                </h2>
                <p className="text-xs text-slate-500">
                  Créez une désignation personnalisée pour cette affaire et enregistrez-la si besoin dans la bibliothèque.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManualArticle} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Désignation des Travaux / Ouvrage <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={manualDesignation}
                  onChange={(e) => setManualDesignation(e.target.value)}
                  placeholder="Ex : Pose câble souterrain HTA 1x240 mm² Alu..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Chapitre
                  </label>
                  <select
                    value={manualChapitre}
                    onChange={(e) => setManualChapitre(e.target.value as WorkChapter)}
                    className="w-full px-2.5 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                  >
                    {CHAPTERS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    RCN / TPR
                  </label>
                  <select
                    value={manualRcnTp}
                    onChange={(e) => setManualRcnTp(e.target.value as 'RCN' | 'TPR')}
                    className="w-full px-2.5 py-2 text-sm border border-slate-200 rounded-lg bg-white font-mono"
                  >
                    <option value="RCN">RCN</option>
                    <option value="TPR">TPR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Unité
                  </label>
                  <select
                    value={manualUnite}
                    onChange={(e) => setManualUnite(e.target.value as WorkUnit)}
                    className="w-full px-2.5 py-2 text-sm border border-slate-200 rounded-lg bg-white font-mono font-semibold"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Famille
                  </label>
                  <input
                    type="text"
                    value={manualFamille}
                    onChange={(e) => setManualFamille(e.target.value)}
                    placeholder="Ex : Raccordement HTA, Génie Civil..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Nature d&apos;ouvrage
                  </label>
                  <input
                    type="text"
                    value={manualNature}
                    onChange={(e) => setManualNature(e.target.value)}
                    placeholder="Ex : Réseau souterrain, Poste..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Qté Devis Fourniture
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={manualQteFourn}
                    onChange={(e) =>
                      setManualQteFourn(parseFloat(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 text-sm num-cell border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Qté Devis Main d&apos;Œuvre (M.O.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={manualQteMO}
                    onChange={(e) =>
                      setManualQteMO(parseFloat(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 text-sm num-cell border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {onAddCatalogItem && (
                <label className="flex items-center gap-2 text-xs text-slate-700 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={manualSaveToCatalog}
                    onChange={(e) => setManualSaveToCatalog(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-700"
                  />
                  Enregistrer aussi cet article dans la Bibliothèque des Ouvrages (pour les prochaines affaires)
                </label>
              )}

              {manualError && (
                <p className="text-xs font-medium text-red-600">{manualError}</p>
              )}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {manualTargetItemId ? 'Valider cet article' : 'Ajouter au devis'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inline Designation Choices Popover (Portal) */}
      {dropdown &&
        activeDropdownItem &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: dropdown.top,
              left: dropdown.left,
              width: dropdown.width,
              transform: dropdown.openUpward ? 'translateY(-100%)' : undefined,
              zIndex: 60,
            }}
            className="bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden flex flex-col max-h-80"
          >
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setDropdown((prev) =>
                      prev ? { ...prev, showAllChapters: false, filterActive: false } : null
                    )
                  }
                  className={`px-2 py-1 text-[11px] font-medium rounded cursor-pointer transition-colors ${
                    !dropdown.showAllChapters
                      ? 'bg-blue-700 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900'
                  }`}
                >
                  Chapitre {activeDropdownItem.chapitre}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDropdown((prev) =>
                      prev ? { ...prev, showAllChapters: true, filterActive: false } : null
                    )
                  }
                  className={`px-2 py-1 text-[11px] font-medium rounded cursor-pointer transition-colors ${
                    dropdown.showAllChapters
                      ? 'bg-blue-700 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900'
                  }`}
                >
                  Tous les ouvrages ({catalog.length})
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 num-cell">
                  {inlineCatalogChoices.length} choix
                </span>
                <button
                  type="button"
                  onClick={() => setDropdown(null)}
                  className="p-0.5 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto divide-y divide-slate-100">
              {inlineCatalogChoices.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-slate-500">
                  Aucun ouvrage correspondant dans la bibliothèque. Vous pouvez conserver votre saisie libre ou afficher{' '}
                  <button
                    type="button"
                    onClick={() =>
                      setDropdown((prev) =>
                        prev ? { ...prev, filterActive: false, showAllChapters: true } : null
                      )
                    }
                    className="text-blue-700 font-medium hover:underline cursor-pointer"
                  >
                    tous les choix
                  </button>
                  .
                </div>
              ) : (
                inlineCatalogChoices.map((choice) => {
                  const isCurrent =
                    choice.designation === activeDropdownItem.designation &&
                    choice.chapitre === activeDropdownItem.chapitre;
                  return (
                    <button
                      key={choice.id}
                      type="button"
                      onClick={() => applyCatalogChoiceToRow(activeDropdownItem.id, choice)}
                      className={`w-full text-left px-3 py-2 flex items-start justify-between gap-3 transition-colors cursor-pointer ${
                        isCurrent ? 'bg-blue-50/80' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-slate-900 leading-snug">
                          {choice.designation}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500 truncate">
                          {choice.famille}
                          {choice.natureOuvrage ? ` · ${choice.natureOuvrage}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded">
                          {choice.chapitre}
                        </span>
                        <span className="px-1.5 py-0.5 text-[10px] font-mono text-blue-700 bg-blue-50 border border-blue-200 rounded">
                          {choice.unite}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() =>
                  openManualModal(
                    activeDropdownItem,
                    activeDropdownItem.designation
                  )
                }
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 hover:text-emerald-900 hover:underline cursor-pointer"
              >
                <PenLine className="h-3 w-3" />
                {activeDropdownItem.designation.trim()
                  ? 'Compléter / enregistrer cet article manuellement'
                  : 'Saisir un nouvel article manuellement...'}
              </button>
              {activeDropdownItem.designation.trim() && (
                <button
                  type="button"
                  onClick={() => setDropdown(null)}
                  className="px-2 py-0.5 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-100 cursor-pointer whitespace-nowrap"
                >
                  Valider saisie libre
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
