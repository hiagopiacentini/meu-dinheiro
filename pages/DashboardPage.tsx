
import React, { useState, useMemo, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Transaction, TransactionType, Category, Account, AnnualGoals } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import CategoryChart from '../components/CategoryChart';
import DateRangePickerModal from '../components/DateRangePickerModal';
import UpArrowIcon from '../components/icons/UpArrowIcon';
import DownArrowIcon from '../components/icons/DownArrowIcon';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

// Helper function to create a UTC date from a local date string to avoid timezone issues.
const getUTCDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

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
    const date = getUTCDate(dateString);
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const diffInMs = today.getTime() - date.getTime();
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
      start: new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1)), 
      end: today 
  });

  const itemBalanceMap = useMemo(() => {
    const map = new Map<string, boolean>();
    categories.forEach(cat => cat.subcategories.forEach(sub => sub.items.forEach(item => map.set(item.id, item.includeInBalance))));
    return map;
  }, [categories]);

  useEffect(() => {
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    let startUTC: Date;

    if (activeFilter === 'Mês Atual') {
      startUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    } else if (activeFilter === 'Este Ano') {
      startUTC = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    } else {
      return;
    }
    
    setDateRange({ start: startUTC, end: todayUTC });
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

  const { filteredTransactions, periodIncome, periodExpenses, periodSavings } = useMemo(() => {
      if (!dateRange.start || !dateRange.end) {
          return { filteredTransactions: [], periodIncome: 0, periodExpenses: 0, periodSavings: 0 };
      }

      const start = new Date(dateRange.start.getTime());
      start.setUTCHours(0,0,0,0);
      const end = new Date(dateRange.end.getTime());
      end.setUTCHours(23,59,59,999);
      
      const filtered = transactions.filter(t => {
        const tDate = getUTCDate(t.date);
        return tDate >= start && tDate <= end;
      });
  
      let income = 0;
      let expense = 0;
      filtered.forEach(t => {
        const shouldInclude = !t.itemId || itemBalanceMap.get(t.itemId) !== false;
        if (shouldInclude) {
            if (t.type === TransactionType.INCOME) income += t.amount;
            else if (t.type === TransactionType.EXPENSE) expense += t.amount;
        }
      });
      
      return {
          filteredTransactions: filtered,
          periodIncome: income,
          periodExpenses: expense,
          periodSavings: income - expense,
      };
  
  }, [transactions, dateRange, itemBalanceMap]);

  const { goalUntilNow, showGoalUntilNow } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth();
    
    let isWithinCurrentMonth = false;
    if (activeFilter === 'Mês Atual') {
        isWithinCurrentMonth = true;
    } else if (activeFilter === 'Personalizado' && dateRange.start && dateRange.end) {
        const start = dateRange.start;
        const end = dateRange.end;
        if (
            start.getUTCFullYear() === currentYear &&
            start.getUTCMonth() === currentMonth &&
            end.getUTCFullYear() === currentYear &&
            end.getUTCMonth() === currentMonth
        ) {
            isWithinCurrentMonth = true;
        }
    }

    if (!isWithinCurrentMonth) {
        return { goalUntilNow: 0, showGoalUntilNow: false };
    }

    const annualGoal = goals[currentYear] || 0;
    if (annualGoal === 0) {
      return { goalUntilNow: 0, showGoalUntilNow: false };
    }

    const monthlyGoal = annualGoal / 12;
    const daysInCurrentMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0)).getUTCDate();
    
    let calculatedGoal = 0;

    if (activeFilter === 'Personalizado' && dateRange.start && dateRange.end) {
        // Custom range within the current month
        const diffTime = Math.abs(dateRange.end.getTime() - dateRange.start.getTime());
        // +1 to include both start and end days
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
        
        calculatedGoal = (monthlyGoal / daysInCurrentMonth) * diffDays;

    } else { // 'Mês Atual' filter
        const currentDayOfMonth = now.getUTCDate();
        const dailyGoal = monthlyGoal / daysInCurrentMonth;
        calculatedGoal = dailyGoal * currentDayOfMonth;
    }

    return {
      goalUntilNow: calculatedGoal,
      showGoalUntilNow: true,
    };
  }, [goals, activeFilter, dateRange]);

  const { periodSpecificGoal, periodSpecificLabel } = useMemo(() => {
    if (!dateRange.start || !dateRange.end) {
      return { periodSpecificGoal: 0, periodSpecificLabel: 'Meta Mensal' };
    }
  
    const start = dateRange.start;
    const end = dateRange.end;
  
    if (activeFilter === 'Mês Atual') {
      const year = start.getUTCFullYear();
      const annualGoal = goals[year] || 0;
      const monthName = start.toLocaleString('pt-BR', { month: 'long', timeZone: 'UTC' });
      return {
        periodSpecificGoal: annualGoal / 12,
        periodSpecificLabel: `Meta Mensal (${monthName})`
      };
    }
  
    const calculatePeriodGoal = () => {
      let totalGoal = 0;
      const sYear = start.getUTCFullYear();
      const sMonth = start.getUTCMonth();
      const sDay = start.getUTCDate();
      const eYear = end.getUTCFullYear();
      const eMonth = end.getUTCMonth();
      const eDay = end.getUTCDate();
  
      for (let y = sYear; y <= eYear; y++) {
        const annualGoalForCurrentYear = goals[y] || 0;
        if (annualGoalForCurrentYear === 0) continue;
        const monthlyGoalForCurrentYear = annualGoalForCurrentYear / 12;
        const startMonthInLoop = (y === sYear) ? sMonth : 0;
        const endMonthInLoop = (y === eYear) ? eMonth : 11;
  
        for (let m = startMonthInLoop; m <= endMonthInLoop; m++) {
          const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
          const isStartMonth = y === sYear && m === sMonth;
          const isEndMonth = y === eYear && m === eMonth;
  
          if (isStartMonth && isEndMonth) {
            const startDay = sDay;
            const endDay = eDay;
            if (startDay === 1 && endDay === daysInMonth) {
              totalGoal += monthlyGoalForCurrentYear;
            } else {
              const daysInRange = endDay - startDay + 1;
              if (daysInMonth > 0) totalGoal += (monthlyGoalForCurrentYear / daysInMonth) * daysInRange;
            }
          } else if (isStartMonth) {
            const startDay = sDay;
            if (startDay === 1) {
              totalGoal += monthlyGoalForCurrentYear;
            } else {
              const daysInRange = daysInMonth - startDay + 1;
              if (daysInMonth > 0) totalGoal += (monthlyGoalForCurrentYear / daysInMonth) * daysInRange;
            }
          } else if (isEndMonth) {
            const endDay = eDay;
            if (endDay === daysInMonth) {
              totalGoal += monthlyGoalForCurrentYear;
            } else {
              const daysInRange = endDay;
              if (daysInMonth > 0) totalGoal += (monthlyGoalForCurrentYear / daysInMonth) * daysInRange;
            }
          } else {
            totalGoal += monthlyGoalForCurrentYear;
          }
        }
      }
      return totalGoal;
    };
  
    const goalValue = calculatePeriodGoal();
    const isSingleMonth = start.getUTCFullYear() === end.getUTCFullYear() && start.getUTCMonth() === end.getUTCMonth();
  
    if (isSingleMonth && activeFilter !== 'Mês Atual') {
      const monthName = start.toLocaleString('pt-BR', { month: 'long', timeZone: 'UTC' });
      return {
        periodSpecificGoal: goalValue,
        periodSpecificLabel: `Meta Mensal (${monthName})`
      };
    } else if (!isSingleMonth) {
      return {
        periodSpecificGoal: goalValue,
        periodSpecificLabel: 'Meta do Período'
      };
    }
  
    // Fallback for Mês Atual if not caught above (though it should be)
    const year = start.getUTCFullYear();
    const annualGoal = goals[year] || 0;
    const monthName = start.toLocaleString('pt-BR', { month: 'long', timeZone: 'UTC' });
    return {
      periodSpecificGoal: annualGoal / 12,
      periodSpecificLabel: `Meta Mensal (${monthName})`
    };
  
  }, [dateRange, goals, activeFilter]);

  const { annualSavingsToDate } = useMemo(() => {
    if (!dateRange.start) return { annualSavingsToDate: 0 };

    const year = dateRange.start.getUTCFullYear();
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const now = new Date();
    
    const endOfPeriod = year === now.getUTCFullYear() 
        ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999))
        : new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    const savings = transactions.filter(t => {
        const tDate = getUTCDate(t.date);
        return tDate >= startOfYear && tDate <= endOfPeriod;
    }).reduce((acc, t) => {
        const shouldInclude = !t.itemId || itemBalanceMap.get(t.itemId) !== false;
        if(shouldInclude){
            if (t.type === TransactionType.INCOME) return acc + t.amount;
            if (t.type === TransactionType.EXPENSE) return acc - t.amount;
        }
        return acc;
    }, 0);
    
    return { annualSavingsToDate: savings };
  }, [transactions, dateRange.start, itemBalanceMap]);
  
  const { annualPeriodGoal, annualPeriodLabel } = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return { annualPeriodGoal: 0, annualPeriodLabel: 'Meta do Período' };
    
    const startYear = dateRange.start.getUTCFullYear();
    const endYear = dateRange.end.getUTCFullYear();

    if (startYear === endYear) {
      return { 
        annualPeriodGoal: goals[startYear] || 0,
        annualPeriodLabel: `Meta Anual ${startYear}`
      };
    } else {
      let totalGoal = 0;
      let currentDate = new Date(dateRange.start);
      currentDate.setUTCDate(1); 

      while (currentDate <= dateRange.end) {
        const year = currentDate.getUTCFullYear();
        const annualGoalForYear = goals[year] || 0;
        const monthlyGoal = annualGoalForYear / 12;
        totalGoal += monthlyGoal;
        
        currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
      }
        
      return {
        annualPeriodGoal: totalGoal,
        annualPeriodLabel: 'Meta do Período'
      };
    }
  }, [dateRange, goals]);
  
  const monthlyChartData = useMemo(() => {
      const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      
      const dataMap = new Map<string, { Receitas: number, Despesas: number, monthIndex: number }>();

      const yearForAxis = dateRange.start?.getUTCFullYear() || new Date().getFullYear();

      monthNames.forEach((name, index) => {
          dataMap.set(`${name}/${yearForAxis}`, { Receitas: 0, Despesas: 0, monthIndex: index });
      });

      filteredTransactions.forEach(t => {
          const shouldInclude = !t.itemId || itemBalanceMap.get(t.itemId) !== false;
          if (!shouldInclude) return;

          const tDate = getUTCDate(t.date);
          const monthIndex = tDate.getUTCMonth();
          const year = tDate.getUTCFullYear();
          const key = `${monthNames[monthIndex]}/${year}`;
          
          if (!dataMap.has(key)) {
              dataMap.set(key, { Receitas: 0, Despesas: 0, monthIndex });
          }
          const entry = dataMap.get(key)!;
          if (t.type === TransactionType.INCOME) entry.Receitas += t.amount;
          else if (t.type === TransactionType.EXPENSE) entry.Despesas += t.amount;
      });

      return Array.from(dataMap.entries())
          .map(([name, values]) => ({ name, ...values }))
          .sort((a, b) => a.monthIndex - b.monthIndex) 
          .filter(d => (dateRange.end?.getUTCFullYear() || 0) > (dateRange.start?.getUTCFullYear() || 1) || d.Receitas > 0 || d.Despesas > 0); 
  }, [filteredTransactions, dateRange, itemBalanceMap]);


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
        const now = new Date();
        const currentMonth = now.getUTCMonth();
        const currentYear = now.getUTCFullYear();

        const singleTransactions = transactions.filter(t => !t.installmentGroupId && (t.type === TransactionType.INCOME || t.type === TransactionType.EXPENSE));

        const installmentGroups = transactions.reduce<Record<string, Transaction[]>>((acc, t) => {
            if (t.installmentGroupId) {
                (acc[t.installmentGroupId] = acc[t.installmentGroupId] || []).push(t);
            }
            return acc;
        }, {});

        const relevantInstallments: Transaction[] = [];
        for (const groupId in installmentGroups) {
            const currentMonthInstallment = installmentGroups[groupId]
                .sort((a, b) => getUTCDate(b.date).getTime() - getUTCDate(a.date).getTime()) // most recent first
                .find(t => {
                    const tDate = getUTCDate(t.date);
                    return tDate.getUTCMonth() === currentMonth && tDate.getUTCFullYear() === currentYear;
                });
            if (currentMonthInstallment) {
                relevantInstallments.push(currentMonthInstallment);
            }
        }
        
        return [...singleTransactions, ...relevantInstallments]
            .sort((a, b) => getUTCDate(b.date).getTime() - getUTCDate(a.date).getTime())
            .slice(0, 4)
            .map(t => {
                const categoryInfo = itemToCategoryMap.get(t.itemId || '');
                return { transaction: t, category: categoryInfo };
            });

    }, [transactions, itemToCategoryMap]);

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
          <StatCard title="Resultado" amount={periodSavings} />
          <StatCard title="Receitas" amount={periodIncome} />
          <StatCard title="Despesas" amount={periodExpenses} />
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
          {showGoalUntilNow && (
            <SavingsGoalCard 
              title="Meta até o Momento" 
              goal={goalUntilNow} 
              current={periodSavings} 
              label="Meta até o Momento" 
              color="bg-purple-500" 
            />
          )}
          <SavingsGoalCard 
            title={periodSpecificLabel} 
            goal={periodSpecificGoal} 
            current={periodSavings} 
            label={periodSpecificLabel} 
            color="bg-blue-500" 
          />
          <SavingsGoalCard 
            title="Meta Anual" 
            goal={annualPeriodGoal} 
            current={annualSavingsToDate} 
            label={annualPeriodLabel} 
            color="bg-green-500" 
          />
        </div>
      </div>

       <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-lg mb-4 text-slate-800">Receitas vs. Despesas</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyChartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
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
