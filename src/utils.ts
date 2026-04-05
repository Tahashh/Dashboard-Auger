import { Article, Commitment } from './types';

export const getCategory = (name: string, code?: string): string => {
  const upperName = name?.toUpperCase() || '';
  const upperCode = code?.toUpperCase() || '';
  
  if (upperName.includes('PORTA AT') || upperName.includes('PORTE AT') || upperCode.startsWith('AT-PO')) return 'PORTE AT';
  if (upperName.includes('PIASTRA AT') || upperName.includes('PIASTRE AT') || upperCode.startsWith('AT-PA')) return 'PIASTRE AT';
  if (upperName.includes('INVOLUCRO AT') || upperCode.startsWith('AT-IN')) return 'INVOLUCRI AT';

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
  if (upperName.includes('PIASTRA')) {
    if (upperName.includes('LATERALE')) return 'Piastre Laterali';
    return 'Piastre Frontali';
  }
  if (upperName.includes('LATERALE') || upperName.includes('LAT.')) {
    if (upperCode.includes('LB') || upperName.includes('IBRIDO')) return 'Laterali Ibridi';
    return 'Laterali';
  }
  if (upperName.includes('TETTO') && !upperName.includes('STT AGR')) return 'Tetti';

  if (upperName.includes('STRUTTURE AGM') || upperName.includes('STRUTTURA AGM') || upperCode.startsWith('AGM')) return 'Strutture AGM';
  if (upperName.includes('STRUTTURE AGR') || 
      upperName.includes('STRUTTURA AGR') || 
      upperName.includes('STT AGR') || 
      upperCode.startsWith('AGR-ST') || 
      upperCode.startsWith('AGT-ST') || 
      /^AGR\d{4}$/.test(upperCode) ||
      (upperCode.startsWith('AGR') && !upperCode.includes('-'))
  ) return 'Strutture Agr';
  if (upperName.includes('BASI&TETTI') || (upperName.includes('BASI') && upperName.includes('TETTI'))) return 'Basi&Tetti';
  if (upperName.includes('AGS')) return 'AGS';
  if (upperName.includes('AGC')) return 'AGC';
  if (upperName.includes('AGLM')) return 'AGLM';
  if (upperName.includes('AGLC')) return 'AGLC';
  if (upperName.includes('CRISTALLO') || upperName.includes('VETRO')) return 'Cristalli';
  return 'Senza Categoria';
};

export const isPhaseEnabled = (category: string, phase: string): boolean => {
  const cat = category.toLowerCase();
  const p = phase.toLowerCase();
  
  // Porte, Retri, Tetti, Laterali: Saldatura disabled
  if (cat.includes('porte') || cat.includes('retri') || cat.includes('tetti') || cat.includes('laterali')) {
    return p !== 'saldatura';
  }

  // AT categories: Allow Grezzo, Saldatura, Taglio, Verniciatura
  if (cat.includes('at')) {
    return ['grezzo', 'saldatura', 'taglio', 'verniciatura'].includes(p);
  }

  // Piastre: Tag, Gre (Sald, Ver disabled)
  if (cat.includes('piastre')) {
    return ['taglio', 'piega', 'gre'].includes(p);
  }

  // Strutture Agr: Taglio, Piega/Grezzo disabled. Solo Saldatura e Verniciatura.
  if (cat.includes('strutture agr')) {
    return ['saldatura', 'verniciatura'].includes(p);
  }

  // Default: all 4 enabled
  return true;
};

export const getPhaseAvailability = (article: Article, process: any, phase: string, commitments: Commitment[]): number => {
  const p = phase.toLowerCase();
  let available = 0;
  
  if (p === 'verniciatura') {
    available = article.verniciati || 0;
  } else if (p === 'saldatura') {
    available = process?.saldatura || 0;
  } else if (p === 'piega' || p === 'grezzo') {
    available = process?.piega || article.piega || 0;
  } else if (p === 'taglio') {
    available = process?.taglio || 0;
  }

  const phaseName = p === 'grezzo' ? 'Piega' : phase;
  
  const totalImp = commitments
    .filter(c => c.articolo_id === article.id && c.stato_lavorazione !== 'Completato' && c.fase_produzione === phaseName)
    .reduce((sum, c) => sum + c.quantita, 0);
    
  return available - totalImp;
};

export const getDisponibilita = (article: Article, commitments?: Commitment[]): number => {
  const category = getCategory(article.nome, article.codice);
  const isPiastra = category.toLowerCase().includes('piastre');
  const available = isPiastra ? (article.piega || 0) : (article.verniciati || 0);
  
  // Calculate commitments from the table
  const tableImp = commitments
    ? commitments
        .filter(c => String(c.articolo_id) === String(article.id) && c.stato_lavorazione !== 'Completato')
        .reduce((sum, c) => sum + c.quantita, 0)
    : 0;

  // Use the larger of the two: manual field or table sum
  // This allows the user to use either the manual field or the detailed table
  const totalImp = Math.max(tableImp, article.impegni_clienti || 0);
  
  return available - totalImp;
};
