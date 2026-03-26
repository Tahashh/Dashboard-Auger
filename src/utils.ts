import { Article, Commitment } from './types';

export const getCategory = (name: string, code?: string): string => {
  const upperName = name?.toUpperCase() || '';
  const upperCode = code?.toUpperCase() || '';
  
  if (upperName.includes('PORTA') || upperName.includes('PORTE') || upperName.includes('ANTA') || upperName.includes('P.TA') || /^\d+X\d+/.test(upperName) || upperCode.startsWith('AG-PO') || upperCode.startsWith('PO') || upperCode.startsWith('PS')) {
    if (upperCode.endsWith('IB') || upperCode.endsWith('CB') || upperName.includes('IB') || upperName.includes('CB')) return 'Porte IB/CB';
    if (upperCode.endsWith('PX') || upperCode.endsWith('PV') || upperName.includes('PX') || upperName.includes('PV')) return 'Porte PX/PV';
    if (upperCode.includes('INT') || upperCode.includes('180')) return 'Porte INT/LAT/180°';
    return 'Porte Standard';
  }
  if (upperName.includes('RETRO')) {
    if (upperCode.includes('MCR')) return 'Montanti Centrali Retro';
    return 'Retri';
  }
  if (upperName.includes('LATERALE')) {
    if (upperCode.includes('LB')) return 'Laterali Ibridi';
    return 'Laterali';
  }
  if (upperName.includes('TETTO')) return 'Tetti';
  if (upperName.includes('PIASTRA')) {
    if (upperName.includes('LATERALE')) return 'Piastre Laterali';
    return 'Piastre Frontali';
  }
  if (upperName.includes('BASI&TETTI') || (upperName.includes('BASI') && upperName.includes('TETTI'))) return 'Basi&Tetti';
  if (upperName.includes('STRUTTURE AGR') || upperName.includes('STRUTTURA AGR')) return 'Strutture Agr';
  if (upperName.includes('AGS')) return 'AGS';
  if (upperName.includes('AGC')) return 'AGC';
  if (upperName.includes('AGLM')) return 'AGLM';
  if (upperName.includes('AGLC')) return 'AGLC';
  if (upperName.includes('INVOLUCRO AT')) return 'INVOLUCRI AT';
  if (upperName.includes('CRISTALLO') || upperName.includes('VETRO')) return 'Cristalli';
  return 'Senza Categoria';
};

export const isPhaseEnabled = (category: string, phase: string): boolean => {
  const cat = category.toLowerCase();
  const p = phase.toLowerCase();
  
  // Porte: Taglio, Piega, Verniciatura (Saldatura disabled)
  if (cat.includes('porte')) {
    return p !== 'saldatura';
  }

  // Retri, Tetti, Laterali: Tag, Sald, Ver (Piega/Gre disabled)
  if (cat.includes('retri') || cat.includes('tetti') || cat.includes('laterali')) {
    return p !== 'piega' && p !== 'gre' && p !== 'piega (gre.)';
  }
  // Piastre: Tag, Gre (Sald, Ver disabled)
  if (cat.includes('piastre')) {
    return ['taglio', 'piega', 'gre'].includes(p);
  }
  // Default: all 4 enabled
  return true;
};

export const getDisponibilita = (article: Article, commitments?: Commitment[]): number => {
  const isPiastra = article.nome?.toUpperCase().includes('PIASTRA');
  const manualImp = article.impegni_clienti || 0;

  if (commitments) {
    if (isPiastra) {
      // Per le piastre, l'impegno si applica sulla fase Piega
      const piegaImp = commitments
        .filter(c => c.articolo_id === article.id && c.fase_produzione === 'Piega' && c.stato_lavorazione !== 'Completato')
        .reduce((sum, c) => sum + c.quantita, 0);
      return (article.piega || 0) - Math.max(piegaImp, manualImp);
    } else {
      // L'impegno si applica SOLO sulla fase Verniciato (Ver.)
      // TOT = Verniciato (V) - Impegnato (IMP)
      const verImp = commitments
        .filter(c => c.articolo_id === article.id && c.fase_produzione === 'Verniciatura' && c.stato_lavorazione !== 'Completato')
        .reduce((sum, c) => sum + c.quantita, 0);
      return (article.verniciati || 0) - Math.max(verImp, manualImp);
    }
  }
  
  if (isPiastra) {
    return (article.piega || 0) - manualImp;
  }
  
  return (article.verniciati || 0) - manualImp;
};
