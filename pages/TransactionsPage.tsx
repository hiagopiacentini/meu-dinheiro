import React, { useState, useMemo, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Transaction, Account, Category, TransactionType } from '../types';
import PlusIcon from '../components/icons/PlusIcon';
import TrashIcon from '../components/icons/TrashIcon';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

const TransactionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (transactions: Omit<Transaction, 'id'>[]) => void;
    accounts: Account[];
    categories: Category[];
}> = ({ isOpen, onClose, onSave, accounts, categories }) => {
    const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [accountId, setAccountId] = useState('');
    const [destinationAccountId, setDestinationAccountId] = useState('');
    const [itemId, setItemId] = useState('');
    const [isInstallment, setIsInstallment] = useState(false);
    const [installments, setInstallments] = useState('2');

    const resetForm = useCallback(() => {
        setType(TransactionType.EXPENSE);
        setDescription('');
        setAmount('');
        setDate(new Date().toISOString().split('T')[0]);
        setAccountId(accounts.find(a => a.isActive)?.id || '');
        setDestinationAccountId('');
        setItemId('');
        setIsInstallment(false);
        setInstallments('2');
    }, [accounts]);

    React.useEffect(() => {
        if(isOpen) {
            resetForm();
        }
    }, [isOpen, resetForm]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const isTransfer = type === TransactionType.TRANSFER;

        if (isTransfer) {
            if (!description || !amount || !date || !accountId || !destinationAccountId) {
                alert('Para transferências, preencha todos os campos obrigatórios.');
                return;
            }
            if (accountId === destinationAccountId) {
                alert('A conta de origem e destino não podem ser a mesma.');
                return;
            }
        } else {
             if(!description || !amount || !date || !accountId || !itemId) {
                alert('Por favor, preencha todos os campos obrigatórios.');
                return;
            }
        }


        const newTransactions: Omit<Transaction, 'id'>[] = [];
        const baseAmount = parseFloat(amount);

        if (isTransfer) {
            newTransactions.push({ description, amount: baseAmount, date, type, accountId, destinationAccountId });
        } else if (isInstallment && type === TransactionType.EXPENSE) {
            const numInstallments = parseInt(installments, 10);
            const installmentGroupId = crypto.randomUUID();
            for (let i = 0; i < numInstallments; i++) {
                const installmentDate = new Date(date);
                installmentDate.setUTCMonth(installmentDate.getUTCMonth() + i);
                newTransactions.push({
                    description: `${description} (${i + 1}/${numInstallments})`,
                    amount: baseAmount / numInstallments,
                    date: installmentDate.toISOString().split('T')[0],
                    type,
                    accountId,
                    itemId,
                    installmentGroupId,
                    currentInstallment: i + 1,
                    totalInstallments: numInstallments
                });
            }
        } else {
            newTransactions.push({ description, amount: baseAmount, date, type, accountId, itemId });
        }
        
        onSave(newTransactions);
        onClose();
    };

    const categoryOptions = useMemo(() => {
        return categories
            .filter(cat => cat.type === type)
            .map(cat => (
                <optgroup label={cat.name} key={cat.id}>
                    {cat.subcategories.map(sub => 
                      sub.items.map(item => (
                        <option key={item.id} value={item.id}>
                           {sub.name} &gt; {item.name}
                        </option>
                      ))
                    )}
                </optgroup>
            ));
    }, [categories, type]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg m-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-6">Novo Lançamento</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                     <div className="flex space-x-2">
                        <button type="button" onClick={() => setType(TransactionType.EXPENSE)} className={`w-full py-2 rounded-md transition-colors ${type === TransactionType.EXPENSE ? 'bg-red-500 text-white' : 'bg-slate-200'}`}>Despesa</button>
                        <button type="button" onClick={() => setType(TransactionType.INCOME)} className={`w-full py-2 rounded-md transition-colors ${type === TransactionType.INCOME ? 'bg-green-500 text-white' : 'bg-slate-200'}`}>Receita</button>
                        <button type="button" onClick={() => setType(TransactionType.TRANSFER)} className={`w-full py-2 rounded-md transition-colors ${type === TransactionType.TRANSFER ? 'bg-blue-500 text-white' : 'bg-slate-200'}`}>Transferência</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição *</label>
                            <input type="text" value={description} onChange={e => setDescription(e.target.value)} required className="input-style" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$) *</label>
                            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required step="0.01" min="0" className="input-style" />
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Data *</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="input-style" />
                    </div>

                    {type === TransactionType.TRANSFER ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Conta de Origem *</label>
                                <select value={accountId} onChange={e => setAccountId(e.target.value)} required className="input-style">
                                    <option value="" disabled>Selecione...</option>
                                    {accounts.filter(a => a.isActive).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Conta de Destino *</label>
                                <select value={destinationAccountId} onChange={e => setDestinationAccountId(e.target.value)} required className="input-style">
                                    <option value="" disabled>Selecione...</option>
                                    {accounts.filter(a => a.isActive && a.id !== accountId).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                </select>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Conta *</label>
                                <select value={accountId} onChange={e => setAccountId(e.target.value)} required className="input-style">
                                    <option value="" disabled>Selecione...</option>
                                    {accounts.filter(a => a.isActive).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Categoria &gt; Subcategoria &gt; Item *</label>
                                <select value={itemId} onChange={e => setItemId(e.target.value)} required className="input-style">
                                     <option value="" disabled>Selecione...</option>
                                     {categoryOptions}
                                </select>
                            </div>
                            {type === TransactionType.EXPENSE && (
                                <div className="flex items-center space-x-4 p-2 bg-slate-50 rounded-md">
                                    <input type="checkbox" id="installment" checked={isInstallment} onChange={e => setIsInstallment(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                    <label htmlFor="installment" className="text-sm font-medium">Lançamento Parcelado?</label>
                                    {isInstallment && (
                                        <input type="number" value={installments} onChange={e => setInstallments(e.target.value)} min="2" className="input-style w-24" />
                                    )}
                                </div>
                            )}
                        </>
                    )}

                     <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                        <button type="submit" className="btn-primary">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const MultipleTransactionsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (transactions: Omit<Transaction, 'id'>[]) => void;
    accounts: Account[];
    categories: Category[];
}> = ({ isOpen, onClose, onSave, accounts, categories }) => {
    
    const getInitialTransactionState = useCallback(() => ({
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        type: TransactionType.EXPENSE,
        accountId: accounts.find(a => a.isActive)?.id || '',
        itemId: '',
    }), [accounts]);

    const [newTransactions, setNewTransactions] = useState([getInitialTransactionState()]);

    const handleFieldChange = (index: number, field: keyof ReturnType<typeof getInitialTransactionState>, value: string | TransactionType) => {
        const updatedTransactions = [...newTransactions];
        const newValues = { ...updatedTransactions[index], [field]: value };

        if (field === 'type') {
            newValues.itemId = ''; // Reset category if type changes
        }
        
        updatedTransactions[index] = newValues;
        setNewTransactions(updatedTransactions);
    };

    const addTransactionRow = () => {
        setNewTransactions([...newTransactions, getInitialTransactionState()]);
    };

    const removeTransactionRow = (index: number) => {
        if (newTransactions.length > 1) {
            setNewTransactions(newTransactions.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        for (const trans of newTransactions) {
            if (!trans.description || !trans.amount || !trans.date || !trans.accountId || !trans.itemId) {
                alert('Por favor, preencha todos os campos obrigatórios em todos os lançamentos.');
                return;
            }
        }
        const transactionsToSave = newTransactions.map(t => ({
            ...t,
            amount: parseFloat(t.amount),
        }));
        onSave(transactionsToSave);
        onClose();
    };

    React.useEffect(() => {
        if (isOpen) {
            setNewTransactions([getInitialTransactionState()]);
        }
    }, [isOpen, getInitialTransactionState]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl m-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-6">Múltiplos Lançamentos</h2>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1 -mr-2">
                        {newTransactions.map((trans, index) => (
                            <div key={index} className="p-4 border border-slate-200 rounded-lg space-y-3 relative bg-slate-50/50">
                                {newTransactions.length > 1 && (
                                    <button type="button" onClick={() => removeTransactionRow(index)} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 transition-colors" aria-label="Remover Lançamento">
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                )}
                                <div className="flex space-x-2">
                                    <button type="button" onClick={() => handleFieldChange(index, 'type', TransactionType.EXPENSE)} className={`w-full text-sm py-1.5 rounded-md ${trans.type === TransactionType.EXPENSE ? 'bg-red-500 text-white' : 'bg-slate-200'}`}>Despesa</button>
                                    <button type="button" onClick={() => handleFieldChange(index, 'type', TransactionType.INCOME)} className={`w-full text-sm py-1.5 rounded-md ${trans.type === TransactionType.INCOME ? 'bg-green-500 text-white' : 'bg-slate-200'}`}>Receita</button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input type="text" placeholder="Descrição *" value={trans.description} onChange={e => handleFieldChange(index, 'description', e.target.value)} required className="input-style" />
                                    <input type="number" placeholder="Valor (R$) *" value={trans.amount} onChange={e => handleFieldChange(index, 'amount', e.target.value)} required step="0.01" min="0" className="input-style" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input type="date" value={trans.date} onChange={e => handleFieldChange(index, 'date', e.target.value)} required className="input-style" />
                                    <select value={trans.accountId} onChange={e => handleFieldChange(index, 'accountId', e.target.value)} required className="input-style">
                                        <option value="" disabled>Selecione Conta *</option>
                                        {accounts.filter(a => a.isActive).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                    </select>
                                </div>
                                <select value={trans.itemId} onChange={e => handleFieldChange(index, 'itemId', e.target.value)} required className="input-style">
                                    <option value="" disabled>Selecione Categoria &gt; Subcategoria &gt; Item *</option>
                                    {categories.filter(c => c.type === trans.type).map(cat => (
                                        <optgroup label={cat.name} key={cat.id}>
                                            {cat.subcategories.map(sub => sub.items.map(item => (
                                                <option key={item.id} value={item.id}>{sub.name} &gt; {item.name}</option>
                                            )))}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between items-center mt-6">
                        <button type="button" onClick={addTransactionRow} className="btn-secondary flex items-center space-x-2">
                           <PlusIcon className="w-5 h-5" />
                           <span>Adicionar Lançamento</span>
                        </button>
                        <div className="flex space-x-3">
                            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                            <button type="submit" className="btn-primary">Salvar Todos</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};


const TransactionsPage: React.FC = () => {
    const [transactions, setTransactions] = useLocalStorage<Transaction[]>('transactions', []);
    const [accounts] = useLocalStorage<Account[]>('accounts', []);
    const [categories] = useLocalStorage<Category[]>('categories', []);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isMultiModalOpen, setIsMultiModalOpen] = useState(false);

    const categoryMap = useMemo(() => {
        const map = new Map<string, { item: string, sub: string, cat: string }>();
        categories.forEach(cat => {
            cat.subcategories.forEach(sub => {
                sub.items.forEach(item => {
                    map.set(item.id, { item: item.name, sub: sub.name, cat: cat.name });
                });
            });
        });
        return map;
    }, [categories]);

    const accountMap = useMemo(() => {
        return new Map(accounts.map(acc => [acc.id, acc.name]));
    }, [accounts]);

    const handleSaveTransactions = (newTransactions: Omit<Transaction, 'id'>[]) => {
        const transactionsToAdd = newTransactions.map(t => ({ ...t, id: crypto.randomUUID() }));
        setTransactions(prev => [...prev, ...transactionsToAdd].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    };

    const handleDelete = (id: string) => {
        if(window.confirm('Tem certeza que deseja excluir este lançamento?')) {
            setTransactions(transactions.filter(t => t.id !== id));
        }
    };
    
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center p-4 sm:p-6 border-b border-slate-200 gap-4">
                <h2 className="text-xl font-bold">Lançamentos</h2>
                <div className="grid grid-cols-2 sm:flex sm:space-x-2 w-full sm:w-auto gap-2">
                    <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center justify-center space-x-2">
                        <PlusIcon className="w-5 h-5" />
                        <span>Novo</span>
                    </button>
                    <button onClick={() => setIsMultiModalOpen(true)} className="btn-secondary whitespace-nowrap justify-center">Múltiplos</button>
                </div>
            </div>

            {/* Desktop View */}
            <div className="overflow-x-auto hidden md:block">
                <table className="w-full text-left">
                     <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                        <tr>
                            <th className="p-4 font-semibold">Data</th>
                            <th className="p-4 font-semibold">Descrição</th>
                            <th className="p-4 font-semibold">Categoria</th>
                            <th className="p-4 font-semibold">Conta</th>
                            <th className="p-4 font-semibold text-right">Valor</th>
                            <th className="p-4 font-semibold text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {transactions.map(t => {
                            const categoryPath = t.itemId ? categoryMap.get(t.itemId) : null;
                            const isExpense = t.type === TransactionType.EXPENSE;
                            const isIncome = t.type === TransactionType.INCOME;
                            const isTransfer = t.type === TransactionType.TRANSFER;
                            
                            return (
                                <tr key={t.id} className="hover:bg-slate-50">
                                    <td className="p-4 whitespace-nowrap text-slate-700">{formatDate(t.date)}</td>
                                    <td className="p-4 font-medium text-slate-900">{t.description}</td>
                                    <td className="p-4 text-sm text-slate-600">{isTransfer ? 'Transferência' : (categoryPath ? `${categoryPath.cat} > ${categoryPath.item}` : 'N/A')}</td>
                                    <td className="p-4 text-slate-700">{isTransfer ? `${accountMap.get(t.accountId)} → ${accountMap.get(t.destinationAccountId!)}` : (accountMap.get(t.accountId) || 'N/A')}</td>
                                    <td className={`p-4 text-right font-bold ${isExpense ? 'text-red-500' : isIncome ? 'text-green-500' : 'text-slate-700'}`}>{isExpense ? '-' : ''}{formatCurrency(t.amount)}</td>
                                    <td className="p-4 text-right">
                                      <button onClick={() => handleDelete(t.id)} className="text-slate-400 hover:text-red-600 p-2 rounded-full hover:bg-slate-100">
                                        <TrashIcon className="w-5 h-5"/>
                                      </button>
                                    </td>
                                </tr>
                            )
                        })}
                         {transactions.length === 0 && (
                            <tr><td colSpan={6} className="text-center p-8 text-slate-500">Nenhum lançamento registrado.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* Mobile View */}
             <div className="md:hidden p-4 space-y-4">
                 {transactions.length === 0 ? (
                    <p className="text-center p-8 text-slate-500">Nenhum lançamento registrado.</p>
                ) : (
                    transactions.map(t => {
                        const categoryPath = t.itemId ? categoryMap.get(t.itemId) : null;
                        const isExpense = t.type === TransactionType.EXPENSE;
                        const isIncome = t.type === TransactionType.INCOME;
                        const isTransfer = t.type === TransactionType.TRANSFER;

                        return (
                             <div key={t.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                    <p className="font-bold text-slate-800 pr-2">{t.description}</p>
                                    <p className={`font-bold text-right whitespace-nowrap ${isExpense ? 'text-red-500' : isIncome ? 'text-green-500' : 'text-slate-700'}`}>{isExpense ? '-' : ''}{formatCurrency(t.amount)}</p>
                                </div>
                                 <div className="text-sm text-slate-600 space-y-1">
                                    <p><span className="font-medium">Categoria:</span> {isTransfer ? 'Transferência' : (categoryPath ? `${categoryPath.cat} > ${categoryPath.item}` : 'N/A')}</p>
                                    <p><span className="font-medium">Conta:</span> {isTransfer ? `${accountMap.get(t.accountId)} → ${accountMap.get(t.destinationAccountId!)}` : (accountMap.get(t.accountId) || 'N/A')}</p>
                                </div>
                                <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                                    <p className="text-sm text-slate-500">{formatDate(t.date)}</p>
                                    <button onClick={() => handleDelete(t.id)} className="text-slate-400 hover:text-red-600 p-2 rounded-full hover:bg-slate-200" aria-label="Excluir Lançamento">
                                        <TrashIcon className="w-5 h-5"/>
                                    </button>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
            
            <TransactionModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveTransactions}
                accounts={accounts}
                categories={categories}
            />
            <MultipleTransactionsModal
                isOpen={isMultiModalOpen}
                onClose={() => setIsMultiModalOpen(false)}
                onSave={handleSaveTransactions}
                accounts={accounts}
                categories={categories}
            />
        </div>
    );
};

export default TransactionsPage;
