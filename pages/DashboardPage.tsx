
import React, { useState, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Transaction, TransactionType, Category } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import CategoryChart from '../components/CategoryChart';


const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const StatCard: React.FC<{title: string, income: number, expense: number}> = ({title, income, expense}) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-lg mb-3 text-slate-800">{title}</h3>
        <div className="space-y-2">
            <p className="text-green-500 flex justify-between"><span>Receitas:</span> <span>{formatCurrency(income)}</span></p>
            <p className="text-red-500 flex justify-between"><span>Despesas:</span> <span>{formatCurrency(expense)}</span></p>
            <hr className="border-slate-200 my-2"/>
            <p className="font-semibold mt-2 flex justify-between"><span>Resultado:</span> <span>{formatCurrency(income - expense)}</span></p>
        </div>
    </div>
);

const GoalCard: React.FC<{title: string, goal: number, current: number, color: string}> = ({title, goal, current, color}) => {
    const percentage = Math.max(0, Math.min(100, (current / goal) * 100));
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-lg mb-3">{title}</h3>
          <div className="flex justify-between text-sm text-slate-600">
            <span>{formatCurrency(current)}</span>
            <span>Meta: {formatCurrency(goal)}</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2.5 mt-2">
            <div className={`${color} h-2.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
          </div>
          <p className="text-right text-sm mt-1 font-medium">{percentage.toFixed(1)}% atingido</p>
        </div>
    );
}

const DashboardPage: React.FC = () => {
  const [transactions] = useLocalStorage<Transaction[]>('transactions', []);
  const [categories] = useLocalStorage<Category[]>('categories', []);
  const [monthlyGoal, setMonthlyGoal] = useLocalStorage<number>('monthlyGoal', 500);
  const [annualGoal, setAnnualGoal] = useLocalStorage<number>('annualGoal', 6000);

  const today = new Date();
  const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
  const lastDayOfYear = new Date(today.getFullYear(), 11, 31);
  
  const [startDate, setStartDate] = useState(firstDayOfYear.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(lastDayOfYear.toISOString().split('T')[0]);

  const { monthTotals, yearTotals, filteredTotals } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const calculateTotals = (trans: Transaction[]) => {
      return trans.reduce((acc, t) => {
        if (t.type === TransactionType.INCOME) acc.income += t.amount;
        else if (t.type === TransactionType.EXPENSE) acc.expense += t.amount;
        return acc;
      }, { income: 0, expense: 0 });
    };
    
    const monthTrans = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate.getUTCMonth() === currentMonth && tDate.getUTCFullYear() === currentYear;
    });

    const yearTrans = transactions.filter(t => new Date(t.date).getUTCFullYear() === currentYear);

    const filteredTrans = transactions.filter(t => {
        const tDate = new Date(t.date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        // Add time to dates to ensure the full day is included
        start.setUTCHours(0,0,0,0);
        end.setUTCHours(23,59,59,999);
        return tDate >= start && tDate <= end;
    });

    return { 
      monthTotals: calculateTotals(monthTrans),
      yearTotals: calculateTotals(yearTrans),
      filteredTotals: calculateTotals(filteredTrans)
    };
  }, [transactions, startDate, endDate]);

  const savingsMonth = monthTotals.income - monthTotals.expense;
  const savingsYear = yearTotals.income - yearTotals.expense;

  const monthlyChartData = useMemo(() => {
    const months: { name: string, Receitas: number, Despesas: number }[] = Array.from({ length: 12 }, (_, i) => ({
        name: new Date(0, i).toLocaleString('pt-BR', { month: 'short' }).replace('.','').toUpperCase(),
        Receitas: 0,
        Despesas: 0,
    }));
    
    transactions.forEach(t => {
        const transactionDate = new Date(t.date);
        const monthIndex = transactionDate.getUTCMonth();
        if(t.type === TransactionType.INCOME) months[monthIndex].Receitas += t.amount;
        else if (t.type === TransactionType.EXPENSE) months[monthIndex].Despesas += t.amount;
    });

    return months;
  }, [transactions]);
  
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold mb-4">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div>
               <label htmlFor="start-date" className="block text-sm font-medium text-slate-700 mb-1">Data Início</label>
               <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-style" />
           </div>
           <div>
               <label htmlFor="end-date" className="block text-sm font-medium text-slate-700 mb-1">Data Fim</label>
               <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-style" />
           </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Mês Atual" income={monthTotals.income} expense={monthTotals.expense} />
          <StatCard title="Ano Vigente" income={yearTotals.income} expense={yearTotals.expense} />
          <StatCard title="Período Filtrado" income={filteredTotals.income} expense={filteredTotals.expense} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GoalCard title="Meta de Economia Mensal" goal={monthlyGoal} current={savingsMonth} color="bg-blue-500" />
        <GoalCard title="Meta de Economia Anual" goal={annualGoal} current={savingsYear} color="bg-green-500" />
      </div>

       <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
             <CategoryChart transactions={transactions} categories={categories} />
          </div>
          <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-lg mb-4">Comparativo Mensal</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false}/>
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${formatCurrency(value as number).replace('R$','')} `} />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value as number)} 
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }} 
                    labelStyle={{ color: '#1e293b' }} 
                    itemStyle={{ fontWeight: 500, color: '#475569' }}/>
                  <Legend wrapperStyle={{fontSize: "14px"}}/>
                  <Bar dataKey="Receitas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
          </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-lg mb-2">Top 10 Despesas em Alta</h3>
              <p className="text-slate-500">Funcionalidade em desenvolvimento.</p>
           </div>
           <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-lg mb-2">Top 10 Receitas</h3>
              <p className="text-slate-500">Funcionalidade em desenvolvimento.</p>
           </div>
      </div>

    </div>
  );
};

export default DashboardPage;