
import React, { useState, useMemo } from 'react';
import { useCDBs, useTransactions, useAccounts, useCategories } from '../hooks/useFirestore';
import { CDBContract, Transaction, TransactionType } from '../types';
import MoneyIcon from '../components/icons/MoneyIcon';
import PlusIcon from '../components/icons/PlusIcon';
import ArrowUturnLeftIcon from '../components/icons/ArrowUturnLeftIcon';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';

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
    onUpdate: (newBalance: number) => Promise<void>;
}> = ({ isOpen, onClose, cdb, onUpdate }) => {
    const [balance, setBalance] = useState(String(cdb.currentGrossBalance));

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newBalance = parseFloat(balance);
        if (isNaN(newBalance) || newBalance < 0) {
            alert('Valor inválido.');
            return;
        }
        await onUpdate(newBalance);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4 text-slate-800">Atualizar Saldo Bruto</h2>
                <p className="text-sm text-slate-500 mb-4">Atualize o valor atual do investimento conforme extrato da corretora.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Novo Saldo Atual</label>
                        <input
                            type="number"
                            value={balance}
                            onChange={e => setBalance(e.target.value)}
                            className="input-style"
                            step="0.01"
                            required
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                        <button type="submit" className="btn-primary">Salvar</button>
                    </div>
                </form>
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

    const handleUpdateBalance = async (newBalance: number) => {
        if (!updateBalanceCdb) return;
        await updateCDB({
            ...updateBalanceCdb,
            currentGrossBalance: newBalance
        });
        setUpdateBalanceCdb(null);
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
                                                        className="p-1 text-slate-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        title="Atualizar saldo"
                                                    >
                                                        <PencilIcon className="w-3 h-3"/>
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
