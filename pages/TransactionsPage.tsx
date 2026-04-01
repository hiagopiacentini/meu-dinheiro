import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTransactions, useAccounts, useCategories, useLoans } from '../hooks/useFirestore';
import { Transaction, Account, Category, TransactionType, Loan, CategoryItem } from '../types';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import SearchIcon from '../components/icons/SearchIcon';
import DateRangePickerModal from '../components/DateRangePickerModal';
import ImportTransactionsModal from '../components/ImportTransactionsModal';
import PlusIcon from '../components/icons/PlusIcon';
import UploadIcon from '../components/icons/UploadIcon';
import DownloadIcon from '../components/icons/DownloadIcon';
import SparklesIcon from '../components/icons/SparklesIcon';
import XIcon from '../components/icons/XIcon';
import ChevronLeftIcon from '../components/icons/ChevronLeftIcon';
import ChevronRightIcon from '../components/icons/ChevronRightIcon';
import ChevronDownIcon from '../components/icons/ChevronDownIcon';
import PrivateValue from '../components/PrivateValue';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const getTodayLocalDate = () => {
    return toISODateString(new Date());
};

const toISODateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
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

const EditChoiceModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onChoice: (mode: 'single' | 'group') => void;
    transaction: Transaction | null;
}> = ({ isOpen, onClose, onChoice, transaction }) => {
    if (!isOpen || !transaction) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-slate-800">Como deseja editar?</h2>
                <p className="text-slate-600 mb-6 mt-2">
                    Este lançamento é a parcela <span className="font-bold">{transaction.currentInstallment}/{transaction.totalInstallments}</span> do grupo <span className="font-bold">"{transaction.description.split(' (')[0]}"</span>.
                </p>
                <div className="flex flex-col space-y-3">
                    <button 
                        onClick={() => onChoice('single')} 
                        className="btn-secondary w-full py-3 border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                        Editar APENAS esta parcela
                    </button>
                    <button 
                        onClick={() => onChoice('group')} 
                        className="btn-secondary w-full py-3"
                    >
                        Editar TODO o parcelamento (Geral)
                    </button>
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
        className="appearance-none h-5 w-5 border-2 border-slate-300 rounded bg-white checked:bg-blue-600 checked:border-blue-600 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer transition-all relative"
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
    
    const [lastUsedDetails, setLastUsedDetails] = useState({ accountId: '', cardId: '', type: TransactionType.EXPENSE });
    const [accountFilter, setAccountFilter] = useState('Todos');
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [editingInstallmentGroup, setEditingInstallmentGroup] = useState<Transaction | null>(null);
    const [editingSplitGroupId, setEditingSplitGroupId] = useState<string | null>(null); 
    const [editingLinkedGroupId, setEditingLinkedGroupId] = useState<string | null>(null);
    const [isEditingSingleParcel, setIsEditingSingleParcel] = useState(false);

    const [type, setType] = useState<TransactionType>(lastUsedDetails.type);
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(getTodayLocalDate());
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
    const [changeDate, setChangeDate] = useState(getTodayLocalDate());
    
    const [isDeduction, setIsDeduction] = useState(false);
    const [deductionAmount, setDeductionAmount] = useState('');
    const [deductionItemId, setDeductionItemId] = useState('');
    const [deductionAccountId, setDeductionAccountId] = useState('');
    const [deductionCardId, setDeductionCardId] = useState('');
    
    const [isRebate, setIsRebate] = useState(false);
    const [rebateAmount, setRebateAmount] = useState('');
    const [rebateItemId, setRebateItemId] = useState('');
    const [rebateAccountId, setRebateAccountId] = useState('');
    const [rebateCardId, setRebateCardId] = useState('');

    const [peerAccountId, setPeerAccountId] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [dateFilter, setDateFilter] = useState('Este Mês');
    const [typeFilter, setTypeFilter] = useState('Todos');
    const [installmentFilter, setInstallmentFilter] = useState(false);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [customDateRange, setCustomDateRange] = useState<{start: Date | null, end: Date | null}>({ start: null, end: null });

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [deleteModalState, setDeleteModalState] = useState<{ isOpen: boolean, transaction: Transaction | null }>({ isOpen: false, transaction: null });
    const [editChoiceModal, setEditChoiceModal] = useState<{ isOpen: boolean, transaction: Transaction | null }>({ isOpen: false, transaction: null });
    
    const descriptionInputRef = useRef<HTMLInputElement>(null);

    const activeAccounts = useMemo(() => accounts.filter(a => a.isActive), [accounts]);
    const isEditing = !!editingTransaction || !!editingInstallmentGroup || !!editingSplitGroupId || !!editingLinkedGroupId;
    const maxDate = '9999-12-31';

    const handleClearForm = useCallback(() => {
        setEditingTransaction(null);
        setEditingInstallmentGroup(null);
        setEditingSplitGroupId(null);
        setEditingLinkedGroupId(null);
        setIsEditingSingleParcel(false);
        setType(lastUsedDetails.type);
        setDescription('');
        setAmount('');
        const today = getTodayLocalDate();
        setDate(today);
        setChangeDate(today);
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
        setIsDeduction(false);
        setDeductionAmount('');
        setDeductionItemId('');
        setDeductionAccountId('');
        setDeductionCardId('');
        setIsRebate(false);
        setRebateAmount('');
        setRebateItemId('');
        setRebateAccountId('');
        setRebateCardId('');
        setPeerAccountId('');
    }, [activeAccounts, lastUsedDetails, accountFilter]);

    useEffect(() => {
        if (addTransactionTrigger > 0) handleClearForm();
    }, [addTransactionTrigger, handleClearForm]);

    useEffect(() => {
        if (!editingTransaction && !editingInstallmentGroup && !editingSplitGroupId && !editingLinkedGroupId && accountFilter !== 'Todos') {
            if (accountFilter.includes('|')) {
                const [accId, cId] = accountFilter.split('|');
                setAccountId(accId);
                setCardId(cId);
            } else {
                setAccountId(accountFilter);
                setCardId('');
            }
        }
    }, [accountFilter, editingTransaction, editingInstallmentGroup, editingSplitGroupId, editingLinkedGroupId]);

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
        const map = new Map<string, { item: string, sub: string, l: string, cat: string, catType: TransactionType }>();
        categories.forEach(cat => {
            cat.subcategories.forEach(sub => {
                sub.items.forEach(item => {
                    map.set(item.id, { item: item.name, sub: sub.name, l: cat.name, cat: cat.name, catType: cat.type });
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
        categories.forEach(cat => {
            const isCatArchived = !!cat.isArchived;
            cat.subcategories.forEach(sub => {
                const isSubArchived = isCatArchived || !!sub.isArchived;
                sub.items.forEach(item => {
                    const isItemArchived = isSubArchived || !!item.isArchived;
                    
                    // Mostra item se: 
                    // 1. Não está arquivado
                    // 2. OU se é o item atualmente selecionado em uma edição (para não quebrar o formulário)
                    if (cat.type === type && (!isItemArchived || item.id === itemId)) {
                        options.push({ id: item.id, name: item.name, subName: sub.name, catName: cat.name });
                    }
                });
            });
        });
        return options.sort((a,b) => a.catName.localeCompare(b.catName) || a.subName.localeCompare(b.subName) || a.name.localeCompare(b.name));
    }, [categories, type, itemId]);

    const expenseCategoryOptions = useMemo(() => {
         const options: { id: string, name: string, subName: string, catName: string }[] = [];
         categories.filter(c => c.type === TransactionType.EXPENSE).forEach(cat => {
            const isCatArchived = !!cat.isArchived;
            cat.subcategories.forEach(sub => {
                const isSubArchived = isCatArchived || !!sub.isArchived;
                sub.items.forEach(item => {
                     const isItemArchived = isSubArchived || !!item.isArchived;
                     if (!isItemArchived || item.id === deductionItemId || item.id === changeItemId) {
                        options.push({ id: item.id, name: item.name, subName: sub.name, catName: cat.name });
                     }
                });
            });
         });
         return options.sort((a,b) => a.catName.localeCompare(b.catName) || a.subName.localeCompare(b.subName) || a.name.localeCompare(b.name));
    }, [categories, deductionItemId, changeItemId]);

    const incomeCategoryOptions = useMemo(() => {
        const options: { id: string, name: string, subName: string, catName: string }[] = [];
        categories.filter(c => c.type === TransactionType.INCOME).forEach(cat => {
           const isCatArchived = !!cat.isArchived;
           cat.subcategories.forEach(sub => {
               const isSubArchived = isCatArchived || !!sub.isArchived;
               sub.items.forEach(item => {
                    const isItemArchived = isSubArchived || !!item.isArchived;
                    if (!isItemArchived || item.id === rebateItemId) {
                        options.push({ id: item.id, name: item.name, subName: sub.name, catName: cat.name });
                    }
               });
           });
        });
        return options.sort((a,b) => a.catName.localeCompare(b.catName) || a.subName.localeCompare(b.subName) || a.name.localeCompare(b.name));
   }, [categories, rebateItemId]);

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
        if (value === 'Personalizado') setIsPickerOpen(true);
    };
    
    const handleCustomDateChange = (range: { start: Date | null, end: Date | null }) => setCustomDateRange(range);
    
    const handleExportCSV = () => {
        const headers = ['Data', 'Descrição', 'Conta', 'Cartão', 'Item', 'Valor', 'Tipo', 'Parcela'];
        const rows = filteredTransactions.map(t => {
            const categoryInfo = t.itemId ? categoryMap.get(t.itemId) : null;
            const accountName = accountMap.get(t.accountId) || '';
            const cardName = t.cardId ? cardMap.get(t.cardId) : '';
            const itemName = categoryInfo ? `${categoryInfo.category} > ${categoryInfo.item}` : '';
            const installment = t.totalInstallments ? `${t.currentInstallment}/${t.totalInstallments}` : '';
            
            return [
                formatDate(t.date),
                t.description,
                accountName,
                cardName,
                itemName,
                t.amount.toString().replace('.', ','),
                t.type,
                installment
            ];
        });

        const csvContent = [
            headers.join(';'),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
        ].join('\n');

        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `lancamentos_${toISODateString(new Date())}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDescriptionBlur = () => {
        if (!description.trim() || isSplit) return;
        const lastTransactionWithDescription = [...transactions].reverse().find(t => t.description.toLowerCase() === description.toLowerCase());
        if (lastTransactionWithDescription && lastTransactionWithDescription.itemId) setItemId(lastTransactionWithDescription.itemId);
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
                    if (t.cardId) return false;
                    return true;
                });
            }
        }

        if (installmentFilter) items = items.filter(t => !!t.installmentGroupId);

        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            const normalizedSearchTerm = lowerSearchTerm.replace(',', '.');
            items = items.filter(t => t.description.toLowerCase().includes(lowerSearchTerm) || t.amount.toFixed(2).includes(normalizedSearchTerm));
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

    const splitSum = useMemo(() => splitItems.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0), [splitItems]);
    const totalAmountValue = parseFloat(amount) || 0;
    const splitDiff = Math.abs(totalAmountValue - splitSum);
    const isSplitValid = isSplit ? splitDiff < 0.01 : true;

    const safeAddMonths = (date: Date, months: number) => {
        const d = new Date(date);
        const day = d.getUTCDate();
        d.setUTCMonth(d.getUTCMonth() + months);
        if (d.getUTCDate() !== day) {
            d.setUTCDate(0); // Ajusta para o último dia do mês anterior se houver rollover (ex: 31 Jan -> 3 Mar vira 28/29 Fev)
        }
        return d;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLastUsedDetails({ accountId, cardId, type });
        let success = false;
        const commonData = { description, date, accountId, type, cardId: cardId || null };
        const transactionData = { ...commonData, amount: parseFloat(amount), itemId };

        if (isTransfer) {
             const transferAmount = parseFloat(amount);
             const isMainAccountSource = type === TransactionType.EXPENSE;
             
             const sourceAccId = isMainAccountSource ? accountId : peerAccountId;
             const sourceCardId = isMainAccountSource ? cardId : null;
             
             const destAccId = isMainAccountSource ? peerAccountId : accountId;
             const destCardId = isMainAccountSource ? null : cardId;

             const expenseTx: Omit<Transaction, 'id'> = { 
                 description: `Transferência para ${accountMap.get(destAccId)}`, 
                 amount: transferAmount, 
                 date, 
                 type: TransactionType.EXPENSE, 
                 accountId: sourceAccId, 
                 itemId, 
                 cardId: sourceCardId || null 
             };
             const incomeTx: Omit<Transaction, 'id'> = { 
                 description: `Transferência de ${accountMap.get(sourceAccId)}`, 
                 amount: transferAmount, 
                 date, 
                 type: TransactionType.INCOME, 
                 accountId: destAccId, 
                 itemId, 
                 cardId: destCardId || null 
             };

             if (editingTransaction) {
                 const partnerTx = transactions.find(t => t.id !== editingTransaction.id && t.date === editingTransaction.date && t.amount === editingTransaction.amount && t.itemId === editingTransaction.itemId && t.type !== editingTransaction.type);
                 const idsToRemove = [editingTransaction.id]; if(partnerTx) idsToRemove.push(partnerTx.id);
                 await deleteTransactions(idsToRemove);
             }
             success = await addTransactions([expenseTx, incomeTx]);
        } else if (type === TransactionType.INCOME && isChange) {
             if (editingTransaction) await deleteTransaction(editingTransaction.id);
             
             const productValue = parseFloat(amount);
             const totalPaid = parseFloat(amountPaid);
             const changeValue = totalPaid - productValue;

             const newTxs: Omit<Transaction, 'id'>[] = [
                 { ...transactionData, amount: productValue, type: TransactionType.INCOME, description: `${description} (Venda)`, cardId: cardId || null },
             ];

             if (changeValue > 0) {
                 newTxs.push({ 
                    description: `Troco recebido (Ref: ${description})`, 
                    amount: changeValue, 
                    date, 
                    type: TransactionType.INCOME, 
                    accountId: accountId, 
                    itemId: changeItemId, 
                    cardId: cardId || null 
                 });
                 newTxs.push({ 
                    description: `Troco devolvido (Ref: ${description})`, 
                    amount: changeValue, 
                    date: changeDate, 
                    type: TransactionType.EXPENSE, 
                    accountId: changeAccountId, 
                    itemId: changeItemId, 
                    cardId: null 
                 });
             }
             success = await addTransactions(newTxs);
        } else if (type === TransactionType.INCOME && isDeduction) {
             const groupToClean = editingLinkedGroupId || (editingTransaction?.linkedGroupId);
             if (groupToClean) {
                 await deleteTransactions(transactions.filter(t => t.linkedGroupId === groupToClean).map(t => t.id));
             } else if (editingTransaction) {
                 await deleteTransaction(editingTransaction.id);
             }

             const finalLinkedGroupId = editingLinkedGroupId || crypto.randomUUID();
             const grossAmount = parseFloat(amount);
             const deductVal = parseFloat(deductionAmount);
             const newTxs = [
                 { ...transactionData, amount: grossAmount, type: TransactionType.INCOME, cardId: cardId || null, linkedGroupId: finalLinkedGroupId },
                 { 
                     description: `Desconto/Consumo: ${description}`, 
                     amount: deductVal, 
                     date, 
                     type: TransactionType.EXPENSE, 
                     accountId: deductionAccountId || accountId, 
                     itemId: deductionItemId, 
                     cardId: deductionCardId || (deductionAccountId ? null : cardId), 
                     linkedGroupId: finalLinkedGroupId 
                 }
             ];
             success = await addTransactions(newTxs);
        } else if (type === TransactionType.EXPENSE && isRebate && isSplit) {
             // NOVO: LÓGICA DE SPLIT + REBATE
             const groupToClean = editingLinkedGroupId || (editingTransaction?.linkedGroupId);
             if (groupToClean) {
                 await deleteTransactions(transactions.filter(t => t.linkedGroupId === groupToClean).map(t => t.id));
             } else if (editingTransaction) {
                 await deleteTransaction(editingTransaction.id);
             }

             const finalLinkedGroupId = editingLinkedGroupId || crypto.randomUUID();
             const rebateVal = parseFloat(rebateAmount);

             const newTxs: Omit<Transaction, 'id'>[] = splitItems.map(item => ({
                 ...commonData,
                 amount: parseFloat(item.amount),
                 itemId: item.itemId,
                 description: `${description} - ${categoryMap.get(item.itemId)?.item || 'Item'}`,
                 linkedGroupId: finalLinkedGroupId
             }));

             newTxs.push({
                 description: `Abatimento/Crédito: ${description}`,
                 amount: rebateVal,
                 date,
                 type: TransactionType.INCOME,
                 accountId: rebateAccountId || accountId,
                 itemId: rebateItemId,
                 cardId: rebateCardId || (rebateAccountId ? null : cardId),
                 linkedGroupId: finalLinkedGroupId
             });

             success = await addTransactions(newTxs);
        } else if (type === TransactionType.EXPENSE && isRebate) {
             const groupToClean = editingLinkedGroupId || (editingTransaction?.linkedGroupId);
             if (groupToClean) {
                 await deleteTransactions(transactions.filter(t => t.linkedGroupId === groupToClean).map(t => t.id));
             } else if (editingTransaction) {
                 await deleteTransaction(editingTransaction.id);
             }

             const finalLinkedGroupId = editingLinkedGroupId || crypto.randomUUID();
             const grossExpense = parseFloat(amount);
             const rebateVal = parseFloat(rebateAmount);
             const newTxs = [
                 { ...transactionData, amount: grossExpense, type: TransactionType.EXPENSE, cardId: cardId || null, linkedGroupId: finalLinkedGroupId },
                 { 
                     description: `Abatimento/Crédito: ${description}`, 
                     amount: rebateVal, 
                     date, 
                     type: TransactionType.INCOME, 
                     accountId: rebateAccountId || accountId, 
                     itemId: rebateItemId, 
                     cardId: rebateCardId || (rebateAccountId ? null : cardId), 
                     linkedGroupId: finalLinkedGroupId 
                 }
             ];
             success = await addTransactions(newTxs);
        } else if (editingInstallmentGroup) {
             const groupId = editingInstallmentGroup.installmentGroupId!;
             await deleteTransactions(transactions.filter(t => t.installmentGroupId === groupId).map(t => t.id));
             const totalInstallments = parseInt(installmentsCount, 10);
             const originalDate = getUTCDate(date);
             const newTransactions = [];
             for (let i = 0; i < totalInstallments; i++) {
                 const installmentDate = safeAddMonths(originalDate, i);
                 newTransactions.push({ ...commonData, amount: parseFloat(amount), itemId, date: toISODateString(installmentDate), description: `${description} (${i + 1}/${totalInstallments})`, installmentGroupId: groupId, currentInstallment: i + 1, totalInstallments });
             }
             success = await addTransactions(newTransactions);
        } else if (isInstallment && isSplit) {
             const totalInstallments = parseInt(installmentsCount, 10);
             const installmentGroupId = crypto.randomUUID();
             const originalDate = getUTCDate(date);
             const allNewTransactions: any[] = [];
             for (let i = 0; i < totalInstallments; i++) {
                 const installmentDate = safeAddMonths(originalDate, i);
                 splitItems.forEach(item => {
                     allNewTransactions.push({ ...commonData, amount: parseFloat(item.amount), itemId: item.itemId, date: toISODateString(installmentDate), description: `${description} (${i+1}/${totalInstallments}) - ${categoryMap.get(item.itemId)?.item}`, installmentGroupId, currentInstallment: i + 1, totalInstallments });
                 });
             }
             success = await addTransactions(allNewTransactions);
        } else if (isSplit) {
             if (editingTransaction && !editingSplitGroupId) await deleteTransaction(editingTransaction.id);
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
                 const installmentDate = safeAddMonths(originalDate, i);
                 newTransactions.push({ ...commonData, amount: parseFloat(amount), itemId, date: toISODateString(installmentDate), description: `${description} (${i + 1}/${totalInstallments})`, installmentGroupId, currentInstallment: i + 1, totalInstallments });
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
        else await deleteTransactions(transactions.filter(tx => tx.installmentGroupId === t.installmentGroupId && (tx.currentInstallment || 0) >= (t.currentInstallment || 0)).map(tx => tx.id));
        setDeleteModalState({ isOpen: false, transaction: null });
    };

    const handleEdit = (transaction: Transaction) => {
        if (transaction.installmentGroupId) {
            setEditChoiceModal({ isOpen: true, transaction });
        } else {
            processEdit(transaction, 'single');
        }
    };

    const processEdit = (transaction: Transaction, mode: 'single' | 'group') => {
        setEditingTransaction(transaction);
        setType(transaction.type);
        setAccountId(transaction.accountId);
        setCardId(transaction.cardId || '');
        setDate(transaction.date);
        
        if (transaction.linkedGroupId) {
            const linkedGroup = transactions.filter(t => t.linkedGroupId === transaction.linkedGroupId);
            if (linkedGroup.length >= 2) {
                setEditingLinkedGroupId(transaction.linkedGroupId);
                setIsEditingSingleParcel(false);
                
                const incomePart = linkedGroup.find(t => t.type === TransactionType.INCOME);
                const expenseParts = linkedGroup.filter(t => t.type === TransactionType.EXPENSE);

                if (incomePart && expenseParts.length > 0) {
                    // Detecção de Rebate
                    if (expenseParts.length > 1) {
                        // Foi um Split + Rebate
                        setType(TransactionType.EXPENSE);
                        setIsRebate(true);
                        setIsSplit(true);
                        setDescription(expenseParts[0].description.split(' - ')[0]);
                        setAmount(String(expenseParts.reduce((acc, curr) => acc + curr.amount, 0)));
                        setSplitItems(expenseParts.map((t, i) => ({ id: i, itemId: t.itemId || '', amount: String(t.amount) })));
                        setRebateAmount(String(incomePart.amount));
                        setRebateItemId(incomePart.itemId || '');
                        setRebateAccountId(incomePart.accountId);
                        setRebateCardId(incomePart.cardId || '');
                    }
                    else if (incomePart.linkedGroupId && incomePart.amount >= expenseParts[0].amount && !expenseParts[0].description.includes('Abatimento')) {
                        // Deduction (Income side)
                        setType(TransactionType.INCOME);
                        setIsDeduction(true);
                        setIsRebate(false);
                        setDescription(incomePart.description);
                        setAmount(String(incomePart.amount));
                        setItemId(incomePart.itemId || '');
                        setDeductionAmount(String(expenseParts[0].amount));
                        setDeductionItemId(expenseParts[0].itemId || '');
                        setDeductionAccountId(expenseParts[0].accountId);
                        setDeductionCardId(expenseParts[0].cardId || '');
                    } 
                    else {
                        // Simple Rebate
                        setType(TransactionType.EXPENSE);
                        setIsRebate(true);
                        setIsDeduction(false);
                        setDescription(expenseParts[0].description);
                        setAmount(String(expenseParts[0].amount));
                        setItemId(expenseParts[0].itemId || '');
                        setRebateAmount(String(incomePart.amount));
                        setRebateItemId(incomePart.itemId || '');
                        setRebateAccountId(incomePart.accountId);
                        setRebateCardId(incomePart.cardId || '');
                    }
                }
                setEditChoiceModal({ isOpen: false, transaction: null });
                document.querySelector('form')?.scrollIntoView({ behavior: 'smooth' });
                return;
            }
        }

        if (mode === 'group' && transaction.installmentGroupId) {
            setEditingInstallmentGroup(transaction); 
            setIsInstallment(true); 
            setIsEditingSingleParcel(false);
            setInstallmentsCount(String(transaction.totalInstallments));
            setDescription(transaction.description.replace(/\s\(\d+\/\d+\)(\s-\s.*)?$/, '')); 
            setAmount(String(transaction.amount)); 
            setItemId(transaction.itemId || '');
        } else if (transaction.splitGroupId) {
            setEditingSplitGroupId(transaction.splitGroupId); 
            setIsSplit(true);
            setIsEditingSingleParcel(false);
            const group = transactions.filter(t => t.splitGroupId === transaction.splitGroupId);
            setSplitItems(group.map((g, i) => ({ id: i, itemId: g.itemId || '', amount: String(g.amount) })));
            setDescription(transaction.description.split(' - ')[0]); 
            setAmount(String(group.reduce((acc, curr) => acc + curr.amount, 0))); 
            setItemId(''); 
        } else {
            setEditingInstallmentGroup(null); 
            setEditingSplitGroupId(null); 
            setIsInstallment(false); 
            setIsSplit(false);
            setIsEditingSingleParcel(!!transaction.installmentGroupId); 
            setDescription(transaction.description); 
            setAmount(String(transaction.amount)); 
            setItemId(transaction.itemId || '');
        }
        
        setEditChoiceModal({ isOpen: false, transaction: null });
        document.querySelector('form')?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleDelete = (id: string) => {
        const t = transactions.find(tx => tx.id === id);
        if (t) {
            if (t.linkedGroupId) {
                if (window.confirm('Este lançamento possui um desconto/abatimento vinculado. Deseja excluir todo o grupo?')) {
                    deleteTransactions(transactions.filter(tx => tx.linkedGroupId === t.linkedGroupId).map(tx => tx.id));
                }
            }
            else if (t.installmentGroupId) setDeleteModalState({ isOpen: true, transaction: t });
            else if (t.splitGroupId) { if (window.confirm('Esta transação faz parte de um grupo dividido. Deseja excluir todo o grupo?')) deleteTransactions(transactions.filter(tx => tx.splitGroupId === t.splitGroupId).map(tx => tx.id)); }
            else if (window.confirm('Tem certeza que deseja excluir esta transação?')) deleteTransaction(id);
        }
    };

    const accountOptions = useMemo(() => {
        const options: { value: string; label: string; isCard: boolean }[] = [];
        activeAccounts.forEach(acc => {
            options.push({ value: acc.id, label: acc.name, isCard: false });
            if (acc.cards) acc.cards.forEach(card => options.push({ value: `${acc.id}|${card.id}`, label: `${acc.name} -> ${card.name}`, isCard: true }));
        });
        return options;
    }, [activeAccounts]);

    const filterOptions: FilterOption[] = useMemo(() => [{ label: 'Todas as Contas', value: 'Todos' }, ...accountOptions.map(opt => ({ label: opt.label, value: opt.value }))], [accountOptions]);
    const currentAccountSelectValue = cardId ? `${accountId}|${cardId}` : accountId;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 xl:col-span-4">
                <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm sticky top-6">
                    <form onSubmit={handleSubmit}>
                        <h2 className="text-xl font-bold text-slate-800 mb-4">
                            {isEditing ? (isEditingSingleParcel ? 'Editar Parcela' : 'Editar Transação') : 'Nova Transação'}
                        </h2>
                        <div className="p-1 bg-slate-100 rounded-lg flex space-x-1 mb-4">
                            <button type="button" onClick={() => { setType(TransactionType.EXPENSE); setIsChange(false); setIsDeduction(false); }} className={`w-full text-center py-2 text-sm font-semibold rounded-md transition-all ${type === TransactionType.EXPENSE ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Saídas</button>
                            <button type="button" onClick={() => { setType(TransactionType.INCOME) ; setIsInstallment(false) ; setIsDeduction(false) ; }} className={`w-full text-center py-2 text-sm font-semibold rounded-md transition-all ${type === TransactionType.INCOME ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Entradas</button>
                        </div>
                        <div className="space-y-4 max-h-[calc(100vh-22rem)] overflow-y-auto pr-2">
                            <div>
                                <label className="text-sm font-medium text-slate-600 mb-1 block">
                                    {(type === TransactionType.INCOME && isDeduction) ? 'Descrição (Receita Bruta)' : (type === TransactionType.EXPENSE && isRebate) ? 'Descrição (Despesa Bruta)' : (type === TransactionType.INCOME && isChange) ? 'Descrição do Produto' : 'Descrição'}
                                </label>
                                <input ref={descriptionInputRef} type="text" value={description} onChange={e => setDescription(e.target.value)} onBlur={handleDescriptionBlur} required className="input-style" placeholder="Ex: Pagamento dívida Pai" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-600 mb-1 block">{(isDeduction || isRebate || (type === TransactionType.INCOME && isChange)) ? 'Valor Bruto' : isInstallment ? 'Valor da Parcela' : isSplit ? 'Valor Bruto Total' : 'Valor'}</label>
                                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required={!isSplit} step="0.01" min="0" className="input-style" placeholder="R$ 0,00" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-600 mb-1 block">Data {isInstallment ? 'da 1ª Parcela' : ''}</label>
                                    <input type="date" value={date} onChange={e => { setDate(e.target.value); if(!isEditing) setChangeDate(e.target.value); }} required className="input-style" max={maxDate} />
                                </div>
                            </div>
                             <div className="flex flex-wrap gap-x-6 gap-y-2">
                                {type === TransactionType.EXPENSE && (
                                    <>
                                        <div className="flex items-center">
                                            <CustomCheckbox id="installment-check" checked={isInstallment} onChange={e => setIsInstallment(e.target.checked)} disabled={!!editingInstallmentGroup || !!editingSplitGroupId || isEditingSingleParcel || !!editingLinkedGroupId}/>
                                            <label htmlFor="installment-check" className={`ml-2 block text-sm cursor-pointer ${(isEditingSingleParcel || !!editingLinkedGroupId) ? 'text-slate-400' : 'text-slate-800'}`}>Parcelar</label>
                                        </div>
                                        <div className="flex items-center">
                                            <CustomCheckbox id="rebate-check" checked={isRebate} onChange={e => setIsRebate(e.target.checked)} disabled={!!editingInstallmentGroup || isEditingSingleParcel}/>
                                            <label htmlFor="rebate-check" className={`ml-2 block text-sm cursor-pointer ${isEditingSingleParcel ? 'text-slate-400' : 'text-slate-800'}`}>Houve abatimento</label>
                                        </div>
                                    </>
                                )}
                                <div className="flex items-center">
                                    <CustomCheckbox id="split-check" checked={isSplit} onChange={e => { setIsSplit(e.target.checked); if(e.target.checked) { setIsChange(false); setIsDeduction(false); } }} disabled={!!editingInstallmentGroup || isChange || isDeduction || isEditingSingleParcel}/>
                                    <label htmlFor="split-check" className={`ml-2 block text-sm cursor-pointer ${(isEditingSingleParcel || !!editingLinkedGroupId) ? 'text-slate-400' : 'text-slate-800'}`}>Dividir</label>
                                </div>
                                {type === TransactionType.INCOME && !isSplit && (
                                    <div className="flex items-center">
                                        <CustomCheckbox id="deduction-check" checked={isDeduction} onChange={e => { setIsDeduction(e.target.checked); if(e.target.checked) setIsChange(false); }} disabled={!!editingInstallmentGroup || !!editingSplitGroupId || isEditingSingleParcel}/>
                                        <label htmlFor="deduction-check" className={`ml-2 block text-sm cursor-pointer ${isEditingSingleParcel ? 'text-slate-400' : 'text-slate-800'}`}>Houve descontos</label>
                                    </div>
                                )}
                            </div>
                            {isInstallment && type === TransactionType.EXPENSE && (
                                <div>
                                    <label className="text-sm font-medium text-slate-600 mb-1 block">Número de Parcelas</label>
                                    <input type="number" value={installmentsCount} onChange={e => setInstallmentsCount(e.target.value)} required min="2" className="input-style" />
                                </div>
                            )}
                             <div>
                                <label className="text-sm font-medium text-slate-600 mb-1 block">Conta / Cartão</label>
                                <select value={currentAccountSelectValue} onChange={e => { const val = e.target.value; if (val.includes('|')) { const [accId, cId] = val.split('|'); setAccountId(accId); setCardId(cId); } else { setAccountId(val); setCardId(''); } }} required className="input-style">
                                    <option value="" disabled>Selecione uma conta...</option>
                                    {accountOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
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
                                        <div><span className="font-semibold block">Total Declarado: {formatCurrency(totalAmountValue)}</span><span className="block text-xs mt-0.5">Soma dos Itens: {formatCurrency(splitSum)}</span></div>
                                        <div className="text-right"><span className="font-bold block">{isSplitValid ? 'OK' : formatCurrency(Math.abs(splitDiff))}</span><span className="text-xs block">{isSplitValid ? 'Igual' : (splitSum > totalAmountValue ? 'Passou' : 'Falta')}</span></div>
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
                                    <label className="text-sm font-medium text-slate-600 mb-1 block">{type === TransactionType.EXPENSE ? 'Conta de Destino' : 'Conta de Origem'}</label>
                                    <select value={peerAccountId} onChange={e => setPeerAccountId(e.target.value)} required className="input-style">
                                        <option value="" disabled>Selecione a outra conta...</option>
                                        {activeAccounts.filter(acc => {
                                            if (cardId) return true;
                                            return acc.id !== accountId;
                                        }).map(acc => (
                                            <option key={acc.id} value={acc.id}>
                                                {acc.name} {acc.id === accountId ? '(Conta Bancária)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                             {type === TransactionType.INCOME && isDeduction && (
                                <div className="space-y-4 p-4 bg-amber-50 rounded-xl border border-amber-200 mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Descontos / Consumo Interno</h3>
                                    <div>
                                        <label className="text-sm font-medium text-amber-700 mb-1 block">Valor do Desconto</label>
                                        <input type="number" value={deductionAmount} onChange={e => setDeductionAmount(e.target.value)} required step="0.01" min="0" max={amount || '0'} className="input-style border-amber-300 focus:ring-amber-500" placeholder="R$ 0,00" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-amber-700 mb-1 block">Categoria do Desconto</label>
                                        <select value={deductionItemId} onChange={e => setDeductionItemId(e.target.value)} required className="input-style border-amber-300 focus:ring-amber-500">
                                            <option value="" disabled>Selecione uma categoria...</option>
                                            {expenseCategoryOptions.map(opt => <option key={opt.id} value={opt.id}>{`${opt.catName} > ${opt.subName} > ${opt.name}`}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-amber-700 mb-1 block">Conta do Desconto</label>
                                        <select 
                                            value={deductionCardId ? `${deductionAccountId}|${deductionCardId}` : deductionAccountId} 
                                            onChange={e => { 
                                                const val = e.target.value; 
                                                if (val.includes('|')) { 
                                                    const [accId, cId] = val.split('|'); 
                                                    setDeductionAccountId(accId); 
                                                    setDeductionCardId(cId); 
                                                } else { 
                                                    setDeductionAccountId(val); 
                                                    setDeductionCardId(''); 
                                                } 
                                            }} 
                                            className="input-style border-amber-300 focus:ring-amber-500"
                                        >
                                            <option value="">Mesma conta da transação principal</option>
                                            {accountOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="pt-2 border-t border-amber-200 flex justify-between items-center">
                                        <span className="text-sm font-medium text-amber-900">Líquido a receber:</span>
                                        <span className="text-lg font-bold text-amber-900">
                                            <PrivateValue>{formatCurrency(Math.max(0, parseFloat(amount || '0') - parseFloat(deductionAmount || '0')))}</PrivateValue>
                                        </span>
                                    </div>
                                </div>
                            )}

                             {type === TransactionType.EXPENSE && isRebate && (
                                <div className="space-y-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200 mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Abatimentos / Recebimentos</h3>
                                    <div>
                                        <label className="text-sm font-medium text-emerald-700 mb-1 block">Valor do Abatimento</label>
                                        <input type="number" value={rebateAmount} onChange={e => setRebateAmount(e.target.value)} required step="0.01" min="0" max={amount || '0'} className="input-style border-emerald-300 focus:ring-emerald-500" placeholder="R$ 0,00" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-emerald-700 mb-1 block">Categoria do Recebimento</label>
                                        <select value={rebateItemId} onChange={e => setRebateItemId(e.target.value)} required className="input-style border-emerald-300 focus:ring-emerald-500">
                                            <option value="" disabled>Selecione uma categoria...</option>
                                            {incomeCategoryOptions.map(opt => <option key={opt.id} value={opt.id}>{`${opt.catName} > ${opt.subName} > ${opt.name}`}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-emerald-700 mb-1 block">Conta do Abatimento</label>
                                        <select 
                                            value={rebateCardId ? `${rebateAccountId}|${rebateCardId}` : rebateAccountId} 
                                            onChange={e => { 
                                                const val = e.target.value; 
                                                if (val.includes('|')) { 
                                                    const [accId, cId] = val.split('|'); 
                                                    setRebateAccountId(accId); 
                                                    setRebateCardId(cId); 
                                                } else { 
                                                    setRebateAccountId(val); 
                                                    setRebateCardId(''); 
                                                } 
                                            }} 
                                            className="input-style border-emerald-300 focus:ring-emerald-500"
                                        >
                                            <option value="">Mesma conta da transação principal</option>
                                            {accountOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="pt-2 border-t border-emerald-200 flex justify-between items-center">
                                        <span className="text-sm font-medium text-emerald-900">Líquido a pagar:</span>
                                        <span className="text-lg font-bold text-emerald-900">
                                            <PrivateValue>{formatCurrency(Math.max(0, parseFloat(amount || '0') - parseFloat(rebateAmount || '0')))}</PrivateValue>
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-emerald-600 mt-1 italic">Registra a despesa total e o recebimento abatido.</p>
                                </div>
                            )}

                             {type === TransactionType.INCOME && !isSplit && !isDeduction && (
                                <div className="flex items-center pt-4 border-t border-slate-200 mt-4">
                                    <CustomCheckbox id="change-check" checked={isChange} onChange={e => setIsChange(e.target.checked)} disabled={!!editingInstallmentGroup || !!editingSplitGroupId || isEditingSingleParcel || !!editingLinkedGroupId}/>
                                    <label htmlFor="change-check" className={`ml-2 block text-sm cursor-pointer ${(isEditingSingleParcel || !!editingLinkedGroupId) ? 'text-slate-400' : 'text-slate-800'}`}>Devolver troco</label>
                                </div>
                            )}
                            {isChange && type === TransactionType.INCOME && (
                                <div className="space-y-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100 mt-2">
                                    <div>
                                        <label className="text-sm font-medium text-slate-600 mb-1 block">Valor Recebido do Cliente (Total)</label>
                                        <input type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} required step="0.01" min={amount || '0'} className="input-style" placeholder="R$ 0,00" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-slate-600 mb-1 block">Conta que Devolverá</label>
                                            <select value={changeAccountId} onChange={e => setChangeAccountId(e.target.value)} required className="input-style">
                                                <option value="" disabled>Selecione...</option>
                                                {activeAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-slate-600 mb-1 block">Data da Devolução</label>
                                            <input type="date" value={changeDate} onChange={e => setChangeDate(e.target.value)} required className="input-style" />
                                        </div>
                                    </div>
                                     <div>
                                        <label className="text-sm font-medium text-slate-600 mb-1 block">Categoria de Movimentação (Troco)</label>
                                        <select value={changeItemId} onChange={e => setChangeItemId(e.target.value)} required className="input-style">
                                            <option value="" disabled>Selecione um item (Extra-balanço)...</option>
                                            {expenseCategoryOptions.map(opt => <option key={opt.id} value={opt.id}>{`${opt.catName} > ${opt.subName} > ${opt.name}`}</option>)}
                                        </select>
                                        <p className="text-[10px] text-slate-400 mt-1">Dica: Use uma categoria marcada como 'Extra-balanço' para não inflar o seu DRE.</p>
                                    </div>
                                    <div className="flex justify-between items-center text-sm pt-1">
                                        <span className="text-slate-500 font-medium">Troco Calculado:</span>
                                        <span className="font-bold text-blue-600">{formatCurrency(Math.max(0, parseFloat(amountPaid || '0') - parseFloat(amount || '0')))}</span>
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
                 <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        {!isSearchFocused && !searchTerm && <SearchIcon className="w-5 h-5 text-slate-400 absolute top-1/2 left-3 -translate-y-1/2 pointer-events-none"/>}
                        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onFocus={() => setIsSearchFocused(true)} onBlur={() => setIsSearchFocused(false)} className="input-style pl-10 h-10 w-full" placeholder="" />
                    </div>
                    <button 
                        onClick={() => setIsImportModalOpen(true)}
                        className="btn-secondary flex items-center gap-2 whitespace-nowrap h-10 px-4"
                        title="Importar transações de um extrato colado"
                    >
                        <UploadIcon className="w-4 h-4 text-blue-600" />
                        <span className="font-bold text-blue-600">Importar Extrato</span>
                    </button>
                    <button 
                        onClick={handleExportCSV}
                        className="btn-secondary flex items-center gap-2 whitespace-nowrap h-10 px-4"
                        title="Exportar transações filtradas para CSV (Excel)"
                    >
                        <DownloadIcon className="w-4 h-4 text-emerald-600" />
                        <span className="font-bold text-emerald-600">Exportar CSV</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                    <div className="md:col-span-4"><FilterDropdown options={filterOptions} value={accountFilter} onChange={setAccountFilter} /></div>
                    <div className="md:col-span-4"><FilterDropdown options={['Este Mês', 'Mês Passado', 'Próximo Mês', 'Este Ano', 'Personalizado'].map(o => ({label: o, value: o}))} value={dateFilter} onChange={handleDateFilterChange} /></div>
                    <div className="md:col-span-4 grid grid-cols-2 gap-2">
                         <FilterDropdown options={['Todos', 'Entradas', 'Saídas', 'Movimentações'].map(o => ({label: o, value: o}))} value={typeFilter} onChange={setTypeFilter} />
                        <button onClick={() => setInstallmentFilter(s => !s)} className={`btn-secondary w-full h-full flex justify-center items-center px-3 py-2 text-sm font-medium ${installmentFilter ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600'}`}>Parceladas</button>
                    </div>
                </div>
                
                <DateRangePickerModal isOpen={isPickerOpen} onClose={() => setIsPickerOpen(false)} value={customDateRange} onChange={handleCustomDateChange} />
                <ImportTransactionsModal 
                    isOpen={isImportModalOpen} 
                    onClose={() => setIsImportModalOpen(false)} 
                    categories={categories}
                    accountId={accountId}
                    onImport={addTransactions}
                />
                <DeleteConfirmationModal isOpen={deleteModalState.isOpen} onClose={() => setDeleteModalState({isOpen: false, transaction: null})} onConfirm={handleConfirmDelete} />
                <EditChoiceModal 
                    isOpen={editChoiceModal.isOpen} 
                    transaction={editChoiceModal.transaction}
                    onClose={() => setEditChoiceModal({ isOpen: false, transaction: null })}
                    onChoice={(mode) => editChoiceModal.transaction && processEdit(editChoiceModal.transaction, mode)}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Receitas no Período</p>
                        <p className="text-xl md:text-2xl font-bold text-green-600"><PrivateValue>{formatCurrency(periodIncome)}</PrivateValue></p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Despesas no Período</p>
                        <p className="text-xl md:text-2xl font-bold text-red-600"><PrivateValue>{formatCurrency(periodExpenses)}</PrivateValue></p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm sm:col-span-2 md:col-span-1">
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Saldo</p>
                        <p className={`text-xl md:text-2xl font-bold ${periodIncome - periodExpenses >= 0 ? 'text-slate-800' : 'text-red-600'}`}><PrivateValue>{formatCurrency(periodIncome - periodExpenses)}</PrivateValue></p>
                    </div>
                </div>

                {filteredTransactions.some(t => Math.abs(t.amount - 3.21) < 0.01) && (
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
                        <div className="bg-blue-100 p-1.5 rounded-lg">
                            <SparklesIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-blue-800 tracking-tight">Investigação de Diferença (3,21)</p>
                            <p className="text-xs text-blue-600 mt-0.5 leading-relaxed">
                                Encontramos lançamentos de 3,21 no período. Se este valor for um <b>abatimento</b> ou <b>reembolso</b>, ele é contado como "Receita" no sistema, enquanto sua soma manual pode estar subtraindo-o das "Despesas". 
                                <br/>O <b>Saldo</b> acima reflete o valor líquido (Despesas - Receitas).
                            </p>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto w-full">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50 text-slate-500 uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-left w-[110px]">Data</th>
                                    <th className="px-4 py-3 font-semibold text-left min-w-[180px]">Descrição</th>
                                    <th className="px-4 py-3 font-semibold text-left w-[150px]">Conta</th>
                                    <th className="px-4 py-3 font-semibold text-center w-[140px]">Item</th>
                                    <th className="px-4 py-3 font-semibold text-right w-[150px]">Valor</th>
                                    <th className="px-4 py-3 font-semibold text-center w-[90px]">Ações</th>
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
                                        if (t.type === TransactionType.INCOME) displayProps = { color: 'text-green-600', sign: '+ ' };
                                        else if (t.type === TransactionType.EXPENSE) displayProps = { color: 'text-red-600', sign: '- ' };
                                        else if (t.type === TransactionType.TRANSFER) {
                                            if (accountFilter !== 'Todos') {
                                                const viewingId = accountFilter.includes('|') ? accountFilter.split('|')[0] : accountFilter;
                                                if (accountFilter.includes('|')) {
                                                    const viewingCardId = accountFilter.split('|')[1];
                                                    if (t.cardId === viewingCardId && t.destinationAccountId === viewingId) displayProps = { color: 'text-green-600', sign: '+ ' };
                                                    else displayProps = { color: 'text-red-600', sign: '- ' };
                                                } else {
                                                    if (t.accountId === viewingId) displayProps = { color: 'text-red-600', sign: '- ' };
                                                    else if (t.destinationAccountId === viewingId) displayProps = { color: 'text-green-600', sign: '+ ' };
                                                }
                                            } else displayProps = { color: 'text-slate-500', sign: '' };
                                        }
                                        return (
                                        <tr key={t.id} className="hover:bg-gray-50 border-b border-slate-100 last:border-0 transition-colors">
                                            <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(t.date)}</td>
                                            <td className="px-4 py-3 text-slate-800 font-medium truncate max-w-[200px]" title={t.description}>{t.description}</td>
                                            <td className="px-4 py-3 text-slate-600 whitespace-nowrap truncate max-w-[150px]" title={displayAccount}>{displayAccount}</td>
                                            <td className="px-4 py-3 text-center align-middle">
                                                <span className={`px-2 py-1 text-[11px] capitalize font-medium rounded-md ${categoryInfo ? (categoryColors[categoryInfo.cat] || defaultCategoryColor) : defaultCategoryColor}`}>
                                                    {categoryInfo?.item || 'N/A'}
                                                </span>
                                            </td>
                                            <td className={`px-4 py-3 text-right font-bold ${displayProps.color} whitespace-nowrap tabular-nums`}>
                                                <PrivateValue className="inline-block">{displayProps.sign}{formatCurrency(t.amount)}</PrivateValue>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button onClick={() => handleEdit(t)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors" title="Editar"><PencilIcon className="w-4 h-4"/></button>
                                                    <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="Excluir"><TrashIcon className="w-4 h-4"/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    )})
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden divide-y divide-slate-100">
                        {paginatedTransactions.length === 0 ? (
                            <div className="text-center p-8 text-slate-500">Nenhum lançamento encontrado.</div>
                        ) : (
                            paginatedTransactions.map(t => {
                                const categoryInfo = t.itemId ? categoryMap.get(t.itemId) : null;
                                const accountName = accountMap.get(t.accountId);
                                const cardName = t.cardId ? cardMap.get(t.cardId) : null;
                                const displayAccount = cardName ? `${accountName} -> ${cardName}` : accountName;
                                let displayProps = { color: 'text-slate-800', sign: '' };
                                if (t.type === TransactionType.INCOME) displayProps = { color: 'text-green-600', sign: '+ ' };
                                else if (t.type === TransactionType.EXPENSE) displayProps = { color: 'text-red-600', sign: '- ' };
                                else if (t.type === TransactionType.TRANSFER) {
                                    if (accountFilter !== 'Todos') {
                                        const viewingId = accountFilter.includes('|') ? accountFilter.split('|')[0] : accountFilter;
                                        if (accountFilter.includes('|')) {
                                            const viewingCardId = accountFilter.split('|')[1];
                                            if (t.cardId === viewingCardId && t.destinationAccountId === viewingId) displayProps = { color: 'text-green-600', sign: '+ ' };
                                            else displayProps = { color: 'text-red-600', sign: '- ' };
                                        } else {
                                            if (t.accountId === viewingId) displayProps = { color: 'text-red-600', sign: '- ' };
                                            else if (t.destinationAccountId === viewingId) displayProps = { color: 'text-green-600', sign: '+ ' };
                                        }
                                    } else displayProps = { color: 'text-slate-500', sign: '' };
                                }
                                return (
                                    <div key={t.id} className="p-4 active:bg-slate-50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="font-bold text-slate-800 text-base leading-tight mb-1">{t.description}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-slate-500">{formatDate(t.date)}</span>
                                                    <span className="text-xs text-slate-300">•</span>
                                                    <span className="text-xs text-slate-500 truncate max-w-[120px]">{displayAccount}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-bold text-lg ${displayProps.color}`}>
                                                    <PrivateValue>{displayProps.sign}{formatCurrency(t.amount)}</PrivateValue>
                                                </p>
                                                <span className={`inline-block px-2 py-0.5 text-[10px] capitalize font-bold rounded-md mt-1 ${categoryInfo ? (categoryColors[categoryInfo.cat] || defaultCategoryColor) : defaultCategoryColor}`}>
                                                    {categoryInfo?.item || 'N/A'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-slate-50">
                                            <button onClick={() => handleEdit(t)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold transition-colors"><PencilIcon className="w-3.5 h-3.5"/> Editar</button>
                                            <button onClick={() => handleDelete(t.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold transition-colors"><TrashIcon className="w-3.5 h-3.5"/> Excluir</button>
                                        </div>
                                    </div>
                                )
                            })
                        )}
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