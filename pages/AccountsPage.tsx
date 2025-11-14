import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Account, Transaction, Loan, TransactionType, Category } from '../types';
import TrashIcon from '../components/icons/TrashIcon';
import PencilIcon from '../components/icons/PencilIcon';
import SearchIcon from '../components/icons/SearchIcon';
import MoneyIcon from '../components/icons/MoneyIcon';
import UploadIcon from '../components/icons/UploadIcon';
import ChevronLeftIcon from '../components/icons/ChevronLeftIcon';
import ChevronRightIcon from '../components/icons/ChevronRightIcon';


// Sample Data
const sampleAccounts: Account[] = [
    { id: 'nubank-1', name: 'Nubank - NuConta', initialBalance: 3480.20, bank: 'Nubank', isActive: true },
    { id: 'itau-1', name: 'Itaú - Conta Corrente', initialBalance: 1250.75, bank: 'Itaú', isActive: true },
    { id: 'paypal-1', name: 'PayPal', initialBalance: 815.00, bank: 'PayPal', isActive: true },
    { id: 'bradesco-1', name: 'Bradesco - Poupança', initialBalance: 10000, bank: 'Bradesco', isActive: false },
];

const sampleTransactions: Transaction[] = [
    { id: 't1', description: 'Uber', amount: 22.50, date: '2024-07-25T12:00:00Z', type: TransactionType.EXPENSE, accountId: 'nubank-1', itemId: 'transporte-uber' },
    { id: 't2', description: 'Salário', amount: 4500.00, date: '2024-07-24T12:00:00Z', type: TransactionType.INCOME, accountId: 'itau-1', itemId: 'receita-salario' },
    { id: 't3', description: 'Spotify', amount: 21.90, date: '2024-07-23T12:00:00Z', type: TransactionType.EXPENSE, accountId: 'nubank-1', itemId: 'lazer-assinaturas' },
    { id: 't4', description: 'Supermercado Pão de Açúcar', amount: 345.80, date: '2024-07-22T12:00:00Z', type: TransactionType.EXPENSE, accountId: 'itau-1', itemId: 'alimentacao-supermercado' },
    { id: 't5', description: 'Venda Online', amount: 150.00, date: '2024-07-21T12:00:00Z', type: TransactionType.INCOME, accountId: 'paypal-1', itemId: 'receita-extra' },
];

const sampleCategories: Category[] = [
  { id: 'cat-receita', name: 'Receita', type: TransactionType.INCOME, subcategories: [
    {id: 'sub-receita', name: 'Receita', items: [{id: 'receita-salario', name: 'Salário', subcategoryId: 'sub-receita', categoryId: 'cat-receita'}, {id: 'receita-extra', name: 'Renda Extra', subcategoryId: 'sub-receita', categoryId: 'cat-receita'}], categoryId: 'cat-receita'}
  ]},
  { id: 'cat-transporte', name: 'Transporte', type: TransactionType.EXPENSE, subcategories: [
    {id: 'sub-transporte', name: 'Transporte', items: [{id: 'transporte-uber', name: 'Uber', subcategoryId: 'sub-transporte', categoryId: 'cat-transporte'}], categoryId: 'cat-transporte'}
  ]},
  { id: 'cat-lazer', name: 'Lazer', type: TransactionType.EXPENSE, subcategories: [
    {id: 'sub-lazer', name: 'Lazer', items: [{id: 'lazer-assinaturas', name: 'Assinaturas', subcategoryId: 'sub-lazer', categoryId: 'cat-lazer'}], categoryId: 'cat-lazer'}
  ]},
  { id: 'cat-alimentacao', name: 'Alimentação', type: TransactionType.EXPENSE, subcategories: [
    {id: 'sub-alimentacao', name: 'Alimentação', items: [{id: 'alimentacao-supermercado', name: 'Supermercado', subcategoryId: 'sub-alimentacao', categoryId: 'cat-alimentacao'}], categoryId: 'cat-alimentacao'}
  ]},
];


const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const getUTCDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};


const AccountModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (account: Omit<Account, 'id'> | Account) => void;
    onDelete: (id: string) => void;
    account: Account | null;
}> = ({ isOpen, onClose, onSave, onDelete, account }) => {
    const [name, setName] = useState('');
    const [initialBalance, setInitialBalance] = useState('');
    const [bank, setBank] = useState('');
    const [agency, setAgency] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [isActive, setIsActive] = useState(true);

    React.useEffect(() => {
        if (account) {
            setName(account.name);
            setInitialBalance(String(account.initialBalance));
            setBank(account.bank || '');
            setAgency(account.agency || '');
            setAccountNumber(account.accountNumber || '');
            setIsActive(account.isActive);
        } else {
            setName('');
            setInitialBalance('');
            setBank('');
            setAgency('');
            setAccountNumber('');
            setIsActive(true);
        }
    }, [account, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!name || !initialBalance) {
            alert('Nome e Saldo Inicial são obrigatórios.');
            return;
        }

        const accountData = {
            name,
            initialBalance: parseFloat(initialBalance),
            bank,
            agency,
            accountNumber,
            isActive,
        };

        if(account) {
            onSave({ ...account, ...accountData });
        } else {
            onSave(accountData);
        }
    };
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
          <h2 className="text-2xl font-bold mb-6 text-slate-800">{account ? 'Editar Conta' : 'Nova Conta'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
             <div>
                <label htmlFor="acc-name" className="block text-sm font-medium text-slate-700">Nome da Conta *</label>
                <input type="text" id="acc-name" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full input-style" />
            </div>
            <div>
                <label htmlFor="acc-balance" className="block text-sm font-medium text-slate-700">Saldo Inicial *</label>
                <input type="number" id="acc-balance" value={initialBalance} onChange={e => setInitialBalance(e.target.value)} required step="0.01" className="mt-1 block w-full input-style" />
            </div>
             <div>
                <label htmlFor="acc-bank" className="block text-sm font-medium text-slate-700">Banco</label>
                <input type="text" id="acc-bank" value={bank} onChange={e => setBank(e.target.value)} className="mt-1 block w-full input-style" placeholder="Ex: Nubank"/>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                    <label htmlFor="acc-agency" className="block text-sm font-medium text-slate-700">Agência</label>
                    <input type="text" id="acc-agency" value={agency} onChange={e => setAgency(e.target.value)} className="mt-1 block w-full input-style" />
                </div>
                 <div>
                    <label htmlFor="acc-number" className="block text-sm font-medium text-slate-700">Número da Conta</label>
                    <input type="text" id="acc-number" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className="mt-1 block w-full input-style" />
                </div>
            </div>
             <div className="flex items-center">
                <input type="checkbox" id="acc-active" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"/>
                <label htmlFor="acc-active" className="ml-2 block text-sm text-slate-800">Conta Ativa</label>
            </div>
            <div className="flex justify-between items-center pt-4">
                <div>
                    {account && <button type="button" onClick={() => onDelete(account.id)} className="text-sm font-semibold text-red-600 hover:text-red-800 transition-colors">Excluir Conta</button>}
                </div>
                <div className="flex space-x-3">
                    <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                    <button type="submit" className="btn-primary">Salvar</button>
                </div>
            </div>
          </form>
        </div>
      </div>
    );
};

const BankLogo: React.FC<{ account: Account, size?: 'sm' | 'lg'}> = ({ account, size = 'sm' }) => {
    const { bank: bankName = '', imageUrl } = account;
    const name = bankName.toLowerCase();
    const sizeClasses = size === 'sm' ? 'w-10 h-10 rounded-lg' : 'w-14 h-14 rounded-xl';
    
    if (imageUrl) {
        return <img src={imageUrl} alt={account.name} className={`${sizeClasses} object-cover`} />;
    }
    if (name.includes('nubank')) {
        return <img src="https://i.imgur.com/8311S3D.png" alt="Nubank" className={sizeClasses} />;
    }
    if (name.includes('itaú')) {
        return <img src="https://i.imgur.com/uR29mKw.png" alt="Itau" className={sizeClasses} />;
    }
    if (name.includes('paypal')) {
        return <img src="https://i.imgur.com/T5QkH90.png" alt="PayPal" className={sizeClasses} />;
    }
    
    return (
        <div className={`${sizeClasses} bg-slate-200 flex items-center justify-center`}>
            <MoneyIcon className="w-6 h-6 text-slate-500" />
        </div>
    );
};

