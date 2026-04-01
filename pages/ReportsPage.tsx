import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTransactions, useCategories, useAccounts, useCDBs, useGoals, useForecasts, useReportNotes } from '../hooks/useFirestore';
import { TransactionType, Transaction, ReportNote } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  ComposedChart, Line, PieChart, Pie, Cell, ReferenceLine, Area
} from 'recharts';
import DateRangePickerModal from '../components/DateRangePickerModal';
import ChevronDownIcon from '../components/icons/ChevronDownIcon';
import ChevronRightIcon from '../components/icons/ChevronRightIcon';
import SearchIcon from '../components/icons/SearchIcon';
import XIcon from '../components/icons/XIcon';
import PencilIcon from '../components/icons/PencilIcon';
import PlusIcon from '../components/icons/PlusIcon';
import TrashIcon from '../components/icons/TrashIcon';
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
        <h3 className="text-sm font-semibold text-slate-700 tracking-normal">{title}</h3>
        <div>
            <p className={`text-3xl font-bold tracking-normal ${colorClass}`}>
                <PrivateValue>{typeof value === 'number' || isCurrency ? formatCurrency(Number(value)) : value}</PrivateValue>
            </p>
            {subtext && <p className="text-[11px] text-slate-600 font-medium tracking-normal mt-1">{subtext}</p>}
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

    // Ordenação obrigatória por data descendente para clareza
    const sortedData = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
                            {sortedData.length === 0 ? (
                                <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-500 italic tracking-normal">Nenhum registro encontrado.</td></tr>
                            ) : (
                                sortedData.map((item, idx) => (
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
                        <PrivateValue>{formatCurrency(sortedData.reduce((acc, curr) => acc + (curr.amount || curr.value || 0), 0))}</PrivateValue>
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
                <td className="py-3 px-4 pl-10 flex items-center text-slate-600 text-sm font-semibold tracking-normal">
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
                <td className="py-3 pl-2 pr-6 text-right text-slate-400 text-xs font-semibold tracking-normal w-24">
                    {totalIncome > 0 ? ((data.value / totalIncome) * 100).toFixed(1) + '%' : '-'}
                </td>
            </tr>
            {isExpanded && data.items.map((item, idx) => (
                <tr key={`${data.name}-item-${idx}`} className="bg-slate-50/20 border-b border-slate-50/50 group">
                    <td className="py-2.5 px-4 pl-16 text-slate-500 text-[11px] font-medium flex items-center tracking-normal">
                        <span className="w-1 h-1 rounded-full bg-slate-200 mr-3"></span>
                        {item.name}
                    </td>
                    <td className="py-2.5 px-2 text-right text-slate-500 text-[11px] font-medium tracking-normal">
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
                <td className="py-4 px-4 pl-4 flex items-center font-semibold text-slate-800 text-sm tracking-normal">
                    <button className={`mr-2 p-1 text-slate-400 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
                        <ChevronDownIcon className="w-4 h-4"/>
                    </button>
                    {data.name}
                </td>
                <td className="py-4 px-2 text-right font-semibold text-slate-800 text-base tracking-normal">
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
                <td className="py-4 pl-2 pr-6 text-right text-slate-500 text-sm font-semibold tracking-normal w-24">
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
    const { goals } = useGoals();
    const { forecasts } = useForecasts();
    const { reportNotes, updateReportNotes } = useReportNotes();
    const { isPrivacyMode } = usePrivacy();

    const [period, setPeriod] = useState<'untilToday' | 'currentMonth' | 'lastMonth' | '3months' | '6months' | 'year' | 'all' | 'custom'>('untilToday');
    const [sourceFilter, setSourceFilter] = useState<string>('all');
    const [customDateRange, setCustomDateRange] = useState<{start: Date | null, end: Date | null}>({ start: null, end: null });
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [breakdownModal, setBreakdownModal] = useState<{ open: boolean, title: string, txs: any[] }>({ open: false, title: '', txs: [] });
    
    // Estados para o sistema de observações múltiplas
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [newNoteText, setNewNoteText] = useState('');
    const [newNoteMonth, setNewNoteMonth] = useState('');

    const accountMap = useMemo(() => new Map<string, string>(accounts.map(acc => [acc.id, acc.name])), [accounts]);

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
            case 'untilToday':
                start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
                end = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));
                break;
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
            default: start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
        }
        return { start, end };
    }, [period, customDateRange]);

    // Calcula os meses incluídos no período filtrado para as observações
    const monthsInPeriod = useMemo(() => {
        const { start, end } = dateBoundaries;
        const result: { key: string, label: string }[] = [];
        let current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
        const stop = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
        
        let safety = 0;
        while (current <= stop && safety < 100) {
            const k = `${current.getUTCFullYear()}-${(current.getUTCMonth() + 1).toString().padStart(2, '0')}`;
            const l = current.toLocaleString('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' });
            result.push({ key: k, label: l });
            current.setUTCMonth(current.getUTCMonth() + 1);
            safety++;
        }
        return result;
    }, [dateBoundaries]);

    // Filtra as observações com base nos meses do período
    const filteredNotes = useMemo(() => {
        const activeKeys = new Set(monthsInPeriod.map(m => m.key));
        return (reportNotes || [])
            .filter(n => activeKeys.has(n.monthKey))
            .sort((a, b) => {
                // Ordena por chave de mês descendente, depois por criação descendente
                if (b.monthKey !== a.monthKey) return b.monthKey.localeCompare(a.monthKey);
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
    }, [reportNotes, monthsInPeriod]);

    // Reseta o formulário de nota quando o período muda
    useEffect(() => {
        if (monthsInPeriod.length > 0) {
            setNewNoteMonth(monthsInPeriod[monthsInPeriod.length - 1].key);
        }
    }, [monthsInPeriod]);

    const handleAddNote = async () => {
        if (!newNoteText.trim() || !newNoteMonth) return;

        const newNote: ReportNote = {
            id: crypto.randomUUID(),
            monthKey: newNoteMonth,
            text: newNoteText.trim(),
            createdAt: new Date().toISOString()
        };

        const success = await updateReportNotes([...(reportNotes || []), newNote]);
        if (success) {
            setNewNoteText('');
            setIsAddingNote(false);
        }
    };

    const handleDeleteNote = async (id: string) => {
        if (window.confirm("Deseja realmente excluir esta observação?")) {
            const nextNotes = (reportNotes || []).filter(n => n.id !== id);
            await updateReportNotes(nextNotes);
        }
    };

    const { reportTransactions, reportYields } = useMemo(() => {
        const { start, end } = dateBoundaries;
        let txs = transactions.filter(t => {
            const tDate = getUTCDate(t.date);
            return tDate >= start && tDate <= end;
        });

        if (sourceFilter !== 'all') {
            if (sourceFilter === 'investments') {
                txs = txs.filter(t => t.itemId && yieldItemInfo && t.itemId === yieldItemInfo.id);
            } else if (sourceFilter.startsWith('card|')) {
                const cardId = sourceFilter.split('|')[1];
                txs = txs.filter(t => t.cardId === cardId);
            } else {
                txs = txs.filter(t => (t.accountId === sourceFilter || t.destinationAccountId === sourceFilter) && !t.cardId);
            }
        }

        const yields: any[] = [];
        cdbs.forEach(cdb => {
            if (sourceFilter === 'all' || sourceFilter === 'investments' || cdb.linkedAccountId === sourceFilter) {
                (cdb.yieldHistory || []).forEach(entry => {
                    const eDate = getUTCDate(entry.date);
                    if (eDate >= start && eDate <= end) yields.push({ ...entry, cdbName: cdb.name });
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

    const daysInPeriod = useMemo(() => {
        const diffTime = Math.abs(dateBoundaries.end.getTime() - dateBoundaries.start.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    }, [dateBoundaries]);

    const dailyAverage = useMemo(() => {
        return dreData.totalExpense / daysInPeriod;
    }, [dreData.totalExpense, daysInPeriod]);

    const previousPeriodData = useMemo(() => {
        const { start, end } = dateBoundaries;
        
        // Calcular período equivalente no mês anterior
        const prevStart = new Date(start);
        prevStart.setUTCMonth(prevStart.getUTCMonth() - 1);
        
        const prevEnd = new Date(end);
        prevEnd.setUTCMonth(prevEnd.getUTCMonth() - 1);

        const prevTxs = transactions.filter(t => {
            const tDate = getUTCDate(t.date);
            return tDate >= prevStart && tDate <= prevEnd;
        });

        let prevTotalExpense = 0;
        let prevTotalIncome = 0;
        const categoryTotals = new Map<string, number>();
        const itemTotals = new Map<string, number>();

        prevTxs.forEach(t => {
            if (t.itemId && itemBalanceMap.get(t.itemId) === false) return;
            if (yieldItemInfo && t.itemId === yieldItemInfo.id) return;
            
            if (t.type === TransactionType.INCOME) {
                prevTotalIncome += t.amount;
            } else if (t.type === TransactionType.EXPENSE) {
                prevTotalExpense += t.amount;
                
                const catInfo = categoryMap.get(t.itemId || '');
                if (catInfo) {
                    categoryTotals.set(catInfo.name, (categoryTotals.get(catInfo.name) || 0) + t.amount);
                    itemTotals.set(catInfo.itemName, (itemTotals.get(catInfo.itemName) || 0) + t.amount);
                }
            }
        });

        // Rendimentos do período anterior
        cdbs.forEach(cdb => {
            (cdb.yieldHistory || []).forEach(entry => {
                const eDate = getUTCDate(entry.date);
                if (eDate >= prevStart && eDate <= prevEnd) prevTotalIncome += entry.amount;
            });
        });

        return { totalExpense: prevTotalExpense, totalIncome: prevTotalIncome, categoryTotals, itemTotals };
    }, [transactions, cdbs, dateBoundaries, itemBalanceMap, yieldItemInfo, categoryMap]);

    const insights = useMemo(() => {
        const list: { type: 'info' | 'success' | 'warning', text: string }[] = [];
        
        // 1. Análise Geral de Despesas
        if (previousPeriodData.totalExpense > 0) {
            const diff = ((dreData.totalExpense - previousPeriodData.totalExpense) / previousPeriodData.totalExpense) * 100;
            if (diff < 0) {
                list.push({ 
                    type: 'success', 
                    text: `Suas despesas totais estão ${Math.abs(diff).toFixed(1)}% menores que no mesmo período do mês passado. Excelente progresso!` 
                });
            } else if (diff > 5) {
                list.push({ 
                    type: 'warning', 
                    text: `Suas despesas totais aumentaram ${diff.toFixed(1)}% em relação ao mês passado. Vale revisar os maiores gastos.` 
                });
            }
        }

        // 2. Análise por Categoria (DRE)
        dreData.expenses.forEach(cat => {
            const prevVal = previousPeriodData.categoryTotals.get(cat.name) || 0;
            if (prevVal > 0) {
                const diff = ((cat.value - prevVal) / prevVal) * 100;
                if (diff > 15 && cat.value > 100) { // Aumento relevante acima de 15% e valor > 100
                    list.push({ 
                        type: 'warning', 
                        text: `Aumento expressivo em "${cat.name}": Seus gastos nesta categoria subiram ${diff.toFixed(1)}% (${formatCurrency(cat.value - prevVal)} a mais).` 
                    });
                } else if (diff < -15 && prevVal > 100) {
                    list.push({ 
                        type: 'success', 
                        text: `Ótima redução em "${cat.name}": Você gastou ${Math.abs(diff).toFixed(1)}% menos que no mês passado nesta categoria.` 
                    });
                }
            }
        });

        // 3. Análise de Itens Específicos (Subcategorias/Itens)
        const currentItemTotals = new Map<string, number>();
        reportTransactions.forEach(t => {
            if (t.type === TransactionType.EXPENSE && t.itemId) {
                const catInfo = categoryMap.get(t.itemId);
                if (catInfo) {
                    currentItemTotals.set(catInfo.itemName, (currentItemTotals.get(catInfo.itemName) || 0) + t.amount);
                }
            }
        });

        currentItemTotals.forEach((val, itemName) => {
            const prevVal = previousPeriodData.itemTotals.get(itemName) || 0;
            if (prevVal > 0) {
                const diff = ((val - prevVal) / prevVal) * 100;
                if (diff > 25 && val > 50) {
                    list.push({ 
                        type: 'info', 
                        text: `O item "${itemName}" teve um aumento de ${diff.toFixed(1)}% no período. Verifique se foi um gasto pontual.` 
                    });
                }
            }
        });

        // 4. Análise de Parcelas Finalizando
        const endingInstallments = reportTransactions.filter(t => 
            t.type === TransactionType.EXPENSE && 
            t.totalInstallments && 
            t.currentInstallment === t.totalInstallments
        );

        if (endingInstallments.length > 0) {
            const totalSaved = endingInstallments.reduce((acc, t) => acc + t.amount, 0);
            const names = endingInstallments.map(t => `"${t.description}"`).join(', ');
            list.push({ 
                type: 'success', 
                text: `Boas notícias! ${endingInstallments.length} parcelas finalizam este mês: ${names}. Isso liberará ${formatCurrency(totalSaved)} no seu orçamento do mês que vem.` 
            });
        }

        // 5. Análise de Margem e Teto
        if (dreData.margin > 30) {
            list.push({ type: 'success', text: `Sua margem de economia está excelente (${dreData.margin.toFixed(1)}%). Você está retendo uma boa parte da sua renda!` });
        } else if (dreData.margin < 10 && dreData.totalIncome > 0) {
            list.push({ type: 'warning', text: `Sua margem de economia está em ${dreData.margin.toFixed(1)}%. Considere reduzir gastos não essenciais para aumentar sua reserva.` });
        }

        const year = dateBoundaries.start.getUTCFullYear();
        const month = dateBoundaries.start.getUTCMonth();
        const annualGoal = goals[String(year)] || 0;
        const forecast = forecasts[String(year)]?.[String(month)] || 0;
        const monthlyCeiling = Math.max(0, forecast - (annualGoal / 12));
        
        if (monthlyCeiling > 0 && dreData.totalExpense > monthlyCeiling) {
            list.push({ type: 'warning', text: `Atenção: Você ultrapassou o teto de gastos planejado para este mês em ${formatCurrency(dreData.totalExpense - monthlyCeiling)}.` });
        }

        // 6. Análise de Custos Fixos vs Variáveis
        let fixedTotal = 0;
        let variableTotal = 0;
        reportTransactions.forEach(t => {
            if (t.type === TransactionType.EXPENSE && t.itemId) {
                const catInfo = categoryMap.get(t.itemId);
                if (catInfo?.isFixed) fixedTotal += t.amount;
                else variableTotal += t.amount;
            }
        });

        if (dreData.totalExpense > 0) {
            const variablePerc = (variableTotal / dreData.totalExpense) * 100;
            if (variablePerc > 60) {
                list.push({ 
                    type: 'info', 
                    text: `Seus gastos variáveis representam ${variablePerc.toFixed(0)}% das suas despesas. Este é o melhor lugar para buscar cortes se precisar economizar.` 
                });
            }
        }

        // 7. Detecção de Gastos Sem Categoria (se houver um item "Outros" ou similar muito alto)
        const othersTotal = currentItemTotals.get('Outros') || currentItemTotals.get('Diversos') || 0;
        if (othersTotal > dreData.totalExpense * 0.15) {
            list.push({ 
                type: 'warning', 
                text: `Você tem muitos gastos (${formatCurrency(othersTotal)}) em categorias genéricas. Tente detalhar mais para ter um controle melhor.` 
            });
        }

        // Ordenar: Amarelo (warning), Azul (info), Verde (success)
        return list.sort((a, b) => {
            const order = { 'warning': 1, 'info': 2, 'success': 3 };
            return order[a.type] - order[b.type];
        });
    }, [dreData, previousPeriodData, dateBoundaries, goals, forecasts, reportTransactions, categoryMap]);

    const openBreakdown = (title: string, txs: any[]) => {
        setBreakdownModal({ open: true, title, txs });
    };

    const dailyChartData = useMemo(() => {
        const dailyMap = new Map<string, { name: string, Entradas: number, Saídas: number, sortKey: number }>();
        const { start, end } = dateBoundaries;
        let current = new Date(start);
        while (current <= end) {
            const key = current.toISOString().split('T')[0];
            const label = current.getUTCDate().toString().padStart(2, '0');
            dailyMap.set(key, { name: label, Entradas: 0, Saídas: 0, sortKey: current.getTime() });
            current.setUTCDate(current.getUTCDate() + 1);
        }
        reportTransactions.forEach(t => {
            if (t.itemId && itemBalanceMap.get(t.itemId) === false) return;
            if (yieldItemInfo && t.itemId === yieldItemInfo.id) return;
            const key = t.date;
            if (dailyMap.has(key)) {
                const entry = dailyMap.get(key)!;
                if (t.type === TransactionType.INCOME) entry.Entradas += t.amount;
                else if (t.type === TransactionType.EXPENSE) entry.Saídas += t.amount;
            }
        });
        reportYields.forEach(y => {
            if (dailyMap.has(y.date)) dailyMap.get(y.date)!.Entradas += y.amount;
        });
        return Array.from(dailyMap.values()).sort((a, b) => a.sortKey - b.sortKey);
    }, [reportTransactions, reportYields, itemBalanceMap, yieldItemInfo, dateBoundaries]);

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
            const entry = data.get(key);
            if (entry) { entry.Receitas += y.amount; entry.Saldo += y.amount; }
        });
        return Array.from(data.values()).sort((a, b) => a.sortKey - b.sortKey);
    }, [reportTransactions, reportYields, itemBalanceMap, yieldItemInfo]);

    const cumulativePerformanceData = useMemo(() => {
        const result = [];
        const { start, end } = dateBoundaries;
        let currentDate = new Date(start);
        let runningActualBalance = 0;
        let runningGoalBalance = 0;
        const dailyRealMap = new Map<string, number>();
        reportTransactions.forEach(t => {
            if (t.itemId && itemBalanceMap.get(t.itemId) === false) return;
            if (yieldItemInfo && t.itemId === yieldItemInfo.id) return;
            const key = t.date;
            const val = t.type === TransactionType.INCOME ? t.amount : -t.amount;
            dailyRealMap.set(key, (dailyRealMap.get(key) || 0) + val);
        });
        reportYields.forEach(y => dailyRealMap.set(y.date, (dailyRealMap.get(y.date) || 0) + y.amount));

        while (currentDate <= end) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const year = currentDate.getUTCFullYear();
            const month = currentDate.getUTCMonth();
            const annualGoal = goals[String(year)] || 0;
            const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
            const proportionalDailyGoal = (annualGoal / 12) / daysInMonth;

            runningActualBalance += dailyRealMap.get(dateStr) || 0;
            runningGoalBalance += proportionalDailyGoal;
            result.push({
                name: currentDate.getUTCDate().toString().padStart(2, '0'),
                "Realizado Acumulado": runningActualBalance,
                "Meta Acumulada": runningGoalBalance,
                sortKey: currentDate.getTime()
            });
            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }
        return result;
    }, [reportTransactions, reportYields, itemBalanceMap, yieldItemInfo, dateBoundaries, goals]);

    const spendingCeilingData = useMemo(() => {
        const result = [];
        const { start, end } = dateBoundaries;
        let currentDate = new Date(start);
        let runningActualExpenses = 0;
        let runningCeiling = 0;
        const dailyExpenseMap = new Map<string, number>();
        reportTransactions.forEach(t => {
            if (t.type !== TransactionType.EXPENSE) return;
            if (t.itemId && itemBalanceMap.get(t.itemId) === false) return;
            dailyExpenseMap.set(t.date, (dailyExpenseMap.get(t.date) || 0) + t.amount);
        });

        while (currentDate <= end) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const year = currentDate.getUTCFullYear();
            const month = currentDate.getUTCMonth();
            const annualGoal = goals[String(year)] || 0;
            const forecast = forecasts[String(year)]?.[String(month)] || 0;
            const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
            const dailyCeiling = Math.max(0, forecast - (annualGoal / 12)) / daysInMonth;

            runningActualExpenses += dailyExpenseMap.get(dateStr) || 0;
            runningCeiling += dailyCeiling;
            result.push({
                name: currentDate.getUTCDate().toString().padStart(2, '0'),
                "Gasto Real": runningActualExpenses,
                "Teto de Gastos": runningCeiling,
                sortKey: currentDate.getTime()
            });
            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }
        return result;
    }, [reportTransactions, itemBalanceMap, dateBoundaries, goals, forecasts]);

    const periods = [
        {id:'untilToday', l:'Até hoje'},
        {id:'currentMonth', l:'Mês atual'}, 
        {id:'lastMonth', l:'Mês passado'}, 
        {id:'year', l:'Este ano'}, 
        {id:'all', l:'Tudo'}, 
        {id:'custom', l:'Personalizado'}
    ];

    const sourceOptions = useMemo(() => {
        const options = [{ label: 'Consolidado (Tudo)', value: 'all' }];
        options.push({ label: 'Apenas Investimentos', value: 'investments' });
        accounts.filter(a => a.isActive).forEach(acc => {
            options.push({ label: `Conta: ${acc.name}`, value: acc.id });
            (acc.cards || []).forEach(card => options.push({ label: `Cartão: ${card.name}`, value: `card|${card.id}` }));
        });
        return options;
    }, [accounts]);

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-hide flex-1">
                    {periods.map(item => (
                        <button 
                            key={item.id} 
                            onClick={() => item.id === 'custom' ? setIsPickerOpen(true) : setPeriod(item.id as any)} 
                            className={`px-4 py-2 rounded-full text-sm transition-all whitespace-nowrap tracking-normal font-medium ${period === item.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'}`}
                        >
                            {item.l}
                        </button>
                    ))}
                </div>
                <div className="relative w-full md:w-80">
                    <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="input-style text-sm font-medium h-10 bg-white border-slate-200 w-full">
                        {sourceOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>
            </div>

            <DateRangePickerModal isOpen={isPickerOpen} onClose={() => setIsPickerOpen(false)} value={customDateRange} onChange={handleDateChange} />

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
                <KpiCard title="Resultado" value={dreData.netResult} colorClass={dreData.netResult >= 0 ? 'text-emerald-500' : 'text-rose-500'} subtext="Líquido final" />
                <KpiCard title="Margem" value={`${dreData.margin.toFixed(1)}%`} isCurrency={false} colorClass="text-blue-600" subtext="Eficiência do período" />
                <KpiCard title="Receitas totais" value={dreData.totalIncome} subtext="Entradas e rendimentos" />
                <KpiCard title="Despesas totais" value={dreData.totalExpense} subtext="Saídas operacionais" />
                <KpiCard title="Gasto Médio Diário" value={dailyAverage} subtext={`Média em ${daysInPeriod} dias`} colorClass="text-slate-800" />
            </div>

            {insights.length > 0 && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold text-slate-500 flex items-center gap-2 tracking-wider uppercase">
                            <div className="w-1 h-3 rounded-full bg-indigo-500"></div>
                            Insights e Performance
                        </h3>
                        <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                            {insights.length} {insights.length === 1 ? 'análise' : 'análises'}
                        </span>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
                        {insights.map((insight, idx) => (
                            <div key={idx} className={`flex-shrink-0 w-[280px] md:w-[320px] p-3 rounded-lg border flex items-start gap-2 snap-start transition-all hover:shadow-sm ${
                                insight.type === 'success' ? 'bg-emerald-50/50 border-emerald-100 text-emerald-900' : 
                                insight.type === 'warning' ? 'bg-amber-50/50 border-amber-100 text-amber-900' : 
                                'bg-blue-50/50 border-blue-100 text-blue-900'
                            }`}>
                                <div className="mt-0.5 flex-shrink-0">
                                    {insight.type === 'success' ? (
                                        <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[8px]">✓</div>
                                    ) : insight.type === 'warning' ? (
                                        <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center text-white text-[8px]">!</div>
                                    ) : (
                                        <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white text-[8px]">i</div>
                                    )}
                                </div>
                                <p className="text-[11px] font-medium leading-tight line-clamp-3">{insight.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm ${isPrivacyMode ? 'blur-md' : ''}`}>
                    <h3 className="text-sm font-bold text-slate-700 mb-6 flex items-center gap-2 tracking-normal uppercase">
                         <div className="w-1.5 h-4 rounded-full bg-blue-500"></div>
                         Economia Acumulada vs Meta
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={cumulativePerformanceData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} stroke="#94a3b8" />
                                <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="#94a3b8" />
                                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar name="Saldo Acumulado" dataKey="Realizado Acumulado">
                                    {cumulativePerformanceData.map((entry, index) => {
                                        const actual = entry["Realizado Acumulado"];
                                        const goal = entry["Meta Acumulada"];
                                        let fillColor = "#10b981"; 
                                        if (actual < 0) fillColor = "#f43f5e"; 
                                        else if (actual < goal) fillColor = "#f59e0b"; 
                                        return <Cell key={`cell-${index}`} fill={fillColor} />;
                                    })}
                                </Bar>
                                <Line name="Meta" type="monotone" dataKey="Meta Acumulada" stroke="#2563eb" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm ${isPrivacyMode ? 'blur-md' : ''}`}>
                    <h3 className="text-sm font-bold text-slate-700 mb-6 flex items-center gap-2 tracking-normal uppercase">
                         <div className="w-1.5 h-4 rounded-full bg-rose-500"></div>
                         Gasto Acumulado vs Teto
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={spendingCeilingData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} stroke="#94a3b8" />
                                <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="#94a3b8" />
                                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar name="Gasto Real" dataKey="Gasto Real">
                                    {spendingCeilingData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry["Gasto Real"] > entry["Teto de Gastos"] ? "#f43f5e" : "#10b981"} />
                                    ))}
                                </Bar>
                                <Line name="Teto" type="monotone" dataKey="Teto de Gastos" stroke="#f43f5e" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm ${isPrivacyMode ? 'blur-md' : ''}`}>
                    <h3 className="text-sm font-semibold text-slate-700 mb-6 flex items-center gap-2 tracking-normal">
                        <div className="w-1.5 h-4 rounded-full bg-rose-500"></div>
                        Saídas Diárias
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dailyChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} stroke="#94a3b8" />
                                <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="#94a3b8" tickFormatter={(v) => `R$${v/1000}k`} />
                                <Tooltip cursor={{fill: 'rgba(241, 245, 249, 0.4)'}} contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem' }} formatter={(v: number) => formatCurrency(v)} />
                                <Bar name="Saídas" dataKey="Saídas" fill="#ef4444" radius={[3, 3, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm ${isPrivacyMode ? 'blur-md' : ''}`}>
                    <h3 className="text-sm font-semibold text-slate-700 mb-6 flex items-center gap-2 tracking-normal">
                        <div className="w-1.5 h-4 rounded-full bg-emerald-500"></div>
                        Entradas Diárias
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dailyChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} stroke="#94a3b8" />
                                <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="#94a3b8" tickFormatter={(v) => `R$${v/1000}k`} />
                                <Tooltip cursor={{fill: 'rgba(241, 245, 249, 0.4)'}} contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem' }} formatter={(v: number) => formatCurrency(v)} />
                                <Bar name="Entradas" dataKey="Entradas" fill="#10b981" radius={[3, 3, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm ${isPrivacyMode ? 'blur-md' : ''}`}>
                <h3 className="text-lg font-semibold text-slate-700 mb-8 tracking-normal">Evolução Financeira (Mensal)</h3>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={evolutionData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" fontSize={10} fontWeight="400" tickLine={false} axisLine={false} stroke="#94a3b8" />
                            <YAxis fontSize={10} fontWeight="400" tickLine={false} axisLine={false} stroke="#94a3b8" tickFormatter={(v) => `R$${v/1000}k`} />
                            <Tooltip cursor={{fill: 'rgba(241, 245, 249, 0.4)'}} contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(v: number) => formatCurrency(v)} />
                            <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: '20px', fontSize: '11px' }} />
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
                        <h3 className="text-xl font-bold tracking-normal">Demonstrativo de Resultado (DRE)</h3>
                        <p className="text-sm text-slate-300 font-semibold tracking-normal">Análise estruturada do período</p>
                    </div>
                </div>
                <div className="p-0 overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
                    <table className="w-full text-sm min-w-[600px] md:min-w-0">
                        <thead className="bg-slate-50/50 text-slate-500">
                            <tr className="text-[11px] font-bold uppercase tracking-normal">
                                <th className="py-4 px-6 text-left">Descrição da conta</th>
                                <th className="py-4 px-2 text-right">Valor líquido</th>
                                <th className="py-4 pl-2 pr-6 text-right w-24">% Rec.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <tr className="bg-emerald-50/30 text-emerald-900">
                                <td className="py-4 px-6 tracking-normal text-sm font-semibold">1. Receitas operacionais e rendimentos</td>
                                <td className="py-4 px-2 text-right font-semibold tracking-normal text-base">
                                    <div className="flex items-center justify-end gap-2">
                                        <button 
                                            onClick={() => openBreakdown("Todas as Receitas", reportTransactions.filter(t => t.type === TransactionType.INCOME).concat(reportYields))}
                                            className="p-1.5 hover:bg-blue-100 text-blue-600 rounded"
                                        >
                                            <SearchIcon className="w-4 h-4" />
                                        </button>
                                        <PrivateValue>{formatCurrency(dreData.totalIncome)}</PrivateValue>
                                    </div>
                                </td>
                                <td className="py-4 pl-2 pr-6 text-right text-sm tracking-normal font-semibold opacity-80 w-24">100%</td>
                            </tr>
                            {dreData.incomes.map((category, idx) => (<DreCategoryRow key={`inc-${idx}`} data={category} totalIncome={dreData.totalIncome} onShowBreakdown={openBreakdown} />))}
                            
                            <tr className="bg-rose-50/30 text-rose-900">
                                <td className="py-4 px-6 tracking-normal text-sm font-semibold pt-10">2. (-) Despesas e saídas operacionais</td>
                                <td className="py-4 px-2 text-right pt-10 font-semibold tracking-normal text-base">
                                    <div className="flex items-center justify-end gap-2">
                                        <button 
                                            onClick={() => openBreakdown("Todas as Despesas", reportTransactions.filter(t => t.type === TransactionType.EXPENSE))}
                                            className="p-1.5 hover:bg-blue-100 text-blue-600 rounded"
                                        >
                                            <SearchIcon className="w-4 h-4" />
                                        </button>
                                        <PrivateValue>{formatCurrency(dreData.totalExpense)}</PrivateValue>
                                    </div>
                                </td>
                                <td className="py-4 pl-2 pr-6 text-right pt-10 text-sm tracking-normal font-semibold opacity-80 w-24">{dreData.totalIncome > 0 ? ((dreData.totalExpense / dreData.totalIncome) * 100).toFixed(1) + '%' : '-'}</td>
                            </tr>
                            {dreData.expenses.map((category, idx) => (<DreCategoryRow key={`exp-${idx}`} data={category} totalIncome={dreData.totalIncome} onShowBreakdown={openBreakdown} />))}
                            
                            <tr className={`border-t-4 ${dreData.netResult >= 0 ? 'bg-blue-50 text-blue-900 border-blue-100' : 'bg-rose-50 text-rose-900 border-rose-100'}`}>
                                <td className="py-6 px-6 text-base tracking-normal font-semibold">(=) Resultado líquido do exercício</td>
                                <td className="py-6 px-2 text-right text-2xl tracking-normal font-semibold"><PrivateValue>{formatCurrency(dreData.netResult)}</PrivateValue></td>
                                <td className="py-6 pl-2 pr-6 text-right font-semibold text-xl tracking-normal w-24">{(dreData.margin).toFixed(1)}%</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* SEÇÃO DE OBSERVAÇÕES MÚLTIPLAS */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                            <PencilIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 tracking-normal">Notas e Observações</h3>
                            <p className="text-xs text-slate-500 font-medium tracking-normal">Histórico de registros para o período filtrado</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsAddingNote(!isAddingNote)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${isAddingNote ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100'}`}
                    >
                        {isAddingNote ? <XIcon className="w-4 h-4"/> : <PlusIcon className="w-4 h-4"/>}
                        {isAddingNote ? 'Cancelar' : 'Nova Observação'}
                    </button>
                </div>

                {isAddingNote && (
                    <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex flex-col md:flex-row gap-4 mb-4">
                            <div className="w-full md:w-48">
                                <label className="block text-[10px] font-bold text-blue-700 uppercase tracking-widest mb-1.5 ml-1">Mês de referência</label>
                                <select 
                                    value={newNoteMonth}
                                    onChange={(e) => setNewNoteMonth(e.target.value)}
                                    className="input-style bg-white border-blue-200 text-blue-900 font-semibold h-11"
                                >
                                    {monthsInPeriod.map(m => (
                                        <option key={m.key} value={m.key}>{m.key}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="block text-[10px] font-bold text-blue-700 uppercase tracking-widest mb-1.5 ml-1">Sua observação</label>
                                <textarea 
                                    value={newNoteText}
                                    onChange={(e) => setNewNoteText(e.target.value)}
                                    className="input-style bg-white border-blue-200 min-h-[100px] leading-relaxed py-3"
                                    placeholder="Descreva fatos relevantes sobre este mês específico..."
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button 
                                onClick={handleAddNote}
                                disabled={!newNoteText.trim()}
                                className="btn-primary px-8 py-2.5 rounded-xl shadow-md shadow-blue-200 disabled:opacity-50"
                            >
                                Salvar registro
                            </button>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    {filteredNotes.length === 0 ? (
                        <div className="bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-12 text-center">
                            <p className="text-slate-400 font-medium tracking-normal">Nenhuma observação registrada para os meses deste período.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredNotes.map((note) => (
                                <div key={note.id} className="group relative bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-blue-100">
                                            {monthsInPeriod.find(m => m.key === note.monthKey)?.label || note.monthKey}
                                        </span>
                                        <button 
                                            onClick={() => handleDeleteNote(note.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            title="Excluir observação"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="text-sm text-slate-700 leading-relaxed font-normal whitespace-pre-wrap">
                                        {note.text}
                                    </p>
                                    <div className="mt-4 pt-4 border-t border-slate-50 flex justify-end">
                                        <span className="text-[9px] text-slate-400 font-medium uppercase tracking-tighter">
                                            Registrado em {new Date(note.createdAt).toLocaleDateString('pt-BR')}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
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