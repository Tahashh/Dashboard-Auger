import { useState, useEffect } from 'react';
import { apiCall } from '../api';

interface Client {
  id: number;
  nome: string;
  email: string;
  telefono: string;
}

interface Article {
  id: number;
  nome: string;
  codice: string;
  famiglia: string;
}

export default function DataDashboard() {
  const [clients, setClients] = useState<Client[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [clientsData, articlesData] = await Promise.all([
          apiCall<Client[]>('/api/clients'),
          apiCall<Article[]>('/api/articles')
        ]);
        setClients(clientsData);
        setArticles(articlesData);
      } catch (err: any) {
        setError(err.message || 'Errore durante il caricamento dei dati');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  if (loading) return <div className="p-4">Caricamento dati...</div>;
  if (error) return <div className="p-4 text-red-600">Errore: {error}</div>;

  const groupedArticles = articles.reduce((acc, article) => {
    const family = article.famiglia || 'Altro';
    if (!acc[family]) acc[family] = [];
    acc[family].push(article);
    return acc;
  }, {} as Record<string, Article[]>);

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">Dashboard Dati</h1>
      
      <section>
        <h2 className="text-xl font-semibold mb-4">Clienti</h2>
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefono</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {clients.map(c => (
                <tr key={c.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{c.nome}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{c.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{c.telefono}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Articoli</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(groupedArticles).map(([family, arts]) => (
            <div key={family} className="bg-white shadow rounded-lg p-4">
              <h3 className="font-bold mb-2">{family}</h3>
              <ul className="text-sm space-y-1">
                {arts.map(a => (
                  <li key={a.id} className="flex justify-between">
                    <span>{a.codice}</span>
                    <span className="text-gray-500">{a.nome}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
