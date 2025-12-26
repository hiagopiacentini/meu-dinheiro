import React, { useMemo } from 'react';
import { useTransactions, useAccounts, useCDBs, useCategories } from '../hooks/useFirestore';
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
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-slate-50 text-slate-500 shadow-sm border border-slate-200`}>
            {account.isCreditCard ? <CreditCardIcon className="w-6 h-6" /> : <BalancesIcon className="w-6 h-6" />}
        </div>
    );
};

const BalancesPage: React.FC = () => {
    const { transactions } = useTransactions();
    const { accounts } = useAccounts();
    const { cdbs } = useCDBs();
    const { categories } = useCategories();

    const yieldItemIds = useMemo(() => {
        const ids: string[] = [];
        categories.forEach(cat => cat.subcategories.forEach(sub => sub.items.forEach(item => {
            if (item.name.trim().toLowerCase() === 'rendimentos') ids.push(item.id);
        })));
        return ids;
    }, [categories]);

    const { processedAccounts, totalNetWorth, totalCash, totalDebt, totalInvested } = useMemo(() => {
        const accBalances = new Map<string, number>();
        const crdBalances = new Map<string, number>();
        const invBalances = new Map<string, number>();

        accounts.forEach(acc => {
            accBalances.set(acc.id, Number(acc.initialBalance) || 0);
            acc.cards?.forEach(c => crdBalances.set(c.id, Number(c.initialBalance) || 0));
            invBalances.set(acc.id, 0);
        });

        cdbs.forEach(cdb => {
            if (cdb.isActive && cdb.linkedAccountId) {
                const current = invBalances.get(cdb.linkedAccountId) || 0;
                invBalances.set(cdb.linkedAccountId, current + cdb.currentGrossBalance);
            }
        });

        transactions.forEach(t => {
            if (t.itemId && yieldItemIds.includes(t.itemId)) return;

            const updateAcc = (id: string, val: number) => accBalances.set(id, (accBalances.get(id) || 0) + val);
            const updateCard = (id: string, val: number) => crdBalances.set(id, (crdBalances.get(id) || 0) + val);

            if (t.cardId) {
                if (t.type === TransactionType.EXPENSE) updateCard(t.cardId, -t.amount);
                else if (t.type === TransactionType.INCOME) updateCard(t.cardId, t.amount);
                else if (t.type === TransactionType.TRANSFER && t.destinationAccountId) {
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

        let netWorth = 0, cash = 0, debt = 0, invested = 0;

        const result = accounts
            .filter(a => a.isActive)
            .map(acc => {
                const accountBalance = accBalances.get(acc.id) || 0;
                const cardsBalance = acc.cards?.reduce((sum, c) => sum + (crdBalances.get(c.id) || 0), 0) || 0;
                const investmentBalance = invBalances.get(acc.id) || 0;
                const consolidated = accountBalance + cardsBalance + investmentBalance;

                netWorth += consolidated;
                invested += investmentBalance;
                if (accountBalance > 0) cash += accountBalance;
                if (accountBalance < 0) debt += accountBalance;
                if (cardsBalance < 0) debt += cardsBalance;

                return { ...acc, accountBalance, cardsBalance, investmentBalance, consolidated };
            })
            .sort((a, b) => b.consolidated - a.consolidated);

        return { processedAccounts: result, totalNetWorth: netWorth, totalCash: cash, totalDebt: debt, totalInvested: invested };
    }, [accounts, transactions, cdbs, yieldItemIds]);

    return (
        <div className="space-y-10 w-full max-w-7xl mx-auto pb-10">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-36">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-sm font-medium text-slate-500 tracking-normal">Patrimônio líquido</p>
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><BalancesIcon className="w-5 h-5"/></div>
                        </div>
                        <p className={`text-3xl font-bold tracking-normal ${totalNetWorth >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                            <PrivateValue>{formatCurrency(totalNetWorth)}</PrivateValue>
                        </p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-36">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-sm font-medium text-slate-500 tracking-normal">Disponível em conta</p>
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><MoneyIcon className="w-5 h-5"/></div>
                        </div>
                        <p className="text-3xl font-bold text-emerald-600 tracking-normal">
                            <PrivateValue>{formatCurrency(totalCash)}</PrivateValue>
                        </p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-36">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-sm font-medium text-slate-500 tracking-normal">Investido (CDB)</p>
                            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><BalancesIcon className="w-5 h-5 transform rotate-180"/></div>
                        </div>
                        <p className="text-3xl font-bold text-purple-600 tracking-normal">
                            <PrivateValue>{formatCurrency(totalInvested)}</PrivateValue>
                        </p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-36">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-sm font-medium text-slate-500 tracking-normal">Comprometido</p>
                            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><CreditCardIcon className="w-5 h-5"/></div>
                        </div>
                        <p className="text-3xl font-bold text-rose-600 tracking-normal">
                            <PrivateValue>{formatCurrency(totalDebt)}</PrivateValue>
                        </p>
                    </div>
                </div>
            </div>
            
            <div>
                <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <div className="w-1 h-6 rounded-full bg-blue-600"></div>
                    Detalhamento por instituição
                </h2>
                
                <div className="grid grid-cols-1 gap-5">
                    {processedAccounts.map(acc => (
                        <div key={acc.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-6 flex flex-col md:flex-row md:items-center justify-between gap-8 group">
                            <div className="flex items-center gap-5">
                                <BankLogo account={acc} />
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800 leading-tight">{acc.name}</h3>
                                    <p className="text-xs font-normal text-slate-500 mt-0.5">
                                        {acc.bank ? (acc.bank.charAt(0).toUpperCase() + acc.bank.slice(1).toLowerCase()) : 'Conta manual'}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:flex items-center gap-10 md:gap-16">
                                <div className="text-right md:text-left">
                                    <p className="text-[11px] font-medium text-slate-500 tracking-normal mb-1">Na conta</p>
                                    <p className={`font-bold tracking-normal text-base ${acc.accountBalance >= 0 ? 'text-slate-600' : 'text-rose-500'}`}>
                                        <PrivateValue>{formatCurrency(acc.accountBalance)}</PrivateValue>
                                    </p>
                                </div>
                                {acc.investmentBalance > 0 && (
                                    <div className="text-right md:text-left">
                                        <p className="text-[11px] font-medium text-slate-500 tracking-normal mb-1">Investido</p>
                                        <p className="font-bold tracking-normal text-base text-purple-600">
                                            <PrivateValue>{formatCurrency(acc.investmentBalance)}</PrivateValue>
                                        </p>
                                    </div>
                                )}
                                {acc.cardsBalance !== 0 && (
                                    <div className="text-right md:text-left">
                                        <p className="text-[11px] font-medium text-slate-500 tracking-normal mb-1">No cartão</p>
                                        <p className={`font-bold tracking-normal text-base ${acc.cardsBalance >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                            <PrivateValue>{formatCurrency(acc.cardsBalance)}</PrivateValue>
                                        </p>
                                    </div>
                                )}
                                <div className="col-span-2 md:col-span-1 text-right border-t border-slate-50 md:border-0 pt-4 md:pt-0">
                                    <p className="text-[11px] font-medium text-slate-500 tracking-normal mb-1">Consolidado</p>
                                    <p className={`font-bold tracking-normal text-base ${acc.consolidated >= 0 ? 'text-slate-600' : 'text-rose-500'}`}>
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