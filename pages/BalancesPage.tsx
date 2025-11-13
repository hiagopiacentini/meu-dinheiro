
import React, { useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Account, Transaction, TransactionType } from '../types';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const BalancesPage: React.FC = () => {
    const [transactions] = useLocalStorage<Transaction[]>('transactions', []);
    const [accounts] = useLocalStorage<Account[]>('accounts', []);

    const { accountBalances, totalBalance } = useMemo(() => {
        const activeAccounts = accounts.filter(a => a.isActive);
        const balances = new Map<string, number>();

        activeAccounts.forEach(acc => {
            balances.set(acc.id, acc.initialBalance);
        });

        transactions.forEach(t => {
            const updateBalance = (accountId: string, amount: number) => {
                if (balances.has(accountId)) {
                    balances.set(accountId, balances.get(accountId)! + amount);
                }
            };

            if (t.type === TransactionType.INCOME) {
                updateBalance(t.accountId, t.amount);
            } else if (t.type === TransactionType.EXPENSE) {
                updateBalance(t.accountId, -t.amount);
            } else if (t.type === TransactionType.TRANSFER) {
                updateBalance(t.accountId, -t.amount); // Source
                if(t.destinationAccountId) {
                    updateBalance(t.destinationAccountId, t.amount); // Destination
                }
            }
        });

        const total = Array.from(balances.values()).reduce((sum, current) => sum + current, 0);

        return { accountBalances: balances, totalBalance: total };
    }, [accounts, transactions]);

    const activeAccountsWithBalance = accounts
        .filter(a => a.isActive)
        .map(acc => ({
            ...acc,
            currentBalance: accountBalances.get(acc.id) || acc.initialBalance
        }));

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <p className="text-lg font-medium text-slate-500">Saldo Total</p>
                <p className={`text-4xl font-bold ${totalBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatCurrency(totalBalance)}
                </p>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-6 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800">Saldo por Conta</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                    {activeAccountsWithBalance.length === 0 ? (
                        <p className="col-span-full text-center text-slate-500 py-8">Nenhuma conta ativa encontrada.</p>
                    ) : (
                        activeAccountsWithBalance.map(acc => (
                            <div key={acc.id} className="p-6 bg-white border border-slate-200 rounded-lg shadow-sm">
                                <h3 className="font-bold text-lg text-slate-800">{acc.name}</h3>
                                {acc.bank && <p className="text-sm text-slate-500">{acc.bank}</p>}
                                <p className={`mt-4 text-2xl font-semibold ${acc.currentBalance >= 0 ? 'text-slate-800' : 'text-red-500'}`}>
                                    {formatCurrency(acc.currentBalance)}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default BalancesPage;