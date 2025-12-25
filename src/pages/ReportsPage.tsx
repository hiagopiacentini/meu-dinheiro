
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTransactions, useCategories, useAccounts, useCDBs } from '../hooks/useFirestore';
import { TransactionType, Transaction } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  ComposedChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import DateRangePickerModal from '../components/DateRangePickerModal';
import ChevronDownIcon from '../components/icons/ChevronDownIcon';
import ChevronRightIcon from '../components/icons/ChevronRightIcon';
import SearchIcon from '../components/icons/SearchIcon';
import XIcon from '../components/icons/XIcon';
import PrivateValue from '../components/PrivateValue';
import { usePrivacy } from '../contexts/PrivacyContext';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const getNowGmtMinus4 = () => {
    const now = new Date();
    const offset = -4 * 60 * 60 * 1000;
    const localOffset = now.getTimezoneOffset() * 60 * 1000;
    return new Date(now.getTime() + localOffset + offset);
}

const getUTCDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const KpiCard: React.FC<{ title: string, value: string | number, subtext?: string, colorClass?: string, isCurrency?: boolean }> = ({ title, value, subtext, colorClass = "text-slate-800", isCurrency = true }) => (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-1 hover:shadow-md transition-all">
        <h3 className="text-sm font-medium text-slate-400 tracking-normal">{title}</h3>
        <div>
            <p className={`text-3xl md:text-4xl font-bold tracking-normal ${colorClass}`}>
                <PrivateValue>{typeof value === 'number' || isCurrency ? formatCurrency(Number(value)) : value}</PrivateValue>
            </p>
            {subtext && <p className="text-xs text-slate-400 font-normal tracking-normal mt-1">{subtext}</p>}
        </div>
    </div>
);

const BreakdownModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    title: string;
    data: any[];
    accountMap: Map<string, string>;
}> = ({ isOpen, onClose, title, data, accountMap }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 tracking-normal">Detalhamento</h2>
                        <p className="text-sm text-slate-500 font-normal tracking-normal">{title}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="overflow-y-auto flex-1 p-0">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-slate-500 text-xs font-normal sticky top-0">
                            <tr>
                                <th className="px-6 py-3 tracking-normal font-normal">Data</th>
                                <th className="px-6 py-3 tracking-normal font-normal">Descrição</th>
                                <th className="px-6 py-3 tracking-normal font-normal">Conta</th>
                                <th className="px-6 py-3 text-right tracking-normal font-normal">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.length === 0 ? (
                                <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-500 italic tracking-normal">Nenhum registro encontrado.</td></tr>
                            ) : (
                                data.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap tracking-normal">
                                            {new Date(item.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                        </td>
                                        <td className="px-6 py-4 text-slate-800 font-normal truncate max-w-[200px] tracking-normal">
                                            {item.description || item.cdbName || 'Rendimento CDB'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap tracking-normal">
                                            {accountMap.get(item.accountId) || 'Investimento'}
                                        </td>
                                        <td className={`px-6 py-4 text-right font-bold ${item.type === 'expense' ? 'text-rose-500' : 'text-emerald-500'} tracking-normal`}>
                                            <PrivateValue>{formatCurrency(item.amount || item.value || 0)}</PrivateValue>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
                    <span className="text-xs text-slate-500 mr-2 font-normal tracking-normal">Total do período:</span>
                    <span className="text-lg font-bold text-slate-800 tracking-normal">
                        <PrivateValue>{formatCurrency(data.reduce((acc, curr) => acc + (curr.amount || curr.value || 0), 0))}</PrivateValue>
                    </span>
                </div>
            </div>
        </div>
    );
}

const DreSubcategoryRow: React.FC<{ 
    data: { name: string, value: number, items: { name: string, value: number, txs: any[] }[], txs: any[] },
    totalIncome: number,
    onShowBreakdown: (title: string, txs: any[]) => void
}> = ({ data, totalIncome, onShowBreakdown }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const hasItems = data.items && data.items.length > 0;

    return (
        <>
            <tr className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors group" onClick={() => hasItems && setIsExpanded(!isExpanded)}>
                <td className="py-3 px-4 pl-10 flex items-center text-slate-600 text-sm font-medium tracking-normal">
                    <button className={`mr-2 p-0.5 rounded transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'} ${!hasItems ? 'invisible' : ''}`}>
                        <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400"/>
                    </button>
                    {data.name}
                </td>
                <td className="py-3 px-2 text-right text-slate-600 text-sm font-semibold tracking-normal">
                    <div className="flex items-center justify-end gap-2">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onShowBreakdown(data.name, data.txs); }}
                            className="p-1 hover:bg-blue-100 text-blue-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <SearchIcon className="w-3.5 h-3.5" />
                        </button>
                        <PrivateValue>{formatCurrency(data.value)}</PrivateValue>
                    </div>
                </td>
                <td className="py-3 pl-2 pr-6 text-right text-slate-400 text-xs font-medium tracking-normal w-24">
                    {totalIncome > 0 ? ((data.value / totalIncome) * 100).toFixed(1) + '%' : '-'}
                </td>
            </tr>
            {isExpanded && data.items.map((item, idx) => (
                <tr key={`${data.name}-item-${idx}`} className="bg-slate-50/20 border-b border-slate-50/50 group">
                    <td className="py-2.5 px-4 pl-16 text-slate-500 text-[11px] font-normal flex items-center tracking-normal">
                        <span className="w-1 h-1 rounded-full bg-slate-200 mr-3"></span>
                        {item.name}
                    </td>
                    <td className="py-2.5 px-2 text-right text-slate-500 text-[11px] font-normal tracking-normal">
                        <div className="flex items-center justify-end gap-2">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onShowBreakdown(item.name, item.txs); }}
                                className="p-1 hover:bg-blue-100 text-blue-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <SearchIcon className="w-3 h-3" />
                            </button>
                            <PrivateValue>{formatCurrency(item.value)}</PrivateValue>
                        </div>
                    </td>
                    <td className="py-2.5 pl-2 pr-6 w-24"></td>
                </tr>
            ))}
        </>
    );
};

