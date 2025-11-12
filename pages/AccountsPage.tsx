import React, { useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Account, Transaction, Loan } from '../types';
import PlusIcon from '../components/icons/PlusIcon';
import TrashIcon from '../components/icons/TrashIcon';
import PencilIcon from '../components/icons/PencilIcon';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const AccountModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (account: Omit<Account, 'id'> | Account) => void;
    account: Account | null;
}> = ({ isOpen, onClose, onSave, account }) => {
    const [name, setName] = useState('');
    const [initialBalance, setInitialBalance] = useState('');
    const [bank, setBank] = useState('');
    const [agency, setAgency] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [isActive, setIsActive] = useState(true);

    React.useEffect(() => {
        if (account) {
            setName(account.name);
            setInitialBalance(String(account.initialBalance));
            setBank(account.bank || '');
            setAgency(account.agency || '');
            setAccountNumber(account.accountNumber || '');
            setIsActive(account.isActive);
        } else {
            setName('');
            setInitialBalance('');
            setBank('');
            setAgency('');
            setAccountNumber('');
            setIsActive(true);
        }
    }, [account, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
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
        };

        if(account) {
            onSave({ ...account, ...accountData });
        } else {
            onSave(accountData);
        }
    };
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
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
                <input type="text" id="acc-bank" value={bank} onChange={e => setBank(e.target.value)} className="mt-1 block w-full input-style" />
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
             <div className="flex items-center">
                <input type="checkbox" id="acc-active" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"/>
                <label htmlFor="acc-active" className="ml-2 block text-sm text-slate-900">Conta Ativa</label>
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


const AccountsPage: React.FC = () => {
    const [accounts, setAccounts] = useLocalStorage<Account[]>('accounts', []);
    const [transactions] = useLocalStorage<Transaction[]>('transactions', []);
    const [loans] = useLocalStorage<Loan[]>('loans', []);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);

    const handleOpenModal = (account: Account | null = null) => {
        setEditingAccount(account);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingAccount(null);
    };

    const handleSaveAccount = (accountData: Omit<Account, 'id'> | Account) => {
        if ('id' in accountData) { // Editing
            setAccounts(accounts.map(acc => acc.id === accountData.id ? accountData : acc));
        } else { // Creating
            setAccounts([...accounts, { ...accountData, id: crypto.randomUUID() }]);
        }
        handleCloseModal();
    };

    const handleDeleteAccount = (id: string) => {
      // Check if account has associated transactions or loans
      const hasTransactions = transactions.some(t => t.accountId === id || t.destinationAccountId === id);
      const hasLoans = loans.some(l => l.lenderAccountId === id || l.borrowerAccountId === id);

      if (hasTransactions || hasLoans) {
        alert('Não é possível excluir esta conta, pois ela está associada a lançamentos ou empréstimos. Remova ou altere os registros associados primeiro.');
        return;
      }
      
      if(window.confirm('Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita.')) {
        setAccounts(accounts.filter(acc => acc.id !== id));
      }
    }

    const toggleAccountStatus = (id: string) => {
        setAccounts(accounts.map(acc => acc.id === id ? { ...acc, isActive: !acc.isActive } : acc));
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center p-4 sm:p-6 border-b border-slate-200 gap-4">
                <h2 className="text-xl font-bold">Gerenciar Contas</h2>
                <button onClick={() => handleOpenModal()} className="btn-primary flex items-center justify-center space-x-2 w-full sm:w-auto">
                    <PlusIcon className="w-5 h-5" />
                    <span>Nova Conta</span>
                </button>
            </div>
            
            {/* Desktop View */}
            <div className="overflow-x-auto hidden md:block">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                        <tr>
                            <th className="p-4 font-semibold">Nome</th>
                            <th className="p-4 font-semibold">Banco</th>
                            <th className="p-4 font-semibold">Saldo Inicial</th>
                            <th className="p-4 font-semibold">Status</th>
                            <th className="p-4 font-semibold text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {accounts.length === 0 ? (
                            <tr><td colSpan={5} className="text-center p-8 text-slate-500">Nenhuma conta cadastrada.</td></tr>
                        ) : (
                            accounts.map(acc => (
                                <tr key={acc.id} className="hover:bg-slate-50">
                                    <td className="p-4 font-medium text-slate-800">{acc.name}</td>
                                    <td className="p-4 text-slate-600">{acc.bank || '-'}</td>
                                    <td className="p-4 text-slate-800">{formatCurrency(acc.initialBalance)}</td>
                                    <td className="p-4">
                                        <span onClick={() => toggleAccountStatus(acc.id)} className={`cursor-pointer px-2 py-1 text-xs font-semibold rounded-full ${acc.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {acc.isActive ? 'Ativa' : 'Inativa'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-end space-x-1">
                                            <button 
                                                onClick={() => handleOpenModal(acc)} 
                                                className="p-2 rounded-full hover:bg-slate-100 transition-colors" 
                                                aria-label="Editar Conta"
                                            >
                                                <PencilIcon className="w-5 h-5 text-blue-600" />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteAccount(acc.id)} 
                                                className="p-2 rounded-full hover:bg-slate-100 transition-colors" 
                                                aria-label="Excluir Conta"
                                            >
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
                 {accounts.length === 0 ? (
                    <p className="text-center p-8 text-slate-500">Nenhuma conta cadastrada.</p>
                ) : (
                    accounts.map(acc => (
                        <div key={acc.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-slate-800">{acc.name}</p>
                                    <p className="text-sm text-slate-600">{acc.bank || 'Sem banco'}</p>
                                </div>
                                 <span onClick={() => toggleAccountStatus(acc.id)} className={`cursor-pointer px-2 py-1 text-xs font-semibold rounded-full ${acc.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {acc.isActive ? 'Ativa' : 'Inativa'}
                                </span>
                            </div>
                             <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                                <p className="text-slate-600">
                                    <span className="text-sm">Saldo Inicial: </span>
                                    <span className="font-medium text-slate-800">{formatCurrency(acc.initialBalance)}</span>
                                </p>
                                <div className="flex items-center space-x-1">
                                    <button 
                                        onClick={() => handleOpenModal(acc)} 
                                        className="p-2 rounded-full hover:bg-slate-200 transition-colors" 
                                        aria-label="Editar Conta"
                                    >
                                        <PencilIcon className="w-5 h-5 text-blue-600" />
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteAccount(acc.id)} 
                                        className="p-2 rounded-full hover:bg-slate-200 transition-colors" 
                                        aria-label="Excluir Conta"
                                    >
                                        <TrashIcon className="w-5 h-5 text-red-500" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <AccountModal 
                isOpen={isModalOpen} 
                onClose={handleCloseModal}
                onSave={handleSaveAccount}
                account={editingAccount}
            />
        </div>
    );
};

export default AccountsPage;