import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTransactions, useCategories, useAccounts } from '../hooks/useFirestore';
import { TransactionType } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  ComposedChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import DateRangePickerModal from '../components/DateRangePickerModal';
import ChevronDownIcon from '../components/icons/ChevronDownIcon';
import ChevronRightIcon from '../components/icons/ChevronRightIcon';
import PrivateValue from '../components/PrivateValue';
import { usePrivacy } from '../contexts/PrivacyContext';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];
const FIXED_VAR_COLORS = ['#64748b', '#f59e0b'];
const RADIAN = Math.PI / 180;

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const FilterDropdown: React.FC<{
    options: { label: string, value: string }[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}> = ({ options, value, onChange, placeholder, className = "w-48" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [ref]);

    const selectedOption = options.find(o => o.value === value);
    const label = selectedOption ? selectedOption.label : (placeholder || "Selecione...");

    return (
        <div className={`relative ${className}`} ref={ref}>
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="flex items-center justify-between w-full px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-all"
            >
                <span className="truncate mr-2">{label}</span>
                <ChevronDownIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
            </button>
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-full min-w-[220px] bg-white border border-slate-100 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                    <div className="py-1">
                        {options.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => { onChange(option.value); setIsOpen(false); }}
                                className={`block w-full text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider truncate transition-colors ${
                                    value === option.value ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                                }`}
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

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight="700">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const getUTCDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const KpiCard: React.FC<{ title: string, value: string | number, subtext?: string, colorClass?: string, isCurrency?: boolean }> = ({ title, value, subtext, colorClass = "text-slate-800", isCurrency = true }) => (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{title}</h3>
        <div>
            <p className={`text-3xl font-bold tracking-tight ${colorClass}`}>
                <PrivateValue>{typeof value === 'number' || isCurrency ? formatCurrency(Number(value)) : value}</PrivateValue>
            </p>
            {subtext && <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide">{subtext}</p>}
        </div>
    </div>
);

const DreSubcategoryRow: React.FC<{ 
    data: { name: string, value: number, items: { name: string, value: number }[] }, 
    totalReference: number 
}> = ({ data, totalReference }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const hasItems = data.items && data.items.length > 0;

    return (
        <>
            <tr className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => hasItems && setIsExpanded(!isExpanded)}>
                <td className="py-3 px-4 pl-10 flex items-center text-slate-600 text-sm font-semibold">
                    <button className={`mr-2 p-0.5 rounded ${!hasItems ? 'invisible' : ''}`}>
                        {isExpanded ? <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400"/> : <ChevronRightIcon className="w-3.5 h-3.5 text-slate-400"/>}
                    </button>
                    {data.name}
                </td>
                <td className="py-3 px-4 text-right text-slate-600 text-sm font-bold">
                    <PrivateValue>{formatCurrency(data.value)}</PrivateValue>
                </td>
                <td className="py-3 px-4 text-right text-slate-400 text-[10px] font-bold uppercase"></td>
            </tr>
            {isExpanded && data.items.map((item, idx) => (
                <tr key={`${data.name}-item-${idx}`} className="bg-slate-50/30 border-b border-slate-50/50">
                    <td className="py-2 px-4 pl-16 text-slate-400 text-[10px] font-bold italic flex items-center uppercase tracking-wide">
                        <span className="w-1 h-1 rounded-full bg-slate-300 mr-2"></span>
                        {item.name}
                    </td>
                    <td className="py-2 px-4 text-right text-slate-400 text-[10px] font-bold"><PrivateValue>{formatCurrency(item.value)}</PrivateValue></td>
                    <td className="py-2 px-4"></td>
                </tr>
            ))}
        </>
    );
};

const DreCategoryRow: React.FC<{ 
    data: { name: string, value: number, subcategories: any[] }, 
    totalReference: number 
}> = ({ data, totalReference }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    return (
        <React.Fragment>
            <tr className="bg-slate-50/50 hover:bg-slate-100 cursor-pointer transition-colors" onClick={() => setIsExpanded(!isExpanded)}>
                <td className="py-4 px-4 pl-4 flex items-center font-bold text-slate-700 text-sm uppercase tracking-tight">
                    <button className="mr-2 p-1 text-slate-400">
                        {isExpanded ? <ChevronDownIcon className="w-4 h-4"/> : <ChevronRightIcon className="w-4 h-4"/>}
                    </button>
                    {data.name}
                </td>
                <td className="py-4 px-4 text-right font-bold text-slate-700 text-base"><PrivateValue>{formatCurrency(data.value)}</PrivateValue></td>
                <td className="py-4 px-4 text-right text-slate-400 text-[10px] font-bold uppercase">
                    {totalReference > 0 ? ((data.value / totalReference) * 100).toFixed(1) + '%' : '-'}
                </td>
            </tr>
            {isExpanded && data.subcategories.map((sub, idx) => (
                <DreSubcategoryRow key={`${data.name}-sub-${idx}`} data={sub} totalReference={totalReference} />
            ))}
        </React.Fragment>
    );
};

const ReportsPage: React.FC = () => {
    const { transactions } = useTransactions();
    const { categories } = useCategories();
    const { accounts } = useAccounts();
    const { isPrivacyMode } = usePrivacy();

    const [period, setPeriod] = useState<'currentMonth' | 'lastMonth' | '3months' | '6months' | 'year' | 'all' | 'custom'>('currentMonth');
    const [categoryViewMode, setCategoryViewMode] = useState<'category' | 'structure'>('category');
    const [customDateRange, setCustomDateRange] = useState<{start: Date | null, end: Date | null}>({ start: null, end: null });
    const [isPickerOpen, setIsPickerOpen] = useState(false);

    const categoryMap = useMemo(() => {
        const map = new Map<string, { name: string, subName: string, itemName: string, color?: string, isFixed?: boolean }>();
        categories.forEach(cat => {
            cat.subcategories.forEach(sub => {
                sub.items.forEach(item => {
                    map.set(item.id, { name: cat.name, subName: sub.name, itemName: item.name, color: cat.color, isFixed: item.isFixed });
                });
            });
        });
        return map;
    }, [categories]);

    const itemBalanceMap = useMemo(() => {
        const map = new Map<string, boolean>();
        categories.forEach(cat => {
            cat.subcategories?.forEach(sub => {
                sub.items?.forEach(item => map.set(item.id, item.includeInBalance));
            });
        });
        return map;
    }, [categories]);

    const accountMap = useMemo(() => new Map(accounts.map(acc => [acc.id, acc])), [accounts]);

    const filteredTransactions = useMemo(() => {
        const now = new Date();
        let startDate: Date;
        let endDate: Date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
        
        switch (period) {
            case 'currentMonth':
                startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
                endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
                break;
            case 'lastMonth':
                startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
                endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));
                break;
            case '3months': startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1)); break;
            case '6months': startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1)); break;
            case 'year': startDate = new Date(Date.UTC(now.getUTCFullYear(), 0, 1)); break;
            case 'all': startDate = new Date(0); break;
            case 'custom':
                if (customDateRange.start && customDateRange.end) {
                    startDate = new Date(customDateRange.start.getTime()); startDate.setUTCHours(0, 0, 0, 0);
                    endDate = new Date(customDateRange.end.getTime()); endDate.setUTCHours(23, 59, 59, 999);
                } else { startDate = new Date(); endDate = new Date(); }
                break;
            default: startDate = new Date();
        }

        return transactions.filter(t => {
            const tDate = getUTCDate(t.date);
            return tDate >= startDate && tDate <= endDate;
        }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [transactions, period, customDateRange]);

    const evolutionData = useMemo(() => {
        const data = new Map<string, { name: string, Receitas: number, Despesas: number, Saldo: number, sortKey: number }>();
        filteredTransactions.forEach(t => {
            if (t.itemId && itemBalanceMap.get(t.itemId) === false) return;
            const date = new Date(t.date);
            const key = `${date.getUTCMonth()}/${date.getUTCFullYear()}`;
            const label = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' });
            const sortKey = date.getUTCFullYear() * 100 + date.getUTCMonth();
            if (!data.has(key)) data.set(key, { name: label, Receitas: 0, Despesas: 0, Saldo: 0, sortKey });
            const entry = data.get(key)!;
            if (t.type === TransactionType.INCOME) { entry.Receitas += t.amount; entry.Saldo += t.amount; }
            else if (t.type === TransactionType.EXPENSE) { entry.Despesas += t.amount; entry.Saldo -= t.amount; }
        });
        return Array.from(data.values()).sort((a, b) => a.sortKey - b.sortKey);
    }, [filteredTransactions, itemBalanceMap]);

    const paymentMethodData = useMemo(() => {
        const data = new Map<string, number>();
        filteredTransactions.forEach(t => {
            if (t.type !== TransactionType.EXPENSE || (t.itemId && itemBalanceMap.get(t.itemId) === false)) return;
            const account = accountMap.get(t.accountId);
            let label = account ? account.name : 'Outros';
            data.set(label, (data.get(label) || 0) + t.amount);
        });
        return Array.from(data.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
    }, [filteredTransactions, accountMap, itemBalanceMap]);

    const categoryChartData = useMemo(() => {
        const data = new Map<string, number>();
        filteredTransactions.forEach(t => {
            if (t.type !== TransactionType.EXPENSE || (t.itemId && itemBalanceMap.get(t.itemId) === false)) return;
            const catInfo = categoryMap.get(t.itemId || '');
            const name = catInfo ? catInfo.name : 'Outros';
            data.set(name, (data.get(name) || 0) + t.amount);
        });
        return Array.from(data.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [filteredTransactions, categoryMap, itemBalanceMap]);

    const fixedVsVariableData = useMemo(() => {
        let fixed = 0, variable = 0;
        filteredTransactions.forEach(t => {
            if (t.type !== TransactionType.EXPENSE || (t.itemId && itemBalanceMap.get(t.itemId) === false)) return;
            const catInfo = categoryMap.get(t.itemId || '');
            if (catInfo?.isFixed) fixed += t.amount;
            else variable += t.amount;
        });
        return [{ name: 'Fixo', value: fixed }, { name: 'Variável', value: variable }];
    }, [filteredTransactions, categoryMap, itemBalanceMap]);

    const dreData = useMemo(() => {
        const incomeGroups = new Map<string, { total: number, subcategories: Map<string, { total: number, items: Map<string, number> }> }>();
        const expenseGroups = new Map<string, { total: number, subcategories: Map<string, { total: number, items: Map<string, number> }> }>();
        let totalIncome = 0, totalExpense = 0;
        filteredTransactions.forEach(t => {
            if (t.itemId && itemBalanceMap.get(t.itemId) === false) return;
            const catInfo = categoryMap.get(t.itemId || '');
            const catName = catInfo ? catInfo.name : 'Outros';
            const subName = catInfo ? catInfo.subName : 'Geral';
            const itemName = catInfo ? catInfo.itemName : 'Diversos';
            const targetMap = t.type === TransactionType.INCOME ? incomeGroups : expenseGroups;
            if (t.type === TransactionType.INCOME) totalIncome += t.amount;
            else if (t.type === TransactionType.EXPENSE) totalExpense += t.amount;
            if (!targetMap.has(catName)) targetMap.set(catName, { total: 0, subcategories: new Map() });
            const catGroup = targetMap.get(catName)!;
            catGroup.total += t.amount;
            if (!catGroup.subcategories.has(subName)) catGroup.subcategories.set(subName, { total: 0, items: new Map() });
            const subGroup = catGroup.subcategories.get(subName)!;
            subGroup.total += t.amount;
            subGroup.items.set(itemName, (subGroup.items.get(itemName) || 0) + t.amount);
        });
        const formatGroup = (groupMap: Map<string, any>) => Array.from(groupMap.entries()).map(([name, data]) => ({
            name, value: data.total,
            subcategories: Array.from(data.subcategories.entries()).map(([subName, subData]: any) => ({ 
                name: subName, value: subData.total,
                items: Array.from(subData.items.entries()).map(([itemName, itemValue]: any) => ({ name: itemName, value: itemValue })).sort((a,b) => b.value - a.value)
            })).sort((a, b) => b.value - a.value)
        })).sort((a, b) => b.value - a.value);
        return { incomes: formatGroup(incomeGroups), expenses: formatGroup(expenseGroups), totalIncome, totalExpense, netResult: totalIncome - totalExpense, margin: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0 };
    }, [filteredTransactions, categoryMap, itemBalanceMap]);

    const kpis = useMemo(() => {
        let totalInc = 0, totalExp = 0;
        filteredTransactions.forEach(t => {
            if (t.itemId && itemBalanceMap.get(t.itemId) === false) return;
            if (t.type === TransactionType.INCOME) totalInc += t.amount;
            if (t.type === TransactionType.EXPENSE) totalExp += t.amount;
        });
        return { savingsRate: totalInc > 0 ? ((totalInc - totalExp) / totalInc) * 100 : 0, totalExp, totalInc, result: totalInc - totalExp };
    }, [filteredTransactions, itemBalanceMap]);

    const activePieData = categoryViewMode === 'category' ? categoryChartData : fixedVsVariableData;
    const activeColors = categoryViewMode === 'category' ? COLORS : FIXED_VAR_COLORS;

    return (
        <div className="space-y-8 pb-12">
            <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-fit overflow-x-auto">
                {['currentMonth', 'lastMonth', 'year', 'all', 'custom'].map(id => (
                    <button key={id} onClick={() => id === 'custom' ? setIsPickerOpen(true) : setPeriod(id as any)} className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all whitespace-nowrap ${period === id || (id==='year' && period==='year') ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
                        {id === 'currentMonth' ? 'Mês Atual' : id === 'lastMonth' ? 'Mês Passado' : id === 'year' ? 'Este Ano' : id === 'all' ? 'Tudo' : 'Personalizado'}
                    </button>
                ))}
            </div>

            <DateRangePickerModal isOpen={isPickerOpen} onClose={() => setIsPickerOpen(false)} value={customDateRange} onChange={setCustomDateRange} />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title="Resultado Líquido" value={kpis.result} colorClass={kpis.result >= 0 ? 'text-emerald-600' : 'text-rose-600'} />
                <KpiCard title="Economia Realizada" value={`${kpis.savingsRate.toFixed(1)}%`} isCurrency={false} colorClass="text-blue-600" subtext="Da sua renda bruta" />
                <KpiCard title="Receitas Totais" value={kpis.totalInc} colorClass="text-emerald-600" />
                <KpiCard title="Despesas Totais" value={kpis.totalExp} colorClass="text-rose-600" />
            </div>

            <div className={`bg-white p-8 rounded-xl border border-slate-200 shadow-sm ${isPrivacyMode ? 'blur-md select-none pointer-events-none' : ''}`}>
                <h3 className="text-lg font-bold text-slate-800 mb-8">Evolução do Fluxo de Caixa</h3>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={evolutionData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" fontSize={10} fontWeight="600" tickLine={false} axisLine={false} stroke="#94a3b8" />
                            <YAxis fontSize={10} fontWeight="600" tickLine={false} axisLine={false} stroke="#94a3b8" tickFormatter={(v) => `R$${v/1000}k`} />
                            <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px', fontWeight: '600' }} formatter={(v: number) => formatCurrency(v)} />
                            <Bar dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16} />
                            <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={16} />
                            <Line type="monotone" dataKey="Saldo" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: '#fff'}} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${isPrivacyMode ? 'blur-sm select-none pointer-events-none' : ''}`}>
                <div className="bg-slate-800 px-8 py-5">
                    <h3 className="text-lg font-bold text-white uppercase tracking-tight">Demonstrativo de Resultado (DRE)</h3>
                </div>
                <div className="p-4 overflow-x-auto">
                    <table className="w-full text-sm">
                        <tbody className="divide-y divide-slate-100">
                            <tr className="bg-emerald-50/50 font-bold">
                                <td className="py-4 px-4 text-emerald-800 uppercase tracking-wide text-[10px] font-bold">1. RECEITAS TOTAIS</td>
                                <td className="py-4 px-4 text-right text-emerald-800"><PrivateValue>{formatCurrency(dreData.totalIncome)}</PrivateValue></td>
                                <td className="py-4 px-4 text-right text-emerald-800 text-[11px]">100%</td>
                            </tr>
                            {dreData.incomes.map((category, idx) => (<DreCategoryRow key={`inc-${idx}`} data={category} totalReference={dreData.totalIncome} />))}
                            <tr className="bg-rose-50/50 font-bold">
                                <td className="py-4 px-4 text-rose-800 uppercase tracking-wide text-[10px] font-bold pt-8">2. DESPESAS TOTAIS</td>
                                <td className="py-4 px-4 text-right text-rose-800 pt-8"><PrivateValue>{formatCurrency(dreData.totalExpense)}</PrivateValue></td>
                                <td className="py-4 px-4 text-right text-rose-800 text-[11px] pt-8">{dreData.totalIncome > 0 ? ((dreData.totalExpense / dreData.totalIncome) * 100).toFixed(1) + '%' : '-'}</td>
                            </tr>
                            {dreData.expenses.map((category, idx) => (<DreCategoryRow key={`exp-${idx}`} data={category} totalReference={dreData.totalIncome} />))}
                            <tr className={`font-bold border-t-2 ${dreData.netResult >= 0 ? 'bg-blue-50 text-blue-900 border-blue-200' : 'bg-rose-50 text-rose-900 border-rose-200'}`}>
                                <td className="py-6 px-4 uppercase text-base tracking-tight">(=) RESULTADO DO PERÍODO</td>
                                <td className="py-6 px-4 text-right text-2xl tracking-tight"><PrivateValue>{formatCurrency(dreData.netResult)}</PrivateValue></td>
                                <td className="py-6 px-4 text-right">{dreData.margin.toFixed(1)}%</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-8 uppercase tracking-tight">Gastos por Instituição</h3>
                    <div className={`h-80 w-full ${isPrivacyMode ? 'blur-md select-none pointer-events-none' : ''}`}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={paymentMethodData} margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="name" width={100} fontSize={10} fontWeight="600" tickLine={false} axisLine={false} stroke="#64748b" />
                                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px', fontWeight: '600' }} />
                                <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={16}>
                                    {paymentMethodData.map((_, index) => (<Cell key={`c-${index}`} fill={COLORS[index % COLORS.length]} />))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Composição de Gastos</h3>
                        <div className="flex bg-slate-100 rounded-lg p-0.5 text-[10px] font-bold uppercase tracking-wider">
                            <button onClick={() => setCategoryViewMode('category')} className={`px-3 py-1.5 rounded-md transition-all ${categoryViewMode === 'category' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Categoria</button>
                            <button onClick={() => setCategoryViewMode('structure')} className={`px-3 py-1.5 rounded-md transition-all ${categoryViewMode === 'structure' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Fixos/Var</button>
                        </div>
                    </div>
                    <div className={`flex flex-col sm:flex-row items-center flex-grow ${isPrivacyMode ? 'blur-md select-none pointer-events-none' : ''}`}>
                        <div className="w-full sm:w-1/2 h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={activePieData} cx="50%" cy="50%" labelLine={false} label={renderCustomizedLabel} innerRadius={60} outerRadius={85} paddingAngle={2} dataKey="value">
                                        {activePieData.map((_, index) => (<Cell key={`pc-${index}`} fill={activeColors[index % activeColors.length]} strokeWidth={0} />))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '12px', fontWeight: '600', fontSize: '11px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-full sm:w-1/2 mt-4 sm:mt-0 pl-0 sm:pl-8 space-y-3">
                            {activePieData.map((entry, index) => (
                                <div key={index} className="flex justify-between items-center text-xs font-semibold uppercase tracking-wide">
                                    <div className="flex items-center">
                                        <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: activeColors[index % activeColors.length] }}></span>
                                        <span className="text-slate-600 truncate max-w-[100px]">{entry.name}</span>
                                    </div>
                                    <span className="text-slate-900"><PrivateValue>{formatCurrency(entry.value)}</PrivateValue></span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportsPage;