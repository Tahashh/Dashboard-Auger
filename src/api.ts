import { Article, Process, Commitment, Client, MovementLog, User, ChatMessage, Macchina5000, FaseTaglio, TaglioLaser, PiastraAT, PortaAT, InvolucroAT } from './types';

// Helper for API calls with exponential backoff retry
export async function apiCall<T>(url: string, options?: RequestInit, retries = 3, backoff = 300): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    
    clearTimeout(timeoutId);
    
    if (response.status === 429 && retries > 0) {
      console.warn(`Rate limit exceeded for ${url}. Retrying in ${backoff}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return apiCall<T>(url, options, retries - 1, backoff * 2);
    }

    const contentType = response.headers.get('content-type');
    const text = await response.text();
    
    // Check if we got the "Starting Server..." page from the platform
    if (text.includes('<title>Starting Server...</title>') && retries > 0) {
      console.warn(`Il server si sta avviando. Riprovo tra ${backoff}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return apiCall<T>(url, options, retries - 1, backoff * 2);
    }

    if (contentType && !contentType.includes('application/json')) {
      console.error(`Invalid response body: ${text}`);
      if (!response.ok) {
        throw new Error(`Errore API: ${response.status} ${response.statusText}`);
      }
      // If it's not JSON but response is OK, it might be an HTML error page from Vite
      throw new Error(`Risposta non valida dal server (non JSON). URL: ${url}. Body: ${text.substring(0, 100)}`);
    }

    let data: any;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      data = text;
    }

    if (!response.ok) {
      const errorMessage = (data && typeof data === 'object' && data.error) 
        ? data.error 
        : (typeof data === 'string' && data.length > 0 ? data : `Errore API: ${response.status} ${response.statusText}`);
      throw new Error(errorMessage);
    }
    
    // If data is null but we expect something, return empty object/array if possible
    // but usually the backend should return [] or {}
    return data as T;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('La richiesta ha impiegato troppo tempo. Riprova.');
    }
    throw error;
  }
}

// Articles
export const fetchArticles = async (): Promise<Article[]> => {
  return apiCall<Article[]>('/api/articles');
};

export const addArticle = async (article: Omit<Article, 'id'>) => {
  return apiCall('/api/articles', {
    method: 'POST',
    body: JSON.stringify(article),
  });
};

export const updateArticle = async (id: string, article: Partial<Article>) => {
  return apiCall(`/api/articles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(article),
  });
};

export const deleteArticle = async (id: string) => {
  return apiCall(`/api/articles/${id}`, {
    method: 'DELETE',
  });
};

export const toggleArticleBlock = async (id: string) => {
  return apiCall<{ success: boolean, is_blocked: number }>(`/api/articles/${id}/toggle-block`, {
    method: 'PATCH',
  });
};

// Processes
export const fetchProcesses = async (): Promise<Process[]> => {
  return apiCall<Process[]>('/api/processes');
};

export const addProcess = async (process: Omit<Process, 'id'>) => {
  // Processes are created automatically when an article is created in the backend
  console.warn('addProcess is handled automatically by the backend when an article is created');
};

export const updateProcess = async (id: string, process: Partial<Process>) => {
  return apiCall(`/api/processes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(process),
  });
};

// Commitments
export const fetchCommitments = async (): Promise<Commitment[]> => {
  return apiCall<Commitment[]>('/api/commitments');
};

export const addCommitment = async (commitment: Omit<Commitment, 'id'>) => {
  return apiCall('/api/commitments', {
    method: 'POST',
    body: JSON.stringify(commitment),
  });
};

export const updateCommitment = async (id: string, commitment: Partial<Commitment>) => {
  return apiCall(`/api/commitments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(commitment),
  });
};

export const deleteCommitment = async (id: string) => {
  return apiCall(`/api/commitments/${id}`, {
    method: 'DELETE',
  });
};

export const reorderCommitments = async (orders: { id: string, priority: number }[]) => {
  return apiCall('/api/commitments/reorder', {
    method: 'POST',
    body: JSON.stringify({ orders }),
  });
};

export const fulfillCommitment = async (id: string, username: string) => {
  return apiCall(`/api/commitments/${id}/fulfill`, {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
};

export const fulfillByCommessa = async (commessa: string, ids: string[] | undefined, username: string) => {
  return apiCall<any>('/api/commitments/fulfill-by-commessa', {
    method: 'POST',
    body: JSON.stringify({ commessa, ids, username }),
  });
};

export const shipCommitment = async (id: string, username: string) => {
  return apiCall(`/api/commitments/${id}/ship`, {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
};

// Clients
export const fetchClients = async (): Promise<Client[]> => {
  return apiCall<Client[]>('/api/clients');
};

export const addClient = async (client: Omit<Client, 'id'>) => {
  return apiCall('/api/clients', {
    method: 'POST',
    body: JSON.stringify(client),
  });
};

export const updateClient = async (id: string, client: Partial<Client>) => {
  return apiCall(`/api/clients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(client),
  });
};

