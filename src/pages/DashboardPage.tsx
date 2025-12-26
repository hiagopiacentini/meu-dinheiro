import React, { useState, useMemo, useEffect } from 'react';
import { useTransactions, useCategories, useAccounts, useGoals, useManualSavings } from '../hooks/useFirestore';
import { TransactionType, Transaction } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import CategoryChart from '../components/CategoryChart';
import DateRangePickerModal from '../components/DateRangePickerModal';
import UpArrowIcon from '../components/icons/UpArrowIcon';
import DownArrowIcon from '../components/icons/DownArrowIcon';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()).toLocaleDateString('pt-BR');
};

const getNowGmtMinus4 = () => {
    const now = new Date();
    const offset = -4 * 60 * 60 * 1000;
    const localOffset = now.getTimezoneOffset() * 60 * 1000;
    return new Date(now.getTime() + localOffset + offset);
}

const getUTCDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

const StatCard: React.FC<{title: string, amount: number, percentage?: number, isPositive?: boolean, info?: string}> = ({title, amount, percentage, isPositive, info}) => (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-slate-500 mb-2 flex justify-between font-semibold text-sm">
            {title}
            {info && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-normal">{info}</span>}
        </h3>
        <p className="text-3xl font-bold text-slate-800 mb-2">{formatCurrency(amount)}</p>
        {percentage !== undefined && isPositive !== undefined && (
            <div className="flex items-center text-sm font-normal">
                {isPositive ? <UpArrowIcon className="w-4 h-4 text-green-500 mr-1" /> : <DownArrowIcon className="w-4 h-4 text-red-500 mr-1" />}
                <span className="text-green-500">{percentage.toFixed(1)}%</span>
            </div>
        )}
    </div>
);

const SavingsGoalCard: React.FC<{title: string, goal: number, current: number, label: string, color: string}> = ({title, goal, current, label, color}) => {
    const percentage = goal > 0 ? Math.max(0, Math.min(100, (current / goal) * 100)) : 0;
    return (
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <h4 className="font-semibold text-slate-700 text-sm">{label}</h4>
            <span className="text-sm font-bold text-blue-600">{percentage.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className={`${color} h-2 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-1">
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
        <p className="font-medium text-slate-700 text-sm">{description}</p>
        <p className="text-xs text-slate-500">{category}</p>
      </div>
    </div>
    <div className="text-right">
      <p className={`font-bold text-sm ${amount.startsWith('-') ? 'text-red-500' : 'text-green-500'}`}>{amount}</p>
      <p className="text-[10px] text-slate-400">{time}</p>
    </div>
  </div>
);

const TopListItem: React.FC<{ index: number, description: string, percentage: string, amount: number}> = ({index, description, percentage, amount}) => (
    <div className="flex items-center justify-between text-sm py-2">
      <div className="flex items-center">
        <span className="text-slate-500 mr-3">{index}.</span>
        <div>
            <p className="font-medium text-slate-700">{description}</p>
            <p className="text-xs text-slate-400">{percentage}</p>
        </div>
      </div>
      <p className="font-bold text-slate-800">{formatCurrency(amount)}</p>
    </div>
);

const DashboardPage: React.FC = () => {
  const { transactions } = useTransactions();
  const { categories } = useCategories();
  const { accounts } = useAccounts();
  const { goals } = useGoals();
  const { manualSavings } = useManualSavings();

  const [activeFilter, setActiveFilter] = useState('Mês Atual');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  
  const today = getNowGmtMinus4();
  const [dateRange, setDateRange] = useState<{start: Date | null, end: Date | null}>({ 
      start: new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1)), 
      end: new Date(Date.UTC(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)) 
  });

  const itemInfoMap = useMemo(() => {
    const map = new Map<string, { itemName: string, includeInBalance: boolean }>();
    categories.forEach(cat => {
        cat.subcategories.forEach(sub => {
            sub.items.forEach(item => {
                map.set(item.id, { 
                    itemName: item.name, 
                    includeInBalance: item.includeInBalance 
                });
            });
        });
    });
    return map;
  }, [categories]);

  useEffect(() => {
    const now = getNowGmtMinus4();
    let startUTC: Date;
    let endUTC: Date;

    if (activeFilter === 'Mês Atual') {
      startUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
      endUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));
    } else if (activeFilter === 'Este Ano') {
      startUTC = new Date(Date.UTC(now.getFullYear(), 0, 1));
      endUTC = new Date(Date.UTC(now.getFullYear(), 11, 31, 23, 59, 59, 999));
    } else {
      return;
    }
    
    setDateRange({ start: startUTC, end: endUTC });
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

  const manualSavingsInPeriod = useMemo(() => {
      if (!dateRange.start || !dateRange.end || !manualSavings) return 0;

      let total = 0;
      let current = new Date(Date.UTC(dateRange.start.getUTCFullYear(), dateRange.start.getUTCMonth(), 1));
      const endMonth = new Date(Date.UTC(dateRange.end.getUTCFullYear(), dateRange.end.getUTCMonth(), 1));

      let safety = 0;
      while (current <= endMonth && safety < 1000) {
          const y = String(current.getUTCFullYear());
          const m = String(current.getUTCMonth());
          
          if (manualSavings && manualSavings[y]) {
              const val = manualSavings[y][m];
              if (typeof val === 'number') {
                  total += val;
              }
          }
          current.setUTCMonth(current.getUTCMonth() + 1);
          safety++;
      }
      return total;
  }, [dateRange, manualSavings]);

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
        const itemInfo = itemInfoMap.get(t.itemId || '');
        const shouldInclude = !t.itemId || (itemInfo ? itemInfo.includeInBalance : true);
        
        if (shouldInclude) {
            if (t.type === TransactionType.INCOME) income += t.amount;
            else if (t.type === TransactionType.EXPENSE) expense += t.amount;
        }
      });
      
      return {
          filteredTransactions: filtered,
          periodIncome: income,
          periodExpenses: expense,
          periodSavings: (income - expense) + manualSavingsInPeriod,
      };
  
  }, [transactions, dateRange, itemInfoMap, manualSavingsInPeriod]);

  const { goalUntilNow, showGoalUntilNow } = useMemo(() => {
    const now = getNowGmtMinus4();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
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

    const annualGoal = goals[String(currentYear)] || 0;
    if (annualGoal === 0) {
      return { goalUntilNow: 0, showGoalUntilNow: false };
    }

    const monthlyGoal = annualGoal / 12;
    const daysInCurrentMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0)).getUTCDate();
    
    let calculatedGoal = 0;

    if (activeFilter === 'Personalizado' && dateRange.start && dateRange.end) {
        const diffTime = Math.abs(dateRange.end.getTime() - dateRange.start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
        calculatedGoal = (monthlyGoal / daysInCurrentMonth) * diffDays;
    } else { 
        const currentDayOfMonth = now.getDate();
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

    const isSingleMonth = start.getUTCFullYear() === end.getUTCFullYear() && start.getUTCMonth() === end.getUTCMonth();

    if (isSingleMonth) {
        const year = start.getUTCFullYear();
        const goalValue = goals[String(year)] || 0;
        const monthName = start.toLocaleString('pt-BR', { month: 'long', timeZone: 'UTC' });
        return {
            periodSpecificGoal: goalValue / 12,
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
            const annualGoalForCurrentYear = goals[String(y)] || 0;
            if (annualGoalForCurrentYear === 0) continue;
            const monthlyGoalForCurrentYear = annualGoalForCurrentYear / 12;
            const startMonthInLoop = (y === sYear) ? sMonth : 0;
            const endMonthInLoop = (y === eYear) ? eMonth : 11;

            for (let m = startMonthInLoop; m <= endMonthInLoop; m++) {
                const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
                const isStartMonth = y === sYear && m === sMonth;
                const isEndMonth = y === eYear && m === eMonth;

                if (isStartMonth && isEndMonth) {
                    const daysInRange = eDay - sDay + 1;
                    if (daysInMonth > 0) totalGoal += (monthlyGoalForCurrentYear / daysInMonth) * daysInRange;
                } else if (isStartMonth) {
                    if (sDay === 1) {
                        totalGoal += monthlyGoalForCurrentYear;
                    } else {
                        const daysInRange = daysInMonth - sDay + 1;
                        if (daysInMonth > 0) totalGoal += (monthlyGoalForCurrentYear / daysInMonth) * daysInRange;
                    }
                } else if (isEndMonth) {
                    if (eDay === daysInMonth) {
                        totalGoal += monthlyGoalForCurrentYear;
                    } else {
                        const daysInRange = eDay;
                        if (daysInMonth > 0) totalGoal += (monthlyGoalForCurrentYear / daysInMonth) * daysInRange;
                    }
                } else {
                    totalGoal += monthlyGoalForCurrentYear;
                }
            }
        }
        return totalGoal;
    };

    return {
        periodSpecificGoal: calculatePeriodGoal(),
        periodSpecificLabel: 'Meta do Período'
    };

}, [dateRange, goals]);

  const { annualSavingsToDate } = useMemo(() => {
    if (!dateRange.start) return { annualSavingsToDate: 0 };
    const year = dateRange.start.getUTCFullYear();
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const endOfPeriod = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    const transactionSavings = transactions.filter(t => {
        const tDate = getUTCDate(t.date);
        return tDate >= startOfYear && tDate <= endOfPeriod;
    }).reduce((acc, t) => {
        const itemInfo = itemInfoMap.get(t.itemId || '');
        const shouldInclude = !t.itemId || (itemInfo ? itemInfo.includeInBalance : true);
        if(shouldInclude){
            if (t.type === TransactionType.INCOME) return acc + t.amount;
            if (t.type === TransactionType.EXPENSE) return acc - t.amount;
        }
        return acc;
    }, 0);
    
    let manualSavingsTotal = 0;
    if (manualSavings && manualSavings[String(year)]) {
        const yearData = manualSavings[String(year)];
        if (yearData && typeof yearData === 'object') {
             manualSavingsTotal = (Object.values(yearData) as number[]).reduce((sum: number, val: number) => sum + (val || 0), 0);
        }
    }
    
    return { annualSavingsToDate: transactionSavings + manualSavingsTotal };
  }, [transactions, dateRange.start, itemInfoMap, manualSavings]);
  
  const { annualPeriodGoal, annualPeriodLabel } = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return { annualPeriodGoal: 0, annualPeriodLabel: 'Meta do Período' };
    
    const startYear = dateRange.start.getUTCFullYear();
    const endYear = dateRange.end.getUTCFullYear();

    if (startYear === endYear) {
      return { 
        annualPeriodGoal: goals[String(startYear)] || 0,
        annualPeriodLabel: `Meta Anual ${startYear}`
      };
    } else {
      let totalGoal = 0;
      let currentDate = new Date(dateRange.start);
      currentDate.setUTCDate(1); 

      while (currentDate <= dateRange.end) {
        const year = currentDate.getUTCFullYear();
        const annualGoalForYear = goals[String(year)] || 0;
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
      const yearForAxis = dateRange.start?.getUTCFullYear() || getNowGmtMinus4().getFullYear();

      monthNames.forEach((name, index) => {
          dataMap.set(`${name}/${yearForAxis}`, { Receitas: 0, Despesas: 0, monthIndex: index });
      });

      filteredTransactions.forEach(t => {
          const itemInfo = itemInfoMap.get(t.itemId || '');
          const shouldInclude = !t.itemId || (itemInfo ? itemInfo.includeInBalance : true);
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
  }, [filteredTransactions, dateRange, itemInfoMap]);

  const accountBalances = useMemo(() => {
    const balances = new Map<string, number>();
    accounts.forEach(acc => balances.set(acc.id, acc.initialBalance));
    transactions.forEach(t => {
        const updateBalance = (id: string, amount: number) => { 
            const current = balances.get(id);
            if(current !== undefined) {
                balances.set(id, current + amount); 
            }
        };
        
        if (t.cardId) {
             if (t.type === TransactionType.TRANSFER && t.destinationAccountId && t.cardId) {
                 updateBalance(t.accountId, -t.amount);
             }
        } else {
            if (t.type === TransactionType.INCOME) updateBalance(t.accountId, t.amount);
            else if (t.type === TransactionType.EXPENSE) updateBalance(t.accountId, -t.amount);
            else if (t.type === TransactionType.TRANSFER) {
                updateBalance(t.accountId, -t.amount);
                if(t.destinationAccountId) updateBalance(t.destinationAccountId, t.amount);
            }
        }
    });
    return balances;
  }, [accounts, transactions]);

  const topExpenses = useMemo(() => {
    const groupedExpenses = new Map<string, number>();
    let total = 0;

    filteredTransactions.forEach(t => {
        if (t.type !== TransactionType.EXPENSE) return;
        
        const itemInfo = itemInfoMap.get(t.itemId || '');
        if (itemInfo && itemInfo.includeInBalance === false) return;

        const name = itemInfo ? itemInfo.itemName : 'Outros';
        
        groupedExpenses.set(name, (groupedExpenses.get(name) || 0) + t.amount);
        total += t.amount;
    });

    return Array.from(groupedExpenses.entries())
        .map(([name, amount]) => ({ description: name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 4)
        .map(t => ({...t, percentage: total > 0 ? ((t.amount / total) * 100).toFixed(1) + '% do total' : '0% do total' }));
  }, [filteredTransactions, itemInfoMap]);
  
  const topIncomes = useMemo(() => {
    const groupedIncomes = new Map<string, number>();
    let total = 0;

    filteredTransactions.forEach(t => {
        if (t.type !== TransactionType.INCOME) return;
        
        const itemInfo = itemInfoMap.get(t.itemId || '');
        if (itemInfo && itemInfo.includeInBalance === false) return;

        const name = itemInfo ? itemInfo.itemName : 'Outros';
        
        groupedIncomes.set(name, (groupedIncomes.get(name) || 0) + t.amount);
        total += t.amount;
    });

    return Array.from(groupedIncomes.entries())
        .map(([name, amount]) => ({ description: name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 4)
        .map(t => ({...t, percentage: total > 0 ? ((t.amount / total) * 100).toFixed(1) + '% do total' : '0% do total' }));
  }, [filteredTransactions, itemInfoMap]);
  
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
        const displayedInstallmentGroups = new Set<string>();

        return [...transactions]
            .sort((a, b) => {
                const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;

                if (createdA > 0 && createdB > 0) {
                    return createdB - createdA;
                }
                
                if (createdA > 0) return -1;
                if (createdB > 0) return 1;

                return getUTCDate(b.date).getTime() - getUTCDate(a.date).getTime();
            })
            .filter(t => {
                if (t.type !== TransactionType.INCOME && t.type !== TransactionType.EXPENSE) return false;

                if (t.installmentGroupId) {
                    if (displayedInstallmentGroups.has(t.installmentGroupId)) {
                        return false;
                    }
                    displayedInstallmentGroups.add(t.installmentGroupId);
                }
                return true;
            })
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
            <button key={f} onClick={() => handleFilterClick(f)} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeFilter === f ? 'bg-blue-600 text-white font-bold shadow-sm' : 'bg-white text-slate-600 hover:bg-gray-100 border border-slate-200'}`}>
                {f}
            </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            title="Resultado" 
            amount={periodSavings} 
            info={manualSavingsInPeriod > 0 ? `Inclui ${formatCurrency(manualSavingsInPeriod)} manual` : undefined}
          />
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
        <h3 className="font-bold text-lg mb-4 text-slate-800 tracking-normal">Metas de Economia</h3>
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
              <h3 className="font-bold text-lg mb-4 text-slate-800 tracking-normal">Receitas vs. Despesas</h3>
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

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
         <h3 className="font-bold text-lg mb-2 text-slate-800 tracking-normal">Atividade Recente</h3>
         <div className="divide-y divide-slate-200">
             {recentTransactionsForDashboard.length > 0 ? (
                recentTransactionsForDashboard.map(({ transaction: t, category }) => (
                    <RecentActivityItem 
                        key={t.id}
                        color={category?.color}
                        description={t.description}
                        category={category?.name || 'Sem Categoria'}
                        amount={`${t.type === TransactionType.EXPENSE ? '-' : '+'} ${formatCurrency(t.amount)}`}
                        time={formatDate(t.date)}
                    />
                ))
            ) : (
                 <p className="text-center text-slate-500 py-4 font-normal text-sm">Nenhuma atividade recente.</p>
            )}
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
               <h3 className="font-bold text-lg mb-2 text-slate-800 tracking-normal">Top Despesas (Por Item)</h3>
               <div className="divide-y divide-slate-200">
                   {topExpenses.length > 0 ? topExpenses.map((item, index) => <TopListItem key={index} index={index + 1} description={item.description} percentage={item.percentage} amount={item.amount} />) : <p className="text-center text-slate-500 py-4 font-normal text-sm">Nenhuma despesa no período.</p>}
               </div>
           </div>
           <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-lg mb-2 text-slate-800 tracking-normal">Top Receitas (Por Item)</h3>
                <div className="divide-y divide-slate-200">
                   {topIncomes.length > 0 ? topIncomes.map((item, index) => <TopListItem key={index} index={index + 1} description={item.description} percentage={item.percentage} amount={item.amount} />) : <p className="text-center text-slate-500 py-4 font-normal text-sm">Nenhuma receita no período.</p>}
               </div>
           </div>
      </div>
    </div>
  );
};

export default DashboardPage;