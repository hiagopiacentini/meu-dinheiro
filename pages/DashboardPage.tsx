
import React, { useState, useMemo, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
// Fix: Import the AnnualGoals type to resolve the 'Cannot find name' error.
import { Transaction, TransactionType, Category, Account, AnnualGoals } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import CategoryChart from '../components/CategoryChart';
import DateRangePickerModal from '../components/DateRangePickerModal';
import UpArrowIcon from '../components/icons/UpArrowIcon';
import DownArrowIcon from '../components/icons/DownArrowIcon';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const StatCard: React.FC<{title: string, amount: number, percentage?: number, isPositive?: boolean}> = ({title, amount, percentage, isPositive}) => (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-slate-500 mb-2">{title}</h3>
        <p className="text-3xl font-bold text-slate-800 mb-2">{formatCurrency(amount)}</p>
        {percentage !== undefined && isPositive !== undefined && (
            <div className="flex items-center text-sm">
                {isPositive ? <UpArrowIcon className="w-4 h-4 text-green-500 mr-1" /> : <DownArrowIcon className="w-4 h-4 text-red-500 mr-1" />}
                <span className={isPositive ? 'text-green-500' : 'text-red-500'}>{percentage.toFixed(1)}%</span>
            </div>
        )}
    </div>
);

const SavingsGoalCard: React.FC<{title: string, goal: number, current: number, label: string, color: string}> = ({title, goal, current, label, color}) => {
    const percentage = goal > 0 ? Math.max(0, Math.min(100, (current / goal) * 100)) : 0;
    return (
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <h4 className="font-medium text-slate-700">{label}</h4>
            <span className="text-sm font-semibold text-blue-600">{percentage.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className={`${color} h-2 rounded-full`} style={{ width: `${percentage}%` }}></div>
          </div>
          <div className="flex justify-between text-sm text-slate-500 mt-1">
            <span>Atingido: {formatCurrency(current)}</span>
            <span>Meta: {formatCurrency(goal)}</span>
          </div>
        </div>
    );
}

const RecentActivityItem: React.FC<{color?: string, description: string, category: string, amount: string, time: string}> = ({color, description, category, amount, time}) => (
  <div className="flex items-center justify-between py-3">
    <div className="flex items-center">
      <div className="w-10 h-10 rounded-lg mr-3" style={{ backgroundColor: color || '#e2e8f0' }}></div>
      <div>
        <p className="font-semibold text-slate-800">{description}</p>
        <p className="text-sm text-slate-500">{category}</p>
      </div>
    </div>
    <div className="text-right">
      <p className={`font-bold ${amount.startsWith('-') ? 'text-red-500' : 'text-green-500'}`}>{amount}</p>
      <p className="text-sm text-slate-400">{time}</p>
    </div>
  </div>
);

const MyAccountItem: React.FC<{ name: string, type: string, balance: number}> = ({name, type, balance}) => (
    <div className="flex items-center justify-between py-2">
        <div>
            <p className="font-semibold text-slate-800">{name}</p>
            <p className="text-sm text-slate-500">{type}</p>
        </div>
        <p className={`font-bold ${balance < 0 ? 'text-red-500': 'text-slate-800'}`}>{formatCurrency(balance)}</p>
    </div>
);

const TopListItem: React.FC<{ index: number, description: string, percentage: string, amount: number}> = ({index, description, percentage, amount}) => (
    <div className="flex items-center justify-between text-sm py-2">
      <div className="flex items-center">
        <span className="text-slate-500 mr-3">{index}.</span>
        <div>
            <p className="font-semibold text-slate-800">{description}</p>
            <p className="text-xs text-slate-400">{percentage}</p>
        </div>
      </div>
      <p className="font-bold text-slate-800">{formatCurrency(amount)}</p>
    </div>
);

const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();

    const transactionDay = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    
    const diffInMs = today - transactionDay;
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Hoje';
    if (diffInDays === 1) return 'Ontem';
    if (diffInDays > 1) return `${diffInDays} dias atrás`;
    return 'Recentemente';
};


const DashboardPage: React.FC = () => {
  const [transactions] = useLocalStorage<Transaction[]>('transactions', []);
  const [categories] = useLocalStorage<Category[]>('categories', []);
  const [accounts] = useLocalStorage<Account[]>('accounts', []);
  const [goals] = useLocalStorage<AnnualGoals>('goals', {});

  const [activeFilter, setActiveFilter] = useState('Mês Atual');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  
  const today = new Date();
  const [dateRange, setDateRange] = useState<{start: Date | null, end: Date | null}>({ 
      start: new Date(today.getFullYear(), today.getMonth(), 1), 
      end: today 
  });

  useEffect(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    let start = new Date(today);

    if (activeFilter === 'Mês Atual') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (activeFilter === 'Este Ano') {
      start = new Date(today.getFullYear(), 0, 1);
    } else {
      return;
    }
    
    start.setHours(0, 0, 0, 0); // Start of the day
    setDateRange({ start, end: today });
  }, [activeFilter]);

  const handleFilterClick = (filter: string) => {
    setActiveFilter(filter);
    if (filter === 'Personalizado') {
        setIsPickerOpen(true);
    }
  };
  
  const handleDateChange = (range: { start: Date | null, end: Date | null }) => {
    setDateRange(range);
    setActiveFilter('Personalizado');
  };

  const { filteredTransactions, balanceAtPeriodEnd, periodIncome, periodExpenses } = useMemo(() => {
      const filtered = transactions.filter(t => {
        if (!dateRange.start || !dateRange.end) return false;
        const tDate = new Date(t.date);
        const start = new Date(dateRange.start);
        start.setHours(0,0,0,0);
        const end = new Date(dateRange.end);
        end.setHours(23,59,59,999);
        return tDate >= start && tDate <= end;
      });
  
      let income = 0;
      let expense = 0;
      filtered.forEach(t => {
        if (t.type === TransactionType.INCOME) income += t.amount;
        else if (t.type === TransactionType.EXPENSE) expense += t.amount;
      });
  
      const transactionsUntilPeriodEnd = transactions.filter(t => {
          if (!dateRange.end) return false;
          const tDate = new Date(t.date);
          const end = new Date(dateRange.end);
          end.setHours(23,59,59,999);
          return tDate <= end;
      });
      let balance = accounts.reduce((sum, acc) => sum + acc.initialBalance, 0);
      transactionsUntilPeriodEnd.forEach(t => {
          if (t.type === TransactionType.INCOME) balance += t.amount;
          else if (t.type === TransactionType.EXPENSE) balance -= t.amount;
      });
      
      return {
          filteredTransactions: filtered,
          balanceAtPeriodEnd: balance,
          periodIncome: income,
          periodExpenses: expense
      };
  
  }, [transactions, accounts, dateRange]);


  const periodSavings = periodIncome - periodExpenses;
  
  const { periodGoal, periodLabel } = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return { periodGoal: 0, periodLabel: 'Meta do Período' };
    
    const startYear = dateRange.start.getFullYear();
    const endYear = dateRange.end.getFullYear();

    if (startYear === endYear) {
        const annualGoal = goals[startYear] || 0;
        return { periodGoal: annualGoal, periodLabel: `Meta Anual ${startYear}` };
    }

    // Calculation for periods spanning multiple years
    let totalGoal = 0;
    const isLeap = (year: number) => new Date(year, 1, 29).getDate() === 29;

    for (let d = new Date(dateRange.start); d <= dateRange.end; d.setDate(d.getDate() + 1)) {
        const year = d.getFullYear();
        const annualGoalForYear = goals[year] || 0;
        const daysInYear = isLeap(year) ? 366 : 365;
        const dailyGoal = annualGoalForYear / daysInYear;
        totalGoal += dailyGoal;
    }
    
    return { periodGoal: totalGoal, periodLabel: 'Meta do Período' };

  }, [dateRange, goals]);
  
  
  const monthlyChartData = useMemo(() => {
    const dataMap = new Map<string, { Receitas: number, Despesas: number }>();
    filteredTransactions.forEach(t => {
        const key = new Date(t.date).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
        if (!dataMap.has(key)) dataMap.set(key, { Receitas: 0, Despesas: 0 });
        const entry = dataMap.get(key)!;
        if(t.type === TransactionType.INCOME) entry.Receitas += t.amount;
        else if (t.type === TransactionType.EXPENSE) entry.Despesas += t.amount;
    });

    return Array.from(dataMap.entries()).map(([name, values]) => ({ name, ...values }));
  }, [filteredTransactions]);

  const accountBalances = useMemo(() => {
    const balances = new Map<string, number>();
    accounts.forEach(acc => balances.set(acc.id, acc.initialBalance));
    transactions.forEach(t => {
        const updateBalance = (id: string, amount: number) => { if(balances.has(id)) balances.set(id, balances.get(id)! + amount); };
        if (t.type === TransactionType.INCOME) updateBalance(t.accountId, t.amount);
        else if (t.type === TransactionType.EXPENSE) updateBalance(t.accountId, -t.amount);
        else if (t.type === TransactionType.TRANSFER) {
            updateBalance(t.accountId, -t.amount);
            if(t.destinationAccountId) updateBalance(t.destinationAccountId, t.amount);
        }
    });
    return balances;
  }, [accounts, transactions]);

  const topExpenses = useMemo(() => {
    const total = filteredTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
    return filteredTransactions
        .filter(t => t.type === TransactionType.EXPENSE)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 4)
        .map(t => ({...t, percentage: total > 0 ? ((t.amount / total) * 100).toFixed(1) + '% do total' : '0% do total' }));
  }, [filteredTransactions]);
  
  const topIncomes = useMemo(() => {
    const total = filteredTransactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
    return filteredTransactions
        .filter(t => t.type === TransactionType.INCOME)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 4)
        .map(t => ({...t, percentage: total > 0 ? ((t.amount / total) * 100).toFixed(1) + '% do total' : '0% do total' }));
  }, [filteredTransactions]);
  
    const itemToCategoryMap = useMemo(() => {
        const map = new Map<string, { name: string, color?: string }>();
        if (categories) {
            categories.forEach(cat => {
                if (cat.subcategories) {
                    cat.subcategories.forEach(sub => {
                        if (sub.items) {
                            sub.items.forEach(item => {
                                map.set(item.id, { name: cat.name, color: cat.color });
                            });
                        }
                    });
                }
            });
        }
        return map;
    }, [categories]);

    const recentTransactionsForDashboard = useMemo(() => {
        return filteredTransactions
            .filter(t => t.type === TransactionType.INCOME || t.type === TransactionType.EXPENSE)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 4)
            .map(t => {
                const categoryInfo = itemToCategoryMap.get(t.itemId || '');
                return {
                    transaction: t,
                    category: categoryInfo
                };
            });
    }, [filteredTransactions, itemToCategoryMap]);

  return (
    <div className="space-y-6 relative">
      <div className="flex space-x-2">
        {['Mês Atual', 'Este Ano', 'Personalizado'].map(f => (
            <button key={f} onClick={() => handleFilterClick(f)} className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${activeFilter === f ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-gray-100 border border-slate-200'}`}>
                {f}
            </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Saldo no final do período" amount={balanceAtPeriodEnd} />
          <StatCard title="Receitas (Período)" amount={periodIncome} />
          <StatCard title="Despesas (Período)" amount={periodExpenses} />
      </div>

      <DateRangePickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        value={dateRange}
        onChange={handleDateChange}
      />

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-lg mb-4 text-slate-800">Metas de Economia</h3>
        <div className="space-y-4">
          <SavingsGoalCard title="Meta de Economia do Período" goal={periodGoal} current={periodSavings} label={periodLabel} color="bg-green-500" />
        </div>
      </div>

       <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-lg mb-4 text-slate-800">Receitas vs. Despesas</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} stroke="#64748b"/>
                  <YAxis fontSize={12} tickLine={false} axisLine={false} stroke="#64748b" tickFormatter={(value) => `R$${(value as number)/1000}k`} />
                  <Tooltip 
                    cursor={{fill: 'rgba(241, 245, 249, 0.5)'}}
                    formatter={(value) => formatCurrency(value as number)} 
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }} 
                    labelStyle={{ color: '#1e293b' }}/>
                  <Legend wrapperStyle={{fontSize: "14px", color: '#475569'}}/>
                  <Bar dataKey="Receitas" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={10} />
                  <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={10} />
                </BarChart>
              </ResponsiveContainer>
          </div>
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <CategoryChart transactions={filteredTransactions} categories={categories} />
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <h3 className="font-bold text-lg mb-2 text-slate-800">Atividade Recente</h3>
             <div className="divide-y divide-slate-200">
                 {recentTransactionsForDashboard.length > 0 ? (
                    recentTransactionsForDashboard.map(({ transaction: t, category }) => (
                        <RecentActivityItem 
                            key={t.id}
                            color={category?.color}
                            description={t.description}
                            category={category?.name || 'Sem Categoria'}
                            amount={`${t.type === TransactionType.EXPENSE ? '-' : '+'} ${formatCurrency(t.amount)}`}
                            time={getTimeAgo(t.date)}
                        />
                    ))
                ) : (
                     <p className="text-center text-slate-500 py-4">Nenhuma atividade recente.</p>
                )}
             </div>
          </div>
           <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <h3 className="font-bold text-lg mb-2 text-slate-800">Minhas Contas</h3>
              <div className="divide-y divide-slate-200">
                  {accounts.slice(0,3).map(acc => (
                      <MyAccountItem key={acc.id} name={acc.name} type={acc.bank || 'Conta Corrente'} balance={accountBalances.get(acc.id) || 0} />
                  ))}
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
               <h3 className="font-bold text-lg mb-2 text-slate-800">Top Despesas</h3>
               <div className="divide-y divide-slate-200">
                   {topExpenses.length > 0 ? topExpenses.map((item, index) => <TopListItem key={item.id} index={index + 1} description={item.description} percentage={item.percentage} amount={item.amount} />) : <p className="text-center text-slate-500 py-4">Nenhuma despesa no período.</p>}
               </div>
           </div>
           <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-lg mb-2 text-slate-800">Top Receitas</h3>
                <div className="divide-y divide-slate-200">
                   {topIncomes.length > 0 ? topIncomes.map((item, index) => <TopListItem key={item.id} index={index + 1} description={item.description} percentage={item.percentage} amount={item.amount} />) : <p className="text-center text-slate-500 py-4">Nenhuma receita no período.</p>}
               </div>
           </div>
      </div>
    </div>
  );
};

export default DashboardPage;
