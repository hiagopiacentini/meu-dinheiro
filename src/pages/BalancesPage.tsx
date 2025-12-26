import React, { useMemo } from 'react';
import { useTransactions, useAccounts } from '../hooks/useFirestore';
import { TransactionType, Account } from '../types';
import MoneyIcon from '../components/icons/MoneyIcon';
import CreditCardIcon from '../components/icons/CreditCardIcon';
import BalancesIcon from '../components/icons/BalancesIcon';
import PrivateValue from '../components/PrivateValue';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const BankLogo: React.FC<{ account: Account }> = ({ account }) => {
    const { bank: bankName = '', imageUrl } = account;
    const name = bankName.toLowerCase();
    const sizeClasses = "w-12 h-12 rounded-xl object-cover shadow-sm border border-slate-100 flex-shrink-0";
    
    if (imageUrl) {
        return <img src={imageUrl} alt={account.name} className={sizeClasses} />;
    }
    if (name.includes('nubank')) return <img src="https://i.imgur.com/8311S3D.png" alt="Nubank" className={sizeClasses} />;
    if (name.includes('itaú') || name.includes('itau')) return <img src="https://i.imgur.com/uR29mKw.png" alt="Itau" className={sizeClasses} />;
    if (name.includes('inter')) return <img src="https://i.imgur.com/P4MhLq7.png" alt="Inter" className={sizeClasses} />;
    if (name.includes('santander')) return <img src="https://i.imgur.com/2Yq6N2I.png" alt="Santander" className={sizeClasses} />;
    if (name.includes('bradesco')) return <img src="https://i.imgur.com/L7X7q8X.png" alt="Bradesco" className={sizeClasses} />;
    
    return (
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-slate-100 text-slate-400 shadow-sm border border-slate-200`}>
            {account.isCreditCard ? <CreditCardIcon className="w-6 h-6" /> : <BalancesIcon className="w-6 h-6" />}
        </div>
    );
};

const BalancesPage: React.FC = () => {
    const { transactions } = useTransactions();
    const { accounts } = useAccounts();

    const { processedAccounts, totalNetWorth, totalCash, totalDebt } = useMemo(() => {
        const accBalances = new Map<string, number>();
        const crdBalances = new Map<string, number>();

        accounts.forEach(acc => {
            accBalances.set(acc.id, Number(acc.initialBalance) || 0);
            acc.cards?.forEach(c => crdBalances.set(c.id, Number(c.initialBalance) || 0));
        });

        transactions.forEach(t => {
            const updateAcc = (id: string, val: number) => accBalances.set(id, (accBalances.get(id) || 0) + val);
            const updateCard = (id: string, val: number) => crdBalances.set(id, (crdBalances.get(id) || 0) + val);

            if (t.cardId) {
                if (t.type === TransactionType.EXPENSE) updateCard(t.cardId, -t.amount);
                else if (t.type === TransactionType.INCOME) updateCard(t.cardId, t.amount);
                else if (t.type === TransactionType.TRANSFER && t.destinationAccountId && t.cardId) {
                    updateCard(t.cardId, t.amount);
                }
            } else {
                if (t.type === TransactionType.INCOME) updateAcc(t.accountId, t.amount);
                else if (t.type === TransactionType.EXPENSE) updateAcc(t.accountId, -t.amount);
            }

            if (t.type === TransactionType.TRANSFER) {
                updateAcc(t.accountId, -t.amount);
                if (t.destinationAccountId && !t.cardId) {
                    updateAcc(t.destinationAccountId, t.amount);
                }
            }
        });

        let netWorth = 0;
        let cash = 0;
        let debt = 0;

        const result = accounts
            .filter(a => a.isActive)
            .map(acc => {
                const accountBalance = accBalances.get(acc.id) || 0;
                const cardsBalance = acc.cards?.reduce((sum, c) => sum + (crdBalances.get(c.id) || 0), 0) || 0;
                const consolidated = accountBalance + cardsBalance;

                netWorth += consolidated;
                
                // Correção: soma saldos positivos de conta E de cartões no Disponível
                if (accountBalance > 0) cash += accountBalance;
                if (cardsBalance > 0) cash += cardsBalance;
                
                // Dívidas: soma saldos negativos de conta E de cartões
                if (accountBalance < 0) debt += accountBalance;
                if (cardsBalance < 0) debt += cardsBalance;

                return { ...acc, accountBalance, cardsBalance, consolidated };
            })
            .sort((a, b) => b.consolidated - a.consolidated);

        return { processedAccounts: result, totalNetWorth: netWorth, totalCash: cash, totalDebt: debt };
    }, [accounts, transactions]);

    return (
        <div className="space-y-10 w-full max-w-7xl mx-auto pb-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-36">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Patrimônio Líquido</p>
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><BalancesIcon className="w-5 h-5"/></div>
                        </div>
                        <p className={`text-3xl font-bold tracking-tight ${totalNetWorth >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                            <PrivateValue>{formatCurrency(totalNetWorth)}</PrivateValue>
                        </p>
                    </div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Soma Total Consolidada</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-36">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Disponível em Conta</p>
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><MoneyIcon className="w-5 h-5"/></div>
                        </div>
                        <p className="text-3xl font-bold text-emerald-600 tracking-tight">
                            <PrivateValue>{formatCurrency(totalCash)}</PrivateValue>
                        </p>
                    </div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Dinheiro livre para uso</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-36">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Comprometido</p>
                            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><CreditCardIcon className="w-5 h-5"/></div>
                        </div>
                        <p className="text-3xl font-bold text-rose-600 tracking-tight">
                            <PrivateValue>{formatCurrency(totalDebt)}</PrivateValue>
                        </p>
                    </div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Faturas e Saldos Devedores</p>
                </div>
            </div>
            
            <div>
                <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <div className="w-1 h-6 rounded-full bg-blue-600"></div>
                    Detalhamento por Instituição
                </h2>
                
                <div className="grid grid-cols-1 gap-5">
                    {processedAccounts.map(acc => (
                        <div key={acc.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-6 flex flex-col md:flex-row md:items-center justify-between gap-8 group">
                            <div className="flex items-center gap-5">
                                <BankLogo account={acc} />
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800 leading-tight">{acc.name}</h3>
                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mt-0.5">
                                        {acc.bank || 'Conta Manual'}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:flex items-center gap-10 md:gap-16">
                                <div className="text-right md:text-left">
                                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1">Na Conta</p>
                                    <p className={`font-bold tracking-tight text-base ${acc.accountBalance >= 0 ? 'text-slate-600' : 'text-rose-500'}`}>
                                        <PrivateValue>{formatCurrency(acc.accountBalance)}</PrivateValue>
                                    </p>
                                </div>
                                {acc.cardsBalance !== 0 && (
                                    <div className="text-right md:text-left">
                                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1">No Cartão</p>
                                        <p className={`font-bold tracking-tight text-base ${acc.cardsBalance >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                            <PrivateValue>{formatCurrency(acc.cardsBalance)}</PrivateValue>
                                        </p>
                                    </div>
                                )}
                                <div className="col-span-2 md:col-span-1 text-right border-t border-slate-50 md:border-0 pt-4 md:pt-0">
                                    <p className="text-[10px] font-medium text-blue-500 uppercase tracking-widest mb-1">Consolidado</p>
                                    <p className={`text-2xl font-bold tracking-tight ${acc.consolidated >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                                        <PrivateValue>{formatCurrency(acc.consolidated)}</PrivateValue>
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BalancesPage;