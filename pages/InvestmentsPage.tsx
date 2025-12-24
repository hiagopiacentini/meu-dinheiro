
import React, { useState, useMemo, useEffect } from 'react';
import { useCDBs, useTransactions, useAccounts, useCategories } from '../hooks/useFirestore';
import { CDBContract, Transaction, TransactionType, YieldEntry } from '../types';
import MoneyIcon from '../components/icons/MoneyIcon';
import PlusIcon from '../components/icons/PlusIcon';
import ArrowUturnLeftIcon from '../components/icons/ArrowUturnLeftIcon';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import UpArrowIcon from '../components/icons/UpArrowIcon';
import SearchIcon from '../components/icons/SearchIcon';
import CheckIcon from '../components/icons/CheckIcon';
import XIcon from '../components/icons/XIcon';
import PrivateValue from '../components/PrivateValue';
import DateRangePickerModal from '../components/DateRangePickerModal';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

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

const isWeekend = (date: Date) => {
    const day = date.getUTCDay();
    return day === 0 || day === 6;
};

const isFixedHoliday = (date: Date) => {
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    const holidays = [
        '1-1', '21-4', '1-5', '7-9', '12-10', '2-11', '15-11', '20-11', '25-12',
    ];
    return holidays.includes(`${day}-${month}`);
};

const isWorkDay = (date: Date) => !isWeekend(date) && !isFixedHoliday(date);

const getWorkDaysInRange = (startDateStr: string, endDateStr: string) => {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const workDays: string[] = [];
    
    let current = new Date(start);
    while (current <= end) {
        if (isWorkDay(current)) {
            workDays.push(current.toISOString().split('T')[0]);
        }
        current.setUTCDate(current.getUTCDate() + 1);
    }
    return workDays;
};

const RedemptionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    cdb: CDBContract;
    onRedeem: (amount: number, date: string) => Promise<void>;
}> = ({ isOpen, onClose, cdb, onRedeem }) => {
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const redeemAmount = parseFloat(amount);
        if (isNaN(redeemAmount) || redeemAmount <= 0 || redeemAmount > cdb.currentGrossBalance) {
            alert(`Valor inválido. O saldo disponível é ${formatCurrency(cdb.currentGrossBalance)}.`);
            return;
        }
        await onRedeem(redeemAmount, date);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4 text-slate-800 tracking-normal">Resgatar investimento</h2>
                <div className="bg-blue-50 p-3 rounded-lg mb-4">
                    <p className="font-bold text-slate-800 tracking-normal">{cdb.name}</p>
                    <p className="text-sm text-slate-500 font-normal tracking-normal">Saldo atual: <span className="font-bold"><PrivateValue>{formatCurrency(cdb.currentGrossBalance)}</PrivateValue></span></p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-normal text-slate-500 mb-1 tracking-normal">Valor do resgate</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="input-style"
                            placeholder="0,00"
                            step="0.01"
                            max={cdb.currentGrossBalance}
                            required
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-normal text-slate-500 mb-1 tracking-normal">Data do resgate</label>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="input-style"
                            required
                        />
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                        <button type="submit" className="btn-primary">Confirmar resgate</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const UpdateBalanceModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    cdb: CDBContract;
    onUpdate: (amount: number, date: string, mode: 'yield' | 'total') => Promise<void>;
}> = ({ isOpen, onClose, cdb, onUpdate }) => {
    const [mode, setMode] = useState<'yield' | 'total'>('yield');
    const [value, setValue] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleSave = async (closeAfter: boolean) => {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0) {
            alert('Valor inválido.');
            return;
        }
        
        setIsSaving(true);
        await onUpdate(numValue, date, mode);
        setIsSaving(false);
        
        if (closeAfter) {
            onClose();
        } else {
            setValue('');
             const nextDate = new Date(date);
             nextDate.setDate(nextDate.getDate() + 1);
             setDate(nextDate.toISOString().split('T')[0]);
        }
    };

    const newEstimatedBalance = mode === 'yield' 
        ? cdb.currentGrossBalance + (parseFloat(value) || 0)
        : (parseFloat(value) || 0);
    
    const diff = newEstimatedBalance - cdb.currentGrossBalance;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4 text-slate-800 tracking-normal">Atualizar saldo bruto</h2>
                <p className="text-xs text-slate-500 mb-4 font-normal tracking-normal">Esta atualização reflete apenas o crescimento do capital e não gera movimentação na conta bancária até o resgate.</p>
                
                <div className="flex p-1 bg-slate-100 rounded-lg mb-6">
                    <button 
                        onClick={() => { setMode('yield'); setValue(''); }} 
                        className={`flex-1 py-2 text-sm font-normal rounded-md transition-all tracking-normal ${mode === 'yield' ? 'bg-white shadow text-slate-800 font-bold' : 'text-slate-500'}`}
                    >
                        Rendimento único
                    </button>
                    <button 
                        onClick={() => { setMode('total'); setValue(''); }} 
                        className={`flex-1 py-2 text-sm font-normal rounded-md transition-all tracking-normal ${mode === 'total' ? 'bg-white shadow text-slate-800 font-bold' : 'text-slate-500'}`}
                    >
                        Correção total
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <p className="text-xs text-slate-500 font-normal tracking-normal mb-1">Saldo atual</p>
                        <p className="text-lg font-bold text-slate-700 tracking-normal">
                            <PrivateValue>{formatCurrency(cdb.currentGrossBalance)}</PrivateValue>
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-normal text-slate-500 mb-1 tracking-normal">
                            {mode === 'yield' ? 'Valor do rendimento (+)' : 'Novo saldo total (=)'}
                        </label>
                        <input
                            type="number"
                            value={value}
                            onChange={e => setValue(e.target.value)}
                            className="input-style text-lg"
                            step="0.01"
                            placeholder="0,00"
                            required
                            autoFocus
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-normal text-slate-500 mb-1 tracking-normal">Data de referência</label>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="input-style"
                            required
                        />
                    </div>

                    {value && (
                        <div className="flex justify-between items-center text-sm px-2">
                             <span className="text-slate-500 font-normal tracking-normal">Ajuste de saldo:</span>
                             <div className="text-right">
                                <span className={`font-bold block tracking-normal ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
                                </span>
                             </div>
                        </div>
                    )}

                    <div className="flex flex-col gap-2 pt-4">
                        <div className="flex gap-2">
                            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
                            <button 
                                type="button" 
                                onClick={() => handleSave(true)} 
                                disabled={isSaving || !value}
                                className="btn-primary flex-1"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const YieldHistoryModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    cdb: CDBContract;
    onDeleteEntry: (entry: YieldEntry) => Promise<void>;
    onEditEntry: (entry: YieldEntry, newAmount: number, newDate: string) => Promise<void>;
}> = ({ isOpen, onClose, cdb, onDeleteEntry, onEditEntry }) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editAmount, setEditAmount] = useState('');
    const [editDate, setEditDate] = useState('');

    if (!isOpen) return null;

    const history = [...(cdb.yieldHistory || [])].sort((a, b) => new Date(a.date).getTime() - new Date(a.date).getTime());

    const startEditing = (entry: YieldEntry) => {
        setEditingId(entry.id);
        setEditAmount(String(entry.amount));
        setEditDate(entry.date);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditAmount('');
        setEditDate('');
    };

    const saveEditing = async (entry: YieldEntry) => {
        const val = parseFloat(editAmount);
        if (isNaN(val)) {
            alert('Valor inválido');
            return;
        }
        await onEditEntry(entry, val, editDate);
        cancelEditing();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg m-4 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 tracking-normal">Histórico de rendimentos</h2>
                        <p className="text-sm text-slate-500 font-normal tracking-normal">{cdb.name}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100"><XIcon className="w-5 h-5 text-slate-500"/></button>
                </div>

                <div className="overflow-y-auto flex-1 pr-2">
                    {history.length === 0 ? (
                        <p className="text-center text-slate-500 py-8 font-normal tracking-normal">Nenhum rendimento registrado.</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-slate-500 sticky top-0">
                                <tr className="text-xs font-normal tracking-normal text-slate-500">
                                    <th className="px-3 py-2 text-left font-normal">Data</th>
                                    <th className="px-3 py-2 text-right font-normal">Valor</th>
                                    <th className="px-3 py-2 text-center font-normal">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {history.map(entry => (
                                    <tr key={entry.id}>
                                        {editingId === entry.id ? (
                                            <>
                                                <td className="px-3 py-2">
                                                    <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="input-style py-1 text-xs" />
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} className="input-style py-1 text-xs text-right" step="0.01" />
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    <div className="flex justify-center gap-1">
                                                        <button onClick={() => saveEditing(entry)} className="p-1 text-green-600 hover:bg-green-100 rounded"><CheckIcon className="w-4 h-4" /></button>
                                                        <button onClick={cancelEditing} className="p-1 text-red-600 hover:bg-red-100 rounded"><XIcon className="w-4 h-4" /></button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-3 py-2 text-slate-600 font-normal tracking-normal">{formatDate(entry.date)}</td>
                                                <td className={`px-3 py-2 text-right font-bold tracking-normal ${entry.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {entry.amount >= 0 ? '+' : ''}<PrivateValue>{formatCurrency(entry.amount)}</PrivateValue>
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    <div className="flex justify-center gap-1">
                                                        <button onClick={() => startEditing(entry)} className="p-1 text-blue-500 hover:bg-blue-50 rounded" title="Corrigir">
                                                            <PencilIcon className="w-3 h-3" />
                                                        </button>
                                                        <button onClick={() => onDeleteEntry(entry)} className="p-1 text-red-500 hover:bg-red-100 rounded" title="Remover">
                                                            <TrashIcon className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

const KpiCardInvest: React.FC<{ title: string, value: string | number, colorClass?: string, isCurrency?: boolean }> = ({ title, value, colorClass = "text-slate-800", isCurrency = true }) => (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-1 transition-shadow hover:shadow-md">
        <h3 className="text-sm font-normal text-slate-500 tracking-normal">{title}</h3>
        <p className={`text-2xl md:text-3xl font-bold tracking-tight ${colorClass}`}>
            <PrivateValue>{typeof value === 'number' || isCurrency ? formatCurrency(Number(value)) : value}</PrivateValue>
        </p>
    </div>
);

const InvestmentsPage: React.FC<{ onNavigateToAccount?: (accId: string, filter: 'overview' | 'card' | 'investments') => void }> = ({ onNavigateToAccount }) => {
    const { cdbs, addCDB, updateCDB, deleteCDB } = useCDBs();
    const { addTransaction, addTransactions, updateTransaction } = useTransactions();
    const { accounts } = useAccounts();
    const { categories } = useCategories();

    const [view, setView] = useState<'dashboard' | 'form'>('dashboard');
    const [editingCdbId, setEditingCdbId] = useState<string | null>(null);
    
    const [name, setName] = useState('');
    const [bank, setBank] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [amount, setAmount] = useState('');
    const [rate, setRate] = useState('');
    const [maturity, setMaturity] = useState('');
    const [accountId, setAccountId] = useState('');
    const [categoryId, setCategoryId] = useState('');

    const [redemptionCdb, setRedemptionCdb] = useState<CDBContract | null>(null);
    const [updateBalanceCdb, setUpdateBalanceCdb] = useState<CDBContract | null>(null);
    const [historyCdb, setHistoryCdb] = useState<CDBContract | null>(null);

    const [activeFilter, setActiveFilter] = useState('Mês atual');
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const today = getNowGmtMinus4();
    const [dateRange, setDateRange] = useState<{start: Date | null, end: Date | null}>({ 
        start: new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1)), 
        end: new Date(Date.UTC(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)) 
    });

    useEffect(() => {
        const now = getNowGmtMinus4();
        let startUTC: Date;
        let endUTC: Date = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));

        switch (activeFilter) {
            case 'Mês atual':
                startUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
                break;
            case 'Mês passado':
                startUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1));
                endUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999));
                break;
            case 'Últimos 3 meses':
                startUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 2, 1));
                break;
            case 'Últimos 6 meses':
                startUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 5, 1));
                break;
            case 'Este ano':
                startUTC = new Date(Date.UTC(now.getFullYear(), 0, 1));
                break;
            default:
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

    const activeAccounts = useMemo(() => accounts.filter(a => a.isActive), [accounts]);
    const accountMap = useMemo(() => new Map(accounts.map(acc => [acc.id, acc.name])), [accounts]);
    
    const investmentCategoryOptions = useMemo(() => {
        return categories
            .filter(c => c.type === TransactionType.EXPENSE)
            .flatMap(c => c.subcategories.flatMap(s => s.items.map(i => ({
                ...i, 
                fullName: `${c.name} > ${s.name} > ${i.name}`
            }))))
            .sort((a, b) => a.fullName.localeCompare(b.fullName));
    }, [categories]);

    const yieldCategoryId = useMemo(() => {
        const incomeCategories = categories.filter(c => c.type === TransactionType.INCOME);
        for (const cat of incomeCategories) {
            for (const sub of cat.subcategories) {
                for (const item of sub.items) {
                    if (item.name.toLowerCase().includes('rendimento')) {
                        return item.id;
                    }
                }
            }
        }
        return '';
    }, [categories]);

    const { filteredTotalProfit, filteredCDBs } = useMemo(() => {
        let totalProfitInPeriod = 0;
        const start = dateRange.start ? dateRange.start.getTime() : 0;
        const end = dateRange.end ? dateRange.end.getTime() : Infinity;

        const processed = cdbs.map(cdb => {
            const profitInPeriod = (cdb.yieldHistory || [])
                .filter(h => {
                    const hTime = new Date(h.date).getTime();
                    return hTime >= start && hTime <= end;
                })
                .reduce((acc, h) => acc + h.amount, 0);
            
            totalProfitInPeriod += profitInPeriod;
            return { ...cdb, profitInPeriod };
        });

        return { 
            filteredTotalProfit: totalProfitInPeriod,
            filteredCDBs: processed
        };
    }, [cdbs, dateRange]);

    const totalEquity = useMemo(() => cdbs.reduce((acc, cdb) => acc + cdb.currentGrossBalance, 0), [cdbs]);
    const totalInvested = useMemo(() => cdbs.reduce((acc, cdb) => acc + cdb.principalAmount, 0), [cdbs]);

    const handleOpenCreate = () => {
        setEditingCdbId(null);
        setName('');
        setBank('');
        setDate(new Date().toISOString().split('T')[0]);
        setAmount('');
        setRate('');
        setMaturity('');
        setAccountId('');
        setCategoryId('');
        setView('form');
    };

    const handleOpenEdit = (cdb: CDBContract) => {
        setEditingCdbId(cdb.id);
        setName(cdb.name);
        setBank(cdb.bank);
        setDate(cdb.applicationDate);
        setAmount(String(cdb.principalAmount));
        setRate(cdb.rateDescription);
        setMaturity(cdb.maturityDate || '');
        setAccountId(cdb.linkedAccountId);
        setCategoryId(''); 
        setView('form');
    };

    const handleSubmitCDB = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !bank || !amount || !accountId) {
            alert("Preencha os campos obrigatórios.");
            return;
        }

        const principal = parseFloat(amount);

        if (editingCdbId) {
            const existing = cdbs.find(c => c.id === editingCdbId);
            if (!existing) return;

            if (principal !== existing.principalAmount || accountId !== existing.linkedAccountId || date !== existing.applicationDate) {
                if (existing.initialTransactionId) {
                    await updateTransaction({
                        id: existing.initialTransactionId,
                        description: `Aplicação em CDB (Editado): ${name}`,
                        amount: principal,
                        date: date,
                        type: TransactionType.EXPENSE,
                        accountId: accountId,
                    } as any);
                }
            }

            const diffPrincipal = principal - existing.principalAmount;
            const newGrossBalance = existing.currentGrossBalance + diffPrincipal;

            const updatedCDB: CDBContract = {
                ...existing,
                name,
                bank,
                applicationDate: date,
                principalAmount: principal,
                rateDescription: rate,
                currentGrossBalance: newGrossBalance,
                linkedAccountId: accountId,
                maturityDate: maturity || null
            };

            await updateCDB(updatedCDB);
            setView('dashboard');
            return;
        }

        let selectedItemId = categoryId;
        if (!selectedItemId && investmentCategoryOptions.length > 0) {
            const smartDefault = investmentCategoryOptions.find(i => i.name.toLowerCase().includes('investimento')) || investmentCategoryOptions[0];
            selectedItemId = smartDefault.id;
        }

        const transaction: Omit<Transaction, 'id'> = {
            description: `Aplicação em CDB: ${name}`,
            amount: principal,
            date: date,
            type: TransactionType.EXPENSE,
            accountId: accountId,
            itemId: selectedItemId 
        };

        const txId = await addTransaction(transaction);

        if (txId) {
            const newCDB: Omit<CDBContract, 'id'> = {
                name,
                bank,
                applicationDate: date,
                principalAmount: principal,
                rateDescription: rate,
                currentGrossBalance: principal, 
                isActive: true,
                initialTransactionId: txId, 
                yieldHistory: [],
                linkedAccountId: accountId,
                maturityDate: maturity || null
            };
            await addCDB(newCDB);
            
            if (onNavigateToAccount) {
                onNavigateToAccount(accountId, 'investments');
            } else {
                setView('dashboard');
            }
        }
    };

    const handleRedeem = async (redeemAmount: number, redeemDate: string) => {
        if (!redemptionCdb) return;

        const proportion = redeemAmount / redemptionCdb.currentGrossBalance;
        const principalPart = redemptionCdb.principalAmount * proportion;
        const profitPart = redeemAmount - principalPart;

        const remainingPrincipal = redemptionCdb.principalAmount - principalPart;
        const remainingBalance = redemptionCdb.currentGrossBalance - redeemAmount;

        const updatedCDB: CDBContract = {
            ...redemptionCdb,
            principalAmount: Math.max(0, remainingPrincipal),
            currentGrossBalance: Math.max(0, remainingBalance),
            isActive: remainingBalance > 0.01
        };
        
        const success = await updateCDB(updatedCDB);
        if (success) {
            const targetAccId = redemptionCdb.linkedAccountId || (activeAccounts.length > 0 ? activeAccounts[0].id : '');
            
            const txs: Omit<Transaction, 'id'>[] = [
                {
                    description: `Resgate principal: ${redemptionCdb.name}`,
                    amount: principalPart,
                    date: redeemDate,
                    type: TransactionType.INCOME,
                    accountId: targetAccId,
                    itemId: '' 
                }
            ];

            if (profitPart > 0.01) {
                txs.push({
                    description: `Rendimento CDB (resgate): ${redemptionCdb.name}`,
                    amount: profitPart,
                    date: redeemDate,
                    type: TransactionType.INCOME,
                    accountId: targetAccId,
                    itemId: yieldCategoryId 
                });
            }

            await addTransactions(txs);
            setRedemptionCdb(null);
        }
    };

    const handleUpdateBalance = async (value: number, txDate: string, mode: 'yield' | 'total') => {
        if (!updateBalanceCdb) return;

        let diff = 0;
        let newGrossBalance = 0;
        let finalHistory = [...(updateBalanceCdb.yieldHistory || [])];
        
        if (mode === 'yield') {
            diff = value;
            newGrossBalance = updateBalanceCdb.currentGrossBalance + value;
            
            finalHistory.push({
                id: crypto.randomUUID(),
                date: txDate,
                amount: diff
            });
        } else {
            diff = value - updateBalanceCdb.currentGrossBalance;
            newGrossBalance = value;
            if (Math.abs(diff) < 0.01) return;
            const existingDates = new Set(finalHistory.map(h => h.date));
            const allWorkDays = getWorkDaysInRange(updateBalanceCdb.applicationDate, txDate);
            const newYieldingDays = allWorkDays.filter(day => 
                !existingDates.has(day) && 
                day !== updateBalanceCdb.applicationDate
            );
            
            if (newYieldingDays.length > 0) {
                const dailyYield = diff / newYieldingDays.length;
                for (const day of newYieldingDays) {
                    finalHistory.push({ id: crypto.randomUUID(), date: day, amount: dailyYield });
                }
            } else {
                finalHistory.push({ id: crypto.randomUUID(), date: txDate, amount: diff });
            }
        }

        const updatedCDB: CDBContract = {
            ...updateBalanceCdb,
            currentGrossBalance: newGrossBalance,
            yieldHistory: finalHistory
        };
        
        await updateCDB(updatedCDB);
        setUpdateBalanceCdb(updatedCDB);
    };

    const handleDeleteHistoryEntry = async (entry: YieldEntry) => {
        if (!historyCdb) return;
        if (!window.confirm('Deseja excluir este rendimento do histórico do CDB?')) return;
        const newBalance = historyCdb.currentGrossBalance - entry.amount;
        const newHistory = (historyCdb.yieldHistory || []).filter(h => h.id !== entry.id);
        const updatedCDB = { ...historyCdb, currentGrossBalance: Math.max(0, newBalance), yieldHistory: newHistory };
        await updateCDB(updatedCDB);
        setHistoryCdb(updatedCDB);
    };

    const processEditHistoryEntry = async (entry: YieldEntry, newAmount: number, newDate: string) => {
        if (!historyCdb) return;
        const diff = newAmount - entry.amount;
        const newBalance = historyCdb.currentGrossBalance + diff;
        const newHistory = (historyCdb.yieldHistory || []).map(h => h.id === entry.id ? { ...h, amount: newAmount, date: newDate } : h);
        const updatedCDB = { ...historyCdb, currentGrossBalance: Math.max(0, newBalance), yieldHistory: newHistory };
        await updateCDB(updatedCDB);
        setHistoryCdb(updatedCDB);
    };

    const handleDelete = async (id: string) => {
        const cdb = cdbs.find(c => c.id === id);
        if (!cdb) return;
        if (window.confirm('Excluir este investimento permanentemente? Apenas as movimentações reais (aportes/resgates) na conta bancária serão preservadas.')) {
            await deleteCDB(id);
        }
    };

    if (view === 'form') {
        return (
            <div className="max-w-3xl mx-auto">
                <button onClick={() => setView('dashboard')} className="mb-4 text-sm text-blue-600 hover:underline flex items-center tracking-normal font-normal">
                    <ArrowUturnLeftIcon className="w-4 h-4 mr-1" /> Voltar ao dashboard
                </button>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6 tracking-normal">{editingCdbId ? 'Editar investimento' : 'Novo investimento em CDB'}</h2>
                    <form onSubmit={handleSubmitCDB} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-normal text-slate-500 mb-1 tracking-normal">Nome do CDB *</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: CDB Liquidez Diária" required className="input-style" />
                            </div>
                            <div>
                                <label className="block text-sm font-normal text-slate-500 mb-1 tracking-normal">Banco / corretora *</label>
                                <input type="text" value={bank} onChange={e => setBank(e.target.value)} placeholder="Ex: XP, NuInvest..." required className="input-style" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-normal text-slate-500 mb-1 tracking-normal">Valor aplicado *</label>
                                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" step="0.01" required className="input-style" />
                            </div>
                            <div>
                                <label className="block text-sm font-normal text-slate-500 mb-1 tracking-normal">Data da aplicação *</label>
                                <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="input-style" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-normal text-slate-500 mb-1 tracking-normal">Taxa de rendimento</label>
                                <input type="text" value={rate} onChange={e => setRate(e.target.value)} placeholder="Ex: 110% do CDI" className="input-style" />
                            </div>
                            <div>
                                <label className="block text-sm font-normal text-slate-500 mb-1 tracking-normal">Vencimento (opcional)</label>
                                <input type="date" value={maturity} onChange={e => setMaturity(e.target.value)} className="input-style" />
                            </div>
                        </div>
                        <div className="pt-4 border-t border-slate-100">
                            <h3 className="text-sm font-bold text-slate-800 mb-3 tracking-normal">Vinculação financeira</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-normal text-slate-500 mb-1 tracking-normal">Conta vinculada *</label>
                                    <select value={accountId} onChange={e => setAccountId(e.target.value)} required className="input-style">
                                        <option value="">Selecione...</option>
                                        {activeAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                    </select>
                                    <p className="text-[10px] text-slate-500 mt-1 font-normal tracking-normal">Os rendimentos e resgates serão lançados nesta conta.</p>
                                </div>
                                {!editingCdbId && (
                                    <div>
                                        <label className="block text-sm font-normal text-slate-500 mb-1 tracking-normal">Categoria (despesa)</label>
                                        <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="input-style">
                                            <option value="">Selecione...</option>
                                            {investmentCategoryOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.fullName}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end pt-4">
                            <button type="submit" className="btn-primary">{editingCdbId ? 'Salvar alterações' : 'Registrar investimento'}</button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
                {['Mês atual', 'Mês passado', 'Últimos 3 meses', 'Últimos 6 meses', 'Este ano', 'Personalizado'].map(f => (
                    <button 
                        key={f} 
                        onClick={() => handleFilterClick(f)} 
                        className={`px-4 py-2 rounded-full text-sm font-normal transition-all tracking-normal ${activeFilter === f ? 'bg-blue-600 text-white font-bold' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCardInvest title="Patrimônio em CDB" value={totalEquity} />
                <KpiCardInvest title="Total investido" value={totalInvested} colorClass="text-blue-600" />
                <KpiCardInvest title="Lucro no período" value={filteredTotalProfit} colorClass={filteredTotalProfit >= 0 ? 'text-green-600' : 'text-red-600'} />
            </div>

            <div className="flex justify-between items-center pt-4">
                <h2 className="text-xl font-bold text-slate-800 tracking-normal">Meus CDBs</h2>
                <button onClick={handleOpenCreate} className="btn-primary flex items-center gap-2">
                    <PlusIcon className="w-5 h-5" /> Novo aporte
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-slate-500">
                            <tr className="text-xs font-normal tracking-normal">
                                <th className="px-6 py-4 font-normal">Nome / banco</th>
                                <th className="px-6 py-4 font-normal">Aplicação</th>
                                <th className="px-6 py-4 text-right font-normal">Valor aplicado</th>
                                <th className="px-6 py-4 text-right font-normal">Saldo bruto</th>
                                <th className="px-6 py-4 text-right font-normal">Lucro no período</th>
                                <th className="px-6 py-4 text-center font-normal">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredCDBs.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500 font-normal tracking-normal">Nenhum investimento encontrado.</td></tr>
                            ) : (
                                filteredCDBs.filter(c => c.isActive).map(cdb => {
                                    const profit = cdb.profitInPeriod;
                                    return (
                                        <tr key={cdb.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-slate-800 tracking-normal">{cdb.name}</p>
                                                <p className="text-xs text-slate-500 font-normal tracking-normal">{cdb.bank} • {cdb.rateDescription}</p>
                                                <p className="text-[10px] text-slate-500 font-normal mt-1 tracking-normal">Conta: {accountMap.get(cdb.linkedAccountId) || 'Não vinculada'}</p>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 font-normal tracking-normal">
                                                {formatDate(cdb.applicationDate)}
                                                {cdb.maturityDate && <span className="block text-xs text-slate-400 font-normal mt-0.5">Vence: {formatDate(cdb.maturityDate)}</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right font-normal text-slate-600 tracking-normal"><PrivateValue>{formatCurrency(cdb.principalAmount)}</PrivateValue></td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-800 tracking-normal"><PrivateValue>{formatCurrency(cdb.currentGrossBalance)}</PrivateValue></td>
                                            <td className="px-6 py-4 text-right">
                                                <p className={`font-bold tracking-normal ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}><PrivateValue>{formatCurrency(profit)}</PrivateValue></p>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => setUpdateBalanceCdb(cdb)} className="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-full text-xs font-normal flex items-center gap-1 tracking-normal" title="Atualizar saldo"><UpArrowIcon className="w-3 h-3"/> Atualizar</button>
                                                    <button onClick={() => setHistoryCdb(cdb)} className="px-3 py-1 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-full text-xs font-normal tracking-normal">Histórico</button>
                                                    <button onClick={() => setRedemptionCdb(cdb)} className="px-3 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-full text-xs font-normal tracking-normal">Resgatar</button>
                                                    <button onClick={() => handleOpenEdit(cdb)} className="p-1.5 text-slate-500 hover:text-blue-500 rounded-full transition-colors" title="Editar"><PencilIcon className="w-4 h-4"/></button>
                                                    <button onClick={() => handleDelete(cdb.id)} className="p-1.5 text-slate-500 hover:text-red-500 rounded-full transition-colors"><TrashIcon className="w-4 h-4"/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <DateRangePickerModal
                isOpen={isPickerOpen}
                onClose={() => setIsPickerOpen(false)}
                value={dateRange}
                onChange={handleDateChange}
            />

            {redemptionCdb && <RedemptionModal isOpen={!!redemptionCdb} onClose={() => setRedemptionCdb(null)} cdb={redemptionCdb} onRedeem={handleRedeem} />}
            {updateBalanceCdb && <UpdateBalanceModal isOpen={!!updateBalanceCdb} onClose={() => setUpdateBalanceCdb(null)} cdb={updateBalanceCdb} onUpdate={handleUpdateBalance} />}
            {historyCdb && <YieldHistoryModal isOpen={!!historyCdb} onClose={() => setHistoryCdb(null)} cdb={historyCdb} onDeleteEntry={handleDeleteHistoryEntry} onEditEntry={processEditHistoryEntry} />}
        </div>
    );
};

export default InvestmentsPage;
