
import React, { useMemo, useState } from 'react';
import { Transaction, TransactionType, Category } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface CategoryChartProps {
  transactions: Transaction[];
  categories: Category[];
}

const COLORS = ['#a855f7', '#3b82f6', '#facc15', '#64748b', '#ec4899', '#22c55e', '#f97316'];

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const CustomLegend: React.FC<{ payload: any[] }> = ({ payload }) => {
    const total = payload.reduce((acc: number, entry: any) => acc + entry.payload.value, 0);

    return (
        <ul className="text-sm space-y-2">
            {payload.map((entry: any, index: number) => (
                <li key={`item-${index}`} className="flex justify-between items-center">
                    <div className="flex items-center">
                        <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: entry.color }}></span>
                        <span className="text-slate-700">{entry.value}</span>
                    </div>
                    <span className="font-medium text-slate-500">{total > 0 ? ((entry.payload.value / total) * 100).toFixed(0) : 0}%</span>
                </li>
            ))}
        </ul>
    );
};

const CategoryChart: React.FC<CategoryChartProps> = ({ transactions, categories }) => {
  const [activeData, setActiveData] = useState<{ name: string, value: number } | null>(null);

  const { chartData, totalExpenses } = useMemo(() => {
    const itemToCategoryMap = new Map<string, string>();
    categories.forEach(cat => {
      cat.subcategories.forEach(sub => {
        sub.items.forEach(item => {
          itemToCategoryMap.set(item.id, cat.name);
        });
      });
    });
    
    const expenseData = new Map<string, number>();
    let total = 0;
    transactions
      .filter(t => t.type === TransactionType.EXPENSE && t.itemId)
      .forEach(t => {
        const categoryName = itemToCategoryMap.get(t.itemId!) || 'Outros';
        const currentAmount = expenseData.get(categoryName) || 0;
        expenseData.set(categoryName, currentAmount + t.amount);
        total += t.amount;
      });

    const data = Array.from(expenseData.entries()).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    return { chartData: data, totalExpenses: total };
  }, [transactions, categories]);

  return (
    <div className="h-full">
      <h2 className="text-lg font-bold mb-4 text-slate-800">Despesas por Categoria</h2>
      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-center text-slate-500">Nenhuma despesa para exibir no gráfico.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="relative h-48 w-48 mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      onMouseEnter={(_, index) => setActiveData(chartData[index])}
                      onMouseLeave={() => setActiveData(null)}
                    >
                      {chartData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-3">
                    {activeData ? (
                        <>
                            <span className="text-sm text-slate-500 text-center truncate max-w-full">{activeData.name}</span>
                            <span className="text-xl font-bold text-slate-800">{formatCurrency(activeData.value)}</span>
                        </>
                    ) : (
                        <>
                            <span className="text-xs text-slate-500">Total</span>
                            <span className="text-lg font-bold text-slate-800 text-center break-words">{formatCurrency(totalExpenses).replace('R$','R$ ')}</span>
                        </>
                    )}
                </div>
            </div>
            <div className="w-full">
                <CustomLegend payload={chartData.map((d,i) => ({value: d.name, color: COLORS[i % COLORS.length], payload: d}))} />
            </div>
        </div>
      )}
    </div>
  );
};

export default CategoryChart;