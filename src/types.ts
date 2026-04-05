export interface Article {
  id: string;
  nome: string;
  codice: string;
  verniciati: number;
  impegni_clienti: number;
  piega: number;
  scorta: number;
  prezzo?: number;
  prezzo_lamiera?: number;
  prezzo_taglio?: number;
  prezzo_piega?: number;
  prezzo_verniciatura?: number;
  prezzo_gommatura?: number;
  prezzo_montaggio?: number;
  prezzo_vendita?: number;
}

export interface Process {
  id: string;
  articolo_id: string;
  taglio: number;
  piega: number;
  saldatura: number;
  verniciatura: number;
  articolo_nome?: string;
  articolo_codice?: string;
}

export interface User {
  username: string;
  role?: string;
}

export interface ChatMessage {
  id: number;
  sender: string;
  text: string;
  timestamp: string;
}

export interface Client {
  id: string;
  nome: string;
  email?: string;
  telefono?: string;
  data_inserimento: string;
}

export interface PiastraAT {
  id: number;
  articolo: string;
  codice: string;
  tag: number;
  gre: number;
  tot: number;
}

export interface PortaAT {
  id: number;
  articolo: string;
  codice: string;
  tag: number;
  gre: number;
  vern: number;
  tot: number;
}

export interface InvolucroAT {
  id: number;
  articolo: string;
  codice: string;
  tag: number;
  gre: number;
  sald: number;
  vern: number;
  mag: number;
  tot: number;
}

export const AUTHORIZED_USERS = ['RobertoBonalumi', 'LucaTurati', 'AdeleTurati', 'RidaTecnico', 'ElenaTurati'];

export const USERS = [
  { username: "LucaTurati", password: "Auger2014", role: "admin" },
  { username: "AdeleTurati", password: "Auger2014", role: "admin" },
  { username: "RobertoBonalumi", password: "Auger2014", role: "admin" },
  { username: "SamantaLimonta", password: "Auger2014", role: "user" },
  { username: "TahaJbala", password: "Auger2014", role: "user" },
  { username: "TahaDev", password: "AugerDev2026", role: "developer" },
  { username: "RidaTecnico", password: "Auger2014", role: "taglio_only" },
  { username: "ElenaTurati", password: "Auger2014", role: "elena_view" }
];

export interface Commitment {
  id: string;
  articolo_id: string;
  articolo_nome: string;
  articolo_codice: string;
  cliente: string;
  commessa: string;
  quantita: number;
  priorita: number;
  fase_produzione?: string;
  operatore?: string;
  note?: string;
  stato_lavorazione?: string;
  data_inserimento: string;
  timestamp_modifica?: string;
}

export interface MovementLog {
  id: string;
  articolo_id: string;
  articolo_nome?: string;
  articolo_codice?: string;
  fase: string;
  tipo: string;
  quantita: number;
  operatore?: string;
  cliente?: string;
  commessa?: string;
  note?: string;
  quantita_lanciata?: number;
  tempo?: number;
  timestamp: string;
}

export interface FaseTaglio {
  id: string;
  lavorazione_per: string;
  articolo: string;
  quantita: number;
  data: string;
  created_at?: string;
  fatto: number;
  stampato: number;
  odl?: string;
  commessa?: string;
  macchina?: 'Macchina 5000' | 'Taglio Laser' | 'Reparto Saldatura';
}

export interface Macchina5000 {
  id: string;
  data: string;
  articolo: string;
  quantita: number;
  preparazione: number;
  inizio: string | null;
  inizio2: string | null;
  pausa: string | null;
  fine: string | null;
  totale_tempo: number | null;
  odl: string | null;
  stato: string;
  operatore: string | null;
  created_at?: string;
  cliente?: string;
  commessa?: string;
}

export interface TaglioLaser {
  id: string;
  data: string;
  articolo: string;
  quantita: number;
  preparazione: number;
  inizio: string | null;
  inizio2: string | null;
  pausa: string | null;
  fine: string | null;
  totale_tempo: number | null;
  odl: string | null;
  stato: string;
  operatore: string | null;
  created_at?: string;
  cliente?: string;
  commessa?: string;
}

export interface MovimentoCGialla {
  id: string;
  data_reg: string;
  articolo_spc: string;
  fase: string;
  quantita: number;
  cliente_commessa: string;
  operatore: string;
  tempo_totale: number;
  quantita_lanciata?: number;
  created_at?: string;
}
