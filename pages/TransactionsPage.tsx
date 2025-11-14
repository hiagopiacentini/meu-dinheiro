
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Transaction, Account, Category, TransactionType, Loan, CategoryItem } from '../types';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import SearchIcon from '../components/icons/SearchIcon';
import DateRangePickerModal from '../components/DateRangePickerModal';
import PlusIcon from '../components/icons/PlusIcon';
import XIcon from '../components/icons/XIcon';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

// Helper function to create a UTC date from a local date string to avoid timezone issues.
const getUTCDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

const formatDate = (dateString: string) => {
    return getUTCDate(dateString).toLocaleDateString('pt-BR');
};


const categoryColors: { [key: string]: string } = {
    'Salário': 'bg-blue-100 text-blue-800',
    'Moradia': 'bg-yellow-100 text-yellow-800',
    'Alimentação': 'bg-red-100 text-red-800',
    'Renda Extra': 'bg-green-100 text-green-800',
    'Lazer': 'bg-purple-100 text-purple-800',
    'Transporte': 'bg-indigo-100 text-indigo-800',
};
const defaultCategoryColor = 'bg-slate-100 text-slate-800';

interface SplitItem {
    id: number;
    itemId: string;
    amount: string;
}

const TransactionsPage: React.FC<{ addTransactionTrigger: number }> = ({ addTransactionTrigger }) => {
    const [transactions, setTransactions] = useLocalStorage<Transaction[]>('transactions', []);
    const [accounts] = useLocalStorage<Account[]>('accounts', []);
    const [categories] = useLocalStorage<Category[]>('categories', []);
    const [loans, setLoans] = useLocalStorage<Loan[]>('loans', []);

    // Form State
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [accountId, setAccountId] = useState('');
    const [itemId, setItemId] = useState('');
    const [isInstallment, setIsInstallment] = useState(false);
    const [installmentsCount, setInstallmentsCount] = useState('2');
    const [isSplit, setIsSplit] = useState(false);
    const [splitItems, setSplitItems] = useState<SplitItem[]>([{ id: 1, itemId: '', amount: '' }]);

    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [dateFilter, setDateFilter] = useState('Este Mês');
    const [typeFilter, setTypeFilter] = useState('Todos');
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [customDateRange, setCustomDateRange] = useState<{start: Date | null, end: Date | null}>({ start: null, end: null });
    const [itemSearch, setItemSearch] = useState('');

    const formRef = useRef<HTMLDivElement>(null);
    
    const descriptionInputRef = useRef<HTMLInputElement>(null);

    const activeAccounts = useMemo(() => accounts.filter(a => a.isActive), [accounts]);

    const handleClearForm = useCallback(() => {
        setEditingTransaction(null);
        setType(TransactionType.EXPENSE);
        setDescription('');
        setAmount('');
        setDate(new Date().toISOString().split('T')[0]);
        setAccountId(activeAccounts.length > 0 ? activeAccounts[0].id : '');
        setItemId('');
        setIsInstallment(false);
        setInstallmentsCount('2');
        setIsSplit(false);
        setSplitItems([{ id: 1, itemId: '', amount: '' }]);
        setItemSearch('');
    }, [activeAccounts]);

    useEffect(() => {
        if (addTransactionTrigger > 0) {
            handleClearForm();
            formRef.current?.scrollTo(0, 0);
        }
    }, [addTransactionTrigger, handleClearForm]);

    useEffect(() => {
        if (!editingTransaction && activeAccounts.length > 0 && !accountId) {
            setAccountId(activeAccounts[0].id);
        }
    }, [editingTransaction, activeAccounts, accountId]);

    const categoryMap = useMemo(() => {
        const map = new Map<string, { item: string, sub: string, cat: string, catType: TransactionType }>();
        categories.forEach(cat => {
            cat.subcategories.forEach(sub => {
                sub.items.forEach(item => {
                    map.set(item.id, { item: item.name, sub: sub.name, cat: cat.name, catType: cat.type });
                });
            });
        });
        return map;
    }, [categories]);
    
    const accountMap = useMemo(() => new Map(accounts.map(acc => [acc.id, acc.name])), [accounts]);
    
    const handleDescriptionBlur = () => {
        if (!description.trim() || isSplit) return;
        const lastTransactionWithDescription = [...transactions]
            .reverse()
            .find(t => t.description.toLowerCase() === description.toLowerCase());

        if (lastTransactionWithDescription && lastTransactionWithDescription.itemId) {
            setItemId(lastTransactionWithDescription.itemId);
        }
    };

    const filteredTransactions = useMemo(() => {
        let items = [...transactions];

        const now = new Date();
        const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
        
        if (dateFilter === 'Este Mês') {
            items = items.filter(t => {
                const tDate = getUTCDate(t.date);
                return tDate >= startOfMonth && tDate <= endOfMonth;
            });
        } else if (dateFilter === 'Mês Passado') {
             const startOfLastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
             const endOfLastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));
             items = items.filter(t => {
                const tDate = getUTCDate(t.date);
                return tDate >= startOfLastMonth && tDate <= endOfLastMonth;
            });
        } else if (dateFilter === 'Personalizado' && customDateRange.start && customDateRange.end) {
            const start = customDateRange.start;
            start.setUTCHours(0,0,0,0);
            const end = customDateRange.end;
            end.setUTCHours(23,59,59,999);
            items = items.filter(t => {
                const tDate = getUTCDate(t.date);
                return tDate >= start && tDate <= end;
            });
        }
        
        if (typeFilter !== 'Todos') {
            const lowerTypeFilter = typeFilter === 'Entradas' ? TransactionType.INCOME : TransactionType.EXPENSE;
            items = items.filter(t => t.type === lowerTypeFilter);
        }

        if (searchTerm) {
            items = items.filter(t => t.description.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        return items.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            if (dateB !== dateA) return dateB - dateA;
            // if dates are the same, we need a stable sort, assuming newer items are added later
            const indexA = transactions.findIndex(t => t.id === a.id);
            const indexB = transactions.findIndex(t => t.id === b.id);
            return indexB - indexA;
        });
    }, [transactions, searchTerm, dateFilter, typeFilter, customDateRange]);

    const { periodIncome, periodExpenses } = useMemo(() => {
        return filteredTransactions.reduce((acc, t) => {
            if (t.type === TransactionType.INCOME) acc.periodIncome += t.amount;
            else if (t.type === TransactionType.EXPENSE) acc.periodExpenses += t.amount;
            return acc;
        }, { periodIncome: 0, periodExpenses: 0 });
    }, [filteredTransactions]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const commonData = { description, date, accountId, type };

        if (isSplit) {
            const totalSplitAmount = splitItems.reduce((sum, item) => sum + parseFloat(item.amount || '0'), 0);
            if(totalSplitAmount !== parseFloat(amount)) {
                alert('A soma dos valores divididos deve ser igual ao valor total.');
                return;
            }
            if(splitItems.some(i => !i.itemId || !i.amount)) {
                alert('Todos os itens divididos devem ter um item e um valor.');
                return;
            }
            
            const newTransactions: Transaction[] = splitItems.map(item => ({
                id: crypto.randomUUID(),
                ...commonData,
                amount: parseFloat(item.amount),
                itemId: item.itemId,
                description: `${description} - ${categoryMap.get(item.itemId)?.item}`
            }));
            setTransactions(prev => [...prev, ...newTransactions]);

        } else if (isInstallment && type === TransactionType.EXPENSE) {
            // Installment logic
            const totalInstallments = parseInt(installmentsCount, 10);
            const installmentGroupId = crypto.randomUUID();
            const originalDate = getUTCDate(date);
            const newTransactions: Transaction[] = [];

            for(let i = 0; i < totalInstallments; i++) {
                const installmentDate = new Date(originalDate);
                installmentDate.setUTCMonth(originalDate.getUTCMonth() + i);
                newTransactions.push({
                    id: crypto.randomUUID(),
                    ...commonData,
                    amount: parseFloat(amount),
                    itemId: itemId,
                    date: installmentDate.toISOString().split('T')[0],
                    description: `${description} (${i + 1}/${totalInstallments})`,
                    installmentGroupId,
                    currentInstallment: i + 1,
                    totalInstallments
                });
            }
            setTransactions(prev => [...prev, ...newTransactions]);
        } else {
            // Single transaction logic
             if (!description || !amount || !date || !accountId || !itemId) {
                alert('Por favor, preencha todos os campos obrigatórios.');
                return;
            }
            const transactionData = { ...commonData, amount: parseFloat(amount), itemId };
            if (editingTransaction) {
                setTransactions(transactions.map(t => t.id === editingTransaction.id ? { ...t, ...transactionData } : t));
            } else {
                setTransactions([...transactions, { ...transactionData, id: crypto.randomUUID() }]);
            }
        }

        handleClearForm();
    };

    const handleEdit = (transaction: Transaction) => {
        setEditingTransaction(transaction);
        setType(transaction.type);
        setDescription(transaction.description);
        setAmount(String(transaction.amount));
        setDate(transaction.date);
        setAccountId(transaction.accountId);
        setItemId(transaction.itemId || '');
        setIsInstallment(false); // Can't edit installments for now
        setIsSplit(false); // Can't edit split for now
        formRef.current?.scrollTo(0, 0);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este lançamento?')) {
            const transactionToDelete = transactions.find(t => t.id === id);
            if (!transactionToDelete) return;
            const relatedLoan = loans.find(l => l.initialTransactionId === id || l.settlementTransactionId === id || l.partialSettlements?.some(p => p.transactionId === id));
            if (relatedLoan) {
              // ... (loan update logic from before)
            }
            setTransactions(prev => prev.filter(t => t.id !== id));
        }
    };
    
    const categoryOptions = useMemo(() => {
        const lowerItemSearch = itemSearch.toLowerCase();
        return categories
            .filter(cat => cat.type === type)
            .flatMap(cat => 
                cat.subcategories.flatMap(sub => 
                    sub.items
                        .filter(item => {
                            const fullName = `${cat.name} > ${sub.name} > ${item.name}`;
                            return fullName.toLowerCase().includes(lowerItemSearch);
                        })
                        .map(item => ({...item, catName: cat.name, subName: sub.name}))
                )
            )
            .sort((a,b) => a.name.localeCompare(b.name, 'pt-BR'));
    }, [categories, type, itemSearch]);
    
    const handleDateFilterChange = (value: string) => {
        setDateFilter(value);
        if (value === 'Personalizado') setIsPickerOpen(true);
    };
    
    const handleCustomDateChange = (range: { start: Date | null, end: Date | null }) => {
        setCustomDateRange(range);
    };

    const handleSplitItemChange = (id: number, field: 'itemId' | 'amount', value: string) => {
        setSplitItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };
    const addSplitItem = () => setSplitItems(prev => [...prev, { id: Date.now(), itemId: '', amount: '' }]);
    const removeSplitItem = (id: number) => setSplitItems(prev => prev.filter(item => item.id !== id));

    const maxDate = isInstallment ? undefined : new Date().toISOString().split('T')[0];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 xl:col-span-4">
                <div ref={formRef} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto">
                    <form onSubmit={handleSubmit}>
                        <h2 className="text-xl font-bold text-slate-800 mb-4">{editingTransaction ? 'Editar Transação' : 'Nova Transação'}</h2>
                        
                        <div className="p-1 bg-slate-100 rounded-lg flex space-x-1 mb-4">
                            <button type="button" onClick={() => { setType(TransactionType.EXPENSE); }} className={`w-full text-center py-2 text-sm font-semibold rounded-md transition-all ${type === TransactionType.EXPENSE ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Saídas</button>
                            <button type="button" onClick={() => { setType(TransactionType.INCOME); setIsInstallment(false); setIsSplit(false); }} className={`w-full text-center py-2 text-sm font-semibold rounded-md transition-all ${type === TransactionType.INCOME ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Entradas</button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-600 mb-1 block">Descrição</label>
                                <input ref={descriptionInputRef} type="text" value={description} onChange={e => setDescription(e.target.value)} onBlur={handleDescriptionBlur} required className="input-style" placeholder="Ex: Almoço no restaurante" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-600 mb-1 block">Valor {isInstallment ? 'da Parcela' : isSplit ? 'Total' : ''}</label>
                                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required={!isSplit} step="0.01" min="0" className="input-style" placeholder="R$ 0,00" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-600 mb-1 block">Data {isInstallment ? 'da 1ª Parcela' : ''}</label>
                                    <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="input-style" max={maxDate} />
                                </div>
                            </div>
                            {type === TransactionType.EXPENSE && !editingTransaction && (
                                <div className="flex space-x-6">
                                    <div className="flex items-center">
                                        <input type="checkbox" id="installment-check" checked={isInstallment} onChange={e => { setIsInstallment(e.target.checked); if(e.target.checked) setIsSplit(false); }} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"/>
                                        <label htmlFor="installment-check" className="ml-2 block text-sm text-slate-800">Parcelar</label>
                                    </div>
                                    <div className="flex items-center">
                                        <input type="checkbox" id="split-check" checked={isSplit} onChange={e => { setIsSplit(e.target.checked); if(e.target.checked) setIsInstallment(false); }} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"/>
                                        <label htmlFor="split-check" className="ml-2 block text-sm text-slate-800">Dividir</label>
                                    </div>
                                </div>
                            )}
                            {isInstallment && type === TransactionType.EXPENSE && (
                                <div>
                                    <label className="text-sm font-medium text-slate-600 mb-1 block">Número de Parcelas</label>
                                    <input type="number" value={installmentsCount} onChange={e => setInstallmentsCount(e.target.value)} required min="2" className="input-style" />
                                </div>
                            )}
                            {isSplit ? (
                                <div className="space-y-3 border-t border-slate-200 pt-4">
                                    {splitItems.map((item, index) => (
                                        <div key={item.id} className="grid grid-cols-12 gap-2 items-end">
                                            <div className="col-span-7">
                                                {index === 0 && <label className="text-sm font-medium text-slate-600 mb-1 block">Item</label>}
                                                <select value={item.itemId} onChange={e => handleSplitItemChange(item.id, 'itemId', e.target.value)} required className="input-style">
                                                    <option value="" disabled>Selecione...</option>
                                                    {categoryOptions.map(opt => <option key={opt.id} value={opt.id}>{`${opt.catName} > ${opt.name}`}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-span-4">
                                                {index === 0 && <label className="text-sm font-medium text-slate-600 mb-1 block">Valor</label>}
                                                <input type="number" value={item.amount} onChange={e => handleSplitItemChange(item.id, 'amount', e.target.value)} required step="0.01" min="0" className="input-style" placeholder="R$ 0,00" />
                                            </div>
                                            <div className="col-span-1">
                                                {splitItems.length > 1 && <button type="button" onClick={() => removeSplitItem(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full"><XIcon className="w-4 h-4"/></button>}
                                            </div>
                                        </div>
                                    ))}
                                    <button type="button" onClick={addSplitItem} className="btn-secondary text-xs py-1 px-3 flex items-center gap-1"><PlusIcon className="w-4 h-4"/> Adicionar Item</button>
                                </div>
                            ) : (
                                <div>
                                    <label className="text-sm font-medium text-slate-600 mb-1 block">Item</label>
                                    <div className="p-2 border border-slate-200 rounded-lg">
                                        <input type="text" value={itemSearch} onChange={e => setItemSearch(e.target.value)} className="input-style mb-2" placeholder="Pesquisar item..."/>
                                        <select value={itemId} onChange={e => setItemId(e.target.value)} required className="input-style" size={5}>
                                            <option value="" disabled>Selecione um item...</option>
                                            {categoryOptions.map(opt => <option key={opt.id} value={opt.id}>{`${opt.catName} > ${opt.subName} > ${opt.name}`}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="text-sm font-medium text-slate-600 mb-1 block">Conta</label>
                                <select value={accountId} onChange={e => setAccountId(e.target.value)} required className="input-style">
                                    <option value="" disabled>Selecione uma conta...</option>
                                    {activeAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3 mt-6">
                            <button type="button" onClick={handleClearForm} className="btn-secondary w-full">Cancelar</button>
                            <button type="submit" className="btn-primary w-full">{editingTransaction ? 'Salvar' : (isInstallment ? 'Lançar Parcelas' : (isSplit ? 'Salvar Lançamentos' : 'Salvar'))}</button>
                        </div>
                    </form>
                </div>
            </div>

            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                    <div className="relative sm:col-span-2 md:col-span-4 lg:col-span-2">
                        {!isSearchFocused && !searchTerm && <SearchIcon className="w-5 h-5 text-slate-400 absolute top-1/2 left-3 -translate-y-1/2 pointer-events-none"/>}
                        <input 
                            type="text" 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            onFocus={() => setIsSearchFocused(true)}
                            onBlur={() => setIsSearchFocused(false)}
                            className="input-style pl-10"/>
                    </div>
                    <select value={dateFilter} onChange={e => handleDateFilterChange(e.target.value)} className="input-style">
                        <option>Este Mês</option>
                        <option>Mês Passado</option>
                        <option>Sempre</option>
                        <option>Personalizado</option>
                    </select>
                    <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input-style">
                        <option>Todos</option>
                        <option>Entradas</option>
                        <option>Saídas</option>
                    </select>
                </div>
                
                <DateRangePickerModal isOpen={isPickerOpen} onClose={() => setIsPickerOpen(false)} value={customDateRange} onChange={handleCustomDateChange} />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200"><p className="text-sm text-slate-500 font-medium">Receitas no Período</p><p className="text-2xl font-bold text-green-600">{formatCurrency(periodIncome)}</p></div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200"><p className="text-sm text-slate-500 font-medium">Despesas no Período</p><p className="text-2xl font-bold text-red-600">{formatCurrency(periodExpenses)}</p></div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200"><p className="text-sm text-slate-500 font-medium">Saldo</p><p className={`text-2xl font-bold ${periodIncome - periodExpenses >= 0 ? 'text-slate-800' : 'text-red-600'}`}>{formatCurrency(periodIncome - periodExpenses)}</p></div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-slate-500 uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-left">Data</th>
                                    <th className="px-4 py-3 font-semibold text-left">Descrição</th>
                                    <th className="px-4 py-3 font-semibold text-left">Categoria</th>
                                    <th className="px-4 py-3 font-semibold text-right">Valor</th>
                                    <th className="px-4 py-3 font-semibold text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {filteredTransactions.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center p-8 text-slate-500">Nenhum lançamento encontrado.</td></tr>
                                ) : (
                                    filteredTransactions.map(t => {
                                        const categoryInfo = t.itemId ? categoryMap.get(t.itemId) : null;
                                        const isExpense = t.type === TransactionType.EXPENSE;
                                        return (
                                        <tr key={t.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(t.date)}</td>
                                            <td className="px-4 py-3 text-slate-800 font-medium">{t.description}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${categoryInfo ? (categoryColors[categoryInfo.cat] || defaultCategoryColor) : defaultCategoryColor}`}>
                                                    {categoryInfo?.cat || 'N/A'}
                                                </span>
                                            </td>
                                            <td className={`px-4 py-3 text-right font-bold ${isExpense ? 'text-red-500' : 'text-green-500'}`}>
                                                {isExpense ? '- ' : ''}{formatCurrency(t.amount)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center space-x-1">
                                                    <button onClick={() => handleEdit(t)} className="p-1.5 rounded-full hover:bg-gray-200 transition-colors" aria-label="Editar"><PencilIcon className="w-4 h-4 text-blue-500"/></button>
                                                    <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded-full hover:bg-gray-200 transition-colors" aria-label="Excluir"><TrashIcon className="w-4 h-4 text-red-500"/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    )})
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TransactionsPage;