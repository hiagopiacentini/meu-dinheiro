
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAccounts, useTransactions, useLoans, useCategories } from '../hooks/useFirestore';
import { Account, Transaction, Loan, TransactionType, Category } from '../types';
import TrashIcon from '../components/icons/TrashIcon';
import PencilIcon from '../components/icons/PencilIcon';
import SearchIcon from '../components/icons/SearchIcon';
import MoneyIcon from '../components/icons/MoneyIcon';
import UploadIcon from '../components/icons/UploadIcon';
import ChevronLeftIcon from '../components/icons/ChevronLeftIcon';
import ChevronRightIcon from '../components/icons/ChevronRightIcon';
import CheckIcon from '../components/icons/CheckIcon';
import CreditCardIcon from '../components/icons/CreditCardIcon';
import PlusIcon from '../components/icons/PlusIcon';
import XIcon from '../components/icons/XIcon';


const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const getUTCDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};


const AccountModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (account: Omit<Account, 'id'> | Account) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    account: Account | null;
}> = ({ isOpen, onClose, onSave, onDelete, account }) => {
    const [name, setName] = useState('');
    const [initialBalance, setInitialBalance] = useState('');
    const [bank, setBank] = useState('');
    const [agency, setAgency] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [isCreditCard, setIsCreditCard] = useState(false);
    
    // Cards State
    const [cards, setCards] = useState<{id: string, name: string}[]>([]);
    const [newCardName, setNewCardName] = useState('');

    React.useEffect(() => {
        if (account) {
            setName(account.name);
            setInitialBalance(String(account.initialBalance));
            setBank(account.bank || '');
            setAgency(account.agency || '');
            setAccountNumber(account.accountNumber || '');
            setIsActive(account.isActive);
            setIsCreditCard(!!account.isCreditCard);
            setCards(account.cards || []);
        } else {
            setName('');
            setInitialBalance('');
            setBank('');
            setAgency('');
            setAccountNumber('');
            setIsActive(true);
            setIsCreditCard(false);
            setCards([]);
        }
        setNewCardName('');
    }, [account, isOpen]);

    if (!isOpen) return null;

    const handleAddCard = () => {
        if (newCardName.trim()) {
            setCards([...cards, { id: crypto.randomUUID(), name: newCardName.trim() }]);
            setNewCardName('');
        }
    };

    const handleRemoveCard = (cardId: string) => {
        setCards(cards.filter(c => c.id !== cardId));
    };

    const handleSubmit = async (e: React.FormEvent) => {
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
            isCreditCard,
            cards
        };

        if(account) {
            await onSave({ ...account, ...accountData });
        } else {
            await onSave(accountData);
        }
    };
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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
            
            <div className="space-y-2 pt-2">
                 <div className="flex items-center">
                    <input type="checkbox" id="acc-credit-card" checked={isCreditCard} onChange={e => setIsCreditCard(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"/>
                    <label htmlFor="acc-credit-card" className="ml-2 block text-sm font-medium text-slate-800">É Cartão de Crédito</label>
                </div>
                 <div className="flex items-center">
                    <input type="checkbox" id="acc-active" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"/>
                    <label htmlFor="acc-active" className="ml-2 block text-sm text-slate-500">Conta Ativa</label>
                </div>
            </div>

            {/* Manage Cards Section */}
            <div className="pt-4 border-t border-slate-100">
                <label className="block text-sm font-medium text-slate-700 mb-2">Cartões Vinculados</label>
                <div className="flex gap-2 mb-2">
                    <input 
                        type="text" 
                        value={newCardName} 
                        onChange={e => setNewCardName(e.target.value)} 
                        placeholder="Nome (ex: Virtual, Adicional)" 
                        className="input-style text-sm py-1"
                        onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddCard(); }}}
                    />
                    <button type="button" onClick={handleAddCard} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200">
                        <PlusIcon className="w-5 h-5" />
                    </button>
                </div>
                {cards.length > 0 && (
                    <ul className="space-y-1 max-h-32 overflow-y-auto">
                        {cards.map(card => (
                            <li key={card.id} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded text-sm">
                                <span className="text-slate-700 flex items-center gap-2">
                                    <CreditCardIcon className="w-3 h-3 text-slate-400"/>
                                    {card.name}
                                </span>
                                <button type="button" onClick={() => handleRemoveCard(card.id)} className="text-slate-400 hover:text-red-500">
                                    <XIcon className="w-4 h-4" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
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

const PayInvoiceModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    targetAccount: Account;
    accounts: Account[];
    currentBalance: number;
    onPay: (sourceAccountId: string, amount: number, date: string) => Promise<void>;
}> = ({ isOpen, onClose, targetAccount, accounts, currentBalance, onPay }) => {
    const [sourceAccountId, setSourceAccountId] = useState('');
    // Suggest paying the full negative balance if it is negative
    const [amount, setAmount] = useState(currentBalance < 0 ? String(Math.abs(currentBalance)) : '');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    // Update amount if targetAccount changes and has negative balance
    useEffect(() => {
        if (isOpen) {
            setAmount(currentBalance < 0 ? String(Math.abs(currentBalance).toFixed(2)) : '');
        }
    }, [isOpen, currentBalance]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sourceAccountId || !amount || !date) {
            alert('Preencha todos os campos.');
            return;
        }
        await onPay(sourceAccountId, parseFloat(amount), date);
    };

    const activeSourceAccounts = accounts.filter(a => a.isActive && a.id !== targetAccount.id);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4 text-slate-800">Pagar Fatura / Zerar Saldo</h2>
                <p className="text-sm text-slate-600 mb-4">
                    Isso criará uma <b>transferência</b> para a conta <span className="font-semibold">{targetAccount.name}</span>. 
                    Transferências não são consideradas despesas nos relatórios.
                </p>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Pagar com (Origem)</label>
                        <select 
                            value={sourceAccountId} 
                            onChange={e => setSourceAccountId(e.target.value)} 
                            required 
                            className="input-style"
                        >
                            <option value="" disabled>Selecione a conta de origem...</option>
                            {activeSourceAccounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Valor do Pagamento</label>
                        <input 
                            type="number" 
                            value={amount} 
                            onChange={e => setAmount(e.target.value)} 
                            step="0.01" 
                            min="0" 
                            required 
                            className="input-style" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Data do Pagamento</label>
                        <input 
                            type="date" 
                            value={date} 
                            onChange={e => setDate(e.target.value)} 
                            required 
                            className="input-style" 
                        />
                    </div>
                    
                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                        <button type="submit" className="btn-primary bg-green-600 hover:bg-green-700 border-none">
                            Confirmar Pagamento
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

const BankLogo: React.FC<{ account: Account, size?: 'sm' | 'lg'}> = ({ account, size = 'sm' }) => {
    const { bank: bankName = '', imageUrl } = account;
    const name = bankName.toLowerCase();
    const sizeClasses = size === 'sm' ? 'w-10 h-10 rounded-lg flex-shrink-0' : 'w-14 h-14 rounded-xl flex-shrink-0';
    
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
            {account.isCreditCard ? (
                <CreditCardIcon className="w-6 h-6 text-slate-500" />
            ) : (
                <MoneyIcon className="w-6 h-6 text-slate-500" />
            )}
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
    const { accounts, addAccount, updateAccount, deleteAccount, reorderAccounts } = useAccounts();
    const { transactions, addTransactions } = useTransactions();
    const { categories } = useCategories();
    // Loans hook not strictly needed for display here but kept for consistency if extended
    const { loans } = useLoans(); 

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
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
    
    const handlePayBillClick = () => {
        if (selectedAccount) {
            setIsPayModalOpen(true);
        }
    };

    const handleSaveAccount = async (accountData: Omit<Account, 'id'> | Account) => {
        let success = false;
        if ('id' in accountData) {
            success = await updateAccount(accountData as Account);
        } else {
            const newId = await addAccount(accountData);
            success = !!newId;
        }
        
        if (success) {
            handleCloseModal();
        }
    };

    const handleDeleteAccount = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta conta? As transações associadas não serão excluídas.')) {
            const success = await deleteAccount(id);
            if (success) {
                if (selectedAccountId === id) {
                    const remainingAccounts = accounts.filter(acc => acc.id !== id);
                    setSelectedAccountId(remainingAccounts.length > 0 ? remainingAccounts[0].id : null);
                }
                handleCloseModal();
            }
        }
    };
    
    const handlePayInvoice = async (sourceAccountId: string, amount: number, date: string) => {
        if (!selectedAccount) return;

        // Create a Transfer Transaction
        // Source: The account paying (Debit)
        // Destination: The Credit Card account (Credit - increasing its balance from negative towards zero)
        
        const transferTransaction: Omit<Transaction, 'id'> = {
            description: `Pagamento Fatura: ${selectedAccount.name}`,
            amount: amount,
            date: date,
            type: TransactionType.TRANSFER,
            accountId: sourceAccountId,
            destinationAccountId: selectedAccount.id,
        };

        const success = await addTransactions([transferTransaction]);
        if (success) {
            setIsPayModalOpen(false);
        }
    };

    const handleImageUpload = (file: File) => {
      if (!selectedAccountId) return;
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Find current account to update
        const acc = accounts.find(a => a.id === selectedAccountId);
        if(acc) {
            updateAccount({ ...acc, imageUrl: base64String });
        }
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
    
    const handleAccountDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        setDraggedItemIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleAccountDragEnter = (index: number) => {
        setDragOverItemIndex(index);
    };

    const handleAccountDragEnd = () => {
        setDraggedItemIndex(null);
        setDragOverItemIndex(null);
    };
    
    const handleAccountDrop = async (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
        e.preventDefault();
        if (draggedItemIndex === null || draggedItemIndex === targetIndex) return;

        const newAccounts = [...accounts];
        const [movedItem] = newAccounts.splice(draggedItemIndex, 1);
        newAccounts.splice(targetIndex, 0, movedItem);
        
        // Prepare the payload for batch update: only need ID and new Order index
        const updates = newAccounts.map((acc, index) => ({
            id: acc.id,
            order: index
        }));
        
        // Optimistically update logic could go here, but reorderAccounts will trigger a snapshot update soon.
        // We call the persist function
        await reorderAccounts(updates);

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
    
    const selectedAccountBalance = selectedAccount ? (accountBalances.get(selectedAccount.id) || 0) : 0;

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
                            onDragStart={(e) => handleAccountDragStart(e, index)}
                            onDragEnter={() => handleAccountDragEnter(index)}
                            onDragEnd={handleAccountDragEnd}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleAccountDrop(e, index)}
                            onClick={() => setSelectedAccountId(acc.id)} 
                            className={`w-full text-left p-4 bg-white rounded-xl border-2 transition-all duration-200 cursor-grab active:cursor-grabbing ${draggedItemIndex === index ? 'opacity-50' : ''} ${isDragOver ? 'border-blue-500 bg-blue-50' : ''} ${isSelected ? 'border-blue-500 shadow-md' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'} ${!acc.isActive ? 'opacity-60' : ''}`}
                         >
                            <div className="flex items-center justify-between pointer-events-none gap-4">
                                <div className="flex items-center space-x-4 min-w-0">
                                    <BankLogo account={acc} />
                                    <div className="min-w-0">
                                        <div className="flex items-center space-x-2">
                                            <p className="font-bold text-slate-800 truncate" title={acc.name}>{acc.name}</p>
                                            {acc.isCreditCard && <div title="Cartão de Crédito"><CreditCardIcon className="w-4 h-4 text-slate-400" /></div>}
                                            {!acc.isActive && <span className="text-xs bg-gray-200 text-gray-600 font-semibold px-2 py-0.5 rounded-full flex-shrink-0">Inativa</span>}
                                        </div>
                                        <p className="text-sm text-slate-500 truncate">Saldo Atual</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-1 pointer-events-auto flex-shrink-0">
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
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
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
                                    <div className="flex flex-col">
                                        <span className="text-sm text-slate-500">Saldo Atual</span>
                                        <span className={`text-3xl font-bold ${selectedAccountBalance < 0 ? 'text-red-500' : 'text-slate-900'}`}>{formatCurrency(selectedAccountBalance)}</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Action Buttons for Account */}
                            <div className="flex items-center gap-3">
                                {selectedAccount.isCreditCard && (
                                    <button 
                                        onClick={handlePayBillClick} 
                                        className="btn-primary bg-green-600 hover:bg-green-700 border-none flex items-center gap-2"
                                        title="Realizar transferência para cobrir saldo negativo"
                                    >
                                        <CheckIcon className="w-5 h-5"/>
                                        Pagar Fatura / Zerar
                                    </button>
                                )}
                            </div>
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

            {selectedAccount && (
                <PayInvoiceModal
                    isOpen={isPayModalOpen}
                    onClose={() => setIsPayModalOpen(false)}
                    targetAccount={selectedAccount}
                    accounts={accounts}
                    currentBalance={accountBalances.get(selectedAccount.id) || 0}
                    onPay={handlePayInvoice}
                />
            )}
        </div>
    );
};

export default AccountsPage;
