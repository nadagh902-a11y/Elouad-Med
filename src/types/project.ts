export type AffaireStatus = 'etude' | 'en_cours' | 'reception_provisoire' | 'cloture_dgd';

export type WorkChapter =
  | 'BTA'
  | 'BTS'
  | 'MTA'
  | 'MTS'
  | 'Branchements'
  | 'TPR'
  | 'RCN'
  | 'Poste'
  | 'Entretien'
  | 'Autre';

export type WorkUnit = 'ML' | 'U' | 'Un' | 'Ens' | 'M2' | 'M3' | 'Kg' | 'Fft';

export interface WorkItem {
  id: string;
  chapitre: WorkChapter;
  rcnTp: 'TPR' | 'RCN';
  famille: string;
  natureOuvrage: string;
  designation: string;
  unite: WorkUnit;
  qteDevisFourn: number;
  qteDevisMO: number;
  puFourniture: number;
  puMainOeuvre: number;
  observation?: string;
}

export interface AttachementLineEntry {
  itemId: string;
  qteFourn: number;
  qteMO: number;
  observation?: string;
}

export interface AttachementSituation {
  id: string;
  numero: number;
  titre: string;
  date: string;
  estFinale: boolean;
  deduirePrecedentes: boolean;
  noteSpeciale?: string;
  retenueGarantiePct: number;
  entries: Record<string, AttachementLineEntry>;
}

export interface DelaySheet {
  t0DateDebut: string;
  d1DelaiJours: number;
  d2ProlongationAvenant: number;
  d2RefAvenant: string;
  d2PrimeProlongationDecision: number;
  d2PrimeRefDecision: string;
  t2DateFinReelle: string;
  p1JoursStructure: number;
  p2JoursContractant: number;
  tauxPenaliteJourPct: number;
  plafondPenalitePct: number;
}

export interface TechnicalCharacteristics {
  posteNature: string;
  posteTension: string;
  posteNumero: string;
  postePuissance: string;
  posteTerreNeutre: string;
  raccBtPosteDp: string;
  raccBtTension: string;
  raccBtPoseCableLe: string;
  raccBtMiseSousTensLe: string;
  raccBtNbreBrts: string;
  raccHtaTension: string;
  raccHtaPoseCableLe: string;
  raccHtaMiseSousTensLe: string;
}

export interface MaterialControlItem {
  id: string;
  designation: string;
  fabricant: string;
  distributeur: string;
  factureAchat: string;
  dateFacture: string;
  controleVisuel: boolean;
  controleMarquage: boolean;
  controleDimensionnel: boolean;
}

export interface WasteDepositItem {
  id: string;
  intituleAffaire?: string;
  codeGdo?: string;
  ap?: string;
  commandeRef?: string;
  etp?: string;
  designation: string;
  uniteDeposee: number;
  uniteReintegree: number;
  longueurML: number;
  poidsEquivalentKg?: number;
  poidsKg: number;
  dateDepot: string;
}

export interface Signatories {
  surveillantTravaux: string;
  controleurTravaux: string;
  chefService: string;
  chefDEET: string;
  agentEtude: string;
}

export interface Affaire {
  id: string;
  numeroAffaire: string;
  codeClient: string;
  imputation: string;
  lotNumero: string;
  etudeNumero: string;
  dateEtude: string;
  natureAffaire: string;
  objet: string;
  demandeur: string;
  lieuTravaux: string;
  commune: string;
  wilaya: string;
  entreprise: string;
  marcheNumero: string;
  marcheDate: string;
  odsNumero: string;
  odsDate: string;
  consultationNumero: string;
  pvCopeoNumero: string;
  aftNumero: string;
  aftDate: string;
  pvReceptionNumero: string;
  pvReceptionDate: string;
  pvReceptionReserves: string;
  pvDelegueNom?: string;
  pvDeleguePar?: string;
  dechargeNumero?: string;
  dechargeDate?: string;
  dgdNumero: string;
  dgdDate: string;
  status: AffaireStatus;
  tvaRate: number;
  observationsAFT: string;
  items: WorkItem[];
  attachements: AttachementSituation[];
  delaySheet: DelaySheet;
  techSpecs: TechnicalCharacteristics;
  materialControls: MaterialControlItem[];
  wasteDeposits: WasteDepositItem[];
  signatories: Signatories;
  updatedAt: string;
}

export interface CatalogItem {
  id: string;
  chapitre: WorkChapter;
  rcnTp: 'TPR' | 'RCN';
  famille: string;
  natureOuvrage: string;
  designation: string;
  unite: WorkUnit;
  puFourniture: number;
  puMainOeuvre: number;
}

export interface InstallPasswordConfig {
  salt: string;
  hash: string;
  iterations: number;
  updatedAt: string;
}

export interface AppSettings {
  organisme: string;
  direction: string;
  division: string;
  wilayaDefaut: string;
  tvaDefaut: number;
  signatairesDefaut: Signatories;
  installPassword?: InstallPasswordConfig;
}
