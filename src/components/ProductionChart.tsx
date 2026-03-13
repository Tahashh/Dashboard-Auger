import { Article } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ProductionChartProps {
  articles: Article[];
}

export default function ProductionChart({ articles }: ProductionChartProps) {
  // Take top 10 articles by verniciati to avoid cluttering the chart
  const data = [...articles]
    .sort((a, b) => b.verniciati - a.verniciati)
    .slice(0, 10)
    .map(a => ({
      name: a.nome.length > 15 ? a.nome.substring(0, 15) + '...' : a.nome,
      Verniciati: a.verniciati,
      Impegni: a.impegni_clienti,
      Disponibilità: a.verniciati - a.impegni_clienti
    }));

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
        Nessun dato disponibile per il grafico
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="name" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#64748b' }}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#64748b' }}
          />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            cursor={{ fill: '#f1f5f9' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar dataKey="Verniciati" fill="#0f172a" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Impegni" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Disponibilità" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