const categoryColors: { [key: string]: string } = {
    'Transporte': 'bg-gray-200 text-gray-800',
    'Receita': 'bg-green-100 text-green-800',
    'Assinaturas': 'bg-gray-200 text-gray-800',
    'Alimentação': 'bg-gray-200 text-gray-800',
};
const defaultCategoryColor = 'bg-slate-100 text-slate-800';

const AccountsPage: React.FC<{ addAccountTrigger: number }> = ({ addAccountTrigger }) => {
    const [accounts, setAccounts] = useLocalStorage<Account[]>('accounts', sampleAccounts);
    const [transactions] = useLocalStorage<Transaction[]>('transactions', sampleTransactions);
    const [loans] = useLocalStorage<Loan[]>('loans', []);
    useLocalStorage<Category[]>('categories', sampleCategories); // just to set sample data
    const [categories] = useLocalStorage<Category[]>('categories', []);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
    const [dragOverItemIndex, setDragOverItemIndex] = useState<number | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [showInstallments, setShowInstallments] = useState(false);
    const itemsPerPage = 5;
    
    const addAccountTriggerRef = useRef(addAccountTrigger);
    
    const categoryMap = useMemo(() => {
        const map = new Map<string, string>();
        categories.forEach(cat => cat.subcategories.forEach(sub => sub.items.forEach(item => map.set(item.id, item.name))));
        return map;
    }, [categories]);

    useEffect(() => {
        if (addAccountTrigger > addAccountTriggerRef.current) {
            handleOpenModal();
        }
        addAccountTriggerRef.current = addAccountTrigger;
    }, [addAccountTrigger]);
    
    useEffect(() => {
        if (!selectedAccountId && accounts.length > 0) {
            setSelectedAccountId(accounts[0].id);
        }
    }, [accounts, selectedAccountId]);
    
    // Reset pagination and filters when account changes
    useEffect(() => {
        setCurrentPage(1);
        setShowInstallments(false);
        setSearchTerm('');
    }, [selectedAccountId]);


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

    const selectedAccount = useMemo(() => {
        return accounts.find(acc => acc.id === selectedAccountId) || null;
    }, [accounts, selectedAccountId]);

    const filteredTransactions = useMemo(() => {
        if (!selectedAccountId) return [];
        
        // Base filter for account and search term
        let accountTransactions = transactions
            .filter(t => t.accountId === selectedAccountId || t.destinationAccountId === selectedAccountId)
            .filter(t => t.description.toLowerCase().includes(searchTerm.toLowerCase()));
            
        let finalTransactions: Transaction[];

        if (showInstallments) {
            // When filter is ON, show all installment transactions for the account (past, present, future).
            finalTransactions = accountTransactions.filter(t => !!t.installmentGroupId);
        } else {
            // When filter is OFF, filter out future transactions and consolidate installments.
            const now = new Date();
            const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

            const pastAndPresentTransactions = accountTransactions.filter(t => getUTCDate(t.date) <= todayUTC);
            
            const installmentGroups = new Map<string, Transaction>();
            const singleTransactions: Transaction[] = [];

            pastAndPresentTransactions.forEach(t => {
                if (t.installmentGroupId) {
                    const existing = installmentGroups.get(t.installmentGroupId);
                    // Keep the most recent installment for each group
                    if (!existing || new Date(t.date) > new Date(existing.date)) {
                        installmentGroups.set(t.installmentGroupId, t);
                    }
                } else {
                    singleTransactions.push(t);
                }
            });
            finalTransactions = [...singleTransactions, ...Array.from(installmentGroups.values())];
        }
        
        return finalTransactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, selectedAccountId, searchTerm, showInstallments]);
    
    // Pagination Logic
    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const paginatedTransactions = filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleOpenModal = (account: Account | null = null) => {
        setEditingAccount(account);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingAccount(null);
    };

    const handleSaveAccount = (accountData: Omit<Account, 'id'> | Account) => {
        if ('id' in accountData) {
            setAccounts(accounts.map(acc => acc.id === accountData.id ? accountData : acc));
        } else {
            const newAccount = { ...accountData, id: crypto.randomUUID() };
            setAccounts([...accounts, newAccount]);
            setSelectedAccountId(newAccount.id);
        }
        handleCloseModal();
    };

    const handleDeleteAccount = (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta conta? As transações associadas não serão excluídas.')) {
            setAccounts(prev => prev.filter(acc => acc.id !== id));
            if (selectedAccountId === id) {
                const remainingAccounts = accounts.filter(acc => acc.id !== id);
                setSelectedAccountId(remainingAccounts.length > 0 ? remainingAccounts[0].id : null);
            }
            handleCloseModal();
        }
    };

    const handleImageUpload = (file: File) => {
      if (!selectedAccountId) return;
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setAccounts(accounts.map(acc => 
          acc.id === selectedAccountId ? { ...acc, imageUrl: base64String } : acc
        ));
      };
      reader.readAsDataURL(file);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleImageUpload(e.target.files[0]);
        }
    };
    
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleImageUpload(e.dataTransfer.files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };
    
    const handleDragStart = (index: number) => {
        setDraggedItemIndex(index);
    };

    const handleDragEnter = (index: number) => {
        setDragOverItemIndex(index);
    };

    const handleDragEnd = () => {
        if (draggedItemIndex !== null && dragOverItemIndex !== null && draggedItemIndex !== dragOverItemIndex) {
            const items = [...accounts];
            const [reorderedItem] = items.splice(draggedItemIndex, 1);
            items.splice(dragOverItemIndex, 0, reorderedItem);
            setAccounts(items);
        }
        setDraggedItemIndex(null);
        setDragOverItemIndex(null);
    };

    const getTransactionDisplayProps = (transaction: Transaction, currentAccountId: string | null) => {
        if (transaction.type === TransactionType.INCOME) {
            return { sign: '+ ', color: 'text-green-500' };
        }
        if (transaction.type === TransactionType.EXPENSE) {
            return { sign: '- ', color: 'text-red-500' };
        }
        if (transaction.type === TransactionType.TRANSFER) {
            if (transaction.accountId === currentAccountId) {
                return { sign: '- ', color: 'text-red-500' }; // Outgoing
            }
            if (transaction.destinationAccountId === currentAccountId) {
                return { sign: '+ ', color: 'text-green-500' }; // Incoming
            }
        }
        return { sign: '', color: 'text-slate-800' };
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-4 space-y-3">
                {accounts.map((acc, index) => {
                    const isSelected = acc.id === selectedAccountId;
                    const isDragOver = dragOverItemIndex === index;
                    return (
                        <div 
                            key={acc.id} 
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragEnter={() => handleDragEnter(index)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => e.preventDefault()}
                            onClick={() => setSelectedAccountId(acc.id)} 
                            className={`w-full text-left p-4 bg-white rounded-xl border-2 transition-all duration-200 cursor-grab ${draggedItemIndex === index ? '' : ''} ${isDragOver ? 'border-blue-500' : ''} ${isSelected ? 'border-blue-500 shadow-md' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'} ${!acc.isActive ? 'opacity-60' : ''}`}
                         >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <BankLogo account={acc} />
                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <p className="font-bold text-slate-800">{acc.name}</p>
                                            {!acc.isActive && <span className="text-xs bg-gray-200 text-gray-600 font-semibold px-2 py-0.5 rounded-full">Inativa</span>}
                                        </div>
                                        <p className="text-sm text-slate-500">Saldo Atual</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <p className="font-bold text-lg text-slate-800 whitespace-nowrap">{formatCurrency(accountBalances.get(acc.id) || 0)}</p>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleOpenModal(acc); }} 
                                        className="p-2 rounded-full text-slate-400 hover:text-blue-500 hover:bg-slate-100 transition-colors"
                                        aria-label="Editar conta"
                                      >
                                          <PencilIcon className="w-4 h-4" />
                                      </button>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="xl:col-span-8 space-y-6">
                {selectedAccount && (
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center space-x-4">
                           <div
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                className="relative group cursor-pointer"
                            >
                                <BankLogo account={selectedAccount} size="lg"/>
                                <div className="absolute inset-0 bg-black/60 rounded-xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <UploadIcon className="w-6 h-6 text-white mb-1"/>
                                    <span className="text-white text-xs font-semibold">Alterar</span>
                                </div>
                                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileSelect} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800">{selectedAccount.name}</h2>
                                <p className="text-slate-500">Detalhes da conta selecionada</p>
                            </div>
                        </div>
                        <div className="mt-4">
                            <p className="text-sm text-slate-500">Saldo Atual</p>
                            <p className="text-4xl font-bold text-slate-900">{formatCurrency(accountBalances.get(selectedAccount.id) || 0)}</p>
                        </div>
                    </div>
                )}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                    <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                      <div className='flex-grow'>
                        <h3 className="text-lg font-bold text-slate-800">Últimas Transações</h3>
                      </div>
                       {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-2">
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center p-2"><ChevronLeftIcon className="w-4 h-4"/></button>
                                <span className="text-sm font-medium text-slate-600 whitespace-nowrap">Página {currentPage} de {totalPages}</span>
                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center p-2"><ChevronRightIcon className="w-4 h-4"/></button>
                            </div>
                        )}
                        <div className="flex items-center gap-4 w-full sm:w-auto">
                            <div className="flex-grow sm:flex-grow-0 relative w-full max-w-xs">
                                {!isSearchFocused && !searchTerm && <SearchIcon className="w-5 h-5 text-slate-400 absolute top-1/2 left-3 -translate-y-1/2 pointer-events-none"/>}
                                <input 
                                    type="text" 
                                    value={searchTerm} 
                                    onChange={e => setSearchTerm(e.target.value)} 
                                    onFocus={() => setIsSearchFocused(true)}
                                    onBlur={() => setIsSearchFocused(false)}
                                    className="input-style pl-10 h-10 w-full"
                                    placeholder=""
                                />
                            </div>
                            <button onClick={() => setShowInstallments(s => !s)} className={`px-3 py-2 text-sm font-semibold rounded-lg whitespace-nowrap h-10 ${showInstallments ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                Parceladas
                            </button>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                         <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-slate-500 uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-left">Data</th>
                                    <th className="px-4 py-3 font-semibold text-left">Descrição</th>
                                    <th className="px-4 py-3 font-semibold text-left">Categoria</th>
                                    <th className="px-4 py-3 font-semibold text-right">Valor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {paginatedTransactions.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center p-8 text-slate-500">Nenhuma transação encontrada.</td></tr>
                                ) : (
                                    paginatedTransactions.map(t => {
                                        const categoryName = t.itemId ? categoryMap.get(t.itemId) : 'N/A';
                                        const displayProps = getTransactionDisplayProps(t, selectedAccountId);
                                        return (
                                            <tr key={t.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-4 text-slate-600 whitespace-nowrap">{formatDate(t.date)}</td>
                                                <td className="px-4 py-4 text-slate-800 font-medium">{t.description}</td>
                                                <td className="px-4 py-4">
                                                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-md ${categoryColors[categoryName || ''] || defaultCategoryColor}`}>
                                                        {categoryName}
                                                    </span>
                                                </td>
                                                <td className={`px-4 py-4 text-right font-bold ${displayProps.color}`}>
                                                    {displayProps.sign}{formatCurrency(t.amount)}
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <AccountModal 
                isOpen={isModalOpen} 
                onClose={handleCloseModal}
                onSave={handleSaveAccount}
                onDelete={handleDeleteAccount}
                account={editingAccount}
            />
        </div>
    );
};

export default AccountsPage;