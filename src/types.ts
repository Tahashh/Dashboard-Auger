export interface Article {
  id: string;
  nome: string;
  codice: string;
  verniciati: number;
  impegni_clienti: number;
  piega: number;
  scorta: number;
  prezzo?: number;
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

export const AUTHORIZED_USERS = ['RobertoBonalumi', 'robertobonalumi', 'LucaTurati', 'AdeleTurati'];

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
  timestamp: string;
}
