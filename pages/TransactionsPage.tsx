
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Transaction, Account, Category, TransactionType } from '../types';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import SearchIcon from '../components/icons/SearchIcon';
import DateRangePickerModal from '../components/DateRangePickerModal';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

const categoryColors: { [key: string]: string } = {
    'Salário': 'bg-blue-100 text-blue-800',
    'Moradia': 'bg-yellow-100 text-yellow-800',
    'Alimentação': 'bg-red-100 text-red-800',
    'Renda Extra': 'bg-green-100 text-green-800',
    'Lazer': 'bg-purple-100 text-purple-800',
    'Transporte': 'bg-indigo-100 text-indigo-800',
};
const defaultCategoryColor = 'bg-slate-100 text-slate-800';

const TransactionsPage: React.FC<{ addTransactionTrigger: number }> = ({ addTransactionTrigger }) => {
    const [transactions, setTransactions] = useLocalStorage<Transaction[]>('transactions', []);
    const [accounts] = useLocalStorage<Account[]>('accounts', []);
    const [categories] = useLocalStorage<Category[]>('categories', []);

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


    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('Este Mês');
    const [typeFilter, setTypeFilter] = useState('Todos');
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [customDateRange, setCustomDateRange] = useState<{start: Date | null, end: Date | null}>({ start: null, end: null });

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
    }, [activeAccounts]);

    useEffect(() => {
        if (addTransactionTrigger > 0) {
            handleClearForm();
        }
    }, [addTransactionTrigger, handleClearForm]);

    useEffect(() => {
        if (!editingTransaction && activeAccounts.length > 0) {
            setAccountId(activeAccounts[0].id);
        }
    }, [editingTransaction, activeAccounts]);

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

    const filteredTransactions = useMemo(() => {
        let items = [...transactions];

        // Date Filter
        const now = new Date();
        if (dateFilter === 'Este Mês') {
            items = items.filter(t => {
                const tDate = new Date(t.date);
                return tDate.getUTCMonth() === now.getUTCMonth() && tDate.getUTCFullYear() === now.getUTCFullYear();
            });
        } else if (dateFilter === 'Personalizado' && customDateRange.start && customDateRange.end) {
            items = items.filter(t => {
                const tDate = new Date(t.date);
                const start = new Date(customDateRange.start as Date);
                start.setHours(0,0,0,0);
                const end = new Date(customDateRange.end as Date);
                end.setHours(23,59,59,999);
                return tDate >= start && tDate <= end;
            });
        }
        
        // Type Filter
        if (typeFilter !== 'Todos') {
            items = items.filter(t => t.type === typeFilter.toLowerCase());
        }

        // Search Term Filter
        if (searchTerm) {
            items = items.filter(t => t.description.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, searchTerm, dateFilter, typeFilter, customDateRange]);

    const { periodIncome, periodExpenses, periodBalance } = useMemo(() => {
        return filteredTransactions.reduce((acc, t) => {
            if (t.type === TransactionType.INCOME) acc.periodIncome += t.amount;
            else if (t.type === TransactionType.EXPENSE) acc.periodExpenses += t.amount;
            return acc;
        }, {
            periodIncome: 0,
            periodExpenses: 0,
            periodBalance: 0
        });
    }, [filteredTransactions]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!description || !amount || !date || !accountId || !itemId) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        if(isInstallment && type === TransactionType.EXPENSE) {
            const totalInstallments = parseInt(installmentsCount, 10);
            if(isNaN(totalInstallments) || totalInstallments < 2) {
                alert('O número de parcelas deve ser 2 ou maior.');
                return;
            }

            const newTransactions: Transaction[] = [];
            const installmentGroupId = crypto.randomUUID();
            const originalDate = new Date(date);

            for(let i = 0; i < totalInstallments; i++) {
                const installmentDate = new Date(originalDate.getUTCFullYear(), originalDate.getUTCMonth() + i, originalDate.getUTCDate());
                newTransactions.push({
                    id: crypto.randomUUID(),
                    description: `${description} (${i + 1}/${totalInstallments})`,
                    amount: parseFloat(amount),
                    date: installmentDate.toISOString().split('T')[0],
                    type: TransactionType.EXPENSE,
                    accountId,
                    itemId,
                    installmentGroupId,
                    currentInstallment: i + 1,
                    totalInstallments
                });
            }
            setTransactions(prev => [...prev, ...newTransactions]);

        } else {
            const transactionData = {
                description,
                amount: parseFloat(amount),
                date,
                type,
                accountId,
                itemId
            };
            
            if (editingTransaction) {
                setTransactions(transactions.map(t => t.id === editingTransaction.id ? { ...editingTransaction, ...transactionData } : t));
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
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este lançamento?')) {
            setTransactions(transactions.filter(t => t.id !== id));
        }
    };
    
    const categoryOptions = useMemo(() => {
        return categories
            .filter(cat => cat.type === type)
            .flatMap(cat => 
                cat.subcategories.flatMap(sub => 
                    sub.items.map(item => (
                        <option key={item.id} value={item.id}>
                            {cat.name} &gt; {sub.name} &gt; {item.name}
                        </option>
                    ))
                )
            );
    }, [categories, type]);
    
    const handleDateFilterChange = (value: string) => {
        setDateFilter(value);
        if (value === 'Personalizado') {
            setIsPickerOpen(true);
        }
    };
    
    const handleCustomDateChange = (range: { start: Date | null, end: Date | null }) => {
        setCustomDateRange(range);
    };

    const maxDate = isInstallment ? undefined : new Date().toISOString().split('T')[0];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 xl:col-span-4">
                <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm sticky top-6">
                    <h2 className="text-xl font-bold text-slate-800 mb-4">{editingTransaction ? 'Editar Transação' : 'Nova Transação'}</h2>
                    
                    <div className="p-1 bg-slate-100 rounded-lg flex space-x-1 mb-4">
                        <button type="button" onClick={() => { setType(TransactionType.EXPENSE); setIsInstallment(false); }} className={`w-full text-center py-2 text-sm font-semibold rounded-md transition-all ${type === TransactionType.EXPENSE ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Despesa</button>
                        <button type="button" onClick={() => setType(TransactionType.INCOME)} className={`w-full text-center py-2 text-sm font-semibold rounded-md transition-all ${type === TransactionType.INCOME ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Receita</button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-slate-600 mb-1 block">Descrição</label>
                            <input type="text" value={description} onChange={e => setDescription(e.target.value)} required className="input-style" placeholder="Ex: Almoço no restaurante" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-slate-600 mb-1 block">Valor {isInstallment ? 'da Parcela' : ''}</label>
                                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required step="0.01" min="0" className="input-style" placeholder="R$ 0,00" />
                            </div>
                             <div>
                                <label className="text-sm font-medium text-slate-600 mb-1 block">Data {isInstallment ? 'da 1ª Parcela' : ''}</label>
                                <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="input-style" max={maxDate} />
                            </div>
                        </div>
                        {type === TransactionType.EXPENSE && !editingTransaction && (
                             <div className="flex items-center">
                                <input type="checkbox" id="installment-check" checked={isInstallment} onChange={e => setIsInstallment(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"/>
                                <label htmlFor="installment-check" className="ml-2 block text-sm text-slate-800">Lançar despesa parcelada</label>
                            </div>
                        )}
                        {isInstallment && type === TransactionType.EXPENSE && (
                             <div>
                                <label className="text-sm font-medium text-slate-600 mb-1 block">Número de Parcelas</label>
                                <input type="number" value={installmentsCount} onChange={e => setInstallmentsCount(e.target.value)} required min="2" className="input-style" />
                            </div>
                        )}
                         <div>
                            <label className="text-sm font-medium text-slate-600 mb-1 block">Item</label>
                            <select value={itemId} onChange={e => setItemId(e.target.value)} required className="input-style">
                                <option value="" disabled>Selecione um item...</option>
                                {categoryOptions}
                            </select>
                        </div>
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
                        <button type="submit" className="btn-primary w-full">{editingTransaction ? 'Salvar' : (isInstallment ? 'Lançar Parcelas' : 'Salvar')}</button>
                    </div>
                </form>
            </div>

            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                    <div className="relative sm:col-span-2 md:col-span-4 lg:col-span-2">
                        <SearchIcon className="w-5 h-5 text-slate-400 absolute top-1/2 left-3 -translate-y-1/2"/>
                        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="input-style pl-10"/>
                    </div>
                    <select value={dateFilter} onChange={e => handleDateFilterChange(e.target.value)} className="input-style">
                        <option>Este Mês</option>
                        <option>Sempre</option>
                        <option>Personalizado</option>
                    </select>
                    <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input-style">
                        <option>Todos</option>
                        <option>Income</option>
                        <option>Expense</option>
                    </select>
                </div>
                
                <DateRangePickerModal
                    isOpen={isPickerOpen}
                    onClose={() => setIsPickerOpen(false)}
                    value={customDateRange}
                    onChange={handleCustomDateChange}
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <p className="text-sm text-slate-500 font-medium">Receitas no Período</p>
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(periodIncome)}</p>
                    </div>
                     <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <p className="text-sm text-slate-500 font-medium">Despesas no Período</p>
                        <p className="text-2xl font-bold text-red-600">{formatCurrency(periodExpenses)}</p>
                    </div>
                     <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <p className="text-sm text-slate-500 font-medium">Saldo</p>
                        <p className={`text-2xl font-bold ${periodIncome - periodExpenses >= 0 ? 'text-slate-800' : 'text-red-600'}`}>{formatCurrency(periodIncome - periodExpenses)}</p>
                    </div>
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
