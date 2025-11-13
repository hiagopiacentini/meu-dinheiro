
import React, { useState, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Loan, Account, Transaction, TransactionType } from '../types';
import TrashIcon from '../components/icons/TrashIcon';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const formatDate = (dateString: string) => {
    if (!dateString) return '';
    // Add timezone offset to prevent date from changing
    const date = new Date(dateString);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString('pt-BR');
};


const sampleLoans: Loan[] = [
    {
        id: 'loan-1',
        description: 'Reserva de Emergência',
        amount: 1500,
        date: '2024-05-30',
        lenderAccountId: 'itau-1',
        borrowerAccountId: 'bradesco-1',
        status: 'active',
        initialTransactionId: 't-loan-1'
    },
    {
        id: 'loan-2',
        description: 'Adiantamento Fatura',
        amount: 750,
        date: '2024-05-20',
        lenderAccountId: 'bradesco-1',
        borrowerAccountId: 'itau-1',
        status: 'active',
        initialTransactionId: 't-loan-2'
    },
    {
        id: 'loan-3',
        description: 'Compra Online',
        amount: 300,
        date: '2024-04-15',
        lenderAccountId: 'nubank-1',
        borrowerAccountId: 'itau-1',
        status: 'paid',
        initialTransactionId: 't-loan-3',
        settlementTransactionId: 't-settle-3'
    }
];

const LoansPage: React.FC = () => {
    const [loans, setLoans] = useLocalStorage<Loan[]>('loans', sampleLoans);
    const [transactions, setTransactions] = useLocalStorage<Transaction[]>('transactions', []);
    const [accounts] = useLocalStorage<Account[]>('accounts', []);

    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [lenderAccountId, setLenderAccountId] = useState('');
    const [borrowerAccountId, setBorrowerAccountId] = useState('');

    const accountMap = useMemo(() => new Map(accounts.map(acc => [acc.id, acc.name])), [accounts]);
    const activeAccounts = useMemo(() => accounts.filter(a => a.isActive), [accounts]);

    const handleRegisterLoan = (e: React.FormEvent) => {
        e.preventDefault();
        if (!description || !amount || !lenderAccountId || !borrowerAccountId) {
            alert('Por favor, preencha todos os campos.');
            return;
        }
        if (lenderAccountId === borrowerAccountId) {
            alert('A conta de origem e destino não podem ser a mesma.');
            return;
        }

        const loanAmount = parseFloat(amount);
        const newTransaction: Transaction = {
            id: crypto.randomUUID(),
            description: `Empréstimo: ${description}`,
            amount: loanAmount,
            date: new Date().toISOString().split('T')[0],
            type: TransactionType.TRANSFER,
            accountId: lenderAccountId,
            destinationAccountId: borrowerAccountId,
        };
        const newLoan: Loan = {
            id: crypto.randomUUID(),
            description,
            amount: loanAmount,
            date: new Date().toISOString().split('T')[0],
            lenderAccountId,
            borrowerAccountId,
            status: 'active',
            initialTransactionId: newTransaction.id,
        };
        setTransactions(prev => [...prev, newTransaction]);
        setLoans(prev => [...prev, newLoan]);

        // Reset form
        setDescription('');
        setAmount('');
        setLenderAccountId('');
        setBorrowerAccountId('');
    };

    const handleDeleteLoan = (id: string) => {
      if(window.confirm('Tem certeza que deseja excluir este empréstimo? A transação associada também será removida.')) {
        const loanToDelete = loans.find(l => l.id === id);
        if (!loanToDelete) return;

        const txIdsToDelete = [loanToDelete.initialTransactionId];
        if(loanToDelete.settlementTransactionId) {
            txIdsToDelete.push(loanToDelete.settlementTransactionId);
        }

        setTransactions(prev => prev.filter(t => !txIdsToDelete.includes(t.id)));
        setLoans(prev => prev.filter(l => l.id !== id));
      }
    }
    
    const handleSettleLoan = (loan: Loan) => {
        if(window.confirm('Deseja quitar este empréstimo? Uma transação de devolução será criada.')) {
            const settlementTransaction: Transaction = {
                id: crypto.randomUUID(),
                description: `Quitação Empréstimo: ${loan.description}`,
                amount: loan.amount,
                date: new Date().toISOString().split('T')[0],
                type: TransactionType.TRANSFER,
                accountId: loan.borrowerAccountId, // Payer is the original borrower
                destinationAccountId: loan.lenderAccountId, // Payee is the original lender
            };

            setTransactions(prev => [...prev, settlementTransaction]);
            setLoans(prev => prev.map(l => l.id === loan.id ? { ...l, status: 'paid', settlementTransactionId: settlementTransaction.id } : l));
        }
    };

    const getSettlementDate = (loan: Loan) => {
        if (!loan.settlementTransactionId) return '';
        const transaction = transactions.find(t => t.id === loan.settlementTransactionId);
        return transaction ? formatDate(transaction.date) : '';
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="loan-value" className="block text-sm font-medium text-slate-700 mb-1">Valor</label>
                            <input type="number" id="loan-value" value={amount} onChange={e => setAmount(e.target.value)} required step="0.01" min="0" className="input-style" placeholder="R$ 0,00" />
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
                         <div className="sm:col-span-2 lg:col-span-3">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {sortedLoans.map(loan => {
                            const isPaid = loan.status === 'paid';
                            return (
                                <div key={loan.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
                                    <div className="flex-grow">
                                        <div className="flex justify-between items-start">
                                            <h3 className="text-xl font-bold text-slate-800 pr-2">{loan.description}</h3>
                                            {isPaid && <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-1 rounded-full">Quitado</span>}
                                        </div>
                                        <p className="text-sm text-slate-500 mt-1">
                                            {accountMap.get(loan.lenderAccountId) || 'N/A'} → {accountMap.get(loan.borrowerAccountId) || 'N/A'}
                                        </p>

                                        <div className={`mt-6 grid ${isPaid ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                                            <div>
                                                <p className="text-sm text-slate-500">Valor</p>
                                                <p className="font-bold text-slate-800 text-lg">{formatCurrency(loan.amount)}</p>
                                            </div>
                                            {isPaid && (
                                                <div>
                                                    <p className="text-sm text-slate-500">Quitado em</p>
                                                    <p className="font-bold text-slate-800 text-lg">{getSettlementDate(loan)}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-4 border-t border-slate-200">
                                        {isPaid ? (
                                        <button className="btn-secondary w-full" disabled>Ver Histórico</button>
                                        ) : (
                                        <div className="flex items-center space-x-2">
                                            <button onClick={() => handleSettleLoan(loan)} className="btn-primary w-full">Quitar</button>
                                            <button onClick={() => handleDeleteLoan(loan.id)} className="btn-secondary w-full flex items-center justify-center gap-2 hover:bg-red-50 hover:border-red-300 hover:text-red-700">
                                                <TrashIcon className="w-4 h-4" />
                                                Excluir
                                            </button>
                                        </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LoansPage;