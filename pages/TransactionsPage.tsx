
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Transaction, Account, Category, TransactionType, Loan, CategoryItem } from '../types';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import SearchIcon from '../components/icons/SearchIcon';
import DateRangePickerModal from '../components/DateRangePickerModal';
import PlusIcon from '../components/icons/PlusIcon';
import XIcon from '../components/icons/XIcon';
import ChevronLeftIcon from '../components/icons/ChevronLeftIcon';
import ChevronRightIcon from '../components/icons/ChevronRightIcon';
import ChevronDownIcon from '../components/icons/ChevronDownIcon';
import { sampleCategories } from '../data/demoData';


const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

// Helper to get the current date in GMT-4
const getNowGmtMinus4 = () => {
    const now = new Date();
    // Offset in milliseconds for GMT-4
    const offset = -4 * 60 * 60 * 1000;
    const localOffset = now.getTimezoneOffset() * 60 * 1000;
    return new Date(now.getTime() + localOffset + offset);
}

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
    'Movimentações': 'bg-slate-200 text-slate-800'
};
const defaultCategoryColor = 'bg-slate-100 text-slate-800';

interface SplitItem {
    id: number;
    itemId: string;
    amount: string;
}

const DeleteConfirmationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (option: 'single' | 'future') => void;
}> = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4 text-slate-800">Excluir Lançamento Parcelado</h2>
                <p className="text-slate-600 mb-6">Como você deseja excluir este lançamento?</p>
                <div className="flex flex-col space-y-3">
                    <button onClick={() => onConfirm('single')} className="btn-secondary w-full">Excluir apenas esta parcela</button>
                    <button onClick={() => onConfirm('future')} className="btn-secondary w-full">Excluir esta e as futuras</button>
                    <button onClick={onClose} className="btn-primary w-full bg-slate-600 hover:bg-slate-700">Cancelar</button>
                </div>
            </div>
        </div>
    );
};

