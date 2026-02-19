
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAccounts, useTransactions, useLoans, useCategories, useCDBs } from '../hooks/useFirestore';
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
import ChevronDownIcon from '../components/icons/ChevronDownIcon';
import TicketIcon from '../components/icons/TicketIcon';
import InvestmentsIcon from '../components/icons/InvestmentsIcon';
import PrivateValue from '../components/PrivateValue';


const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const getUTCDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

const InvoiceHistoryModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    accountName: string;
    cardName: string;
    transactions: Transaction[];
    accountId: string;
    cardId: string;
    accounts: Account[];
}> = ({ isOpen, onClose, accountName, cardName, transactions, accountId, cardId, accounts }) => {
    if (!isOpen) return null;

    const accountMap = new Map(accounts.map(acc => [acc.id, acc.name]));

    const history = transactions.filter(t => 
        t.type === TransactionType.INCOME &&
        t.accountId === accountId && 
        t.cardId === cardId
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg m-4 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Histórico de Faturas</h2>
                        <p className="text-sm text-slate-500">{accountName} - {cardName}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100"><XIcon className="w-5 h-5 text-slate-500"/></button>
                </div>

                <div className="overflow-y-auto flex-1 pr-2">
                    {history.length === 0 ? (
                        <p className="text-center text-slate-500 py-8">Nenhum pagamento de fatura encontrado.</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-slate-500 uppercase text-xs sticky top-0">
                                <tr>
                                    <th className="px-3 py-2 text-left">Data</th>
                                    <th className="px-3 py-2 text-right">Valor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {history.map(t => (
                                    <tr key={t.id}>
                                        <td className="px-3 py-2 text-slate-600">{formatDate(t.date)}</td>
                                        <td className="px-3 py-2 text-right font-medium text-green-600">
                                            <PrivateValue>{formatCurrency(t.amount)}</PrivateValue>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
                    <button type="button" onClick={onClose} className="btn-secondary">Fechar</button>
                </div>
            </div>
        </div>
    );
};

type FilterType = 'overview' | 'card' | 'investments';

const CardFilterDropdown: React.FC<{
    selectedType: FilterType;
    selectedId: string | null;
    onChange: (type: FilterType, id: string | null) => void;
    cards: { id: string; name: string }[];
    hasInvestments: boolean;
}> = ({ selectedType, selectedId, onChange, cards, hasInvestments }) => {
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

    const handleSelect = (type: FilterType, id: string | null) => {
        onChange(type, id);
        setIsOpen(false);
    };

    let selectedLabel = 'Visão Geral da Conta';
    const cardsList = Array.isArray(cards) ? cards : [];
    if (selectedType === 'card' && selectedId) {
        selectedLabel = cardsList.find(c => c.id === selectedId)?.name || 'Cartão';
    } else if (selectedType === 'investments') {
        selectedLabel = 'Investimentos';
    }

    return (
        <div className="relative" ref={ref}>
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg px-4 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            >
                <span>{selectedLabel}</span>
                <ChevronDownIcon className="w-4 h-4 text-slate-500" />
            </button>
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-slate-100 rounded-xl shadow-xl z-20 overflow-hidden ring-1 ring-black ring-opacity-5">
                    <div className="py-1">
                        <button 
                            onClick={() => handleSelect('overview', null)} 
                            className={`block w-full text-left px-4 py-3 text-sm transition-colors ${selectedType === 'overview' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}
                        >
                            Visão Geral da Conta
                        </button>
                        
                        {cardsList.length > 0 && (
                            <div className="border-t border-slate-50 my-1">
                                <p className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">Meus Cartões</p>
                                {cardsList.map(card => (
                                    <button 
                                        key={card.id} 
                                        onClick={() => handleSelect('card', card.id)} 
                                        className={`block w-full text-left px-4 py-3 text-sm transition-colors ${selectedType === 'card' && selectedId === card.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <CreditCardIcon className="w-4 h-4 opacity-70"/>
                                            {card.name}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {hasInvestments && (
                            <div className="border-t border-slate-50 my-1">
                                <p className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">Patrimônio</p>
                                <button 
                                    onClick={() => handleSelect('investments', null)} 
                                    className={`block w-full text-left px-4 py-3 text-sm transition-colors ${selectedType === 'investments' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <InvestmentsIcon className="w-4 h-4 opacity-70"/>
                                        Investimentos
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
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
    
    const [cards, setCards] = useState<{id: string, name: string, initialBalance?: number}[]>([]);
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
            setCards(Array.isArray(account.cards) ? account.cards : []);
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
            setCards([...cards, { id: crypto.randomUUID(), name: newCardName.trim(), initialBalance: 0 }]);
            setNewCardName('');
        }
    };

    const handleRemoveCard = (cardId: string) => {
        setCards(cards.filter(c => c.id !== cardId));
    };

    const handleCardBalanceChange = (cardId: string, value: string) => {
        setCards(cards.map(c => c.id === cardId ? { ...c, initialBalance: parseFloat(value) || 0 } : c));
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
                <label htmlFor="acc-balance" className="block text-sm font-medium text-slate-700">Saldo Inicial (Conta) *</label>
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
                    <input type="checkbox" id="acc-credit-card" checked={isCreditCard} onChange={e => setIsCreditCard(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" style={{ accentColor: '#2563eb' }}/>
                    <label htmlFor="acc-credit-card" className="ml-2 block text-sm font-medium text-slate-800">É Cartão de Crédito</label>
                </div>
                 <div className="flex items-center">
                    <input type="checkbox" id="acc-active" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" style={{ accentColor: '#2563eb' }}/>
                    <label htmlFor="acc-active" className="ml-2 block text-sm text-slate-500">Conta Ativa</label>
                </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
                <label className="block text-sm font-medium text-slate-700 mb-2">Cartões Vinculados</label>
                <div className="flex gap-2 mb-2">
                    <input 
                        type="text" 
                        value={newCardName} 
                        onChange={e => setNewCardName(e.target.value)} 
                        placeholder="Nome (ex: Virtual, Adicional)" 
                        className="input-style text-sm py-2"
                        onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddCard(); }}}
                    />
                    <button type="button" onClick={handleAddCard} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors">
                        <PlusIcon className="w-5 h-5" />
                    </button>
                </div>
                {cards.length > 0 && (
                    <ul className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {cards.map(card => (
                            <li key={card.id} className="flex justify-between items-center bg-white border border-slate-200 px-3 py-2 rounded-lg shadow-sm gap-3">
                                <span className="text-slate-700 flex items-center gap-2 flex-grow truncate font-medium text-sm">
                                    <div className="bg-slate-100 p-1 rounded">
                                        <CreditCardIcon className="w-3 h-3 text-slate-500 flex-shrink-0"/>
                                    </div>
                                    {card.name}
                                </span>
                                <div className="flex items-center gap-2">
                                    <label htmlFor={`card-balance-${card.id}`} className="text-xs text-slate-500 font-medium">Saldo Inicial:</label>
                                    <div className="relative">
                                        <input 
                                            id={`card-balance-${card.id}`}
                                            type="number" 
                                            value={card.initialBalance || ''} 
                                            onChange={(e) => handleCardBalanceChange(card.id, e.target.value)} 
                                            className="w-28 pl-2 pr-2 py-1.5 text-right text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-slate-700 placeholder-slate-400 transition-all"
                                            placeholder="0.00"
                                            step="0.01"
                                        />
                                    </div>
                                    <button type="button" onClick={() => handleRemoveCard(card.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors ml-1" title="Remover Cartão">
                                        <XIcon className="w-4 h-4" />
                                    </button>
                                </div>
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

interface MultiPaymentSource {
    id: string;
    accountId: string;
    amount: string;
}

const PayInvoiceModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    targetAccount: Account;
    targetCardId: string | null;
    accounts: Account[];
    categories: Category[];
    currentBalance: number;
    accountCashBalances: Map<string, number>;
    onPay: (payments: { sourceAccountId: string, amount: number }[], date: string, itemId: string) => Promise<void>;
}> = ({ isOpen, onClose, targetAccount, targetCardId, accounts, categories, currentBalance, accountCashBalances, onPay }) => {
    const [payments, setPayments] = useState<MultiPaymentSource[]>([]);
    const [totalTarget, setTotalTarget] = useState(currentBalance < 0 ? Math.abs(currentBalance) : 0);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [itemId, setItemId] = useState('');

    useEffect(() => {
        if (isOpen) {
            const absBalance = currentBalance < 0 ? Math.abs(currentBalance) : 0;
            setTotalTarget(absBalance);
            // Inicia com uma linha de pagamento sugerindo o total
            setPayments([{ id: crypto.randomUUID(), accountId: '', amount: String(absBalance.toFixed(2)) }]);
        }
    }, [isOpen, currentBalance]);

    const currentSum = useMemo(() => payments.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0), [payments]);
    const difference = totalTarget - currentSum;
    const isSumMatched = Math.abs(difference) < 0.01;

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

    if (!isOpen) return null;

    const addSource = () => {
        const remaining = Math.max(0, difference);
        setPayments([...payments, { id: crypto.randomUUID(), accountId: '', amount: remaining > 0 ? remaining.toFixed(2) : '' }]);
    };

    const removeSource = (id: string) => {
        if (payments.length > 1) {
            setPayments(payments.filter(p => p.id !== id));
        }
    };

    const updatePayment = (id: string, field: keyof MultiPaymentSource, value: string) => {
        setPayments(payments.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const validPayments = payments.map(p => ({
            sourceAccountId: p.accountId,
            amount: parseFloat(p.amount)
        })).filter(p => p.sourceAccountId && p.amount > 0);

        if (validPayments.length === 0 || !date || !itemId) {
            alert('Preencha as contas de origem, valores e categoria.');
            return;
        }
        
        if (!isSumMatched && !window.confirm(`O valor total dos pagamentos (${formatCurrency(currentSum)}) é diferente do valor pretendido (${formatCurrency(totalTarget)}). Deseja continuar assim mesmo?`)) {
            return;
        }

        await onPay(validPayments, date, itemId);
    };

    const activeAccounts = accounts.filter(a => a.isActive);
    const cardsList = Array.isArray(targetAccount.cards) ? targetAccount.cards : [];
    const cardName = targetCardId ? cardsList.find(c => c.id === targetCardId)?.name : null;
    const titleContext = cardName ? ` - ${cardName}` : '';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Pagar com múltiplas contas</h2>
                        <p className="text-sm text-slate-500 font-normal">Quitação de fatura para <span className="font-bold text-slate-700">{targetAccount.name}{titleContext}</span></p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"><XIcon className="w-6 h-6"/></button>
                </div>
                
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Valor Total da Quitação</label>
                            <input 
                                type="number" 
                                value={totalTarget} 
                                onChange={e => setTotalTarget(parseFloat(e.target.value) || 0)} 
                                step="0.01" 
                                min="0" 
                                className="input-style font-bold text-lg" 
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Data do Pagamento</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="input-style font-medium" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Distribuição entre contas</label>
                        {payments.map((payment, index) => (
                            <div key={payment.id} className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-200">
                                <div className="flex-1">
                                    <select 
                                        value={payment.accountId} 
                                        onChange={e => updatePayment(payment.id, 'accountId', e.target.value)} 
                                        required 
                                        className="input-style py-2"
                                    >
                                        <option value="" disabled>Selecionar conta de origem...</option>
                                        {activeAccounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>
                                                {acc.name} (Saldo: {formatCurrency(accountCashBalances.get(acc.id) || 0)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="w-32">
                                    <input 
                                        type="number" 
                                        value={payment.amount} 
                                        onChange={e => updatePayment(payment.id, 'amount', e.target.value)} 
                                        step="0.01" 
                                        min="0.01" 
                                        required 
                                        className="input-style py-2 text-right font-bold" 
                                        placeholder="0,00"
                                    />
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => removeSource(payment.id)}
                                    disabled={payments.length === 1}
                                    className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-30"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        
                        <button 
                            type="button" 
                            onClick={addSource}
                            className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800 px-1 py-2 transition-colors"
                        >
                            <PlusIcon className="w-4 h-4" />
                            Adicionar outra conta
                        </button>
                    </div>

                    <div className="pt-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 px-1">Categoria do Lançamento</label>
                        <select value={itemId} onChange={e => setItemId(e.target.value)} required className="input-style font-medium">
                            <option value="" disabled>Selecione a categoria de despesa...</option>
                            {expenseCategoryOptions.map(opt => <option key={opt.id} value={opt.id}>{`${opt.catName} > ${opt.subName} > ${opt.name}`}</option>)}
                        </select>
                    </div>

                    <div className={`p-4 rounded-xl border flex justify-between items-center transition-all ${isSumMatched ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
                        <div>
                            <p className="text-xs font-medium uppercase tracking-tight opacity-70">Total distribuído</p>
                            <p className="text-xl font-black tracking-normal">{formatCurrency(currentSum)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-medium uppercase tracking-tight opacity-70">Diferença</p>
                            <p className="text-xl font-bold tracking-normal">{isSumMatched ? 'OK' : formatCurrency(difference)}</p>
                        </div>
                    </div>
                </form>
                
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-2xl">
                    <button type="button" onClick={onClose} className="btn-secondary px-6">Cancelar</button>
                    <button type="submit" onClick={handleSubmit} className="btn-primary bg-blue-600 hover:bg-blue-700 border-none px-8 shadow-lg shadow-blue-100">
                        Confirmar Pagamentos
                    </button>
                </div>
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
    if (name.includes('inter')) {
        return <img src="https://i.imgur.com/P4MhLq7.png" alt="Inter" className={sizeClasses} />;
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

interface AccountsPageProps {
    addAccountTrigger: number;
    initialParams?: { accountId: string, filterType: 'overview' | 'card' | 'investments' } | null;
    onParamsProcessed?: () => void;
}

const AccountsPage: React.FC<AccountsPageProps> = ({ addAccountTrigger, initialParams, onParamsProcessed }) => {
    const { accounts, addAccount, updateAccount, deleteAccount, reorderAccounts } = useAccounts();
    const { transactions, addTransactions } = useTransactions();
    const { categories } = useCategories();
    const { cdbs } = useCDBs();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [isInvoiceHistoryOpen, setIsInvoiceHistoryOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
    
    const [filterType, setFilterType] = useState<FilterType>('overview');
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
    const [dragOverItemIndex, setDragOverItemIndex] = useState<number | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    
    const categoryMap = useMemo(() => {
        const map = new Map<string, string>();
        categories.forEach(cat => cat.subcategories.forEach(sub => sub.items.forEach(item => map.set(item.id, item.name))));
        return map;
    }, [categories]);

    // Identificação dos IDs dos itens categorizados como "Rendimentos" para exclusão matemática do caixa
    const yieldItemIds = useMemo(() => {
        const ids: string[] = [];
        categories.forEach(cat => cat.subcategories.forEach(sub => sub.items.forEach(item => {
            // Correspondência exata para garantir que não exclua "Rendimentos Diários" por engano
            if (item.name.trim().toLowerCase() === 'rendimentos') ids.push(item.id);
        })));
        return ids;
    }, [categories]);

    useEffect(() => {
        if (initialParams) {
            setSelectedAccountId(initialParams.accountId);
            setFilterType(initialParams.filterType);
            if (onParamsProcessed) onParamsProcessed();
        }
    }, [initialParams, onParamsProcessed]);

    useEffect(() => {
        if (addAccountTrigger > 0) {
            handleOpenModal();
        }
    }, [addAccountTrigger]);
    
    useEffect(() => {
        if (!selectedAccountId && accounts.length > 0) {
            setSelectedAccountId(accounts[0].id);
        }
    }, [accounts, selectedAccountId]);
    
    useEffect(() => {
        if (!initialParams) {
            setFilterType('overview');
            setSelectedCardId(null);
            setCurrentPage(1);
            setSearchTerm('');
        }
    }, [selectedAccountId, initialParams]);


    const { accountCashBalances, cardBalances } = useMemo(() => {
        const accCashBalances = new Map<string, number>();
        const crdBalances = new Map<string, number>();

        accounts.forEach(acc => {
            accCashBalances.set(acc.id, Number(acc.initialBalance) || 0);
            const accCards = Array.isArray(acc.cards) ? acc.cards : [];
            accCards.forEach(c => crdBalances.set(c.id, Number(c.initialBalance) || 0));
        });

        transactions.forEach(t => {
            // REGRA DE OURO: Se a transação for do item "Rendimentos", ela NÃO ENTRA no cálculo do saldo bancário de caixa.
            if (t.itemId && yieldItemIds.includes(t.itemId)) return;

            const updateAcc = (id: string, val: number) => accCashBalances.set(id, (accCashBalances.get(id) || 0) + val);
            const updateCard = (id: string, val: number) => crdBalances.set(id, (crdBalances.get(id) || 0) + val);

            if (t.cardId) {
                if (t.type === TransactionType.EXPENSE) {
                    updateCard(t.cardId, -t.amount);
                } else if (t.type === TransactionType.INCOME) {
                    updateCard(t.cardId, t.amount);
                } else if (t.type === TransactionType.TRANSFER && t.destinationAccountId) {
                    updateCard(t.cardId, t.amount);
                    updateAcc(t.accountId, -t.amount);
                }
            } else {
                if (t.type === TransactionType.INCOME) updateAcc(t.accountId, t.amount);
                else if (t.type === TransactionType.EXPENSE) updateAcc(t.accountId, -t.amount);
                else if (t.type === TransactionType.TRANSFER) {
                    updateAcc(t.accountId, -t.amount);
                    if (t.destinationAccountId) updateAcc(t.destinationAccountId, t.amount);
                }
            }
        });

        return { accountCashBalances: accCashBalances, cardBalances: crdBalances };
    }, [accounts, transactions, yieldItemIds]);

    const currentViewBalance = useMemo(() => {
        if (!selectedAccountId) return 0;
        
        if (filterType === 'card' && selectedCardId) {
            return cardBalances.get(selectedCardId) || 0;
        }

        if (filterType === 'investments') {
            return cdbs
                .filter(c => c.linkedAccountId === selectedAccountId && c.isActive)
                .reduce((sum, c) => sum + c.currentGrossBalance, 0);
        }

        return accountCashBalances.get(selectedAccountId) || 0;
    }, [accountCashBalances, cdbs, cardBalances, selectedAccountId, selectedCardId, filterType]);

    const selectedAccount = useMemo(() => {
        return accounts.find(acc => acc.id === selectedAccountId) || null;
    }, [accounts, selectedAccountId]);
    
    const hasLinkedInvestments = useMemo(() => {
        if (!selectedAccountId) return false;
        return cdbs.some(c => c.linkedAccountId === selectedAccountId && c.isActive);
    }, [cdbs, selectedAccountId]);

    const filteredTransactions = useMemo(() => {
        if (!selectedAccountId) return [];
        
        let accountTransactions = transactions
            .filter(t => t.accountId === selectedAccountId || t.destinationAccountId === selectedAccountId)
            .filter(t => t.description.toLowerCase().includes(searchTerm.toLowerCase()));
        
        if (filterType === 'card' && selectedCardId) {
            accountTransactions = accountTransactions.filter(t => t.cardId === selectedCardId);
        } else if (filterType === 'investments') {
            accountTransactions = accountTransactions.filter(t => {
                const name = t.description.toLowerCase();
                const isYieldItem = t.itemId && yieldItemIds.includes(t.itemId);
                return isYieldItem || name.includes('cdb') || name.includes('aporte') || name.includes('resgate');
            });
        } else {
            accountTransactions = accountTransactions.filter(t => {
                if (t.itemId && yieldItemIds.includes(t.itemId)) return false;
                if (t.cardId && t.type !== TransactionType.TRANSFER) return false;

                const isSource = t.accountId === selectedAccountId;
                const isDest = t.destinationAccountId === selectedAccountId;
                
                if (isSource) return true;
                if (isDest && !t.cardId) return true;
                
                return false;
            });
        }
            
        return accountTransactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, selectedAccountId, filterType, selectedCardId, searchTerm, accounts, yieldItemIds]);
    
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
        if (success) handleCloseModal();
    };

    const handleDeleteAccount = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta conta?')) {
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

    const handleAccountDrop = async (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
        e.preventDefault();
        if (draggedItemIndex === null || draggedItemIndex === targetIndex) return;
        const newAccounts = [...accounts];
        const [movedItem] = newAccounts.splice(draggedItemIndex, 1);
        newAccounts.splice(targetIndex, 0, movedItem);
        const updates = newAccounts.map((acc, index) => ({ id: acc.id, order: index }));
        await reorderAccounts(updates);
        setDraggedItemIndex(null); setDragOverItemIndex(null);
    };

    const getTransactionDisplayProps = (transaction: Transaction, currentAccountId: string | null) => {
        if (transaction.type === TransactionType.INCOME) return { sign: '+ ', color: 'text-green-500' };
        if (transaction.type === TransactionType.EXPENSE) return { sign: '- ', color: 'text-red-500' };
        if (transaction.type === TransactionType.TRANSFER) {
            if (transaction.accountId === currentAccountId) return { sign: '- ', color: 'text-red-500' };
            if (transaction.destinationAccountId === currentAccountId) return { sign: '+ ', color: 'text-green-500' };
        }
        return { sign: '', color: 'text-slate-800' };
    };

    const accountMapRaw = useMemo(() => new Map(accounts.map(acc => [acc.id, acc.name])), [accounts]);

    return (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-4 space-y-3">
                {accounts.map((acc, index) => {
                    const isSelected = acc.id === selectedAccountId;
                    const isDragOver = dragOverItemIndex === index;
                    const cashBalance = accountCashBalances.get(acc.id) || 0;
                    return (
                        <div 
                            key={acc.id} 
                            draggable
                            onDragStart={(e) => { setDraggedItemIndex(index); e.dataTransfer.effectAllowed = 'move'; }}
                            onDragEnter={() => setDragOverItemIndex(index)}
                            onDragEnd={() => { setDraggedItemIndex(null); setDragOverItemIndex(null); }}
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
                                        </div>
                                        <p className="text-sm text-slate-500 truncate">Disponível em Caixa</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-1 pointer-events-auto flex-shrink-0">
                                    <p className="font-bold text-lg text-slate-800 whitespace-nowrap">
                                        <PrivateValue>{formatCurrency(cashBalance)}</PrivateValue>
                                    </p>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleOpenModal(acc); }} 
                                        className="p-2 rounded-full text-slate-400 hover:text-blue-500 hover:bg-slate-100 transition-colors"
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
                                <BankLogo account={selectedAccount} size="lg"/>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-2xl font-bold text-slate-800">{selectedAccount.name}</h2>
                                        <CardFilterDropdown 
                                            selectedType={filterType}
                                            selectedId={selectedCardId}
                                            onChange={(type, id) => { setFilterType(type); setSelectedCardId(id); setCurrentPage(1); }}
                                            cards={Array.isArray(selectedAccount.cards) ? selectedAccount.cards : []}
                                            hasInvestments={hasLinkedInvestments}
                                        />
                                    </div>
                                    <div className="flex flex-col mt-1">
                                        <span className="text-sm text-slate-500 font-normal">
                                            {filterType === 'card' ? 'Fatura do cartão' : filterType === 'investments' ? 'Saldo Bruto Investido' : 'Saldo de Caixa (Disponível)'}
                                        </span>
                                        <span className={`text-3xl font-bold ${currentViewBalance < 0 ? 'text-red-500' : 'text-slate-900'}`}>
                                            <PrivateValue>{formatCurrency(currentViewBalance)}</PrivateValue>
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                {filterType === 'card' && (
                                    <button onClick={() => setIsInvoiceHistoryOpen(true)} className="btn-secondary flex items-center gap-2 text-sm">
                                        <TicketIcon className="w-4 h-4 text-slate-500"/> Histórico
                                    </button>
                                )}
                                {(currentViewBalance < 0 && (filterType === 'card' || selectedAccount.isCreditCard)) && (
                                    <button onClick={handlePayBillClick} className="btn-primary bg-green-600 hover:bg-green-700 border-none flex items-center gap-2">
                                        <CheckIcon className="w-5 h-5"/> Pagar Fatura / Zerar
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                    <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                      <div className='flex-grow'>
                        <h3 className="text-lg font-bold text-slate-800">
                            {filterType === 'card' ? 'Transações do Cartão' : filterType === 'investments' ? 'Aportes e Resgates' : 'Histórico de Caixa'}
                        </h3>
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
                                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onFocus={() => setIsSearchFocused(true)} onBlur={() => setIsSearchFocused(false)} className="input-style pl-10 h-10 w-full" placeholder=""/>
                            </div>
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
                                    <tr><td colSpan={4} className="text-center p-8 text-slate-500">Nenhuma transação nesta visão.</td></tr>
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
                                                    <PrivateValue>{displayProps.sign}{formatCurrency(t.amount)}</PrivateValue>
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

            <AccountModal isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleSaveAccount} onDelete={handleDeleteAccount} account={editingAccount} />
            
            <InvoiceHistoryModal 
                isOpen={isInvoiceHistoryOpen}
                onClose={() => setIsInvoiceHistoryOpen(false)}
                accountName={selectedAccount?.name || ''}
                cardName={selectedAccount?.cards && Array.isArray(selectedAccount.cards) ? (selectedAccount.cards.find(c => c.id === selectedCardId)?.name || '') : ''}
                transactions={transactions}
                accountId={selectedAccount?.id || ''}
                cardId={selectedCardId || ''}
                accounts={accounts}
            />

            {selectedAccount && (
              <PayInvoiceModal 
                isOpen={isPayModalOpen} 
                onClose={() => setIsPayModalOpen(false)} 
                targetAccount={selectedAccount} 
                targetCardId={selectedCardId} 
                accounts={accounts} 
                categories={categories} 
                currentBalance={currentViewBalance}
                accountCashBalances={accountCashBalances} // Passando o mapa de saldos calculados
                onPay={async (validPayments, d, i) => { 
                    const selectedAccCards = Array.isArray(selectedAccount.cards) ? selectedAccount.cards : [];
                    const cardName = selectedCardId ? selectedAccCards.find(c => c.id === selectedCardId)?.name : null;
                    const targetName = cardName ? `${selectedAccount.name} (${cardName})` : selectedAccount.name;

                    const allTxs: Omit<Transaction, 'id'>[] = [];
                    
                    validPayments.forEach(p => {
                        const sourceAccName = accountMapRaw.get(p.sourceAccountId) || 'Conta';
                        // Para cada fonte, criamos o par: Saída da conta -> Entrada no cartão
                        allTxs.push({
                            description: `Pagamento Fatura: ${targetName}`,
                            amount: p.amount,
                            date: d,
                            type: TransactionType.EXPENSE,
                            accountId: p.sourceAccountId,
                            cardId: null,
                            itemId: i
                        });
                        allTxs.push({
                            description: `Recebimento Fatura (${sourceAccName})`,
                            amount: p.amount,
                            date: d,
                            type: TransactionType.INCOME,
                            accountId: selectedAccount.id,
                            cardId: selectedCardId || null,
                            itemId: i
                        });
                    });
                    
                    const success = await addTransactions(allTxs);
                    if (success) setIsPayModalOpen(false);
                }} 
              />
            )}
        </div>
    );
};

export default AccountsPage;
