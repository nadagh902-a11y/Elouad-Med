import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_SETTINGS,
  INITIAL_AFFAIRES,
  INITIAL_CATALOG,
} from '../data/seedData';
import { Affaire, AppSettings, CatalogItem } from '../types/project';

const STORAGE_KEY_AFFAIRES = 'elec_chiffrage_affaires_v1';
const STORAGE_KEY_CATALOG = 'elec_chiffrage_catalog_v1';
const STORAGE_KEY_SETTINGS = 'elec_chiffrage_settings_v1';
const STORAGE_KEY_SEED_PV = 'elec_chiffrage_seed_pv_v1';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function useWorkspaceStore() {
  const [affaires, setAffaires] = useState<Affaire[]>(() => {
    const saved = loadFromStorage<Affaire[]>(
      STORAGE_KEY_AFFAIRES,
      INITIAL_AFFAIRES
    );
    try {
      const seededPv = localStorage.getItem(STORAGE_KEY_SEED_PV);
      if (!seededPv) {
        localStorage.setItem(STORAGE_KEY_SEED_PV, '1');
        const pvExample = INITIAL_AFFAIRES.find(
          (a) => a.id === 'aff-hai-zitoune-500'
        );
        if (pvExample && !saved.some((a) => a.id === pvExample.id)) {
          return [...saved, pvExample];
        }
      }
    } catch {
      // ignore storage issues
    }
    return saved;
  });
  const [catalog, setCatalog] = useState<CatalogItem[]>(() => {
    const saved = loadFromStorage<CatalogItem[]>(
      STORAGE_KEY_CATALOG,
      INITIAL_CATALOG
    );
    const seenIds = new Set<string>();
    const seenKeys = new Set<string>();
    const cleanSaved: CatalogItem[] = [];

    for (let i = 0; i < saved.length; i++) {
      const item = saved[i];
      const key = `${item.chapitre}::${item.designation.trim().toLowerCase()}`;
      if (seenKeys.has(key) && seenIds.has(item.id)) {
        continue; // exact duplicate already kept
      }
      let safeId = item.id || `cat-saved-${i}`;
      if (seenIds.has(safeId)) {
        safeId = `${safeId}-u${i}`;
      }
      seenIds.add(safeId);
      seenKeys.add(key);
      cleanSaved.push(safeId === item.id ? item : { ...item, id: safeId });
    }

    const missing: CatalogItem[] = [];
    INITIAL_CATALOG.forEach((c, idx) => {
      const key = `${c.chapitre}::${c.designation.trim().toLowerCase()}`;
      if (seenKeys.has(key)) return;
      let safeId = c.id;
      if (seenIds.has(safeId)) {
        safeId = `${c.id}-m${idx}`;
      }
      seenIds.add(safeId);
      seenKeys.add(key);
      missing.push(safeId === c.id ? c : { ...c, id: safeId });
    });

    return missing.length > 0 ? [...cleanSaved, ...missing] : cleanSaved;
  });
  const [settings, setSettings] = useState<AppSettings>(() =>
    loadFromStorage<AppSettings>(STORAGE_KEY_SETTINGS, DEFAULT_SETTINGS)
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_AFFAIRES, JSON.stringify(affaires));
    } catch {
      // ignore storage quota issues
    }
  }, [affaires]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CATALOG, JSON.stringify(catalog));
    } catch {
      // ignore storage quota issues
    }
  }, [catalog]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch {
      // ignore storage quota issues
    }
  }, [settings]);

  const createAffaire = useCallback(
    (partial?: Partial<Affaire>): Affaire => {
      const id = 'aff-' + Date.now();
      const today = new Date().toISOString().slice(0, 10);
      const newAffaire: Affaire = {
        id,
        numeroAffaire: partial?.numeroAffaire || `7226AT-${Math.floor(100 + Math.random() * 900)}`,
        codeClient: partial?.codeClient || '',
        imputation: partial?.imputation || '',
        lotNumero: partial?.lotNumero || '1',
        etudeNumero: partial?.etudeNumero || '',
        dateEtude: partial?.dateEtude || today,
        natureAffaire: partial?.natureAffaire || 'Raccordement',
        objet: partial?.objet || 'Nouvelle affaire travaux électriques',
        demandeur: partial?.demandeur || '',
        lieuTravaux: partial?.lieuTravaux || '',
        commune: partial?.commune || '',
        wilaya: partial?.wilaya || settings.wilayaDefaut,
        entreprise: partial?.entreprise || '',
        marcheNumero: partial?.marcheNumero || '',
        marcheDate: partial?.marcheDate || '',
        odsNumero: partial?.odsNumero || '',
        odsDate: partial?.odsDate || '',
        consultationNumero: partial?.consultationNumero || '',
        pvCopeoNumero: partial?.pvCopeoNumero || '',
        aftNumero: '',
        aftDate: '',
        pvReceptionNumero: '',
        pvReceptionDate: '',
        pvReceptionReserves: 'RAS',
        pvDelegueNom: partial?.pvDelegueNom || settings.signatairesDefaut.surveillantTravaux || '',
        pvDeleguePar: partial?.pvDeleguePar || settings.signatairesDefaut.chefService || '',
        dechargeNumero: '',
        dechargeDate: '',
        dgdNumero: '',
        dgdDate: '',
        status: 'etude',
        tvaRate: settings.tvaDefaut,
        observationsAFT: '',
        items: partial?.items || [],
        attachements: partial?.attachements || [],
        delaySheet: {
          t0DateDebut: '',
          d1DelaiJours: 30,
          d2ProlongationAvenant: 0,
          d2RefAvenant: '',
          d2PrimeProlongationDecision: 0,
          d2PrimeRefDecision: '',
          t2DateFinReelle: '',
          p1JoursStructure: 0,
          p2JoursContractant: 0,
          tauxPenaliteJourPct: 0.1,
          plafondPenalitePct: 10,
        },
        techSpecs: {
          posteNature: '',
          posteTension: '',
          posteNumero: '',
          postePuissance: '',
          posteTerreNeutre: '',
          raccBtPosteDp: '',
          raccBtTension: '',
          raccBtPoseCableLe: '',
          raccBtMiseSousTensLe: '',
          raccBtNbreBrts: '',
          raccHtaTension: '',
          raccHtaPoseCableLe: '',
          raccHtaMiseSousTensLe: '',
        },
        materialControls: [],
        wasteDeposits: [],
        signatories: { ...settings.signatairesDefaut },
        updatedAt: new Date().toISOString(),
      };
      setAffaires((prev) => [newAffaire, ...prev]);
      return newAffaire;
    },
    [settings]
  );

  const duplicateAffaire = useCallback((source: Affaire): Affaire => {
    const id = 'aff-' + Date.now();
    const copy: Affaire = {
      ...JSON.parse(JSON.stringify(source)),
      id,
      numeroAffaire: `${source.numeroAffaire} (Copie)`,
      status: 'etude',
      attachements: [],
      updatedAt: new Date().toISOString(),
    };
    setAffaires((prev) => [copy, ...prev]);
    return copy;
  }, []);

  const updateAffaire = useCallback((updated: Affaire) => {
    setAffaires((prev) =>
      prev.map((a) =>
        a.id === updated.id
          ? { ...updated, updatedAt: new Date().toISOString() }
          : a
      )
    );
  }, []);

  const deleteAffaire = useCallback((id: string) => {
    setAffaires((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const upsertCatalogItem = useCallback((item: CatalogItem) => {
    setCatalog((prev) => {
      const exists = prev.some((c) => c.id === item.id);
      if (exists) {
        return prev.map((c) => (c.id === item.id ? item : c));
      }
      return [item, ...prev];
    });
  }, []);

  const deleteCatalogItem = useCallback((id: string) => {
    setCatalog((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const exportBackupJSON = useCallback(() => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      affaires,
      catalog,
      settings,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sauvegarde_chiffrage_attachement_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [affaires, catalog, settings]);

  const importBackupJSON = useCallback((jsonText: string): boolean => {
    try {
      const parsed = JSON.parse(jsonText);
      if (Array.isArray(parsed.affaires)) setAffaires(parsed.affaires);
      if (Array.isArray(parsed.catalog)) setCatalog(parsed.catalog);
      if (parsed.settings) setSettings(parsed.settings);
      return true;
    } catch {
      return false;
    }
  }, []);

  const resetDemoData = useCallback(() => {
    setAffaires(INITIAL_AFFAIRES);
    setCatalog(INITIAL_CATALOG);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return {
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
  };
}
