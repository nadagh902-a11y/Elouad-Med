import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Calculator,
  ClipboardCheck,
  FileText,
  FolderKanban,
  Menu,
  Printer,
  Settings,
  X,
} from 'lucide-react';
import { AffaireListView } from './components/AffaireListView';
import { AttachementEditor } from './components/AttachementEditor';
import { CatalogView, SettingsView } from './components/CatalogSettingsView';
import { ChiffrageEditor } from './components/ChiffrageEditor';
import { DossierTechniqueView } from './components/DossierTechniqueView';
import { PrintDocType, PrintPreviewView } from './components/PrintPreviewView';
import {
  OfflineIndicator,
  PWAInstallButton,
} from './components/PWAInstallButton';
import { useWorkspaceStore } from './hooks/useWorkspaceStore';
import { computeAffairePhysicalStats, formatNumber } from './utils/formatters';

type MainSection = 'affaires' | 'catalog' | 'settings';
type AffaireTab = 'chiffrage' | 'attachement' | 'dossier' | 'print';

export default function App() {
  const {
    affaires,
    catalog,
    settings,
    setSettings,
    createAffaire,
    duplicateAffaire,
    updateAffaire,
    deleteAffaire,
    upsertCatalogItem,
    deleteCatalogItem,
    exportBackupJSON,
    importBackupJSON,
    resetDemoData,
  } = useWorkspaceStore();

  const [section, setSection] = useState<MainSection>('affaires');
  const [selectedAffaireId, setSelectedAffaireId] = useState<string | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<AffaireTab>('chiffrage');
  const [printDocType, setPrintDocType] = useState<PrintDocType>('attachement');
  const [printSitId, setPrintSitId] = useState<string | undefined>(undefined);
  const [autoPrintSignal, setAutoPrintSignal] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const selectedAffaire = useMemo(
    () => affaires.find((a) => a.id === selectedAffaireId) || null,
    [affaires, selectedAffaireId]
  );

  const selectedStats = useMemo(
    () => (selectedAffaire ? computeAffairePhysicalStats(selectedAffaire) : null),
    [selectedAffaire]
  );

  const handleOpenAffaire = (id: string, tab: AffaireTab = 'chiffrage') => {
    setSelectedAffaireId(id);
    setActiveTab(tab);
    setSection('affaires');
    setMobileMenuOpen(false);
  };

  const handleOpenPrint = (
    doc: PrintDocType,
    sitId?: string,
    triggerImmediate = false
  ) => {
    setPrintDocType(doc);
    if (sitId !== undefined) {
      setPrintSitId(sitId);
    }
    setActiveTab('print');
    if (triggerImmediate) {
      setAutoPrintSignal((n) => n + 1);
    }
  };

  const handleTopBarPrint = () => {
    if (activeTab === 'print') {
      setAutoPrintSignal((n) => n + 1);
      return;
    }
    if (activeTab === 'chiffrage') {
      handleOpenPrint('devis', undefined, true);
    } else if (activeTab === 'attachement') {
      handleOpenPrint('attachement', undefined, true);
    } else {
      handleOpenPrint(printDocType, undefined, true);
    }
  };

  const handleBackToList = () => {
    setSelectedAffaireId(null);
    setSection('affaires');
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div
          className="no-print fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside
        className={`no-print fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBackToList}
            className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer text-left"
          >
            Chiffrage &amp; Attachement
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="p-3 space-y-1">
          <button
            type="button"
            onClick={() => {
              setSection('affaires');
              setSelectedAffaireId(null);
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              section === 'affaires' && !selectedAffaire
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <FolderKanban className="h-4 w-4 shrink-0" />
            Portefeuille Affaires
          </button>

          <button
            type="button"
            onClick={() => {
              setSection('catalog');
              setSelectedAffaireId(null);
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              section === 'catalog'
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            Bibliothèque Ouvrages
          </button>

          <button
            type="button"
            onClick={() => {
              setSection('settings');
              setSelectedAffaireId(null);
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              section === 'settings'
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Settings className="h-4 w-4 shrink-0" />
            Paramètres &amp; Sauvegarde
          </button>
        </nav>

        {/* Quick Dossier Switcher */}
        <div className="mt-2 px-3 pt-3 border-t border-slate-200 flex-1 overflow-y-auto">
          <div className="px-3 pb-2 text-xs font-medium text-slate-500">
            Affaires récentes
          </div>
          <div className="space-y-1">
            {affaires.slice(0, 8).map((aff) => {
              const isActive =
                section === 'affaires' && selectedAffaireId === aff.id;
              return (
                <button
                  key={aff.id}
                  type="button"
                  onClick={() => handleOpenAffaire(aff.id, activeTab)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-xs font-mono font-semibold truncate">
                    {aff.numeroAffaire}
                  </div>
                  <div
                    className={`text-[11px] truncate ${
                      isActive ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {aff.objet}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-3 border-t border-slate-200 space-y-2.5">
          <PWAInstallButton
            onExportBackup={exportBackupJSON}
            installPassword={settings.installPassword}
            onUpdateInstallPassword={(cfg) =>
              setSettings((prev) => ({ ...prev, installPassword: cfg }))
            }
          />
          <div className="px-1 text-[11px] text-slate-500 truncate">
            {settings.direction}
          </div>
        </div>
      </aside>

      <OfflineIndicator />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract */}
        <header className="no-print h-16 bg-white border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 text-sm min-w-0 truncate">
              <button
                type="button"
                onClick={handleBackToList}
                className="text-slate-500 hover:text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {section === 'catalog'
                  ? 'Bibliothèque Ouvrages'
                  : section === 'settings'
                    ? 'Paramètres'
                    : 'Affaires'}
              </button>
              {selectedAffaire && section === 'affaires' && (
                <>
                  <span className="text-slate-300">/</span>
                  <span className="font-mono font-semibold text-slate-900 truncate">
                    {selectedAffaire.numeroAffaire}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {selectedAffaire && section === 'affaires' ? (
              <>
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Toutes les affaires
                </button>
                <button
                  type="button"
                  onClick={handleTopBarPrint}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Imprimer PDF
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const created = createAffaire();
                  handleOpenAffaire(created.id, 'chiffrage');
                }}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
              >
                Nouvelle Affaire
              </button>
            )}
          </div>
        </header>

        {/* Viewport Body */}
        <main className="flex-1 p-4 lg:p-8 max-w-[1400px] w-full mx-auto">
          {section === 'catalog' && (
            <CatalogView
              catalog={catalog}
              onUpsertItem={upsertCatalogItem}
              onDeleteItem={deleteCatalogItem}
            />
          )}

          {section === 'settings' && (
            <SettingsView
              settings={settings}
              onChange={setSettings}
              onExportJSON={exportBackupJSON}
              onImportJSON={importBackupJSON}
              onResetDemo={resetDemoData}
            />
          )}

          {section === 'affaires' && !selectedAffaire && (
            <AffaireListView
              affaires={affaires}
              onOpenAffaire={handleOpenAffaire}
              onCreateAffaire={createAffaire}
              onDuplicateAffaire={duplicateAffaire}
              onDeleteAffaire={deleteAffaire}
            />
          )}

          {section === 'affaires' && selectedAffaire && selectedStats && (
            <div className="space-y-6">
              {/* Affaire Workspace Header & 4-Stat Strip */}
              <div className="no-print bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono font-semibold text-blue-700">
                        {selectedAffaire.numeroAffaire}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{selectedAffaire.natureAffaire}</span>
                      {selectedAffaire.marcheNumero && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Marché N° {selectedAffaire.marcheNumero}</span>
                        </>
                      )}
                      {selectedAffaire.odsNumero && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>ODS N° {selectedAffaire.odsNumero}</span>
                        </>
                      )}
                    </div>
                    <h1 className="mt-1 text-lg font-semibold text-slate-900">
                      {selectedAffaire.objet}
                    </h1>
                    <div className="mt-1 text-xs text-slate-600">
                      {selectedAffaire.entreprise || 'Entreprise à désigner'}
                      {' · '}
                      {selectedAffaire.lieuTravaux ||
                        `${selectedAffaire.commune} / ${selectedAffaire.wilaya}`}
                    </div>
                  </div>

                  {/* Workspace Tabs */}
                  <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveTab('chiffrage')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
                        activeTab === 'chiffrage'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Calculator className="h-3.5 w-3.5" />
                      Consistances (Devis)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('attachement')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
                        activeTab === 'attachement'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <ClipboardCheck className="h-3.5 w-3.5" />
                      Attachements ({selectedAffaire.attachements.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('dossier')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
                        activeTab === 'dossier'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Délais, AFT &amp; DGD
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('print')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
                        activeTab === 'print'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Impression A4
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 divide-x divide-slate-200 bg-slate-50/50 text-xs">
                  <div className="px-5 py-3">
                    <span className="text-slate-500">Postes au devis</span>
                    <div className="mt-0.5 text-sm font-semibold text-slate-900 num-cell">
                      {selectedStats.totalPostes} ouvrages ({selectedStats.postesSoldes} soldés)
                    </div>
                  </div>
                  <div className="px-5 py-3">
                    <span className="text-slate-500">Linéaire réalisé / Devis</span>
                    <div className="mt-0.5 text-sm font-semibold text-blue-700 num-cell">
                      {formatNumber(selectedStats.totalRealiseML, 0)} / {formatNumber(selectedStats.totalDevisML, 0)} ML
                    </div>
                  </div>
                  <div className="px-5 py-3">
                    <span className="text-slate-500">Unités réalisées / Devis</span>
                    <div className="mt-0.5 text-sm font-semibold text-slate-900 num-cell">
                      {formatNumber(selectedStats.totalRealiseUnit, 0)} / {formatNumber(selectedStats.totalDevisUnit, 0)} U
                    </div>
                  </div>
                  <div className="px-5 py-3">
                    <span className="text-slate-500">Avancement Physique</span>
                    <div className="mt-0.5 text-sm font-semibold text-slate-900 num-cell">
                      {selectedStats.avancementPct.toFixed(0)} %
                      {selectedStats.postesDepassement > 0 && (
                        <span className="text-amber-700 ml-2">
                          ({selectedStats.postesDepassement} dép.)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Module View */}
              {activeTab === 'chiffrage' && (
                <ChiffrageEditor
                  affaire={selectedAffaire}
                  catalog={catalog}
                  onChange={updateAffaire}
                  onAddCatalogItem={upsertCatalogItem}
                  onPrint={() => handleOpenPrint('devis', undefined, true)}
                />
              )}

              {activeTab === 'attachement' && (
                <AttachementEditor
                  affaire={selectedAffaire}
                  onChange={updateAffaire}
                  onPrint={(sitId) => handleOpenPrint('attachement', sitId, true)}
                />
              )}

              {activeTab === 'dossier' && (
                <DossierTechniqueView
                  affaire={selectedAffaire}
                  settings={settings}
                  onChange={updateAffaire}
                  onPrintDoc={(doc) => handleOpenPrint(doc, undefined, true)}
                />
              )}

              {activeTab === 'print' && (
                <PrintPreviewView
                  affaire={selectedAffaire}
                  settings={settings}
                  initialDocType={printDocType}
                  initialSitId={printSitId}
                  autoPrintSignal={autoPrintSignal}
                  onDocTypeChange={setPrintDocType}
                />
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