export const deleteClient = async (id: string) => {
  return apiCall(`/api/clients/${id}`, {
    method: 'DELETE',
  });
};

// Movement Logs
export const fetchMovements = async (): Promise<MovementLog[]> => {
  return apiCall<MovementLog[]>('/api/movements');
};

export const addMovementLog = async (log: Omit<MovementLog, 'id'>) => {
  return apiCall('/api/movements', {
    method: 'POST',
    body: JSON.stringify(log),
  });
};

// Presence (now handled by WebSocket in Dashboard.tsx, these are just stubs to prevent errors if still called)
export const updatePresence = async (username: string) => {
  // Handled by WebSocket
};

export const fetchPresence = async (): Promise<User[]> => {
  // Handled by WebSocket
  return [];
};

// Chat
export const fetchChatMessages = async (username: string): Promise<ChatMessage[]> => {
  return apiCall<ChatMessage[]>(`/api/chat/messages?username=${encodeURIComponent(username)}`);
};

export const sendChatMessage = async (sender: string, text: string): Promise<ChatMessage> => {
  return apiCall<ChatMessage>('/api/chat/messages', {
    method: 'POST',
    body: JSON.stringify({ sender, text }),
  });
};

// Casse AT
export const fetchCasseComplete = async (): Promise<any[]> => {
  return apiCall<any[]>('/api/casse-at/complete');
};

export const updateCassaCompleta = async (id: string, data: any) => {
  return apiCall(`/api/casse-at/complete/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

// Macchina 5000
export const fetchMacchina5000 = async (): Promise<Macchina5000[]> => {
  return apiCall<Macchina5000[]>('/api/macchina-5000');
};

export const addMacchina5000 = async (data: Omit<Macchina5000, 'id'>) => {
  return apiCall('/api/macchina-5000', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateMacchina5000 = async (id: string, data: Partial<Macchina5000>) => {
  return apiCall(`/api/macchina-5000/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteMacchina5000 = async (id: string) => {
  return apiCall(`/api/macchina-5000/${id}`, {
    method: 'DELETE',
  });
};

// Taglio Laser
export const fetchTaglioLaser = async (): Promise<TaglioLaser[]> => {
  return apiCall<TaglioLaser[]>('/api/taglio-laser');
};

export const addTaglioLaser = async (data: Omit<TaglioLaser, 'id'>) => {
  return apiCall('/api/taglio-laser', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateTaglioLaser = async (id: string, data: Partial<TaglioLaser>) => {
  return apiCall(`/api/taglio-laser/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteTaglioLaser = async (id: string) => {
  return apiCall(`/api/taglio-laser/${id}`, {
    method: 'DELETE',
  });
};

// C. Gialle
export const fetchCGialle = async (): Promise<any[]> => {
  return apiCall<any[]>('/api/c-gialle');
};

export const addCGialle = async (data: any) => {
  return apiCall('/api/c-gialle', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// Movimenti C. Gialla
export const fetchMovimentiCGialla = async (): Promise<any[]> => {
  return apiCall<any[]>('/api/movimenti-c-gialla');
};

export const addMovimentoCGialla = async (data: any) => {
  return apiCall('/api/movimenti-c-gialla', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// Fase Taglio
export const fetchFaseTaglio = async (): Promise<FaseTaglio[]> => {
  return apiCall<FaseTaglio[]>('/api/fase-taglio');
};

export const addFaseTaglio = async (data: Omit<FaseTaglio, 'id'>) => {
  return apiCall('/api/fase-taglio', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const addFaseSaldatura = async (data: Omit<FaseTaglio, 'id'>) => {
  return apiCall('/api/fase-saldatura', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateFaseTaglio = async (id: string, data: Partial<FaseTaglio>) => {
  return apiCall(`/api/fase-taglio/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteFaseTaglio = async (id: string) => {
  return apiCall(`/api/fase-taglio/${id}`, {
    method: 'DELETE',
  });
};

// Casse AT
export const fetchPiastreAT = async (): Promise<PiastraAT[]> => {
  return apiCall<PiastraAT[]>('/api/casse-at/piastre');
};

export const updatePiastraAT = async (id: number, data: Partial<PiastraAT>) => {
  return apiCall(`/api/casse-at/piastre/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const fetchPorteAT = async (): Promise<PortaAT[]> => {
  return apiCall<PortaAT[]>('/api/casse-at/porte');
};

export const updatePortaAT = async (id: number, data: Partial<PortaAT>) => {
  return apiCall(`/api/casse-at/porte/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const fetchInvolucroAT = async (): Promise<InvolucroAT[]> => {
  return apiCall<InvolucroAT[]>('/api/casse-at/involucro');
};

export const updateInvolucroAT = async (id: number, data: Partial<InvolucroAT>) => {
  return apiCall(`/api/casse-at/involucro/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const assemblaggioCassaAT = async (data: { L: number, H: number, P: number, Q: number }) => {
  return apiCall('/api/casse-at/assemblaggio', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

