
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTransactions, useAccounts, useCategories, useLoans } from '../hooks/useFirestore';
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
import PrivateValue from '../components/PrivateValue';

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
    onConfirm: (option: 'single' | 'future') => Promise<void>;
}> = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-slate-800">Excluir Lançamento Parcelado</h2>
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

interface FilterOption {
    label: string;
    value: string;
}

const FilterDropdown: React.FC<{
    options: FilterOption[];
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

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    const selectedLabel = options.find(o => o.value === value)?.label || value;

    return (
        <div className="relative h-full" ref={ref}>
            <button onClick={() => setIsOpen(prev => !prev)} className="btn-secondary w-full flex justify-between items-center px-3 py-2 h-full text-left bg-white font-medium">
                <span className="truncate mr-2 text-sm">{selectedLabel}</span>
                <ChevronDownIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
            </button>
            {isOpen && (
                <div className="absolute top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                    {options.map(option => (
                        <button key={option.value} onClick={() => handleSelect(option.value)} className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg truncate">
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const checkmarkSvg = `data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e`;

const CustomCheckbox: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input 
        type="checkbox" 
        className="
            appearance-none 
            h-5 w-5 
            border-2 border-slate-300 
            rounded 
            bg-white 
            checked:bg-blue-600 checked:border-blue-600 
            focus:ring-2 focus:ring-blue-500 focus:outline-none 
            cursor-pointer 
            transition-all 
            relative
        "
        style={{
            backgroundImage: props.checked ? `url("${checkmarkSvg}")` : 'none',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '100%'
        }}
        {...props}
    />
);


const TransactionsPage: React.FC<{ addTransactionTrigger: number }> = ({ addTransactionTrigger }) => {
    const { transactions, addTransaction, addTransactions, updateTransaction, deleteTransaction, deleteTransactions } = useTransactions();
    const { accounts } = useAccounts();
    const { categories } = useCategories();
    const { loans } = useLoans();
    
    const [lastUsedDetails, setLastUsedDetails] = useState({
        accountId: '',
        cardId: '',
        type: TransactionType.EXPENSE,
    });

    const [accountFilter, setAccountFilter] = useState('Todos');
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [editingInstallmentGroup, setEditingInstallmentGroup] = useState<Transaction | null>(null);
    const [editingSplitGroupId, setEditingSplitGroupId] = useState<string | null>(null); 

    const [type, setType] = useState<TransactionType>(lastUsedDetails.type);
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [accountId, setAccountId] = useState(lastUsedDetails.accountId);
    const [cardId, setCardId] = useState(lastUsedDetails.cardId || '');
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

    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [dateFilter, setDateFilter] = useState('Este Mês');
    const [typeFilter, setTypeFilter] = useState('Todos');
    const [installmentFilter, setInstallmentFilter] = useState(false);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [customDateRange, setCustomDateRange] = useState<{start: Date | null, end: Date | null}>({ start: null, end: null });

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [deleteModalState, setDeleteModalState] = useState<{ isOpen: boolean, transaction: Transaction | null }>({ isOpen: false, transaction: null });
    
    const descriptionInputRef = useRef<HTMLInputElement>(null);

    const activeAccounts = useMemo(() => accounts.filter(a => a.isActive), [accounts]);
    const isEditing = !!editingTransaction || !!editingInstallmentGroup || !!editingSplitGroupId;
    const maxDate = '9999-12-31';

    const handleClearForm = useCallback(() => {
        setEditingTransaction(null);
        setEditingInstallmentGroup(null);
        setEditingSplitGroupId(null);
        setType(lastUsedDetails.type);
        setDescription('');
        setAmount('');
        setDate(new Date().toISOString().split('T')[0]);
        if (accountFilter !== 'Todos') {
            if (accountFilter.includes('|')) {
                const [accId, cId] = accountFilter.split('|');
                setAccountId(accId);
                setCardId(cId);
            } else {
                setAccountId(accountFilter);
                setCardId('');
            }
        } else {
            setAccountId(lastUsedDetails.accountId || (activeAccounts.length > 0 ? activeAccounts[0].id : ''));
            setCardId(lastUsedDetails.cardId || '');
        }
        
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
    }, [activeAccounts, lastUsedDetails, accountFilter]);

    useEffect(() => {
        if (addTransactionTrigger > 0) {
            handleClearForm();
        }
    }, [addTransactionTrigger, handleClearForm]);

    useEffect(() => {
        if (!editingTransaction && !editingInstallmentGroup && !editingSplitGroupId && accountFilter !== 'Todos') {
            if (accountFilter.includes('|')) {
                const [accId, cId] = accountFilter.split('|');
                setAccountId(accId);
                setCardId(cId);
            } else {
                setAccountId(accountFilter);
                setCardId('');
            }
        }
    }, [accountFilter, editingTransaction, editingInstallmentGroup, editingSplitGroupId]);

    useEffect(() => {
        if (!editingTransaction && activeAccounts.length > 0 && !accountId) {
             setAccountId(lastUsedDetails.accountId || activeAccounts[0].id);
             setCardId(lastUsedDetails.cardId || '');
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
    const cardMap = useMemo(() => {
        const map = new Map<string, string>();
        accounts.forEach(acc => {
            acc.cards?.forEach(card => map.set(card.id, card.name));
        });
        return map;
    }, [accounts]);

    const categoryOptions = useMemo(() => {
        const options: { id: string, name: string, subName: string, catName: string }[] = [];
        categories.filter(c => c.type === type).forEach(cat => {
            cat.subcategories.forEach(sub => {
                sub.items.forEach(item => {
                    options.push({
                        id: item.id,
                        name: item.name,
                        subName: sub.name,
                        catName: cat.name
                    });
                });
            });
        });
        return options.sort((a,b) => a.catName.localeCompare(b.catName) || a.subName.localeCompare(b.subName) || a.name.localeCompare(b.name));
    }, [categories, type]);

    const expenseCategoryOptions = useMemo(() => {
         const options: { id: string, name: string, subName: string, catName: string }[] = [];
         categories.filter(c => c.type === TransactionType.EXPENSE).forEach(cat => {
            cat.subcategories.forEach(sub => {
                sub.items.forEach(item => {
                     options.push({ id: item.id, name: item.name, subName: sub.name, catName: cat.name });
                });
            });
         });
         return options.sort((a,b) => a.catName.localeCompare(b.catName) || a.subName.localeCompare(b.subName) || a.name.localeCompare(b.name));
    }, [categories]);

    const isTransfer = useMemo(() => {
        if (!itemId) return false;
        const balanceInclude = itemBalanceMap.get(itemId);
        const catInfo = categoryMap.get(itemId);
        return balanceInclude === false && catInfo?.item !== 'Repasse';
    }, [itemId, itemBalanceMap, categoryMap]);

    const handleSplitItemChange = (id: number, field: keyof SplitItem, value: string) => {
        setSplitItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const addSplitItem = () => {
        setSplitItems(prev => [...prev, { id: Date.now(), itemId: '', amount: '' }]);
    };

    const removeSplitItem = (id: number) => {
        setSplitItems(prev => prev.filter(item => item.id !== id));
    };

    const handleDateFilterChange = (value: string) => {
        setDateFilter(value);
        if (value === 'Personalizado') {
            setIsPickerOpen(true);
        }
    };
    
    const handleCustomDateChange = (range: { start: Date | null, end: Date | null }) => {
        setCustomDateRange(range);
    };
    
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
        
        const now = getNowGmtMinus4();
        if (dateFilter === 'Este Mês') {
            const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
            const endOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));
            items = items.filter(t => { const tDate = getUTCDate(t.date); return tDate >= startOfMonth && tDate <= endOfMonth; });
        } else if (dateFilter === 'Mês Passado') {
             const startOfLastMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1));
             const endOfLastMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999));
             items = items.filter(t => { const tDate = getUTCDate(t.date); return tDate >= startOfLastMonth && tDate <= endOfLastMonth; });
        } else if (dateFilter === 'Próximo Mês') {
             const startOfNextMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1));
             const endOfNextMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999));
             items = items.filter(t => { const tDate = getUTCDate(t.date); return tDate >= startOfNextMonth && tDate <= endOfNextMonth; });
        } else if (dateFilter === 'Este Ano') {
             const startOfYear = new Date(Date.UTC(now.getFullYear(), 0, 1));
             const endOfYear = new Date(Date.UTC(now.getFullYear(), 11, 31, 23, 59, 59, 999));
             items = items.filter(t => { const tDate = getUTCDate(t.date); return tDate >= startOfYear && tDate <= endOfYear; });
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
        
        if (accountFilter !== 'Todos') {
            if (accountFilter.includes('|')) {
                const [accId, cId] = accountFilter.split('|');
                items = items.filter(t => t.cardId === cId);
            } else {
                items = items.filter(t => {
                    const isSource = t.accountId === accountFilter;
                    const isDest = t.destinationAccountId === accountFilter;
                    
                    if (!isSource && !isDest) return false;
                    
                    // Ajuste solicitado: Qualquer transação ligada a um cartão (incluindo pagamentos)
                    // deve aparecer apenas no filtro do cartão, e nunca na visão da conta pura.
                    if (t.cardId) return false;
                    
                    return true;
                });
            }
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

        return items.sort((a, b) => {
            const dateA = getUTCDate(a.date).getTime();
            const dateB = getUTCDate(b.date).getTime();
            if (dateA !== dateB) return dateB - dateA;
            const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return createdB - createdA;
        });
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

    const splitSum = useMemo(() => {
        return splitItems.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);
    }, [splitItems]);

    const totalAmountValue = parseFloat(amount) || 0;
    const splitDiff = Math.abs(totalAmountValue - splitSum);
    const isSplitValid = isSplit ? splitDiff < 0.01 : true;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLastUsedDetails({ accountId, cardId, type });
        let success = false;
        
        const commonData = { description, date, accountId, type, cardId: cardId || null };
        const transactionData = { ...commonData, amount: parseFloat(amount), itemId };

        if (isTransfer) {
             const transferAmount = parseFloat(amount);
             const sourceAccId = type === TransactionType.EXPENSE ? accountId : peerAccountId;
             const destAccId = type === TransactionType.EXPENSE ? peerAccountId : accountId;
             const expenseTx: Omit<Transaction, 'id'> = { description: `Transferência para ${accountMap.get(destAccId)}`, amount: transferAmount, date, type: TransactionType.EXPENSE, accountId: sourceAccId, itemId, cardId: (type === TransactionType.EXPENSE && cardId) ? cardId : null };
             const incomeTx: Omit<Transaction, 'id'> = { description: `Transferência de ${accountMap.get(sourceAccId)}`, amount: transferAmount, date, type: TransactionType.INCOME, accountId: destAccId, itemId, cardId: null };
             
             if (editingTransaction) {
                 const partnerTx = transactions.find(t => t.id !== editingTransaction.id && t.date === editingTransaction.date && t.amount === editingTransaction.amount && t.itemId === editingTransaction.itemId && t.type !== editingTransaction.type);
                 const idsToRemove = [editingTransaction.id]; if(partnerTx) idsToRemove.push(partnerTx.id);
                 await deleteTransactions(idsToRemove);
             }
             success = await addTransactions([expenseTx, incomeTx]);
        } 
        else if (type === TransactionType.INCOME && isChange) {
             const saleAmount = parseFloat(amount);
             const paidAmount = parseFloat(amountPaid);
             const changeAmount = paidAmount - saleAmount;
             
             // CORREÇÃO: A entrada principal na conta deve ser o valor pago (ex: 200), não o valor da venda (ex: 180)
             // O "lucro" real da venda será mantido no DRE pelo confronto da Receita (200) com a Despesa do troco (20)
             const newTxs = [{ ...transactionData, amount: paidAmount, type: TransactionType.INCOME, cardId: cardId || null }];
             
             if(changeAmount > 0) {
                 newTxs.push({ 
                     description: `Troco devolvido: ${description}`, 
                     amount: changeAmount, 
                     date, 
                     type: TransactionType.EXPENSE, 
                     accountId: changeAccountId, 
                     itemId: changeItemId, 
                     cardId: null 
                 });
             }
             success = await addTransactions(newTxs);
        }
        else if (editingInstallmentGroup) {
             const groupId = editingInstallmentGroup.installmentGroupId!;
             const idsToRemove = transactions.filter(t => t.installmentGroupId === groupId).map(t => t.id);
             await deleteTransactions(idsToRemove);
             const totalInstallments = parseInt(installmentsCount, 10);
             const originalDate = getUTCDate(date);
             const newTransactions = [];
             for (let i = 0; i < totalInstallments; i++) {
                 const installmentDate = new Date(originalDate); installmentDate.setUTCMonth(originalDate.getUTCMonth() + i);
                 newTransactions.push({ ...commonData, amount: parseFloat(amount), itemId, date: installmentDate.toISOString().split('T')[0], description: `${description} (${i + 1}/${totalInstallments})`, installmentGroupId: groupId, currentInstallment: i + 1, totalInstallments });
             }
             success = await addTransactions(newTransactions);
        } else if (isInstallment && isSplit) {
             const totalInstallments = parseInt(installmentsCount, 10);
             const installmentGroupId = crypto.randomUUID();
             const originalDate = getUTCDate(date);
             const allNewTransactions: any[] = [];
             for (let i = 0; i < totalInstallments; i++) {
                 const installmentDate = new Date(originalDate); installmentDate.setUTCMonth(originalDate.getUTCMonth() + i);
                 splitItems.forEach(item => {
                     allNewTransactions.push({ ...commonData, amount: parseFloat(item.amount), itemId: item.itemId, date: installmentDate.toISOString().split('T')[0], description: `${description} (${i+1}/${totalInstallments}) - ${categoryMap.get(item.itemId)?.item}`, installmentGroupId, currentInstallment: i + 1, totalInstallments });
                 });
             }
             success = await addTransactions(allNewTransactions);
        } else if (isSplit) {
             const finalSplitGroupId = editingSplitGroupId || crypto.randomUUID();
             if (editingSplitGroupId) await deleteTransactions(transactions.filter(t => t.splitGroupId === editingSplitGroupId).map(t => t.id));
             const newTransactions = splitItems.map(item => ({ ...commonData, amount: parseFloat(item.amount), itemId: item.itemId, description: `${description} - ${categoryMap.get(item.itemId)?.item || 'Item'}`, splitGroupId: finalSplitGroupId }));
             success = await addTransactions(newTransactions);
        } else if (isInstallment) {
             const totalInstallments = parseInt(installmentsCount, 10);
             const installmentGroupId = crypto.randomUUID();
             const originalDate = getUTCDate(date);
             const newTransactions = [];
             for(let i = 0; i < totalInstallments; i++) {
                 const installmentDate = new Date(originalDate); installmentDate.setUTCMonth(originalDate.getUTCMonth() + i);
                 newTransactions.push({ ...commonData, amount: parseFloat(amount), itemId, date: installmentDate.toISOString().split('T')[0], description: `${description} (${i + 1}/${totalInstallments})`, installmentGroupId, currentInstallment: i + 1, totalInstallments });
             }
             success = await addTransactions(newTransactions);
        } else {
             if (editingTransaction) success = await updateTransaction({ ...editingTransaction, ...transactionData });
             else success = !!await addTransaction(transactionData);
        }

        if (success) handleClearForm();
    };
    
    const handleConfirmDelete = async (option: 'single' | 'future') => {
        const t = deleteModalState.transaction;
        if (!t) return;
        if (option === 'single') await deleteTransaction(t.id);
        else {
            const group = transactions.filter(tx => tx.installmentGroupId === t.installmentGroupId);
            const toDelete = group.filter(tx => (tx.currentInstallment || 0) >= (t.currentInstallment || 0)).map(tx => tx.id);
            await deleteTransactions(toDelete);
        }
        setDeleteModalState({ isOpen: false, transaction: null });
    };

    const handleDelete = (id: string) => {
        const t = transactions.find(tx => tx.id === id);
        if (t) {
            if (t.installmentGroupId) setDeleteModalState({ isOpen: true, transaction: t });
            else if (t.splitGroupId) {
                if (window.confirm('Esta transação faz parte de um grupo dividido. Deseja excluir todo o grupo?')) {
                     deleteTransactions(transactions.filter(tx => tx.splitGroupId === t.splitGroupId).map(tx => tx.id));
                }
            } else if (window.confirm('Tem certeza que deseja excluir esta transação?')) deleteTransaction(id);
        }
    };

    const handleEdit = (transaction: Transaction) => {
        setEditingTransaction(transaction);
        setType(transaction.type);
        setAccountId(transaction.accountId);
        setCardId(transaction.cardId || '');
        setDate(transaction.date);
        
        if (transaction.installmentGroupId) {
            setEditingInstallmentGroup(transaction);
            setIsInstallment(true);
            setInstallmentsCount(String(transaction.totalInstallments));
            const baseDesc = transaction.description.replace(/\s\(\d+\/\d+\)(\s-\s.*)?$/, '');
            setDescription(baseDesc);
            setAmount(String(transaction.amount));
            setItemId(transaction.itemId || '');
        } else if (transaction.splitGroupId) {
            setEditingSplitGroupId(transaction.splitGroupId);
            setIsSplit(true);
            const group = transactions.filter(t => t.splitGroupId === transaction.splitGroupId);
            setSplitItems(group.map((g, i) => ({ id: i, itemId: g.itemId || '', amount: String(g.amount) })));
            const firstPart = transaction.description.split(' - ')[0]; 
            setDescription(firstPart);
            const total = group.reduce((acc, curr) => acc + curr.amount, 0);
            setAmount(String(total));
            setItemId(''); 
        } else {
            setEditingInstallmentGroup(null);
            setEditingSplitGroupId(null);
            setIsInstallment(false);
            setIsSplit(false);
            setDescription(transaction.description);
            setAmount(String(transaction.amount));
            setItemId(transaction.itemId || '');
        }
        const formElement = document.querySelector('form');
        if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
    };

    const accountOptions = useMemo(() => {
        const options: { value: string; label: string; isCard: boolean }[] = [];
        activeAccounts.forEach(acc => {
            options.push({ value: acc.id, label: acc.name, isCard: false });
            if (acc.cards && acc.cards.length > 0) {
                acc.cards.forEach(card => {
                    options.push({ value: `${acc.id}|${card.id}`, label: `${acc.name} -> ${card.name}`, isCard: true });
                });
            }
        });
        return options;
    }, [activeAccounts]);

    const filterOptions: FilterOption[] = useMemo(() => [
        { label: 'Todas as Contas', value: 'Todos' },
        ...accountOptions.map(opt => ({ label: opt.label, value: opt.value }))
    ], [accountOptions]);

    const currentAccountSelectValue = cardId ? `${accountId}|${cardId}` : accountId;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 xl:col-span-4">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm sticky top-6">
                    <form onSubmit={handleSubmit}>
                        <h2 className="text-xl font-bold text-slate-800 mb-4">{isEditing ? 'Editar Transação' : 'Nova Transação'}</h2>
                        
                        <div className="p-1 bg-slate-100 rounded-lg flex space-x-1 mb-4">
                            <button type="button" onClick={() => { setType(TransactionType.EXPENSE); }} className={`w-full text-center py-2 text-sm font-semibold rounded-md transition-all ${type === TransactionType.EXPENSE ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Saídas</button>
                            <button type="button" onClick={() => { setType(TransactionType.INCOME); setIsInstallment(false); }} className={`w-full text-center py-2 text-sm font-semibold rounded-md transition-all ${type === TransactionType.INCOME ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Entradas</button>
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
                            
                             <div className="flex space-x-6">
                                {type === TransactionType.EXPENSE && (
                                    <div className="flex items-center">
                                        <CustomCheckbox id="installment-check" checked={isInstallment} onChange={e => setIsInstallment(e.target.checked)} disabled={!!editingInstallmentGroup || !!editingSplitGroupId}/>
                                        <label htmlFor="installment-check" className="ml-2 block text-sm text-slate-800 cursor-pointer">Parcelar</label>
                                    </div>
                                )}
                                <div className="flex items-center">
                                    <CustomCheckbox id="split-check" checked={isSplit} onChange={e => { setIsSplit(e.target.checked); if(e.target.checked) setIsChange(false); }} disabled={!!editingTransaction || !!editingInstallmentGroup || isChange}/>
                                    <label htmlFor="split-check" className="ml-2 block text-sm text-slate-800 cursor-pointer">Dividir</label>
                                </div>
                            </div>

                            {isInstallment && type === TransactionType.EXPENSE && (
                                <div>
                                    <label className="text-sm font-medium text-slate-600 mb-1 block">Número de Parcelas</label>
                                    <input type="number" value={installmentsCount} onChange={e => setInstallmentsCount(e.target.value)} required min="2" className="input-style" />
                                </div>
                            )}
                             <div>
                                <label className="text-sm font-medium text-slate-600 mb-1 block">Conta / Cartão</label>
                                <select 
                                    value={currentAccountSelectValue} 
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (val.includes('|')) {
                                            const [accId, cId] = val.split('|');
                                            setAccountId(accId);
                                            setCardId(cId);
                                        } else {
                                            setAccountId(val);
                                            setCardId('');
                                        }
                                    }} 
                                    required 
                                    className="input-style"
                                >
                                    <option value="" disabled>Selecione uma conta...</option>
                                    {accountOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
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
                                    
                                    <div className={`mt-3 p-2 rounded-lg text-sm border flex justify-between items-center ${isSplitValid ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                                        <div>
                                            <span className="font-semibold block">Total Declarado: {formatCurrency(totalAmountValue)}</span>
                                            <span className="block text-xs mt-0.5">Soma dos Itens: {formatCurrency(splitSum)}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-bold block">{isSplitValid ? 'OK' : formatCurrency(Math.abs(splitDiff))}</span>
                                            <span className="text-xs block">{isSplitValid ? 'Igual' : (splitSum > totalAmountValue ? 'Passou' : 'Falta')}</span>
                                        </div>
                                    </div>
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
                             {type === TransactionType.INCOME && !isSplit && (
                                <div className="flex items-center pt-4 border-t border-slate-200 mt-4">
                                    <CustomCheckbox id="change-check" checked={isChange} onChange={e => setIsChange(e.target.checked)} disabled={isEditing}/>
                                    <label htmlFor="change-check" className="ml-2 block text-sm text-slate-800 cursor-pointer">Devolver troco</label>
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
                            <button type="submit" disabled={isSplit && !isSplitValid} className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed">{isEditing ? 'Salvar Alterações' : 'Salvar'}</button>
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
                            options={filterOptions}
                            value={accountFilter}
                            onChange={setAccountFilter}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <FilterDropdown 
                            options={['Este Mês', 'Mês Passado', 'Próximo Mês', 'Este Ano', 'Personalizado'].map(o => ({label: o, value: o}))}
                            value={dateFilter}
                            onChange={handleDateFilterChange}
                        />
                    </div>
                    <div className="md:col-span-4 grid grid-cols-2 gap-2">
                         <FilterDropdown 
                            options={['Todos', 'Entradas', 'Saídas', 'Movimentações'].map(o => ({label: o, value: o}))}
                            value={typeFilter}
                            onChange={setTypeFilter}
                        />
                        <button onClick={() => setInstallmentFilter(s => !s)} className={`btn-secondary w-full h-full flex justify-center items-center px-3 py-2 text-sm font-medium ${installmentFilter ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600'}`}>
                            Parceladas
                        </button>
                    </div>
                </div>
                
                <DateRangePickerModal isOpen={isPickerOpen} onClose={() => setIsPickerOpen(false)} value={customDateRange} onChange={handleCustomDateChange} />
                <DeleteConfirmationModal isOpen={deleteModalState.isOpen} onClose={() => setDeleteModalState({isOpen: false, transaction: null})} onConfirm={handleConfirmDelete} />


                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-sm text-slate-500 font-medium">Receitas no Período</p>
                        <p className="text-2xl font-bold text-green-600"><PrivateValue>{formatCurrency(periodIncome)}</PrivateValue></p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-sm text-slate-500 font-medium">Despesas no Período</p>
                        <p className="text-2xl font-bold text-red-600"><PrivateValue>{formatCurrency(periodExpenses)}</PrivateValue></p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-sm text-slate-500 font-medium">Saldo</p>
                        <p className={`text-2xl font-bold ${periodIncome - periodExpenses >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                            <PrivateValue>{formatCurrency(periodIncome - periodExpenses)}</PrivateValue>
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-slate-500 uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-left w-[110px]">Data</th>
                                    <th className="px-4 py-3 font-semibold text-left min-w-[200px]">Descrição</th>
                                    <th className="px-4 py-3 font-semibold text-left w-[150px]">Conta</th>
                                    <th className="px-4 py-3 font-semibold text-center w-[160px]">Item</th>
                                    <th className="px-4 py-3 font-semibold text-right w-[160px]">Valor</th>
                                    <th className="px-4 py-3 font-semibold text-center w-[100px]">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {paginatedTransactions.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center p-8 text-slate-500">Nenhum lançamento encontrado.</td></tr>
                                ) : (
                                    paginatedTransactions.map(t => {
                                        const categoryInfo = t.itemId ? categoryMap.get(t.itemId) : null;
                                        const accountName = accountMap.get(t.accountId);
                                        const cardName = t.cardId ? cardMap.get(t.cardId) : null;
                                        const displayAccount = cardName ? `${accountName} -> ${cardName}` : accountName;

                                        let displayProps = { color: 'text-slate-800', sign: '' };
                                        if (t.type === TransactionType.INCOME) {
                                            displayProps = { color: 'text-green-600', sign: '+ ' };
                                        } else if (t.type === TransactionType.EXPENSE) {
                                            displayProps = { color: 'text-red-600', sign: '- ' };
                                        } else if (t.type === TransactionType.TRANSFER) {
                                            if (accountFilter !== 'Todos') {
                                                const viewingId = accountFilter.includes('|') ? accountFilter.split('|')[0] : accountFilter;
                                                const isCardView = accountFilter.includes('|');
                                                
                                                if (isCardView) {
                                                    const viewingCardId = accountFilter.split('|')[1];
                                                    // Na visão do cartão, o pagamento de fatura é uma "entrada" de crédito.
                                                    if (t.cardId === viewingCardId && t.destinationAccountId === viewingId) {
                                                        displayProps = { color: 'text-green-600', sign: '+ ' };
                                                    } else {
                                                        displayProps = { color: 'text-red-600', sign: '- ' };
                                                    }
                                                } else {
                                                    if (t.accountId === viewingId) displayProps = { color: 'text-red-600', sign: '- ' };
                                                    else if (t.destinationAccountId === viewingId) displayProps = { color: 'text-green-600', sign: '+ ' };
                                                }
                                            } else {
                                                displayProps = { color: 'text-slate-500', sign: '' };
                                            }
                                        }

                                        return (
                                        <tr key={t.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(t.date)}</td>
                                            <td className="px-4 py-3 text-slate-800 font-medium truncate max-w-xs" title={t.description}>{t.description}</td>
                                            <td className="px-4 py-3 text-slate-600 whitespace-nowrap truncate max-w-[150px]" title={displayAccount}>{displayAccount}</td>
                                            <td className="px-4 py-3 text-center align-middle">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${categoryInfo ? (categoryColors[categoryInfo.cat] || defaultCategoryColor) : defaultCategoryColor}`}>
                                                    {categoryInfo?.item || 'N/A'}
                                                </span>
                                            </td>
                                            <td className={`px-4 py-3 text-right font-bold ${displayProps.color} whitespace-nowrap tabular-nums min-w-[140px]`}>
                                                <PrivateValue className="inline-block">{displayProps.sign}{formatCurrency(t.amount)}</PrivateValue>
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
