
import React, { useState, useMemo } from 'react';
import { useLoans, useTransactions, useAccounts } from '../hooks/useFirestore';
import { Loan, Account, Transaction, TransactionType } from '../types';
import TrashIcon from '../components/icons/TrashIcon';
import XIcon from '../components/icons/XIcon';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};
const getTodayLocalDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};


const PartialSettlementModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (amount: number, date: string) => Promise<void>;
    loan: Loan;
    remainingAmount: number;
}> = ({ isOpen, onClose, onSave, loan, remainingAmount }) => {
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(getTodayLocalDate());

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const settleAmount = parseFloat(amount);
        if(isNaN(settleAmount) || settleAmount <= 0 || settleAmount > remainingAmount) {
            alert(`Por favor, insira um valor válido, maior que zero e menor ou igual a ${formatCurrency(remainingAmount)}.`);
            return;
        }
        await onSave(settleAmount, date);
        setAmount('');
        setDate(getTodayLocalDate());
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-4 text-slate-800">Quitar Parcialmente</h2>
                <p className="text-slate-600 mb-1">Empréstimo: <span className="font-semibold">{loan.description}</span></p>
                <p className="text-slate-600 mb-6">Valor restante: <span className="font-semibold">{formatCurrency(remainingAmount)}</span></p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="partial-amount" className="block text-sm font-medium text-slate-700 mb-1">Valor a quitar</label>
                            <input
                                type="number"
                                id="partial-amount"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="input-style"
                                placeholder="0,00"
                                step="0.01"
                                min="0.01"
                                max={remainingAmount}
                                required
                                autoFocus
                            />
                        </div>
                        <div>
                            <label htmlFor="partial-date" className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                            <input
                                type="date"
                                id="partial-date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="input-style"
                                required
                            />
                        </div>
                    </div>
                    <div className="flex justify-end space-x-3 pt-6">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                        <button type="submit" className="btn-primary">Salvar Pagamento</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const SettleLoanModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSettle: (date: string) => Promise<void>;
    loan: Loan;
    remainingAmount: number;
}> = ({ isOpen, onClose, onSettle, loan, remainingAmount }) => {
    const [date, setDate] = useState(getTodayLocalDate());

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSettle(date);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-4 text-slate-800">Quitar Empréstimo</h2>
                <p className="text-slate-600 mb-1">Empréstimo: <span className="font-semibold">{loan.description}</span></p>
                <p className="text-slate-600 mb-6">Será quitado o valor restante de <span className="font-semibold">{formatCurrency(remainingAmount)}</span>.</p>
                <form onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="settle-date" className="block text-sm font-medium text-slate-700 mb-1">Data da Quitação</label>
                        <input
                            type="date"
                            id="settle-date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="input-style"
                            required
                        />
                    </div>
                    <div className="flex justify-end space-x-3 pt-6">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                        <button type="submit" className="btn-primary">Confirmar Quitação</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const LoanHistoryModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    loan: Loan | null;
    transactions: Transaction[];
}> = ({ isOpen, onClose, loan, transactions }) => {
    if (!isOpen || !loan) return null;

    const historyTransactions = transactions.filter(t => 
        t.id === loan.initialTransactionId || 
        t.id === loan.settlementTransactionId ||
        loan.partialSettlements?.some(p => p.transactionId === t.id)
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg m-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-slate-800">Histórico do Empréstimo</h2>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100"><XIcon className="w-5 h-5 text-slate-500"/></button>
                </div>
                <p className="text-slate-600 mb-6 font-semibold">{loan.description}</p>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {historyTransactions.map(t => (
                        <div key={t.id} className="p-3 border border-slate-200 rounded-lg">
                            <p className="font-semibold text-slate-800">{t.description}</p>
                            <div className="flex justify-between items-center text-sm mt-1">
                                <span className="text-slate-500">{formatDate(t.date)}</span>
                                <span className="font-bold text-slate-700">{formatCurrency(t.amount)}</span>
                            </div>
                        </div>
                    ))}
                </div>
                 <div className="flex justify-end pt-6">
                    <button type="button" onClick={onClose} className="btn-secondary">Fechar</button>
                </div>
            </div>
        </div>
    );
};


