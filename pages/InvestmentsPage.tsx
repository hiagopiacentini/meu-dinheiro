
import React, { useState, useMemo } from 'react';
import { useCDBs, useTransactions, useAccounts, useCategories } from '../hooks/useFirestore';
import { CDBContract, Transaction, TransactionType } from '../types';
import MoneyIcon from '../components/icons/MoneyIcon';
import PlusIcon from '../components/icons/PlusIcon';
import ArrowUturnLeftIcon from '../components/icons/ArrowUturnLeftIcon';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import UpArrowIcon from '../components/icons/UpArrowIcon';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
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
                <h2 className="text-xl font-bold mb-4 text-slate-800">Resgatar Investimento</h2>
                <div className="bg-blue-50 p-3 rounded-lg mb-4">
                    <p className="font-semibold text-slate-800">{cdb.name}</p>
                    <p className="text-sm text-slate-600">Saldo Atual: <span className="font-bold">{formatCurrency(cdb.currentGrossBalance)}</span></p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Valor do Resgate</label>
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
                        <label className="block text-sm font-medium text-slate-700 mb-1">Data do Resgate</label>
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
                        <button type="submit" className="btn-primary">Confirmar Resgate</button>
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
            // Reset for next entry
            setValue('');
            // Optional: Advance date automatically? keeping it manual for safety
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
                <h2 className="text-xl font-bold mb-4 text-slate-800">Atualizar Investimento</h2>
                
                {/* Tabs */}
                <div className="flex p-1 bg-slate-100 rounded-lg mb-6">
                    <button 
                        onClick={() => { setMode('yield'); setValue(''); }} 
                        className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${mode === 'yield' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                    >
                        Rendimento Diário
                    </button>
                    <button 
                        onClick={() => { setMode('total'); setValue(''); }} 
                        className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${mode === 'total' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                    >
                        Correção de Saldo
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <p className="text-xs text-slate-500 uppercase font-semibold">Saldo Atual</p>
                        <p className="text-lg font-bold text-slate-700">{formatCurrency(cdb.currentGrossBalance)}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            {mode === 'yield' ? 'Valor do Rendimento (+)' : 'Novo Saldo Total (=)'}
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
                        <label className="block text-sm font-medium text-slate-700 mb-1">Data de Referência</label>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="input-style"
                            required
                        />
                        {mode === 'yield' && <p className="text-xs text-slate-400 mt-1">Dica: Use "Salvar e Adicionar Outro" para lançar vários dias.</p>}
                    </div>

                    {value && (
                        <div className="flex justify-between items-center text-sm px-2">
                             <span className="text-slate-500">Novo Saldo Estimado:</span>
                             <div className="text-right">
                                <span className="font-bold text-slate-800 block">{formatCurrency(newEstimatedBalance)}</span>
                                {mode === 'total' && (
                                    <span className={`text-xs ${diff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                        ({diff >= 0 ? '+' : ''}{formatCurrency(diff)})
                                    </span>
                                )}
                             </div>
                        </div>
                    )}

                    <div className="flex flex-col gap-2 pt-4">
                        {mode === 'yield' && (
                            <button 
                                type="button" 
                                onClick={() => handleSave(false)} 
                                disabled={isSaving || !value}
                                className="w-full py-2 bg-blue-100 text-blue-700 font-semibold rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
                            >
                                Salvar e Adicionar Outro
                            </button>
                        )}
                        <div className="flex gap-2">
                            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
                            <button 
                                type="button" 
                                onClick={() => handleSave(true)} 
                                disabled={isSaving || !value}
                                className="btn-primary flex-1"
                            >
                                Salvar e Fechar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const InvestmentsPage: React.FC = () => {
    const { cdbs, addCDB, updateCDB, deleteCDB } = useCDBs();
    const { addTransactions } = useTransactions();
    const { accounts } = useAccounts();
    const { categories } = useCategories();

    const [view, setView] = useState<'dashboard' | 'form'>('dashboard');
    
    // Form States
    const [name, setName] = useState('');
    const [bank, setBank] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [amount, setAmount] = useState('');
    const [rate, setRate] = useState('');
    const [maturity, setMaturity] = useState('');
    const [accountId, setAccountId] = useState('');
    const [categoryId, setCategoryId] = useState('');

    // Modals
    const [redemptionCdb, setRedemptionCdb] = useState<CDBContract | null>(null);
    const [updateBalanceCdb, setUpdateBalanceCdb] = useState<CDBContract | null>(null);

    // Helpers
    const activeAccounts = useMemo(() => accounts.filter(a => a.isActive), [accounts]);
    
    // Find generic investment category or fallback
    const investmentCategoryOptions = useMemo(() => {
        return categories
            .filter(c => c.type === TransactionType.EXPENSE)
            .flatMap(c => c.subcategories.flatMap(s => s.items.map(i => ({...i, fullName: `${c.name} > ${s.name} > ${i.name}`}))))
            .filter(i => i.fullName.toLowerCase().includes('investimento') || i.fullName.toLowerCase().includes('aplicação') || i.fullName.toLowerCase().includes('cdb'));
    }, [categories]);

    // Summary calculations
    const totalEquity = useMemo(() => cdbs.reduce((acc, cdb) => acc + cdb.currentGrossBalance, 0), [cdbs]);
    const totalInvested = useMemo(() => cdbs.reduce((acc, cdb) => acc + cdb.principalAmount, 0), [cdbs]);
    const totalProfit = totalEquity - totalInvested;

    const handleCreateCDB = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!name || !bank || !amount || !accountId) {
            alert("Preencha os campos obrigatórios.");
            return;
        }

        const principal = parseFloat(amount);
        
        // 1. Create CDB
        const newCDB: Omit<CDBContract, 'id'> = {
            name,
            bank,
            applicationDate: date,
            principalAmount: principal,
            rateDescription: rate,
            currentGrossBalance: principal, // Starts equal to principal
            isActive: true,
            ...(maturity ? { maturityDate: maturity } : {})
        };

        const cdbId = await addCDB(newCDB);

        if (cdbId) {
            // 2. Create Expense Transaction
            let selectedItemId = categoryId;
            if (!selectedItemId && investmentCategoryOptions.length > 0) {
                selectedItemId = investmentCategoryOptions[0].id; // Default to first found
            }

            const transaction: Omit<Transaction, 'id'> = {
                description: `Aplicação em CDB: ${name}`,
                amount: principal,
                date: date,
                type: TransactionType.EXPENSE,
                accountId: accountId,
                itemId: selectedItemId // Can be undefined if user didn't select and we didn't find one
            };

            await addTransactions([transaction]);

            // Reset form
            setName('');
            setBank('');
            setAmount('');
            setRate('');
            setMaturity('');
            setAccountId('');
            setView('dashboard');
        }
    };

    const handleRedeem = async (redeemAmount: number, redeemDate: string) => {
        if (!redemptionCdb) return;

        // 1. Calculate Split
        // Logic: Proportion of redemption relative to current total balance
        const proportion = redeemAmount / redemptionCdb.currentGrossBalance;
        const principalPart = redemptionCdb.principalAmount * proportion;
        const profitPart = redeemAmount - principalPart;

        const remainingPrincipal = redemptionCdb.principalAmount - principalPart;
        const remainingBalance = redemptionCdb.currentGrossBalance - redeemAmount;

        // 2. Update CDB
        const updatedCDB: CDBContract = {
            ...redemptionCdb,
            principalAmount: Math.max(0, remainingPrincipal),
            currentGrossBalance: Math.max(0, remainingBalance),
            isActive: remainingBalance > 1 // If practically empty, mark inactive? Or keep active with 0. Let's keep active.
        };
        
        // If fully redeemed (allow small floating point margin)
        if (remainingBalance < 0.01) {
             updatedCDB.isActive = false;
        }

        const success = await updateCDB(updatedCDB);

        if (success) {
            // 3. Create Transactions (Income)
            // A. Principal Return (Transfer/Neutro)
            // Need a category for "Resgate de Aplicação"
            const principalTx: Omit<Transaction, 'id'> = {
                description: `Resgate Principal: ${redemptionCdb.name}`,
                amount: principalPart,
                date: redeemDate,
                type: TransactionType.INCOME,
                accountId: accounts[0]?.id || '', // Ideally user selects, simplified here to first account or we need a selector in modal
                itemId: '' // Ideally "Transferência/Resgate" category
            };

            // B. Profit (Revenue)
            const profitTx: Omit<Transaction, 'id'> = {
                description: `Rendimento CDB: ${redemptionCdb.name}`,
                amount: profitPart,
                date: redeemDate,
                type: TransactionType.INCOME,
                accountId: accounts[0]?.id || '',
                itemId: '' // Ideally "Rendimentos" category
            };
            
            // Note: Since we don't have an account selector in the redemption modal to keep it simple as per prompt,
            // we will default to the FIRST active account. In a real app, we'd add an account select to the modal.
            if (activeAccounts.length > 0) {
                principalTx.accountId = activeAccounts[0].id;
                profitTx.accountId = activeAccounts[0].id;
            }

            // Filter out profit transaction if negligible
            const txs = [principalTx];
            if (profitPart > 0.01) txs.push(profitTx);

            await addTransactions(txs);
            setRedemptionCdb(null);
        }
    };

    const handleUpdateBalance = async (value: number, txDate: string, mode: 'yield' | 'total') => {
        if (!updateBalanceCdb) return;

        let diff = 0;
        let newGrossBalance = 0;

        if (mode === 'yield') {
            diff = value;
            newGrossBalance = updateBalanceCdb.currentGrossBalance + value;
        } else {
            diff = value - updateBalanceCdb.currentGrossBalance;
            newGrossBalance = value;
        }

        // 1. Create Transaction (if profit/loss)
        // We record the transaction to track history of gains
        if (Math.abs(diff) > 0.00) {
             const transaction: Omit<Transaction, 'id'> = {
                description: mode === 'yield' 
                    ? `Rendimento Diário: ${updateBalanceCdb.name}` 
                    : `Correção Saldo CDB: ${updateBalanceCdb.name}`,
                amount: Math.abs(diff),
                date: txDate,
                type: diff > 0 ? TransactionType.INCOME : TransactionType.EXPENSE,
                accountId: accounts.find(a => a.isActive)?.id || '', // Assign to default account or virtual account to keep track of Income
                itemId: '' // TODO: Link to "Rendimentos" category
            };
            
            // Note: In a double-entry system, "Accrued Interest" usually doesn't hit a bank account immediately.
            // However, to show up in "Reports > Income", we need it as a Transaction.
            // For now, we assign it to the first active account but users might prefer a "Virtual Investment Account".
            // To avoid messing up Bank Balances, advanced users would create a "Corretora" account.
            
            await addTransactions([transaction]);
        }

        // 2. Update CDB Balance
        // Even if we are adding a yield for a PAST date, the "Current Gross Balance" 
        // effectively increases by that amount relative to what it is now.
        const updatedCDB: CDBContract = {
            ...updateBalanceCdb,
            currentGrossBalance: newGrossBalance
        };
        
        await updateCDB(updatedCDB);
        
        // Update local state references if needed, though hook handles it
        // If "Save & Add Another" is used, we need to update the base reference for next calculation
        setUpdateBalanceCdb(updatedCDB);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Deseja excluir este registro de investimento? Isso não excluirá as transações financeiras já lançadas.')) {
            await deleteCDB(id);
        }
    }

    if (view === 'form') {
        return (
            <div className="max-w-3xl mx-auto">
                <button onClick={() => setView('dashboard')} className="mb-4 text-sm text-blue-600 hover:underline flex items-center">
                    <ArrowUturnLeftIcon className="w-4 h-4 mr-1" /> Voltar ao Dashboard
                </button>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6">Novo Investimento em CDB</h2>
                    <form onSubmit={handleCreateCDB} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do CDB *</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: CDB Liquidez Diária" required className="input-style" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Banco / Corretora *</label>
                                <input type="text" value={bank} onChange={e => setBank(e.target.value)} placeholder="Ex: XP, NuInvest..." required className="input-style" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Valor Aplicado *</label>
                                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" step="0.01" required className="input-style" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Data da Aplicação *</label>
                                <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="input-style" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Taxa de Rendimento</label>
                                <input type="text" value={rate} onChange={e => setRate(e.target.value)} placeholder="Ex: 110% do CDI" className="input-style" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Vencimento (Opcional)</label>
                                <input type="date" value={maturity} onChange={e => setMaturity(e.target.value)} className="input-style" />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                            <h3 className="text-sm font-semibold text-slate-800 mb-3">Vinculação Financeira</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Conta de Origem *</label>
                                    <select value={accountId} onChange={e => setAccountId(e.target.value)} required className="input-style">
                                        <option value="">Selecione...</option>
                                        {activeAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                    </select>
                                    <p className="text-xs text-slate-500 mt-1">Será gerado um lançamento de saída nesta conta.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Categoria (Despesa)</label>
                                    <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="input-style">
                                        <option value="">Automático (Investimentos)</option>
                                        {investmentCategoryOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.fullName}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button type="submit" className="btn-primary">Registrar Investimento</button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Top Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-sm font-medium">Patrimônio em CDB</p>
                    <p className="text-3xl font-bold text-slate-800">{formatCurrency(totalEquity)}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-sm font-medium">Total Investido (Principal)</p>
                    <p className="text-3xl font-bold text-blue-600">{formatCurrency(totalInvested)}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-sm font-medium">Rendimento Acumulado</p>
                    <p className="text-3xl font-bold text-green-600">{formatCurrency(totalProfit)}</p>
                </div>
            </div>

            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800">Meus CDBs</h2>
                <button onClick={() => setView('form')} className="btn-primary flex items-center gap-2">
                    <PlusIcon className="w-5 h-5" /> Novo Aporte
                </button>
            </div>

            {/* CDB List */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-slate-500 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-3">Nome / Banco</th>
                                <th className="px-6 py-3">Aplicação</th>
                                <th className="px-6 py-3 text-right">Valor Aplicado</th>
                                <th className="px-6 py-3 text-right">Saldo Bruto</th>
                                <th className="px-6 py-3 text-right">Rendimento</th>
                                <th className="px-6 py-3 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {cdbs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                        Nenhum investimento registrado.
                                    </td>
                                </tr>
                            ) : (
                                cdbs.filter(c => c.isActive).map(cdb => {
                                    const profit = cdb.currentGrossBalance - cdb.principalAmount;
                                    const profitPercent = cdb.principalAmount > 0 ? (profit / cdb.principalAmount) * 100 : 0;
                                    return (
                                        <tr key={cdb.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-slate-800">{cdb.name}</p>
                                                <p className="text-xs text-slate-500">{cdb.bank} • {cdb.rateDescription}</p>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {formatDate(cdb.applicationDate)}
                                                {cdb.maturityDate && <span className="block text-xs text-slate-400">Vence: {formatDate(cdb.maturityDate)}</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-slate-700">
                                                {formatCurrency(cdb.principalAmount)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 group">
                                                    <span className="font-bold text-slate-800">{formatCurrency(cdb.currentGrossBalance)}</span>
                                                    <button 
                                                        onClick={() => setUpdateBalanceCdb(cdb)} 
                                                        className="p-1 text-slate-300 hover:text-green-600 transition-colors"
                                                        title="Atualizar rendimento"
                                                    >
                                                        <UpArrowIcon className="w-4 h-4"/>
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <p className={`font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                    {formatCurrency(profit)}
                                                </p>
                                                <p className="text-xs text-slate-400">{profitPercent.toFixed(2)}%</p>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button 
                                                        onClick={() => setRedemptionCdb(cdb)}
                                                        className="px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded-full text-xs font-semibold transition-colors"
                                                    >
                                                        Resgatar
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(cdb.id)} 
                                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                                        title="Excluir"
                                                    >
                                                        <TrashIcon className="w-4 h-4"/>
                                                    </button>
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

            {/* Modals */}
            {redemptionCdb && (
                <RedemptionModal 
                    isOpen={!!redemptionCdb} 
                    onClose={() => setRedemptionCdb(null)} 
                    cdb={redemptionCdb} 
                    onRedeem={handleRedeem} 
                />
            )}

            {updateBalanceCdb && (
                <UpdateBalanceModal
                    isOpen={!!updateBalanceCdb}
                    onClose={() => setUpdateBalanceCdb(null)}
                    cdb={updateBalanceCdb}
                    onUpdate={handleUpdateBalance}
                />
            )}
        </div>
    );
};

export default InvestmentsPage;
