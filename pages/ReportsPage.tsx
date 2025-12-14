
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTransactions, useCategories, useAccounts } from '../hooks/useFirestore';
import { TransactionType } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, ComposedChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import DateRangePickerModal from '../components/DateRangePickerModal';
import ChevronDownIcon from '../components/icons/ChevronDownIcon';
import ChevronRightIcon from '../components/icons/ChevronRightIcon';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];
const FIXED_VAR_COLORS = ['#64748b', '#f59e0b']; // Slate (Fixo), Amber (Variável)
const RADIAN = Math.PI / 180;

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

// Helper for custom labels in Pie Chart
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  // Hide labels for small slices (< 5%) to prevent leaking/clutter
  if (percent < 0.05) return null;

  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor="middle" 
      dominantBaseline="central" 
      fontSize={11} 
      fontWeight="bold"
      style={{ pointerEvents: 'none', textShadow: '0px 0px 2px rgba(0,0,0,0.2)' }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// Helper to get UTC Date without time
const getUTCDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const KpiCard: React.FC<{ title: string, value: string, subtext?: string, colorClass?: string }> = ({ title, value, subtext, colorClass = "text-slate-800" }) => (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</h3>
        <div className="mt-2">
            <span className={`text-3xl font-bold ${colorClass}`}>{value}</span>
            {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
        </div>
    </div>
);

// --- Custom Dropdown Component ---
interface FilterOption {
    label: string;
    value: string;
}

const FilterDropdown: React.FC<{
    options: FilterOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}> = ({ options, value, onChange, placeholder, className = "w-48" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [ref]);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    const selectedOption = options.find(o => o.value === value);
    const label = selectedOption ? selectedOption.label : (placeholder || "Selecione...");

    return (
        <div className={`relative ${className}`} ref={ref}>
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            >
                <span className="truncate mr-2">{label}</span>
                <ChevronDownIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
            </button>
            {isOpen && (
                <div className="absolute right-0 top-full mt-1 w-full min-w-[220px] bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                    <div className="py-1">
                        {options.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => handleSelect(option.value)}
                                className={`block w-full text-left px-4 py-2 text-sm truncate transition-colors ${
                                    value === option.value 
                                    ? 'bg-blue-50 text-blue-700 font-medium' 
                                    : 'text-slate-700 hover:bg-slate-50'
                                }`}
                                title={option.label}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- DRE Components ---

const DreSubcategoryRow: React.FC<{ 
    data: { name: string, value: number, items: { name: string, value: number }[] }, 
    totalReference: number 
}> = ({ data, totalReference }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const hasItems = data.items && data.items.length > 0;

    return (
        <>
            <tr 
                className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => hasItems && setIsExpanded(!isExpanded)}
            >
                <td className="py-1.5 px-2 pl-8 flex items-center text-slate-600 text-sm font-medium">
                    <button className={`mr-2 p-0.5 rounded hover:bg-slate-200 ${!hasItems ? 'invisible' : ''}`}>
                        {isExpanded ? <ChevronDownIcon className="w-3 h-3 text-slate-400"/> : <ChevronRightIcon className="w-3 h-3 text-slate-400"/>}
                    </button>
                    {data.name}
                </td>
                <td className="py-1.5 px-2 text-right text-slate-600 text-sm font-medium">{formatCurrency(data.value)}</td>
                <td className="py-1.5 px-2 text-right text-slate-400 text-xs">
                    {/* Percentage relative to the total Income */}
                </td>
            </tr>
            {isExpanded && data.items.map((item, idx) => (
                <tr key={`${data.name}-item-${idx}`} className="bg-slate-50/30 border-b border-slate-50/50">
                    <td className="py-1 px-2 pl-16 text-slate-500 text-xs italic flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mr-2"></span>
                        {item.name}
                    </td>
                    <td className="py-1 px-2 text-right text-slate-500 text-xs">{formatCurrency(item.value)}</td>
                    <td className="py-1 px-2"></td>
                </tr>
            ))}
        </>
    );
};

const DreCategoryRow: React.FC<{ 
    data: { name: string, value: number, subcategories: any[] }, 
    totalReference: number 
}> = ({ data, totalReference }) => {
    const [isExpanded, setIsExpanded] = useState(false); // Categories start collapsed or expanded based on preference. Default collapsed to keep it clean.

    return (
        <React.Fragment>
            <tr 
                className="bg-slate-50/80 hover:bg-slate-100 cursor-pointer transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <td className="py-2.5 px-2 pl-2 flex items-center font-bold text-slate-700">
                    <button className="mr-2 p-1 rounded hover:bg-slate-200 text-slate-500">
                        {isExpanded ? <ChevronDownIcon className="w-4 h-4"/> : <ChevronRightIcon className="w-4 h-4"/>}
                    </button>
                    {data.name}
                </td>
                <td className="py-2.5 px-2 text-right font-bold text-slate-700">{formatCurrency(data.value)}</td>
                <td className="py-2.5 px-2 text-right text-slate-400 text-xs font-semibold">
                    {totalReference > 0 ? ((data.value / totalReference) * 100).toFixed(1) + '%' : '-'}
                </td>
            </tr>
            {isExpanded && data.subcategories.map((sub, idx) => (
                <DreSubcategoryRow 
                    key={`${data.name}-sub-${idx}`} 
                    data={sub} 
                    totalReference={totalReference} 
                />
            ))}
        </React.Fragment>
    );
};

const ReportsPage: React.FC = () => {
    const { transactions } = useTransactions();
    const { categories } = useCategories();
    const { accounts } = useAccounts();

    // Changed '30days' to 'currentMonth' and added 'lastMonth'
    const [period, setPeriod] = useState<'currentMonth' | 'lastMonth' | '3months' | '6months' | 'year' | 'all'>('currentMonth');
    const [categoryViewMode, setCategoryViewMode] = useState<'category' | 'structure'>('category');

    // Chart Filters
    const [incomeSubcategoryFilter, setIncomeSubcategoryFilter] = useState('');
    const [expenseItemFilter, setExpenseItemFilter] = useState('');

    // Mappings - Enhanced to include Item Name and isFixed
    const categoryMap = useMemo(() => {
        const map = new Map<string, { name: string, subName: string, itemName: string, color?: string, isFixed?: boolean }>();
        categories.forEach(cat => {
            cat.subcategories.forEach(sub => {
                sub.items.forEach(item => {
                    map.set(item.id, { 
                        name: cat.name, 
                        subName: sub.name, 
                        itemName: item.name, 
                        color: cat.color,
                        isFixed: item.isFixed 
                    });
                });
            });
        });
        return map;
    }, [categories]);

    const itemBalanceMap = useMemo(() => {
        const map = new Map<string, boolean>();
        categories.forEach(cat => {
            if (cat.subcategories) {
                cat.subcategories.forEach(sub => {
                    if (sub.items) {
                        sub.items.forEach(item => map.set(item.id, item.includeInBalance));
                    }
                });
            }
        });
        return map;
    }, [categories]);

    const accountMap = useMemo(() => new Map(accounts.map(acc => [acc.id, acc])), [accounts]);

    // Generate Filter Options
    const incomeSubcategoryOptions = useMemo(() => {
        const subs = new Set<string>();
        categories
            .filter(c => c.type === TransactionType.INCOME)
            .forEach(c => c.subcategories.forEach(s => subs.add(s.name)));
        return Array.from(subs).sort();
    }, [categories]);

    const expenseItemOptions = useMemo(() => {
        const items: {id: string, name: string, fullPath: string}[] = [];
        categories
            .filter(c => c.type === TransactionType.EXPENSE)
            .forEach(c => c.subcategories.forEach(s => s.items.forEach(i => {
                items.push({id: i.id, name: i.name, fullPath: `${s.name} > ${i.name}`});
            })));
        return items.sort((a, b) => a.name.localeCompare(b.name));
    }, [categories]);


    // Data Processing based on period (Updated logic for specific ranges)
    const filteredTransactions = useMemo(() => {
        const now = new Date();
        let startDate: Date;
        let endDate: Date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)); // Default end is today/now
        
        switch (period) {
            case 'currentMonth':
                startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
                endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
                break;
            case 'lastMonth':
                startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
                endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));
                break;
            case '3months': 
                startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1)); // Current + 2 prev
                break;
            case '6months': 
                startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1)); 
                break;
            case 'year': 
                startDate = new Date(Date.UTC(now.getUTCFullYear(), 0, 1)); // Current Year
                break;
            case 'all': 
                startDate = new Date(0); 
                break;
            default:
                startDate = new Date();
        }

        return transactions.filter(t => {
            const tDate = getUTCDate(t.date);
            return tDate >= startDate && tDate <= endDate;
        }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [transactions, period]);

    // --- REPORT 1: Evolution (Bar + Line) ---
    const evolutionData = useMemo(() => {
        const data = new Map<string, { name: string, Receitas: number, Despesas: number, Saldo: number, sortKey: number }>();
        
        filteredTransactions.forEach(t => {
            if (t.itemId && itemBalanceMap.get(t.itemId) === false) return; // Skip non-balance items

            const date = new Date(t.date);
            const key = `${date.getUTCMonth()}/${date.getUTCFullYear()}`; // 0/2023
            const label = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' });
            const sortKey = date.getUTCFullYear() * 100 + date.getUTCMonth();

            if (!data.has(key)) {
                data.set(key, { name: label, Receitas: 0, Despesas: 0, Saldo: 0, sortKey });
            }

            const entry = data.get(key)!;
            if (t.type === TransactionType.INCOME) {
                entry.Receitas += t.amount;
                entry.Saldo += t.amount;
            } else if (t.type === TransactionType.EXPENSE) {
                entry.Despesas += t.amount;
                entry.Saldo -= t.amount;
            }
        });

        return Array.from(data.values()).sort((a, b) => a.sortKey - b.sortKey);
    }, [filteredTransactions, itemBalanceMap]);

    // --- REPORT 2: Expenses by Payment Method (Account/Card) ---
    const paymentMethodData = useMemo(() => {
        const data = new Map<string, number>();

        filteredTransactions.forEach(t => {
            if (t.type !== TransactionType.EXPENSE) return;
            if (t.itemId && itemBalanceMap.get(t.itemId) === false) return;

            const account = accountMap.get(t.accountId);
            let label = account ? account.name : 'Conta Excluída';
            
            // Logic to append Card Name if available
            if (t.cardId && account?.cards) {
                const card = account.cards.find(c => c.id === t.cardId);
                if (card) {
                    label = `${account.name} - ${card.name}`;
                } else {
                    label = `${account.name} (Cartão)`;
                }
            } else if (account?.cards && account.cards.length > 0 && !t.cardId) {
                 // Account has cards but none selected -> Likely Debit/Transfer
                 label = `${account.name} (Débito/Conta)`;
            }

            data.set(label, (data.get(label) || 0) + t.amount);
        });

        return Array.from(data.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10); // Top 10 methods
    }, [filteredTransactions, accountMap, itemBalanceMap]);

    // --- REPORT 3: Expenses by Main Category ---
    const categoryChartData = useMemo(() => {
        const data = new Map<string, number>();
        let total = 0;

        filteredTransactions.forEach(t => {
            if (t.type !== TransactionType.EXPENSE) return;
            if (t.itemId && itemBalanceMap.get(t.itemId) === false) return;

            const catInfo = categoryMap.get(t.itemId || '');
            const name = catInfo ? catInfo.name : 'Outros';
            
            data.set(name, (data.get(name) || 0) + t.amount);
            total += t.amount;
        });

        return Array.from(data.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredTransactions, categoryMap, itemBalanceMap]);

    // --- REPORT 3.5: Fixed vs Variable Expenses ---
    const fixedVsVariableData = useMemo(() => {
        let fixed = 0;
        let variable = 0;
        
        filteredTransactions.forEach(t => {
            if (t.type !== TransactionType.EXPENSE) return;
            if (t.itemId && itemBalanceMap.get(t.itemId) === false) return;

            const catInfo = categoryMap.get(t.itemId || '');
            
            // Use the explicit flag set by the user, defaulting to false (Variable) if not set
            const isFixed = catInfo?.isFixed || false;
            
            if (isFixed) fixed += t.amount;
            else variable += t.amount;
        });

        return [
            { name: 'Gastos Fixos', value: fixed },
            { name: 'Gastos Variáveis', value: variable }
        ];
    }, [filteredTransactions, categoryMap, itemBalanceMap]);

    // --- REPORT 4: Daily Expenses (Chronological) ---
    const dailyExpensesData = useMemo(() => {
        const data = new Map<string, { label: string, value: number, dateMs: number }>();

        filteredTransactions.forEach(t => {
            if (t.type !== TransactionType.EXPENSE) return;
            if (t.itemId && itemBalanceMap.get(t.itemId) === false) return;

            // Apply Item Filter
            if (expenseItemFilter && t.itemId !== expenseItemFilter) return;

            const date = getUTCDate(t.date);
            const key = date.toISOString().split('T')[0]; // YYYY-MM-DD
            
            // Label format: DD/MM
            const label = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });

            if (!data.has(key)) {
                data.set(key, { label, value: 0, dateMs: date.getTime() });
            }

            const entry = data.get(key)!;
            entry.value += t.amount;
        });

        return Array.from(data.values()).sort((a, b) => a.dateMs - b.dateMs);
    }, [filteredTransactions, itemBalanceMap, expenseItemFilter]);

    // --- REPORT 5: Daily Income (Chronological) ---
    const dailyIncomeData = useMemo(() => {
        const data = new Map<string, { label: string, value: number, dateMs: number }>();

        filteredTransactions.forEach(t => {
            if (t.type !== TransactionType.INCOME) return;
            if (t.itemId && itemBalanceMap.get(t.itemId) === false) return;

            // Apply Subcategory Filter
            if (incomeSubcategoryFilter) {
                const info = categoryMap.get(t.itemId || '');
                if (info?.subName !== incomeSubcategoryFilter) return;
            }

            const date = getUTCDate(t.date);
            const key = date.toISOString().split('T')[0]; // YYYY-MM-DD
            
            // Label format: DD/MM
            const label = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });

            if (!data.has(key)) {
                data.set(key, { label, value: 0, dateMs: date.getTime() });
            }

            const entry = data.get(key)!;
            entry.value += t.amount;
        });

        return Array.from(data.values()).sort((a, b) => a.dateMs - b.dateMs);
    }, [filteredTransactions, itemBalanceMap, incomeSubcategoryFilter, categoryMap]);

    // --- REPORT 6: Detailed DRE Data (3 Levels) ---
    const dreData = useMemo(() => {
        // Structure: 
        // Map<CategoryName, { 
        //    total: number, 
        //    subcategories: Map<SubcategoryName, { total: number, items: Map<ItemName, number> }> 
        // }>
        const incomeGroups = new Map<string, { total: number, subcategories: Map<string, { total: number, items: Map<string, number> }> }>();
        const expenseGroups = new Map<string, { total: number, subcategories: Map<string, { total: number, items: Map<string, number> }> }>();
        
        let totalIncome = 0;
        let totalExpense = 0;

        filteredTransactions.forEach(t => {
            // Include only items marked for balance
            if (t.itemId && itemBalanceMap.get(t.itemId) === false) return;

            const catInfo = categoryMap.get(t.itemId || '');
            const catName = catInfo ? catInfo.name : 'Outros';
            const subName = catInfo ? catInfo.subName : 'Geral';
            const itemName = catInfo ? catInfo.itemName : 'Diversos';

            const targetMap = t.type === TransactionType.INCOME ? incomeGroups : expenseGroups;
            if (t.type === TransactionType.INCOME) totalIncome += t.amount;
            else if (t.type === TransactionType.EXPENSE) totalExpense += t.amount;

            // 1. Ensure Category Group Exists
            if (!targetMap.has(catName)) {
                targetMap.set(catName, { total: 0, subcategories: new Map() });
            }
            const catGroup = targetMap.get(catName)!;
            catGroup.total += t.amount;

            // 2. Ensure Subcategory Group Exists
            if (!catGroup.subcategories.has(subName)) {
                catGroup.subcategories.set(subName, { total: 0, items: new Map() });
            }
            const subGroup = catGroup.subcategories.get(subName)!;
            subGroup.total += t.amount;

            // 3. Update Item Total
            subGroup.items.set(itemName, (subGroup.items.get(itemName) || 0) + t.amount);
        });

        // Helper to convert Nested Maps to Nested Arrays for rendering
        const formatGroup = (groupMap: Map<string, { total: number, subcategories: Map<string, { total: number, items: Map<string, number> }> }>) => {
            return Array.from(groupMap.entries())
                .map(([name, data]) => ({
                    name,
                    value: data.total,
                    subcategories: Array.from(data.subcategories.entries())
                        .map(([subName, subData]) => ({ 
                            name: subName, 
                            value: subData.total,
                            items: Array.from(subData.items.entries())
                                .map(([itemName, itemValue]) => ({ name: itemName, value: itemValue }))
                                .sort((a,b) => b.value - a.value)
                        }))
                        .sort((a, b) => b.value - a.value)
                }))
                .sort((a, b) => b.value - a.value);
        };

        return {
            incomes: formatGroup(incomeGroups),
            expenses: formatGroup(expenseGroups),
            totalIncome,
            totalExpense,
            netResult: totalIncome - totalExpense,
            margin: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0
        };
    }, [filteredTransactions, categoryMap, itemBalanceMap]);

    // --- KPIs ---
    const kpis = useMemo(() => {
        let totalInc = 0;
        let totalExp = 0;
        let maxExpense = { desc: '', val: 0 };
        let daysCount = 0;
        
        if (filteredTransactions.length > 0) {
            const first = new Date(filteredTransactions[0].date);
            const last = new Date(filteredTransactions[filteredTransactions.length - 1].date);
            const diffTime = Math.abs(last.getTime() - first.getTime());
            daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
        }

        filteredTransactions.forEach(t => {
            if (t.itemId && itemBalanceMap.get(t.itemId) === false) return;

            if (t.type === TransactionType.INCOME) totalInc += t.amount;
            if (t.type === TransactionType.EXPENSE) {
                totalExp += t.amount;
                if (t.amount > maxExpense.val) {
                    maxExpense = { desc: t.description, val: t.amount };
                }
            }
        });

        const savingsRate = totalInc > 0 ? ((totalInc - totalExp) / totalInc) * 100 : 0;
        const avgDaily = daysCount > 0 ? totalExp / daysCount : 0;

        return {
            savingsRate,
            avgDaily,
            maxExpense,
            totalExp,
            totalInc
        };
    }, [filteredTransactions, itemBalanceMap]);
    
    // Determine active chart data and colors for Category card
    const activePieData = categoryViewMode === 'category' ? categoryChartData : fixedVsVariableData;
    const activeColors = categoryViewMode === 'category' ? COLORS : FIXED_VAR_COLORS;


    return (
        <div className="space-y-8 pb-10">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Relatórios Inteligentes</h2>
                    <p className="text-slate-500 text-sm">Análise detalhada do seu comportamento financeiro.</p>
                </div>
                <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm overflow-x-auto">
                    {[
                        { id: 'currentMonth', label: 'Mês Atual' },
                        { id: 'lastMonth', label: 'Mês Passado' },
                        { id: '3months', label: '3 Meses' },
                        { id: '6months', label: '6 Meses' },
                        { id: 'year', label: 'Este Ano' },
                        { id: 'all', label: 'Tudo' }
                    ].map(opt => (
                        <button
                            key={opt.id}
                            onClick={() => setPeriod(opt.id as any)}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                                period === opt.id 
                                ? 'bg-slate-800 text-white shadow' 
                                : 'text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard 
                    title="Taxa de Poupança" 
                    value={`${kpis.savingsRate.toFixed(1)}%`} 
                    colorClass={kpis.savingsRate > 20 ? 'text-green-600' : kpis.savingsRate > 0 ? 'text-blue-600' : 'text-red-600'}
                    subtext="Da sua renda foi economizada"
                />
                <KpiCard 
                    title="Média Diária" 
                    value={formatCurrency(kpis.avgDaily)} 
                    subtext="Gasto médio por dia no período"
                />
                <KpiCard 
                    title="Total Gerado" 
                    value={formatCurrency(kpis.totalInc)} 
                    subtext="Receitas totais no período"
                    colorClass="text-green-600"
                />
                <KpiCard 
                    title="Total Gasto" 
                    value={formatCurrency(kpis.totalExp)}
                    subtext="Neste período selecionado" 
                />
            </div>

            {/* Chart 1: Financial Evolution */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Evolução Financeira</h3>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={evolutionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(val) => `R$${val/1000}k`} />
                            <Tooltip 
                                cursor={{fill: 'transparent'}}
                                contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                                formatter={(value: number) => formatCurrency(value)}
                            />
                            <Legend wrapperStyle={{paddingTop: '20px'}} />
                            <Bar dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                            <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                            <Line type="monotone" dataKey="Saldo" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: '#fff'}} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* DRE Section (Detailed Interactive) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-800 px-6 py-4">
                    <h3 className="text-lg font-bold text-white">Demonstrativo de Resultado (DRE) Interativo</h3>
                    <p className="text-xs text-slate-300 mt-1">Clique nas categorias e subcategorias para expandir os detalhes.</p>
                </div>
                <div className="p-6">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b-2 border-slate-100">
                                    <th className="text-left py-2 font-semibold text-slate-500 uppercase tracking-wider pl-8">Descrição</th>
                                    <th className="text-right py-2 font-semibold text-slate-500 uppercase tracking-wider">Valor</th>
                                    <th className="text-right py-2 font-semibold text-slate-500 uppercase tracking-wider w-24">% Rec.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Incomes */}
                                <tr className="bg-green-50 font-bold border-b border-green-100">
                                    <td className="py-3 px-2 text-green-800 uppercase tracking-wide">1. RECEITAS BRUTAS</td>
                                    <td className="py-3 px-2 text-right text-green-800">{formatCurrency(dreData.totalIncome)}</td>
                                    <td className="py-3 px-2 text-right text-green-800">100%</td>
                                </tr>
                                {dreData.incomes.map((category, idx) => (
                                    <DreCategoryRow 
                                        key={`inc-cat-${idx}`} 
                                        data={category} 
                                        totalReference={dreData.totalIncome} 
                                    />
                                ))}

                                {/* Expenses */}
                                <tr className="bg-red-50 font-bold border-b border-red-100">
                                    <td className="py-3 px-2 text-red-800 mt-4 uppercase tracking-wide">2. (-) DESPESAS OPERACIONAIS</td>
                                    <td className="py-3 px-2 text-right text-red-800">{formatCurrency(dreData.totalExpense)}</td>
                                    <td className="py-3 px-2 text-right text-red-800">
                                        {dreData.totalIncome > 0 ? ((dreData.totalExpense / dreData.totalIncome) * 100).toFixed(1) + '%' : '-'}
                                    </td>
                                </tr>
                                {dreData.expenses.map((category, idx) => (
                                    <DreCategoryRow 
                                        key={`exp-cat-${idx}`} 
                                        data={category} 
                                        totalReference={dreData.totalIncome} 
                                    />
                                ))}

                                {/* Result */}
                                <tr className={`font-bold text-base border-t-2 ${dreData.netResult >= 0 ? 'bg-blue-50 text-blue-900 border-blue-200' : 'bg-orange-50 text-red-900 border-red-200'}`}>
                                    <td className="py-4 px-2 uppercase tracking-wide">(=) RESULTADO LÍQUIDO</td>
                                    <td className="py-4 px-2 text-right">{formatCurrency(dreData.netResult)}</td>
                                    <td className="py-4 px-2 text-right">{dreData.margin.toFixed(1)}%</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart 2: Expenses by Payment Method (With Cards) */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Por Meio de Pagamento</h3>
                    <p className="text-xs text-slate-500 mb-6">Análise detalhada por conta e cartões</p>
                    <div className="h-80 w-full">
                        {paymentMethodData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={paymentMethodData} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                    <XAxis type="number" hide />
                                    <YAxis 
                                        type="category" 
                                        dataKey="name" 
                                        width={120} 
                                        tick={{fill: '#475569', fontSize: 11}} 
                                        interval={0}
                                    />
                                    <Tooltip 
                                        cursor={{fill: 'rgba(241, 245, 249, 0.5)'}}
                                        contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0'}}
                                        formatter={(value: number) => [formatCurrency(value), 'Valor']}
                                    />
                                    <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={24}>
                                        {paymentMethodData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400">Sem dados de despesas.</div>
                        )}
                    </div>
                </div>

                {/* Chart 3: Expenses by Category / Structure */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="flex justify-between items-start mb-6">
                        <h3 className="text-lg font-bold text-slate-800">Raio-X das Categorias</h3>
                        <div className="flex bg-slate-100 rounded-lg p-0.5 text-xs font-medium">
                            <button 
                                onClick={() => setCategoryViewMode('category')}
                                className={`px-3 py-1.5 rounded-md transition-all ${categoryViewMode === 'category' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Categorias
                            </button>
                            <button 
                                onClick={() => setCategoryViewMode('structure')}
                                className={`px-3 py-1.5 rounded-md transition-all ${categoryViewMode === 'structure' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Fixos vs Variáveis
                            </button>
                        </div>
                    </div>
                    
                    <div className="h-80 w-full flex flex-col sm:flex-row items-center flex-grow">
                        <div className="w-full sm:w-1/2 h-64">
                             {activePieData.length > 0 && activePieData.some(d => d.value > 0) ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={activePieData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={renderCustomizedLabel}
                                            innerRadius={60}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            paddingAngle={2}
                                            dataKey="value"
                                        >
                                            {activePieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={activeColors[index % activeColors.length]} strokeWidth={0} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value: number) => [formatCurrency(value), 'Valor']} />
                                    </PieChart>
                                </ResponsiveContainer>
                             ) : (
                                <div className="flex items-center justify-center h-full text-slate-400">Sem dados.</div>
                             )}
                        </div>
                        <div className="w-full sm:w-1/2 mt-4 sm:mt-0 pl-0 sm:pl-6">
                            <ul className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                {activePieData.map((entry, index) => (
                                    <li key={index} className="flex justify-between items-center text-sm">
                                        <div className="flex items-center">
                                            <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: activeColors[index % activeColors.length] }}></span>
                                            <span className="text-slate-700 truncate max-w-[120px]" title={entry.name}>{entry.name}</span>
                                        </div>
                                        <span className="font-medium text-slate-900">{formatCurrency(entry.value)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Daily Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart 4: Daily Income (Chronological) */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Receitas Diárias</h3>
                            <p className="text-xs text-slate-500">Acompanhamento das entradas dia a dia.</p>
                        </div>
                        <FilterDropdown 
                            value={incomeSubcategoryFilter}
                            onChange={setIncomeSubcategoryFilter}
                            options={[
                                { label: 'Todas Subcategorias', value: '' },
                                ...incomeSubcategoryOptions.map(sub => ({ label: sub, value: sub }))
                            ]}
                            placeholder="Todas Subcategorias"
                            className="w-48"
                        />
                    </div>
                    
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dailyIncomeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                                <Tooltip 
                                    cursor={{fill: 'rgba(241, 245, 249, 0.5)'}}
                                    contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0'}}
                                    formatter={(value: number) => [formatCurrency(value), 'Valor']}
                                />
                                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Chart 5: Daily Expenses (Chronological) */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Gastos Diários</h3>
                            <p className="text-xs text-slate-500">Acompanhamento das despesas dia a dia.</p>
                        </div>
                        <FilterDropdown 
                            value={expenseItemFilter}
                            onChange={setExpenseItemFilter}
                            options={[
                                { label: 'Todos Itens', value: '' },
                                ...expenseItemOptions.map(item => ({ label: item.fullPath, value: item.id }))
                            ]}
                            placeholder="Todos Itens"
                            className="w-56"
                        />
                    </div>

                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dailyExpensesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                                <Tooltip 
                                    cursor={{fill: 'rgba(241, 245, 249, 0.5)'}}
                                    contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0'}}
                                    formatter={(value: number) => [formatCurrency(value), 'Valor']}
                                />
                                <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportsPage;