const LoansPage: React.FC = () => {
    const { loans, addLoan, updateLoan, deleteLoan } = useLoans();
    const { transactions, addTransaction, deleteTransactions } = useTransactions();
    const { accounts } = useAccounts();

    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(getTodayLocalDate());
    const [lenderAccountId, setLenderAccountId] = useState('');
    const [borrowerAccountId, setBorrowerAccountId] = useState('');

    const [isPartialModalOpen, setIsPartialModalOpen] = useState(false);
    const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

    const accountMap = useMemo(() => new Map(accounts.map(acc => [acc.id, acc.name])), [accounts]);
    const activeAccounts = useMemo(() => accounts.filter(a => a.isActive), [accounts]);

    const handleRegisterLoan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description || !amount || !lenderAccountId || !borrowerAccountId || !date) {
            alert('Por favor, preencha todos os campos.');
            return;
        }
        if (lenderAccountId === borrowerAccountId) {
            alert('A conta de origem e destino não podem ser a mesma.');
            return;
        }

        const loanAmount = parseFloat(amount);
        const newTransaction: Omit<Transaction, 'id'> = {
            description: `Empréstimo: ${description}`,
            amount: loanAmount,
            date: date,
            type: TransactionType.TRANSFER,
            accountId: lenderAccountId,
            destinationAccountId: borrowerAccountId,
        };
        
        const txId = await addTransaction(newTransaction);
        if(!txId) return;

        const newLoan: Omit<Loan, 'id'> = {
            description,
            amount: loanAmount,
            date,
            lenderAccountId,
            borrowerAccountId,
            status: 'active',
            initialTransactionId: txId,
        };
        
        const loanId = await addLoan(newLoan);
        if (loanId) {
            setDescription('');
            setAmount('');
            setDate(getTodayLocalDate());
            setLenderAccountId('');
            setBorrowerAccountId('');
        }
    };

    const handleDeleteLoan = async (id: string) => {
      if(window.confirm('Tem certeza que deseja excluir este empréstimo? Todas as transações associadas serão removidas.')) {
        const loanToDelete = loans.find(l => l.id === id);
        if (!loanToDelete) return;

        const txIdsToDelete = [loanToDelete.initialTransactionId];
        if(loanToDelete.settlementTransactionId) txIdsToDelete.push(loanToDelete.settlementTransactionId);
        loanToDelete.partialSettlements?.forEach(p => txIdsToDelete.push(p.transactionId));
        
        const validIds = txIdsToDelete.filter(Boolean) as string[];

        const txSuccess = await deleteTransactions(validIds);
        if(txSuccess) {
            await deleteLoan(id);
        }
      }
    }
    
    const handleSettleLoan = async (settleDate: string) => {
        if (!selectedLoan) return;
        const remaining = calculateRemainingAmount(selectedLoan);
        
        const settlementTransaction: Omit<Transaction, 'id'> = {
            description: `Quitação Empréstimo: ${selectedLoan.description}`,
            amount: remaining,
            date: settleDate,
            type: TransactionType.TRANSFER,
            accountId: selectedLoan.borrowerAccountId,
            destinationAccountId: selectedLoan.lenderAccountId,
        };
        
        const txId = await addTransaction(settlementTransaction);
        if (txId) {
             await updateLoan({ ...selectedLoan, status: 'paid', settlementTransactionId: txId });
             setIsSettleModalOpen(false);
             setSelectedLoan(null);
        }
    };
    
    const handlePartialSettle = async (settleAmount: number, settleDate: string) => {
        if (!selectedLoan) return;
        const partialTransaction: Omit<Transaction, 'id'> = {
            description: `Pgto. Parcial Empréstimo: ${selectedLoan.description}`,
            amount: settleAmount,
            date: settleDate,
            type: TransactionType.TRANSFER,
            accountId: selectedLoan.borrowerAccountId,
            destinationAccountId: selectedLoan.lenderAccountId,
        };
        
        const txId = await addTransaction(partialTransaction);
        
        if (txId) {
            const newPartial = {
                transactionId: txId,
                amount: settleAmount,
                date: settleDate
            };
            const partials = selectedLoan.partialSettlements ? [...selectedLoan.partialSettlements, newPartial] : [newPartial];
            await updateLoan({ ...selectedLoan, partialSettlements: partials });
            
            setIsPartialModalOpen(false);
            setSelectedLoan(null);
        }
    };

    const calculateRemainingAmount = (loan: Loan) => {
        const paidAmount = loan.partialSettlements?.reduce((sum, p) => sum + p.amount, 0) || 0;
        return loan.amount - paidAmount;
    };

    const sortedLoans = useMemo(() => {
        return [...loans].sort((a, b) => {
            if (a.status === 'active' && b.status === 'paid') return -1;
            if (a.status === 'paid' && b.status === 'active') return 1;
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
    }, [loans]);

    return (
        <div className="space-y-8">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h2 className="text-lg font-bold text-slate-800 mb-4">Registrar Novo Empréstimo Interno</h2>
                 <form onSubmit={handleRegisterLoan} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label htmlFor="loan-value" className="block text-sm font-medium text-slate-700 mb-1">Valor</label>
                            <input type="number" id="loan-value" value={amount} onChange={e => setAmount(e.target.value)} required step="0.01" min="0" className="input-style" placeholder="R$ 0,00" />
                        </div>
                        <div>
                            <label htmlFor="loan-date" className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                            <input type="date" id="loan-date" value={date} onChange={e => setDate(e.target.value)} required className="input-style" />
                        </div>
                        <div>
                            <label htmlFor="lender-account" className="block text-sm font-medium text-slate-700 mb-1">Conta de Origem</label>
                            <select id="lender-account" value={lenderAccountId} onChange={e => setLenderAccountId(e.target.value)} required className="input-style">
                                <option value="" disabled>Selecione...</option>
                                {activeAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="borrower-account" className="block text-sm font-medium text-slate-700 mb-1">Conta de Destino</label>
                            <select id="borrower-account" value={borrowerAccountId} onChange={e => setBorrowerAccountId(e.target.value)} required className="input-style">
                                <option value="" disabled>Selecione...</option>
                                {activeAccounts.filter(a => a.id !== lenderAccountId).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                            </select>
                        </div>
                         <div className="sm:col-span-2 lg:col-span-4">
                            <label htmlFor="loan-desc" className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                            <input type="text" id="loan-desc" value={description} onChange={e => setDescription(e.target.value)} required className="input-style" placeholder="Ex: Reserva de emergência" />
                        </div>
                    </div>
                    <div className="flex justify-end pt-2">
                        <button type="submit" className="btn-primary">Registrar Transferência</button>
                    </div>
                </form>
            </div>

             <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-4">Empréstimos Ativos</h2>
                {loans.length === 0 ? (
                    <p className="text-center text-slate-500 py-8">Nenhum empréstimo registrado.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sortedLoans.map(loan => {
                            const isPaid = loan.status === 'paid';
                            const remainingAmount = calculateRemainingAmount(loan);
                            return (
                                <div key={loan.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
                                    <div className="flex-grow">
                                        <div className="flex justify-between items-start">
                                            <h3 className="text-xl font-bold text-slate-800 pr-2">{loan.description}</h3>
                                            <div className="flex items-center space-x-2 flex-shrink-0">
                                              {isPaid ? <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-1 rounded-full">Quitado</span> : <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2.5 py-1 rounded-full">Ativo</span>}
                                              {!isPaid && (
                                                <button onClick={() => handleDeleteLoan(loan.id)} className="p-1.5 rounded-full text-slate-400 hover:bg-red-100 hover:text-red-600" aria-label="Excluir empréstimo">
                                                    <TrashIcon className="w-4 h-4"/>
                                                </button>
                                              )}
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-500 mt-1">
                                            {accountMap.get(loan.lenderAccountId) || 'N/A'} → {accountMap.get(loan.borrowerAccountId) || 'N/A'}
                                        </p>

                                        <div className="mt-6 grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm text-slate-500">Valor Total</p>
                                                <p className="font-bold text-slate-800 text-lg">{formatCurrency(loan.amount)}</p>
                                            </div>
                                             <div>
                                                <p className="text-sm text-slate-500">Valor Restante</p>
                                                <p className={`font-bold text-lg ${remainingAmount > 0 && !isPaid ? 'text-red-600' : 'text-slate-800'}`}>{formatCurrency(isPaid ? 0 : remainingAmount)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-4 border-t border-slate-200 flex items-center space-x-2">
                                        <button onClick={() => { setSelectedLoan(loan); setIsHistoryModalOpen(true); }} className="btn-secondary w-full">Ver Histórico</button>
                                        {!isPaid ? (
                                        <>
                                            <button onClick={() => { setSelectedLoan(loan); setIsPartialModalOpen(true); }} className="btn-secondary w-full">Parcial</button>
                                            <button onClick={() => { setSelectedLoan(loan); setIsSettleModalOpen(true); }} className="btn-primary w-full">Quitar</button>
                                        </>
                                        ) : (
                                        <button onClick={() => handleDeleteLoan(loan.id)} className="btn-secondary w-full flex items-center justify-center gap-2 hover:bg-red-50 hover:border-red-300 hover:text-red-700">
                                            <TrashIcon className="w-4 h-4" /> Excluir
                                        </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {selectedLoan && (
              <>
                <PartialSettlementModal 
                    isOpen={isPartialModalOpen}
                    onClose={() => { setIsPartialModalOpen(false); setSelectedLoan(null); }}
                    onSave={handlePartialSettle}
                    loan={selectedLoan}
                    remainingAmount={calculateRemainingAmount(selectedLoan)}
                />
                <SettleLoanModal
                    isOpen={isSettleModalOpen}
                    onClose={() => { setIsSettleModalOpen(false); setSelectedLoan(null); }}
                    onSettle={handleSettleLoan}
                    loan={selectedLoan}
                    remainingAmount={calculateRemainingAmount(selectedLoan)}
                />
                <LoanHistoryModal
                    isOpen={isHistoryModalOpen}
                    onClose={() => { setIsHistoryModalOpen(false); setSelectedLoan(null); }}
                    loan={selectedLoan}
                    transactions={transactions}
                />
              </>
            )}
        </div>
    );
};

export default LoansPage;
