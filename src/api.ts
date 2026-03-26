import { Article, Process, Commitment, Client, MovementLog, User, ChatMessage } from './types';

// Helper for API calls
async function apiCall<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    let errorMessage = 'API Error';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch (e) {
      errorMessage = await response.text() || errorMessage;
    }
    throw new Error(errorMessage);
  }
  
  return response.json();
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

