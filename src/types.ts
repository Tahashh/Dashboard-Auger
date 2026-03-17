export interface Article {
  id: number;
  nome: string;
  codice: string;
  verniciati: number;
  impegni_clienti: number;
  piega: number;
  scorta: number;
  prezzo?: number;
}

export interface Process {
  id: number;
  articolo_id: number;
  taglio: number;
  piega: number;
  verniciatura: number;
  articolo_nome?: string;
  articolo_codice?: string;
}

export interface User {
  username: string;
}

export interface Client {
  id: number;
  nome: string;
  email?: string;
  telefono?: string;
  data_inserimento: string;
}

export const AUTHORIZED_USERS = ['RobertoBonalumi', 'LucaTurati', 'AdeleTurati'];

export interface Commitment {
  id: number;
  articolo_id: number;
  articolo_nome: string;
  articolo_codice: string;
  cliente: string;
  commessa: string;
  quantita: number;
  fase_produzione?: string;
  operatore?: string;
  note?: string;
  stato_lavorazione?: string;
  data_inserimento: string;
  timestamp_modifica?: string;
}

export interface MovementLog {
  id: number;
  articolo_id: number;
  articolo_nome?: string;
  articolo_codice?: string;
  fase: string;
  tipo: string;
  quantita: number;
  operatore?: string;
  timestamp: string;
}
