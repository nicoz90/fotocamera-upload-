export type Ruolo = "admin" | "dipendente";
export type Stagione = "estiva" | "invernale" | "quattro_stagioni";
export type TipoGomma = "nuova" | "usata" | "deposito";
export type Motivo =
  | "arrivo_merce" | "montata" | "venduta" | "reso" | "spostamento" | "inventario" | "ritiro_deposito";

export interface Profilo {
  id: string;
  email: string;
  nome: string;
  ruolo: Ruolo;
  attivo: boolean;
}

export interface Gomma {
  id: string;
  larghezza: number;
  serie: number;
  diametro: number;
  size_key: string;
  indice_carico: string | null;
  codice_velocita: string | null;
  marca: string;
  modello: string | null;
  stagione: Stagione;
  tipo: TipoGomma;
  dot_settimana: number | null;
  dot_anno: number | null;
  battistrada_mm: number | null;
  runflat: boolean;
  xl: boolean;
  ean: string | null;
  quantita: number;
  scaffale: string | null;
  ripiano: string | null;
  posto: string | null;
  posizione: string | null;
  prezzo_vendita: number | null;
  foto_path: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Deposito {
  id: string;
  tyre_id: string;
  targa: string;
  cliente_nome: string;
  telefono: string | null;
  data_deposito: string;
  con_cerchi: boolean;
  data_ritiro: string | null;
  note: string | null;
  tyres?: Gomma;
}

export interface Movimento {
  id: number;
  tyre_id: string | null;
  descrizione: string;
  delta: number;
  quantita_dopo: number;
  motivo: Motivo;
  da_posizione: string | null;
  a_posizione: string | null;
  note: string | null;
  user_nome: string | null;
  created_at: string;
}

export const STAGIONI: Record<Stagione, string> = {
  estiva: "Estiva",
  invernale: "Invernale",
  quattro_stagioni: "4 stagioni",
};

export const TIPI: Record<TipoGomma, string> = {
  nuova: "Nuova",
  usata: "Usata",
  deposito: "Deposito",
};

export const MOTIVI: Record<Motivo, string> = {
  arrivo_merce: "Arrivo merce",
  montata: "Montata",
  venduta: "Venduta",
  reso: "Reso",
  spostamento: "Spostamento",
  inventario: "Inventario",
  ritiro_deposito: "Ritiro deposito",
};

export const MOTIVI_CARICO: Motivo[] = ["arrivo_merce", "reso", "inventario"];
export const MOTIVI_SCARICO: Motivo[] = ["montata", "venduta", "reso", "inventario"];

export const CAMPI_LISTA =
  "id,larghezza,serie,diametro,size_key,indice_carico,codice_velocita,marca,modello,stagione,tipo,dot_settimana,dot_anno,battistrada_mm,runflat,xl,ean,quantita,scaffale,ripiano,posto,posizione,prezzo_vendita,foto_path,note,created_at,updated_at";