const FilterDropdown: React.FC<{
    options: string[];
    value: string;
    onChange: (value: string) => void;
}> = ({ options, value, onChange }) => {
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

    const handleSelect = (option: string) => {
        onChange(option);
        setIsOpen(false);
    };

    return (
        <div className="relative h-full" ref={ref}>
            <button onClick={() => setIsOpen(prev => !prev)} className="btn-secondary w-full flex justify-center items-center px-3 py-2 h-full">
                <span>{value}</span>
            </button>
            {isOpen && (
                <div className="absolute top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-10">
                    {options.map(option => (
                        <button key={option} onClick={() => handleSelect(option)} className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg">
                            {option}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};


const TransactionsPage: React.FC<{ addTransactionTrigger: number }> = ({ addTransactionTrigger }) => {
    const [transactions, setTransactions] = useLocalStorage<Transaction[]>('transactions', []);
    const [accounts] = useLocalStorage<Account[]>('accounts', []);
    const [categories] = useLocalStorage<Category[]>('categories', sampleCategories);
    const [loans, setLoans] = useLocalStorage<Loan[]>('loans', []);
    
    // State to remember last used form fields
    const [lastUsedDetails, setLastUsedDetails] = useState({
        accountId: '',
        type: TransactionType.EXPENSE,
    });

    // Form State
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [editingInstallmentGroup, setEditingInstallmentGroup] = useState<Transaction | null>(null);
    const [type, setType] = useState<TransactionType>(lastUsedDetails.type);
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [accountId, setAccountId] = useState(lastUsedDetails.accountId);
    const [itemId, setItemId] = useState('');
    const [isInstallment, setIsInstallment] = useState(false);
    const [installmentsCount, setInstallmentsCount] = useState('2');
    const [isSplit, setIsSplit] = useState(false);
    const [splitItems, setSplitItems] = useState<SplitItem[]>([{ id: 1, itemId: '', amount: '' }]);
    const [isChange, setIsChange] = useState(false);
    const [amountPaid, setAmountPaid] = useState('');
    const [changeAccountId, setChangeAccountId] = useState('');
    const [changeItemId, setChangeItemId] = useState('');
    const [peerAccountId, setPeerAccountId] = useState('');


    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [dateFilter, setDateFilter] = useState('Este Mês');
    const [typeFilter, setTypeFilter] = useState('Todos');
    const [accountFilter, setAccountFilter] = useState('Todos');
    const [installmentFilter, setInstallmentFilter] = useState(false);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [customDateRange, setCustomDateRange] = useState<{start: Date | null, end: Date | null}>({ start: null, end: null });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Delete Modal
    const [deleteModalState, setDeleteModalState] = useState<{ isOpen: boolean, transaction: Transaction | null }>({ isOpen: false, transaction: null });
    
    const descriptionInputRef = useRef<HTMLInputElement>(null);

    const activeAccounts = useMemo(() => accounts.filter(a => a.isActive), [accounts]);

    const handleClearForm = useCallback(() => {
        setEditingTransaction(null);
        setEditingInstallmentGroup(null);
        setType(lastUsedDetails.type);
        setDescription('');
        setAmount('');
        setDate(new Date().toISOString().split('T')[0]);
        setAccountId(lastUsedDetails.accountId || (activeAccounts.length > 0 ? activeAccounts[0].id : ''));
        setItemId('');
        setIsInstallment(false);
        setInstallmentsCount('2');
        setIsSplit(false);
        setSplitItems([{ id: 1, itemId: '', amount: '' }]);
        setIsChange(false);
        setAmountPaid('');
        setChangeAccountId('');
        setChangeItemId('');
        setPeerAccountId('');
    }, [activeAccounts, lastUsedDetails]);

    useEffect(() => {
        if (addTransactionTrigger > 0) {
            handleClearForm();
        }
    }, [addTransactionTrigger, handleClearForm]);

    useEffect(() => {
        if (!editingTransaction && activeAccounts.length > 0 && !accountId) {
             setAccountId(lastUsedDetails.accountId || activeAccounts[0].id);
             setType(lastUsedDetails.type);
        }
    }, [editingTransaction, activeAccounts, accountId, lastUsedDetails]);
    
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, dateFilter, typeFilter, installmentFilter, accountFilter, customDateRange]);

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
    
    const itemBalanceMap = useMemo(() => {
        const map = new Map<string, boolean>();
        categories.forEach(cat => cat.subcategories.forEach(sub => sub.items.forEach(item => map.set(item.id, item.includeInBalance))));
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
        // First reverse the transactions so newer ones (by insertion order) are first.
        // This effectively ensures LIFO for transactions on the same day when sorted by date.
        let items = [...transactions].reverse();
        
        const now = getNowGmtMinus4();
        if (dateFilter === 'Este Mês') {
            const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
            const endOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));
            items = items.filter(t => { const tDate = getUTCDate(t.date); return tDate >= startOfMonth && tDate <= endOfMonth; });
        } else if (dateFilter === 'Mês Passado') {
             const startOfLastMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1));
             const endOfLastMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999));
             items = items.filter(t => { const tDate = getUTCDate(t.date); return tDate >= startOfLastMonth && tDate <= endOfLastMonth; });
        } else if (dateFilter === 'Personalizado' && customDateRange.start && customDateRange.end) {
            const start = new Date(customDateRange.start.getTime()); start.setUTCHours(0,0,0,0);
            const end = new Date(customDateRange.end.getTime()); end.setUTCHours(23,59,59,999);
            items = items.filter(t => { const tDate = getUTCDate(t.date); return tDate >= start && tDate <= end; });
        }
        
        if (typeFilter === 'Movimentações') {
            items = items.filter(t => t.itemId && itemBalanceMap.get(t.itemId) === false);
        } else if (typeFilter === 'Entradas') {
             items = items.filter(t => t.type === TransactionType.INCOME && (!t.itemId || itemBalanceMap.get(t.itemId) !== false));
        } else if (typeFilter === 'Saídas') {
            items = items.filter(t => t.type === TransactionType.EXPENSE && (!t.itemId || itemBalanceMap.get(t.itemId) !== false));
        }
        // For 'Todos', no type filter is applied, showing all items.
        
        if (accountFilter !== 'Todos') {
            items = items.filter(t => t.accountId === accountFilter);
        }

        if (installmentFilter) {
            items = items.filter(t => !!t.installmentGroupId);
        }

        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            const normalizedSearchTerm = lowerSearchTerm.replace(',', '.');
            items = items.filter(t => 
                t.description.toLowerCase().includes(lowerSearchTerm) ||
                t.amount.toFixed(2).includes(normalizedSearchTerm)
            );
        }

        // Sort by date. Stable sort + reversed input ensures newer items first for same date.
        return items.sort((a, b) => getUTCDate(b.date).getTime() - getUTCDate(a.date).getTime());
    }, [transactions, searchTerm, dateFilter, typeFilter, accountFilter, installmentFilter, customDateRange, itemBalanceMap]);
    
    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const paginatedTransactions = filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const { periodIncome, periodExpenses } = useMemo(() => {
        return filteredTransactions.reduce((acc, t) => {
            if (!t.itemId || itemBalanceMap.get(t.itemId) !== false) {
                if (t.type === TransactionType.INCOME) acc.periodIncome += t.amount;
                else if (t.type === TransactionType.EXPENSE) acc.periodExpenses += t.amount;
            }
            return acc;
        }, { periodIncome: 0, periodExpenses: 0 });
    }, [filteredTransactions, itemBalanceMap]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Update last used details before clearing form
        setLastUsedDetails({ accountId, type });

        const isTransfer = itemBalanceMap.get(itemId) === false;
        
        if (isTransfer) {
            if (!peerAccountId || !accountId || !amount) {
                alert('Para transferências, selecione as contas de origem, destino e o valor.');
                return;
            }
            const transferAmount = parseFloat(amount);
            const sourceAccId = type === TransactionType.EXPENSE ? accountId : peerAccountId;
            const destAccId = type === TransactionType.EXPENSE ? peerAccountId : accountId;

            const expenseTx: Omit<Transaction, 'id'> = {
                description: `Transferência para ${accountMap.get(destAccId)}`,
                amount: transferAmount, date, type: TransactionType.EXPENSE,
                accountId: sourceAccId, itemId
            };
            const incomeTx: Omit<Transaction, 'id'> = {
                description: `Transferência de ${accountMap.get(sourceAccId)}`,
                amount: transferAmount, date, type: TransactionType.INCOME,
                accountId: destAccId, itemId
            };

            if (editingTransaction) {
                // When editing a transfer, remove the old pair and add the new pair
                const oldTx = editingTransaction;
                const partnerTx = transactions.find(t => 
                     t.id !== oldTx.id &&
                     t.date === oldTx.date &&
                     t.amount === oldTx.amount &&
                     t.itemId === oldTx.itemId &&
                     t.type !== oldTx.type
                );

                const idsToRemove = [oldTx.id];
                if (partnerTx) idsToRemove.push(partnerTx.id);

                const remainingTxs = transactions.filter(t => !idsToRemove.includes(t.id));
                setTransactions([...remainingTxs, { ...expenseTx, id: crypto.randomUUID() }, { ...incomeTx, id: crypto.randomUUID() }]);

            } else {
                setTransactions(prev => [...prev, { ...expenseTx, id: crypto.randomUUID() }, { ...incomeTx, id: crypto.randomUUID() }]);
            }
            handleClearForm();
            return;
        }

        if (type === TransactionType.INCOME && isChange) {
            const saleAmount = parseFloat(amount);
            const paidAmount = parseFloat(amountPaid);
            if (isNaN(saleAmount) || saleAmount <= 0) {
                alert('O valor da receita deve ser positivo.'); return;
            }
            if (isNaN(paidAmount) || paidAmount < saleAmount) {
                alert('O valor pago deve ser maior ou igual ao valor da receita.'); return;
            }
            if (!changeAccountId || !changeItemId || !accountId || !itemId) {
                alert('Selecione a conta e a categoria para a receita e para o troco.'); return;
            }
            
            const changeAmount = paidAmount - saleAmount;
            
            const incomeTransaction: Omit<Transaction, 'id'> = {
                description,
                amount: saleAmount,
                date,
                type: TransactionType.INCOME,
                accountId,
                itemId,
            };
            
            const newTxs = [{ ...incomeTransaction, id: crypto.randomUUID() }];
    
            if (changeAmount > 0) {
                const changeTransaction: Omit<Transaction, 'id'> = {
                    description: `Troco para: ${description}`,
                    amount: changeAmount,
                    date,
                    type: TransactionType.EXPENSE,
                    accountId: changeAccountId,
                    itemId: changeItemId,
                };
                newTxs.push({ ...changeTransaction, id: crypto.randomUUID() });
            }
            
            setTransactions(prev => [...prev, ...newTxs]);
            handleClearForm();
            return;
        }


        const commonData = { description, date, accountId, type };

        if (editingInstallmentGroup) {
            const groupId = editingInstallmentGroup.installmentGroupId!;
            const remainingTransactions = transactions.filter(t => t.installmentGroupId !== groupId);
            // Re-create installments
            const totalInstallments = parseInt(installmentsCount, 10);
            const originalDate = getUTCDate(date);
            const newTransactions: Transaction[] = [];

            for (let i = 0; i < totalInstallments; i++) {
                const installmentDate = new Date(originalDate);
                installmentDate.setUTCMonth(originalDate.getUTCMonth() + i);
                newTransactions.push({
                    id: crypto.randomUUID(),
                    ...commonData,
                    amount: parseFloat(amount),
                    itemId,
                    date: installmentDate.toISOString().split('T')[0],
                    description: `${description} (${i + 1}/${totalInstallments})`,
                    installmentGroupId: groupId,
                    currentInstallment: i + 1,
                    totalInstallments
                });
            }
            setTransactions([...remainingTransactions, ...newTransactions]);

        } else if (isInstallment && isSplit) {
            const totalInstallments = parseInt(installmentsCount, 10);
            const installmentGroupId = crypto.randomUUID();
            const originalDate = getUTCDate(date);
            const allNewTransactions: Transaction[] = [];
            const perInstallmentAmount = parseFloat(amount);

            const totalSplitAmount = splitItems.reduce((sum, item) => sum + parseFloat(item.amount || '0'), 0);
            if (Math.abs(totalSplitAmount - perInstallmentAmount) > 0.001) {
                alert(`A soma dos valores divididos (${formatCurrency(totalSplitAmount)}) deve ser igual ao valor da parcela (${formatCurrency(perInstallmentAmount)}).`);
                return;
            }

            for (let i = 0; i < totalInstallments; i++) {
                const installmentDate = new Date(originalDate);
                installmentDate.setUTCMonth(originalDate.getUTCMonth() + i);
                
                splitItems.forEach(item => {
                    allNewTransactions.push({
                        id: crypto.randomUUID(),
                        ...commonData,
                        amount: parseFloat(item.amount),
                        itemId: item.itemId,
                        date: installmentDate.toISOString().split('T')[0],
                        description: `${description} (${i+1}/${totalInstallments}) - ${categoryMap.get(item.itemId)?.item}`,
                        installmentGroupId,
                        currentInstallment: i + 1,
                        totalInstallments
                    });
                });
            }
            setTransactions(prev => [...prev, ...allNewTransactions]);

        } else if (isSplit) {
            const totalSplitAmount = splitItems.reduce((sum, item) => sum + parseFloat(item.amount || '0'), 0);
            if(Math.abs(totalSplitAmount - parseFloat(amount)) > 0.001) {
                alert('A soma dos valores divididos deve ser igual ao valor total.'); return;
            }
            if(splitItems.some(i => !i.itemId || !i.amount)) {
                alert('Todos os itens divididos devem ter um item e um valor.'); return;
            }
            const newTransactions: Transaction[] = splitItems.map(item => ({
                id: crypto.randomUUID(), ...commonData, amount: parseFloat(item.amount), itemId: item.itemId,
                description: `${description} - ${categoryMap.get(item.itemId)?.item}`
            }));
            setTransactions(prev => [...prev, ...newTransactions]);
        } else if (isInstallment && type === TransactionType.EXPENSE) {
            const totalInstallments = parseInt(installmentsCount, 10);
            const installmentGroupId = crypto.randomUUID();
            const originalDate = getUTCDate(date);
            const newTransactions: Transaction[] = [];
            for(let i = 0; i < totalInstallments; i++) {
                const installmentDate = new Date(originalDate);
                installmentDate.setUTCMonth(originalDate.getUTCMonth() + i);
                newTransactions.push({
                    id: crypto.randomUUID(), ...commonData, amount: parseFloat(amount), itemId,
                    date: installmentDate.toISOString().split('T')[0],
                    description: `${description} (${i + 1}/${totalInstallments})`,
                    installmentGroupId, currentInstallment: i + 1, totalInstallments
                });
            }
            setTransactions(prev => [...prev, ...newTransactions]);
        } else {
             if (!description || !amount || !date || !accountId || !itemId) { alert('Por favor, preencha todos os campos obrigatórios.'); return; }
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
        window.scrollTo(0, 0);
        if (transaction.installmentGroupId) {
            const groupTransactions = transactions.filter(t => t.installmentGroupId === transaction.installmentGroupId).sort((a,b) => a.currentInstallment! - b.currentInstallment!);
            const firstInstallment = groupTransactions[0];
            setEditingTransaction(null);
            setEditingInstallmentGroup(firstInstallment);
            setType(firstInstallment.type);
            setDescription(firstInstallment.description.replace(/\s\(\d+\/\d+\)$/, ''));
            setAmount(String(firstInstallment.amount));
            setDate(firstInstallment.date);
            setAccountId(firstInstallment.accountId);
            setItemId(firstInstallment.itemId || '');
            setIsInstallment(true);
            setInstallmentsCount(String(firstInstallment.totalInstallments));
            setIsSplit(false);
        } else {
            setEditingInstallmentGroup(null);
            setEditingTransaction(transaction);
            setType(transaction.type);
            setDescription(transaction.description);
            setAmount(String(transaction.amount));
            setDate(transaction.date);
            setAccountId(transaction.accountId);
            setItemId(transaction.itemId || '');
            setIsInstallment(false);
            setIsSplit(false);

            // Check if it's a transfer and try to find the partner account
            // Also rely on itemBalanceMap to ensure isTransfer logic works
            if (transaction.itemId && itemBalanceMap.get(transaction.itemId) === false) {
                const partner = transactions.find(t => 
                     t.id !== transaction.id &&
                     t.date === transaction.date &&
                     t.amount === transaction.amount &&
                     t.itemId === transaction.itemId &&
                     t.type !== transaction.type
                );
                if (partner) {
                    setPeerAccountId(partner.accountId);
                }
            }
        }
    };

    const handleDelete = (id: string) => {
        const txToDelete = transactions.find(t => t.id === id);
        if (!txToDelete) return;

        if (txToDelete.installmentGroupId) {
            setDeleteModalState({ isOpen: true, transaction: txToDelete });
        } else {
            if (window.confirm('Tem certeza que deseja excluir este lançamento?')) {
                const relatedLoan = loans.find(l => l.initialTransactionId === id || l.settlementTransactionId === id || l.partialSettlements?.some(p => p.transactionId === id));
                if (relatedLoan) {
                   alert('Este lançamento está associado a um empréstimo e não pode ser excluído diretamente.');
                   return;
                }

                // Check if it's a transfer and delete the partner transaction as well
                const isTransfer = txToDelete.itemId && itemBalanceMap.get(txToDelete.itemId) === false;
                if (isTransfer) {
                    const partner = transactions.find(t => 
                        t.id !== txToDelete.id &&
                        t.date === txToDelete.date &&
                        t.amount === txToDelete.amount &&
                        t.itemId === txToDelete.itemId &&
                        t.type !== txToDelete.type
                   );
                   
                   if (partner) {
                       setTransactions(prev => prev.filter(t => t.id !== id && t.id !== partner.id));
                       return;
                   }
                }

                setTransactions(prev => prev.filter(t => t.id !== id));
            }
        }
    };
    
    const handleConfirmDelete = (option: 'single' | 'future') => {
        const tx = deleteModalState.transaction;
        if (!tx) return;

        if (option === 'single') {
            setTransactions(prev => prev.filter(t => t.id !== tx.id));
        } else if (option === 'future') {
            setTransactions(prev => prev.filter(t => 
                t.installmentGroupId !== tx.installmentGroupId || 
                (t.installmentGroupId === tx.installmentGroupId && t.currentInstallment! < tx.currentInstallment!)
            ));
        }
        setDeleteModalState({ isOpen: false, transaction: null });
    };
    
    const categoryOptions = useMemo(() => {
        return categories
            .filter(cat => cat.type === type)
            .flatMap(cat => cat.subcategories.flatMap(sub => sub.items.map(item => ({...item, catName: cat.name, subName: sub.name}))))
            .sort((a,b) => {
                if (a.catName !== b.catName) return a.catName.localeCompare(b.catName, 'pt-BR');
                if (a.subName !== b.subName) return a.subName.localeCompare(b.subName, 'pt-BR');
                return a.name.localeCompare(b.name, 'pt-BR');
            });
    }, [categories, type]);

     const expenseCategoryOptions = useMemo(() => {
        return categories
            .filter(cat => cat.type === TransactionType.EXPENSE)
            .flatMap(cat => cat.subcategories.flatMap(sub => sub.items.map(item => ({...item, catName: cat.name, subName: sub.name}))))
            .sort((a,b) => {
                if (a.catName !== b.catName) return a.catName.localeCompare(b.catName, 'pt-BR');
                if (a.subName !== b.subName) return a.subName.localeCompare(b.subName, 'pt-BR');
                return a.name.localeCompare(b.name, 'pt-BR');
            });
    }, [categories]);
    
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

    const isEditing = editingTransaction || editingInstallmentGroup;
    const isTransfer = itemBalanceMap.get(itemId) === false;
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 xl:col-span-4">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm sticky top-6">
                    <form onSubmit={handleSubmit}>
                        <h2 className="text-xl font-bold text-slate-800 mb-4">{isEditing ? 'Editar Transação' : 'Nova Transação'}</h2>
                        
                        <div className="p-1 bg-slate-100 rounded-lg flex space-x-1 mb-4">
                            <button type="button" onClick={() => { setType(TransactionType.EXPENSE); }} className={`w-full text-center py-2 text-sm font-semibold rounded-md transition-all ${type === TransactionType.EXPENSE ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Saídas</button>
                            <button type="button" onClick={() => { setType(TransactionType.INCOME); setIsInstallment(false); setIsSplit(false); }} className={`w-full text-center py-2 text-sm font-semibold rounded-md transition-all ${type === TransactionType.INCOME ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Entradas</button>
                        </div>

                        <div className="space-y-4 max-h-[calc(100vh-22rem)] overflow-y-auto pr-2">
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
                            {type === TransactionType.EXPENSE && (
                                <div className="flex space-x-6">
                                    <div className="flex items-center">
                                        <input type="checkbox" id="installment-check" checked={isInstallment} onChange={e => setIsInstallment(e.target.checked)} disabled={!!editingInstallmentGroup} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"/>
                                        <label htmlFor="installment-check" className="ml-2 block text-sm text-slate-800">Parcelar</label>
                                    </div>
                                    <div className="flex items-center">
                                        <input type="checkbox" id="split-check" checked={isSplit} onChange={e => setIsSplit(e.target.checked)} disabled={!!editingTransaction || !!editingInstallmentGroup} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"/>
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
                             <div>
                                <label className="text-sm font-medium text-slate-600 mb-1 block">Conta</label>
                                <select value={accountId} onChange={e => setAccountId(e.target.value)} required className="input-style">
                                    <option value="" disabled>Selecione uma conta...</option>
                                    {activeAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                </select>
                            </div>
                            {isSplit ? (
                                <div className="space-y-3 border-t border-slate-200 pt-4">
                                    {splitItems.map((item, index) => (
                                        <div key={item.id} className="grid grid-cols-12 gap-2 items-end">
                                            <div className="col-span-7">
                                                {index === 0 && <label className="text-sm font-medium text-slate-600 mb-1 block">Item</label>}
                                                <select value={item.itemId} onChange={e => handleSplitItemChange(item.id, 'itemId', e.target.value)} required className="input-style">
                                                    <option value="" disabled>Selecione...</option>
                                                    {categoryOptions.map(opt => <option key={opt.id} value={opt.id}>{`${opt.catName} > ${opt.subName} > ${opt.name}`}</option>)}
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
                                    <select value={itemId} onChange={e => setItemId(e.target.value)} required className="input-style">
                                        <option value="" disabled>Selecione um item...</option>
                                        {categoryOptions.map(opt => <option key={opt.id} value={opt.id}>{`${opt.catName} > ${opt.subName} > ${opt.name}`}</option>)}
                                    </select>
                                </div>
                            )}
                             {isTransfer && (
                                <div>
                                    <label className="text-sm font-medium text-slate-600 mb-1 block">
                                        {type === TransactionType.EXPENSE ? 'Conta de Destino' : 'Conta de Origem'}
                                    </label>
                                    <select 
                                        value={peerAccountId} 
                                        onChange={e => setPeerAccountId(e.target.value)} 
                                        required 
                                        className="input-style"
                                    >
                                        <option value="" disabled>Selecione a outra conta...</option>
                                        {activeAccounts
                                            .filter(acc => acc.id !== accountId)
                                            .map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                    </select>
                                </div>
                            )}
                             {type === TransactionType.INCOME && (
                                <div className="flex items-center pt-4 border-t border-slate-200 mt-4">
                                    <input type="checkbox" id="change-check" checked={isChange} onChange={e => setIsChange(e.target.checked)} disabled={isEditing} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"/>
                                    <label htmlFor="change-check" className="ml-2 block text-sm text-slate-800">Devolver troco</label>
                                </div>
                            )}
                            {isChange && type === TransactionType.INCOME && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-slate-600 mb-1 block">Valor Pago pelo Cliente</label>
                                        <input type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} required step="0.01" min={amount || '0'} className="input-style" placeholder="R$ 0,00" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-slate-600 mb-1 block">Conta para o Troco</label>
                                        <select value={changeAccountId} onChange={e => setChangeAccountId(e.target.value)} required className="input-style">
                                            <option value="" disabled>Selecione uma conta...</option>
                                            {activeAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                        </select>
                                    </div>
                                     <div>
                                        <label className="text-sm font-medium text-slate-600 mb-1 block">Categoria do Troco</label>
                                        <select value={changeItemId} onChange={e => setChangeItemId(e.target.value)} required className="input-style">
                                            <option value="" disabled>Selecione um item...</option>
                                            {expenseCategoryOptions.map(opt => <option key={opt.id} value={opt.id}>{`${opt.catName} > ${opt.subName} > ${opt.name}`}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500">Valor do Troco: <span className="font-semibold">{formatCurrency(Math.max(0, parseFloat(amountPaid || '0') - parseFloat(amount || '0')))}</span></p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center space-x-3 mt-6">
                            <button type="button" onClick={handleClearForm} className="btn-secondary w-full">Cancelar</button>
                            <button type="submit" className="btn-primary w-full">{isEditing ? 'Salvar Alterações' : 'Salvar'}</button>
                        </div>
                    </form>
                </div>
            </div>

            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                    <div className="relative md:col-span-3">
                        {!isSearchFocused && !searchTerm && <SearchIcon className="w-5 h-5 text-slate-400 absolute top-1/2 left-3 -translate-y-1/2 pointer-events-none"/>}
                        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onFocus={() => setIsSearchFocused(true)} onBlur={() => setIsSearchFocused(false)} className="input-style pl-10 h-full" placeholder="" />
                    </div>
                    <div className="md:col-span-3">
                        <FilterDropdown 
                            options={['Todos', ...activeAccounts.map(a => a.name)]}
                            value={accountFilter === 'Todos' ? 'Todas as Contas' : accounts.find(a => a.id === accountFilter)?.name || 'Todas as Contas'}
                            onChange={(value) => setAccountFilter(value === 'Todas as Contas' ? 'Todos' : accounts.find(a => a.name === value)?.id || 'Todos')}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <FilterDropdown 
                            options={['Este Mês', 'Mês Passado', 'Personalizado']}
                            value={dateFilter}
                            onChange={handleDateFilterChange}
                        />
                    </div>
                    <div className="md:col-span-4 grid grid-cols-2 gap-2">
                         <FilterDropdown 
                            options={['Todos', 'Entradas', 'Saídas', 'Movimentações']}
                            value={typeFilter}
                            onChange={setTypeFilter}
                        />
                        <button onClick={() => setInstallmentFilter(s => !s)} className={`btn-secondary w-full h-full flex justify-center items-center px-3 py-2 text-sm ${installmentFilter ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600'}`}>
                            Parceladas
                        </button>
                    </div>
                </div>
                
                <DateRangePickerModal isOpen={isPickerOpen} onClose={() => setIsPickerOpen(false)} value={customDateRange} onChange={handleCustomDateChange} />
                <DeleteConfirmationModal isOpen={deleteModalState.isOpen} onClose={() => setDeleteModalState({isOpen: false, transaction: null})} onConfirm={handleConfirmDelete} />


                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200"><p className="text-sm text-slate-500 font-medium">Receitas no Período</p><p className="text-2xl font-bold text-green-600">{formatCurrency(periodIncome)}</p></div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200"><p className="text-sm text-slate-500 font-medium">Despesas no Período</p><p className="text-2xl font-bold text-red-600">{formatCurrency(periodExpenses)}</p></div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200"><p className="text-sm text-slate-500 font-medium">Saldo</p><p className={`text-2xl font-bold ${periodIncome - periodExpenses >= 0 ? 'text-slate-800' : 'text-red-600'}`}>{formatCurrency(periodIncome - periodExpenses)}</p></div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm table-fixed">
                            <thead className="bg-gray-50 text-slate-500 uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-left w-[110px]">Data</th>
                                    <th className="px-4 py-3 font-semibold text-left">Descrição</th>
                                    <th className="px-4 py-3 font-semibold text-left w-[150px]">Conta</th>
                                    <th className="px-4 py-3 font-semibold text-center w-[180px]">Item</th>
                                    <th className="px-4 py-3 font-semibold text-right w-[120px]">Valor</th>
                                    <th className="px-4 py-3 font-semibold text-center w-[100px]">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {paginatedTransactions.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center p-8 text-slate-500">Nenhum lançamento encontrado.</td></tr>
                                ) : (
                                    paginatedTransactions.map(t => {
                                        const categoryInfo = t.itemId ? categoryMap.get(t.itemId) : null;
                                        const isExpense = t.type === TransactionType.EXPENSE;
                                        return (
                                        <tr key={t.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(t.date)}</td>
                                            <td className="px-4 py-3 text-slate-800 font-medium truncate">{t.description}</td>
                                            <td className="px-4 py-3 text-slate-600 whitespace-nowrap truncate">{accountMap.get(t.accountId)}</td>
                                            <td className="px-4 py-3 text-center align-middle">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${categoryInfo ? (categoryColors[categoryInfo.cat] || defaultCategoryColor) : defaultCategoryColor}`}>
                                                    {categoryInfo?.item || 'N/A'}
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
                     {totalPages > 1 && (
                        <div className="p-4 border-t border-slate-200 flex justify-between items-center">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center"><ChevronLeftIcon className="w-4 h-4 mr-1"/> Anterior</button>
                            <span className="text-sm font-medium text-slate-600">Página {currentPage} de {totalPages}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center">Próxima <ChevronRightIcon className="w-4 h-4 ml-1"/></button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TransactionsPage;
