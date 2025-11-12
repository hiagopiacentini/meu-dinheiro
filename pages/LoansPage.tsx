import React, { useState, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Loan, Account, Transaction, TransactionType } from '../types';
import PlusIcon from '../components/icons/PlusIcon';
import TrashIcon from '../components/icons/TrashIcon';
import PencilIcon from '../components/icons/PencilIcon';
import CheckIcon from '../components/icons/CheckIcon';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

const LoanModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (loan: Omit<Loan, 'id' | 'status' | 'initialTransactionId' | 'settlementTransactionId'> | Loan) => void;
    loan: Omit<Loan, 'status' | 'initialTransactionId' | 'settlementTransactionId'> | Loan | null;
    accounts: Account[];
}> = ({ isOpen, onClose, onSave, loan, accounts }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [lenderAccountId, setLenderAccountId] = useState('');
    const [borrowerAccountId, setBorrowerAccountId] = useState('');

    React.useEffect(() => {
        if (loan) {
            setDescription(loan.description);
            setAmount(String(loan.amount));
            setDate(loan.date);
            setLenderAccountId(loan.lenderAccountId);
            setBorrowerAccountId(loan.borrowerAccountId);
        } else {
            setDescription('');
            setAmount('');
            setDate(new Date().toISOString().split('T')[0]);
            setLenderAccountId('');
            setBorrowerAccountId('');
        }
    }, [loan, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!description || !amount || !date || !lenderAccountId || !borrowerAccountId) {
            alert('Por favor, preencha todos os campos.');
            return;
        }
        if (lenderAccountId === borrowerAccountId) {
            alert('A conta credora e devedora não podem ser a mesma.');
            return;
        }

        const loanData = {
            description,
            amount: parseFloat(amount),
            date,
            lenderAccountId,
            borrowerAccountId,
        };

        if(loan && 'id' in loan) {
            onSave({ ...loan, ...loanData });
        } else {
            onSave(loanData);
        }
    };
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
          <h2 className="text-2xl font-bold mb-6 text-slate-800">{loan ? 'Editar Empréstimo' : 'Novo Empréstimo'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700">Descrição *</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} required className="mt-1 block w-full input-style" />
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700">Valor *</label>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required step="0.01" min="0" className="mt-1 block w-full input-style" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Data *</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="mt-1 block w-full input-style" />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700">Conta Credora (empresta) *</label>
                <select value={lenderAccountId} onChange={e => setLenderAccountId(e.target.value)} required className="mt-1 block w-full input-style">
                    <option value="" disabled>Selecione...</option>
                    {accounts.filter(a => a.isActive).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
            </div>
             <div>
                <label className="block text-sm font-medium text-slate-700">Conta Devedora (recebe) *</label>
                <select value={borrowerAccountId} onChange={e => setBorrowerAccountId(e.target.value)} required className="mt-1 block w-full input-style">
                     <option value="" disabled>Selecione...</option>
                    {accounts.filter(a => a.isActive && a.id !== lenderAccountId).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
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

const LoansPage: React.FC = () => {
    const [loans, setLoans] = useLocalStorage<Loan[]>('loans', []);
    const [transactions, setTransactions] = useLocalStorage<Transaction[]>('transactions', []);
    const [accounts] = useLocalStorage<Account[]>('accounts', []);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLoan, setEditingLoan] = useState<Loan | null>(null);

    const accountMap = useMemo(() => new Map(accounts.map(acc => [acc.id, acc.name])), [accounts]);

    const handleOpenModal = (loan: Loan | null = null) => {
        setEditingLoan(loan);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingLoan(null);
    };

    const handleSaveLoan = (loanData: Omit<Loan, 'id' | 'status' | 'initialTransactionId' | 'settlementTransactionId'> | Loan) => {
        if ('id' in loanData) { // Editing
            const originalLoan = loans.find(l => l.id === loanData.id);
            if(!originalLoan) return;

            const newTransaction: Transaction = {
                id: crypto.randomUUID(),
                description: `Empréstimo (editado): ${loanData.description}`,
                amount: loanData.amount,
                date: loanData.date,
                type: TransactionType.TRANSFER,
                accountId: loanData.lenderAccountId,
                destinationAccountId: loanData.borrowerAccountId,
            };
            
            setTransactions(prev => [...prev.filter(t => t.id !== originalLoan.initialTransactionId), newTransaction]);
            setLoans(prev => prev.map(l => l.id === loanData.id ? {...loanData, initialTransactionId: newTransaction.id } : l));

        } else { // Creating
            const newTransaction: Transaction = {
                id: crypto.randomUUID(),
                description: `Empréstimo: ${loanData.description}`,
                amount: loanData.amount,
                date: loanData.date,
                type: TransactionType.TRANSFER,
                accountId: loanData.lenderAccountId,
                destinationAccountId: loanData.borrowerAccountId,
            };
            const newLoan: Loan = {
                ...loanData,
                id: crypto.randomUUID(),
                status: 'active',
                initialTransactionId: newTransaction.id,
            };
            setTransactions(prev => [...prev, newTransaction]);
            setLoans(prev => [...prev, newLoan]);
        }
        handleCloseModal();
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

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center p-4 sm:p-6 border-b border-slate-200 gap-4">
                <h2 className="text-xl font-bold">Gerenciar Empréstimos</h2>
                <button onClick={() => handleOpenModal()} className="btn-primary flex items-center justify-center space-x-2 w-full sm:w-auto">
                    <PlusIcon className="w-5 h-5" />
                    <span>Novo Empréstimo</span>
                </button>
            </div>
            
            {/* Desktop View */}
            <div className="overflow-x-auto hidden md:block">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                        <tr>
                            <th className="p-4 font-semibold">Descrição</th>
                            <th className="p-4 font-semibold">Contas (Credora → Devedora)</th>
                            <th className="p-4 font-semibold">Valor</th>
                            <th className="p-4 font-semibold">Data</th>
                            <th className="p-4 font-semibold">Status</th>
                            <th className="p-4 font-semibold text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {loans.length === 0 ? (
                            <tr><td colSpan={6} className="text-center p-8 text-slate-500">Nenhum empréstimo registrado.</td></tr>
                        ) : (
                            loans.map(loan => (
                                <tr key={loan.id} className={`hover:bg-slate-50 ${loan.status === 'paid' ? 'opacity-60' : ''}`}>
                                    <td className="p-4 font-medium text-slate-800">{loan.description}</td>
                                    <td className="p-4 text-slate-600">{accountMap.get(loan.lenderAccountId)} → {accountMap.get(loan.borrowerAccountId)}</td>
                                    <td className="p-4 text-slate-800 font-medium">{formatCurrency(loan.amount)}</td>
                                    <td className="p-4 text-slate-600">{formatDate(loan.date)}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${loan.status === 'active' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                            {loan.status === 'active' ? 'Ativo' : 'Quitado'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-end space-x-1">
                                            {loan.status === 'active' && (
                                                <button onClick={() => handleSettleLoan(loan)} className="p-2 rounded-full hover:bg-slate-100 transition-colors" aria-label="Quitar Empréstimo">
                                                    <CheckIcon className="w-5 h-5 text-green-600" />
                                                </button>
                                            )}
                                            <button onClick={() => handleOpenModal(loan)} className="p-2 rounded-full hover:bg-slate-100 transition-colors" aria-label="Editar Empréstimo">
                                                <PencilIcon className="w-5 h-5 text-blue-600" />
                                            </button>
                                            <button onClick={() => handleDeleteLoan(loan.id)} className="p-2 rounded-full hover:bg-slate-100 transition-colors" aria-label="Excluir Empréstimo">
                                                <TrashIcon className="w-5 h-5 text-red-500" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden p-4 space-y-4">
                 {loans.length === 0 ? (
                    <p className="text-center p-8 text-slate-500">Nenhum empréstimo registrado.</p>
                ) : (
                    loans.map(loan => (
                        <div key={loan.id} className={`bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3 ${loan.status === 'paid' ? 'opacity-70' : ''}`}>
                            <div className="flex justify-between items-start">
                                <p className="font-bold text-slate-800 pr-2">{loan.description}</p>
                                <span className={`whitespace-nowrap px-2 py-1 text-xs font-semibold rounded-full ${loan.status === 'active' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                    {loan.status === 'active' ? 'Ativo' : 'Quitado'}
                                </span>
                            </div>
                            <div className="text-sm text-slate-600 space-y-1">
                                <p><span className="font-medium">Valor:</span> <span className="font-bold text-slate-800">{formatCurrency(loan.amount)}</span></p>
                                <p><span className="font-medium">Contas:</span> {accountMap.get(loan.lenderAccountId)} → {accountMap.get(loan.borrowerAccountId)}</p>
                            </div>
                            <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                                <p className="text-sm text-slate-500">{formatDate(loan.date)}</p>
                                <div className="flex items-center space-x-1">
                                    {loan.status === 'active' && (
                                        <button onClick={() => handleSettleLoan(loan)} className="p-2 rounded-full hover:bg-slate-200 transition-colors" aria-label="Quitar Empréstimo">
                                            <CheckIcon className="w-5 h-5 text-green-600" />
                                        </button>
                                    )}
                                    <button onClick={() => handleOpenModal(loan)} className="p-2 rounded-full hover:bg-slate-200 transition-colors" aria-label="Editar Empréstimo">
                                        <PencilIcon className="w-5 h-5 text-blue-600" />
                                    </button>
                                    <button onClick={() => handleDeleteLoan(loan.id)} className="p-2 rounded-full hover:bg-slate-200 transition-colors" aria-label="Excluir Empréstimo">
                                        <TrashIcon className="w-5 h-5 text-red-500" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <LoanModal 
                isOpen={isModalOpen} 
                onClose={handleCloseModal}
                onSave={handleSaveLoan}
                loan={editingLoan}
                accounts={accounts}
            />
        </div>
    );
};

export default LoansPage;
