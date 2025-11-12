
import React, { useMemo } from 'react';
import { Transaction, TransactionType, Category } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface CategoryChartProps {
  transactions: Transaction[];
  categories: Category[];
}

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', 
  '#FF4560', '#775DD0', '#546E7A', '#26a69a'
];

const CategoryChart: React.FC<CategoryChartProps> = ({ transactions, categories }) => {
  const chartData = useMemo(() => {
    const itemToCategoryMap = new Map<string, string>();
    categories.forEach(cat => {
      cat.subcategories.forEach(sub => {
        sub.items.forEach(item => {
          itemToCategoryMap.set(item.id, cat.name);
        });
      });
    });
    
    const expenseData = new Map<string, number>();
    transactions
      .filter(t => t.type === TransactionType.EXPENSE && t.itemId)
      .forEach(t => {
        const categoryName = itemToCategoryMap.get(t.itemId);
        if (categoryName) {
            const currentAmount = expenseData.get(categoryName) || 0;
            expenseData.set(categoryName, currentAmount + t.amount);
        }
      });

    return Array.from(expenseData.entries()).map(([name, value]) => ({ name, value }));
  }, [transactions, categories]);

  return (
    <div className="h-full">
      <h2 className="text-xl font-bold mb-4 text-slate-800">Despesas por Categoria</h2>
      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-center text-slate-500">Nenhuma despesa para exibir no gráfico.</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
            >
              {chartData.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) =>
                new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(value)
              }
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
              }}
              labelStyle={{ color: '#1e293b' }}
              itemStyle={{ color: '#475569' }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default CategoryChart;