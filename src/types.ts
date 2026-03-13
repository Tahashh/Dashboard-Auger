export interface Article {
  id: number;
  nome: string;
  codice: string;
  verniciati: number;
  impegni_clienti: number;
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
  data_inserimento: string;
}

export interface MovementLog {
  id: number;
  articolo_id: number;
  fase: string;
  tipo: string;
  quantita: number;
  timestamp: string;
}
