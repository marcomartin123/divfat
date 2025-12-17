import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Transaction } from '../types';
import { PieChart as PieChartIcon } from 'lucide-react';

interface CategoryChartProps {
  transactions: Transaction[];
  onCategoryClick?: (category: string) => void;
}

const COLORS = [
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#94a3b8', // Slate (Others)
];

export const CategoryChart: React.FC<CategoryChartProps> = ({ transactions, onCategoryClick }) => {
  
  const chartData = useMemo(() => {
    // 1. Agrupar por categoria
    // Fix: Explicitly type the reduce accumulator to avoid 'unknown' type errors
    const grouped = transactions.reduce<Record<string, number>>((acc, tx) => {
      // Ignorar valores negativos (pagamentos/créditos) para não estragar o gráfico de DESPESAS
      if (tx.amount <= 0) return acc;
      
      const category = tx.category || 'Outros';
      acc[category] = (acc[category] || 0) + tx.amount;
      return acc;
    }, {});

    // 2. Converter para array
    let dataArray = Object.entries(grouped).map(([name, value]) => ({
      name,
      value
    }));

    // 3. Ordenar por valor decrescente
    dataArray.sort((a, b) => b.value - a.value);

    // 4. Pegar Top 5 e agrupar o resto em "Outros"
    if (dataArray.length > 6) {
      const top5 = dataArray.slice(0, 5);
      const others = dataArray.slice(5);
      const othersTotal = others.reduce((sum, item) => sum + item.value, 0);
      
      return [
        ...top5,
        { name: 'Outros', value: othersTotal }
      ];
    }

    return dataArray;
  }, [transactions]);

  if (chartData.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mt-6">
      <div className="flex items-center gap-2 mb-4">
        <PieChartIcon className="w-5 h-5 text-indigo-600" />
        <h3 className="font-bold text-slate-800">Gastos por Categoria</h3>
      </div>
      
      <div className="h-[250px] w-full text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              onClick={(data) => {
                if (onCategoryClick) onCategoryClick(data.name);
              }}
              cursor="pointer"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
              ))}
            </Pie>
            <Tooltip 
               formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
               contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36} 
              iconType="circle"
              formatter={(value) => <span className="text-slate-600 font-medium ml-1 cursor-pointer">{value}</span>}
              onClick={(props) => {
                if (onCategoryClick) onCategoryClick(props.value);
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-slate-400 text-center mt-2">Clique no gráfico para filtrar</p>
    </div>
  );
};