import { Article } from './types';

export const getDisponibilita = (article: Article): number => {
  const isPiastra = article.nome.toLowerCase().includes('piastra');
  const availableBase = isPiastra ? (article.piega || 0) : article.verniciati;
  return availableBase - article.impegni_clienti;
};