const DreCategoryRow: React.FC<{ 
    data: { name: string, value: number, subcategories: any[], txs: any[] }, 
    totalIncome: number,
    onShowBreakdown: (title: string, txs: any[]) => void
}> = ({ data, totalIncome, onShowBreakdown }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    return (
        <React.Fragment>
            <tr className="bg-white hover:bg-slate-50 cursor-pointer transition-colors group border-b border-slate-100" onClick={() => setIsExpanded(!isExpanded)}>
                <td className="py-4 px-4 pl-4 flex items-center font-bold text-slate-800 text-sm tracking-normal">
                    <button className={`mr-2 p-1 text-slate-400 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
                        <ChevronDownIcon className="w-4 h-4"/>
                    </button>
                    {data.name}
                </td>
                <td className="py-4 px-2 text-right font-bold text-slate-800 text-base tracking-normal">
                    <div className="flex items-center justify-end gap-2">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onShowBreakdown(data.name, data.txs); }}
                            className="p-1.5 hover:bg-blue-100 text-blue-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <SearchIcon className="w-4 h-4" />
                        </button>
                        <PrivateValue>{formatCurrency(data.value)}</PrivateValue>
                    </div>
                </td>
                <td className="py-4 pl-2 pr-6 text-right text-slate-500 text-sm font-bold tracking-normal w-24">
                    {totalIncome > 0 ? ((data.value / totalIncome) * 100).toFixed(1) + '%' : '-'}
                </td>
            </tr>
            {isExpanded && data.subcategories.map((sub, idx) => (
                <DreSubcategoryRow key={`${data.name}-sub-${idx}`} data={sub} totalIncome={totalIncome} onShowBreakdown={onShowBreakdown} />
            ))}
        </React.Fragment>
    );
};

const ReportsPage: React.FC = () => {
    const { transactions } = useTransactions();
    const { categories } = useCategories();
    const { accounts } = useAccounts();
    const { cdbs } = useCDBs();
    const { isPrivacyMode } = usePrivacy();

    const [period, setPeriod] = useState<'currentMonth' | 'lastMonth' | '3months' | '6months' | 'year' | 'all' | 'custom'>('currentMonth');
    const [sourceFilter, setSourceFilter] = useState<string>('all'); // 'all', 'investments', accountId, 'card|cardId'
    const [customDateRange, setCustomDateRange] = useState<{start: Date | null, end: Date | null}>({ start: null, end: null });
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [breakdownModal, setBreakdownModal] = useState<{ open: boolean, title: string, txs: any[] }>({ open: false, title: '', txs: [] });

    const accountMap = useMemo(() => new Map(accounts.map(acc => [acc.id, acc.name])), [accounts]);

    const handleDateChange = (range: { start: Date | null, end: Date | null }) => {
        setCustomDateRange(range);
        setPeriod('custom');
    };

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

    const yieldItemInfo = useMemo(() => {
        for (const cat of categories) {
            for (const sub of cat.subcategories) {
                for (const item of sub.items) {
                    if (item.name.trim().toLowerCase() === 'rendimentos') {
                        return { id: item.id, catName: cat.name, subName: sub.name, itemName: item.name };
                    }
                }
            }
        }
        return null;
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

    const dateBoundaries = useMemo(() => {
        const now = getNowGmtMinus4();
        let start: Date;
        let end: Date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));
        
        switch (period) {
            case 'currentMonth':
                start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
                end = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));
                break;
            case 'lastMonth':
                start = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1));
                end = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999));
                break;
            case '3months': start = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 2, 1)); break;
            case '6months': start = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 5, 1)); break;
            case 'year': start = new Date(Date.UTC(now.getFullYear(), 0, 1)); break;
            case 'all': start = new Date(0); break;
            case 'custom':
                if (customDateRange.start && customDateRange.end) {
                    start = new Date(customDateRange.start.getTime()); start.setUTCHours(0, 0, 0, 0);
                    end = new Date(customDateRange.end.getTime()); end.setUTCHours(23, 59, 59, 999);
                } else { start = new Date(); end = new Date(); }
                break;
            default: start = new Date();
        }
        return { start, end };
    }, [period, customDateRange]);

    const { reportTransactions, reportYields } = useMemo(() => {
        const { start, end } = dateBoundaries;
        
        let txs = transactions.filter(t => {
            const tDate = getUTCDate(t.date);
            return tDate >= start && tDate <= end;
        });

        // Aplicar Filtro de Origem
        if (sourceFilter !== 'all') {
            if (sourceFilter === 'investments') {
                txs = txs.filter(t => t.itemId && yieldItemInfo && t.itemId === yieldItemInfo.id);
            } else if (sourceFilter.startsWith('card|')) {
                const cardId = sourceFilter.split('|')[1];
                txs = txs.filter(t => t.cardId === cardId);
            } else {
                // Conta específica
                txs = txs.filter(t => (t.accountId === sourceFilter || t.destinationAccountId === sourceFilter) && !t.cardId);
            }
        }

        const yields: { date: string, amount: number, cdbName: string, id: string }[] = [];
        cdbs.forEach(cdb => {
            let shouldIncludeYield = false;
            if (sourceFilter === 'all' || sourceFilter === 'investments') {
                shouldIncludeYield = true;
            } else if (cdb.linkedAccountId === sourceFilter) {
                shouldIncludeYield = true;
            }

            if (shouldIncludeYield) {
                (cdb.yieldHistory || []).forEach(entry => {
                    const eDate = getUTCDate(entry.date);
                    if (eDate >= start && eDate <= end) {
                        yields.push({ date: entry.date, amount: entry.amount, cdbName: cdb.name, id: entry.id });
                    }
                });
            }
        });

        return { reportTransactions: txs, reportYields: yields };
    }, [transactions, cdbs, dateBoundaries, sourceFilter, yieldItemInfo]);

    const dreData = useMemo(() => {
        const incomeGroups = new Map<string, { total: number, txs: any[], subcategories: Map<string, { total: number, txs: any[], items: Map<string, { total: number, txs: any[] }> }> }>();
        const expenseGroups = new Map<string, { total: number, txs: any[], subcategories: Map<string, { total: number, txs: any[], items: Map<string, { total: number, txs: any[] }> }> }>();
        let totalIncome = 0, totalExpense = 0;

        reportTransactions.forEach(t => {
            if (t.itemId && itemBalanceMap.get(t.itemId) === false) return;
            if (yieldItemInfo && t.itemId === yieldItemInfo.id) return;

            const catInfo = categoryMap.get(t.itemId || '');
            if (!catInfo) return;

            const targetMap = t.type === TransactionType.INCOME ? incomeGroups : expenseGroups;
            if (t.type === TransactionType.INCOME) totalIncome += t.amount;
            else if (t.type === TransactionType.EXPENSE) totalExpense += t.amount;

            const { name: catName, subName, itemName } = catInfo;

            if (!targetMap.has(catName)) targetMap.set(catName, { total: 0, txs: [], subcategories: new Map() });
            const catGroup = targetMap.get(catName)!;
            catGroup.total += t.amount;
            catGroup.txs.push(t);

            if (!catGroup.subcategories.has(subName)) catGroup.subcategories.set(subName, { total: 0, txs: [], items: new Map() });
            const subGroup = catGroup.subcategories.get(subName)!;
            subGroup.total += t.amount;
            subGroup.txs.push(t);

            if (!subGroup.items.has(itemName)) subGroup.items.set(itemName, { total: 0, txs: [] });
            const itemGroup = subGroup.items.get(itemName)!;
            itemGroup.total += t.amount;
            itemGroup.txs.push(t);
        });

        if (yieldItemInfo) {
            reportYields.forEach(y => {
                totalIncome += y.amount;
                const { catName, subName, itemName } = yieldItemInfo;

                if (!incomeGroups.has(catName)) incomeGroups.set(catName, { total: 0, txs: [], subcategories: new Map() });
                const catGroup = incomeGroups.get(catName)!;
                catGroup.total += y.amount;
                catGroup.txs.push(y);

                if (!catGroup.subcategories.has(subName)) catGroup.subcategories.set(subName, { total: 0, txs: [], items: new Map() });
                const subGroup = catGroup.subcategories.get(subName)!;
                subGroup.total += y.amount;
                subGroup.txs.push(y);

                if (!subGroup.items.has(itemName)) subGroup.items.set(itemName, { total: 0, txs: [] });
                const itemGroup = subGroup.items.get(itemName)!;
                itemGroup.total += y.amount;
                itemGroup.txs.push(y);
            });
        }

        const formatGroup = (groupMap: Map<string, any>) => Array.from(groupMap.entries()).map(([name, data]) => ({
            name, value: data.total, txs: data.txs,
            subcategories: Array.from(data.subcategories.entries()).map(([subName, subData]: any) => ({ 
                name: subName, value: subData.total, txs: subData.txs,
                items: Array.from(subData.items.entries()).map(([itemName, itemData]: any) => ({ name: itemName, value: itemData.total, txs: itemData.txs })).sort((a,b) => b.value - a.value)
            })).sort((a, b) => b.value - a.value)
        })).sort((a, b) => b.value - a.value);

        return { 
            incomes: formatGroup(incomeGroups), 
            expenses: formatGroup(expenseGroups), 
            totalIncome, 
            totalExpense, 
            netResult: totalIncome - totalExpense, 
            margin: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0 
        };
    }, [reportTransactions, reportYields, categoryMap, itemBalanceMap, yieldItemInfo]);

    const openBreakdown = (title: string, txs: any[]) => {
        setBreakdownModal({ open: true, title, txs });
    };

    const evolutionData = useMemo(() => {
        const data = new Map<string, { name: string, Receitas: number, Despesas: number, Saldo: number, sortKey: number }>();
        
        reportTransactions.forEach(t => {
            if (t.itemId && itemBalanceMap.get(t.itemId) === false) return;
            if (yieldItemInfo && t.itemId === yieldItemInfo.id) return;

            const date = new Date(t.date);
            const key = `${date.getUTCMonth()}/${date.getUTCFullYear()}`;
            const label = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' });
            const sortKey = date.getUTCFullYear() * 100 + date.getUTCMonth();
            
            if (!data.has(key)) data.set(key, { name: label, Receitas: 0, Despesas: 0, Saldo: 0, sortKey });
            const entry = data.get(key)!;
            
            if (t.type === TransactionType.INCOME) { entry.Receitas += t.amount; entry.Saldo += t.amount; }
            else if (t.type === TransactionType.EXPENSE) { entry.Despesas += t.amount; entry.Saldo -= t.amount; }
        });

        reportYields.forEach(y => {
            const date = new Date(y.date);
            const key = `${date.getUTCMonth()}/${date.getUTCFullYear()}`;
            const label = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' });
            const sortKey = date.getUTCFullYear() * 100 + date.getUTCMonth();
            
            if (!data.has(key)) data.set(key, { name: label, Receitas: 0, Despesas: 0, Saldo: 0, sortKey });
            const entry = data.get(key)!;
            entry.Receitas += y.amount;
            entry.Saldo += y.amount;
        });

        return Array.from(data.values()).sort((a, b) => a.sortKey - b.sortKey);
    }, [reportTransactions, reportYields, itemBalanceMap, yieldItemInfo]);

    const dailyChartData = useMemo(() => {
        const dailyMap = new Map<string, { name: string, Entradas: number, Saídas: number, sortKey: number }>();
        
        reportTransactions.forEach(t => {
            if (t.itemId && itemBalanceMap.get(t.itemId) === false) return;
            if (yieldItemInfo && t.itemId === yieldItemInfo.id) return;

            const d = new Date(t.date);
            const key = t.date;
            const label = d.getUTCDate().toString().padStart(2, '0');
            const sortKey = d.getTime();

            if (!dailyMap.has(key)) dailyMap.set(key, { name: label, Entradas: 0, Saídas: 0, sortKey });
            const entry = dailyMap.get(key)!;

            if (t.type === TransactionType.INCOME) entry.Entradas += t.amount;
            else if (t.type === TransactionType.EXPENSE) entry.Saídas += t.amount;
        });

        reportYields.forEach(y => {
            const d = new Date(y.date);
            const key = y.date;
            const label = d.getUTCDate().toString().padStart(2, '0');
            const sortKey = d.getTime();

            if (!dailyMap.has(key)) dailyMap.set(key, { name: label, Entradas: 0, Saídas: 0, sortKey });
            const entry = dailyMap.get(key)!;
            entry.Entradas += y.amount;
        });

        return Array.from(dailyMap.values()).sort((a, b) => a.sortKey - b.sortKey);
    }, [reportTransactions, reportYields, itemBalanceMap, yieldItemInfo]);

    const periods = [
        {id:'currentMonth', l:'Mês atual'}, 
        {id:'lastMonth', l:'Mês passado'}, 
        {id:'3months', l:'3 meses'}, 
        {id:'6months', l:'6 meses'}, 
        {id:'year', l:'Este ano'}, 
        {id:'all', l:'Tudo'}, 
        {id:'custom', l:'Personalizado'}
    ];

    const sourceOptions = useMemo(() => {
        const options = [{ label: 'Consolidado (Tudo)', value: 'all' }];
        options.push({ label: 'Apenas Investimentos', value: 'investments' });
        
        accounts.filter(a => a.isActive).forEach(acc => {
            options.push({ label: `Conta: ${acc.name}`, value: acc.id });
            acc.cards?.forEach(card => {
                options.push({ label: `Cartão: ${card.name}`, value: `card|${card.id}` });
            });
        });
        return options;
    }, [accounts]);

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide flex-1">
                    {periods.map(item => (
                        <button 
                            key={item.id} 
                            onClick={() => item.id === 'custom' ? setIsPickerOpen(true) : setPeriod(item.id as any)} 
                            className={`px-4 py-2 rounded-full text-sm transition-all whitespace-nowrap tracking-normal font-medium ${period === item.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}
                        >
                            {item.l}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-72">
                    <select 
                        value={sourceFilter}
                        onChange={(e) => setSourceFilter(e.target.value)}
                        className="input-style text-sm font-medium h-10 bg-white border-slate-200"
                    >
                        {sourceOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <DateRangePickerModal isOpen={isPickerOpen} onClose={() => setIsPickerOpen(false)} value={customDateRange} onChange={handleDateChange} />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <KpiCard title="Resultado" value={dreData.netResult} colorClass={dreData.netResult >= 0 ? 'text-emerald-500' : 'text-rose-500'} subtext="Líquido final" />
                <KpiCard title="Margem" value={`${dreData.margin.toFixed(1)}%`} isCurrency={false} colorClass="text-blue-600" subtext="Eficiência do período" />
                <KpiCard title="Receitas totais" value={dreData.totalIncome} subtext="Entradas e rendimentos" />
                <KpiCard title="Despesas totais" value={dreData.totalExpense} subtext="Saídas operacionais" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gráfico de Saídas Diárias */}
                <div className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm ${isPrivacyMode ? 'blur-md' : ''}`}>
                    <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <div className="w-1 h-4 rounded-full bg-rose-500"></div>
                        Saídas Diárias
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dailyChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} stroke="#94a3b8" />
                                <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="#94a3b8" tickFormatter={(v) => `R$${v/1000}k`} />
                                <Tooltip 
                                    cursor={{fill: 'rgba(241, 245, 249, 0.4)'}} 
                                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem' }} 
                                    formatter={(v: number) => formatCurrency(v)} 
                                />
                                <Bar name="Saídas" dataKey="Saídas" fill="#ef4444" radius={[3, 3, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gráfico de Entradas Diárias */}
                <div className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm ${isPrivacyMode ? 'blur-md' : ''}`}>
                    <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <div className="w-1 h-4 rounded-full bg-emerald-500"></div>
                        Entradas Diárias
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dailyChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} stroke="#94a3b8" />
                                <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="#94a3b8" tickFormatter={(v) => `R$${v/1000}k`} />
                                <Tooltip 
                                    cursor={{fill: 'rgba(241, 245, 249, 0.4)'}} 
                                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem' }} 
                                    formatter={(v: number) => formatCurrency(v)} 
                                />
                                <Bar name="Entradas" dataKey="Entradas" fill="#10b981" radius={[3, 3, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className={`bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm ${isPrivacyMode ? 'blur-md' : ''}`}>
                <h3 className="text-lg font-bold text-slate-800 mb-8 tracking-normal">Evolução financeira (Mensal)</h3>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={evolutionData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" fontSize={10} fontWeight="400" tickLine={false} axisLine={false} stroke="#94a3b8" />
                            <YAxis fontSize={10} fontWeight="400" tickLine={false} axisLine={false} stroke="#94a3b8" tickFormatter={(v) => `R$${v/1000}k`} />
                            <Tooltip 
                                cursor={{fill: 'rgba(241, 245, 249, 0.4)'}} 
                                contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                                labelStyle={{ color: '#1e293b', fontWeight: 'bold', marginBottom: '4px', fontSize: '12px' }}
                                itemStyle={{ fontSize: '11px', padding: '1px 0', fontWeight: '500' }}
                                formatter={(v: number) => formatCurrency(v)} 
                            />
                            <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: '500' }} />
                            <Bar name="Receitas" dataKey="Receitas" fill="#10b981" radius={[3, 3, 0, 0]} barSize={12} />
                            <Bar name="Despesas" dataKey="Despesas" fill="#ef4444" radius={[3, 3, 0, 0]} barSize={12} />
                            <Line name="Saldo" type="monotone" dataKey="Saldo" stroke="#3b82f6" strokeWidth={2.5} dot={{r: 4, strokeWidth: 2, fill: '#fff'}} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${isPrivacyMode ? 'blur-sm' : ''}`}>
                <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between md:items-center gap-2 bg-slate-800 text-white">
                    <div>
                        <h3 className="text-xl font-bold tracking-normal">Demonstrativo de resultado (DRE)</h3>
                        <p className="text-sm text-slate-300 font-normal tracking-normal">Análise estruturada do período</p>
                    </div>
                </div>
                <div className="p-0 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50/50 text-slate-500">
                            <tr className="text-[11px] font-bold uppercase tracking-normal">
                                <th className="py-4 px-6 text-left">Descrição da conta</th>
                                <th className="py-4 px-2 text-right">Valor líquido</th>
                                <th className="py-4 pl-2 pr-6 text-right w-24">% Rec.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <tr className="bg-emerald-50/30 text-emerald-900">
                                <td className="py-4 px-6 tracking-normal text-sm font-bold">1. Receitas operacionais e rendimentos</td>
                                <td className="py-4 px-2 text-right font-bold tracking-normal text-base"><PrivateValue>{formatCurrency(dreData.totalIncome)}</PrivateValue></td>
                                <td className="py-4 pl-2 pr-6 text-right text-sm tracking-normal font-bold opacity-80 w-24">100%</td>
                            </tr>
                            {dreData.incomes.map((category, idx) => (<DreCategoryRow key={`inc-${idx}`} data={category} totalIncome={dreData.totalIncome} onShowBreakdown={openBreakdown} />))}
                            
                            <tr className="bg-rose-50/30 text-rose-900">
                                <td className="py-4 px-6 tracking-normal text-sm font-bold pt-10">2. (-) Despesas e saídas operacionais</td>
                                <td className="py-4 px-2 text-right pt-10 font-bold tracking-normal text-base"><PrivateValue>{formatCurrency(dreData.totalExpense)}</PrivateValue></td>
                                <td className="py-4 pl-2 pr-6 text-right pt-10 text-sm tracking-normal font-bold opacity-80 w-24">{dreData.totalIncome > 0 ? ((dreData.totalExpense / dreData.totalIncome) * 100).toFixed(1) + '%' : '-'}</td>
                            </tr>
                            {dreData.expenses.map((category, idx) => (<DreCategoryRow key={`exp-${idx}`} data={category} totalIncome={dreData.totalIncome} onShowBreakdown={openBreakdown} />))}
                            
                            <tr className={`border-t-4 ${dreData.netResult >= 0 ? 'bg-blue-50 text-blue-900 border-blue-100' : 'bg-rose-50 text-rose-900 border-rose-100'}`}>
                                <td className="py-6 px-6 text-base tracking-normal font-bold">(=) Resultado líquido do exercício</td>
                                <td className="py-6 px-2 text-right text-2xl tracking-normal font-bold"><PrivateValue>{formatCurrency(dreData.netResult)}</PrivateValue></td>
                                <td className="py-6 pl-2 pr-6 text-right font-bold text-xl tracking-normal w-24">{(dreData.margin).toFixed(1)}%</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <BreakdownModal 
                isOpen={breakdownModal.open} 
                onClose={() => setBreakdownModal({ open: false, title: '', txs: [] })}
                title={breakdownModal.title}
                data={breakdownModal.txs}
                accountMap={accountMap}
            />
        </div>
    );
};

export default ReportsPage;
