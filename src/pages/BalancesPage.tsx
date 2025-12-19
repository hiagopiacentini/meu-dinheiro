
import React, { useMemo } from 'react';
import { useTransactions, useAccounts } from '../hooks/useFirestore';
import { TransactionType, Account } from '../types';
import MoneyIcon from '../components/icons/MoneyIcon';
import CreditCardIcon from '../components/icons/CreditCardIcon';
import BalancesIcon from '../components/icons/BalancesIcon';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const BankLogo: React.FC<{ account: Account }> = ({ account }) => {
    const { bank: bankName = '', imageUrl } = account;
    const name = bankName.toLowerCase();
    const sizeClasses = "w-12 h-12 rounded-xl object-cover shadow-sm border border-slate-100 flex-shrink-0";
    
    if (imageUrl) {
        return <img src={imageUrl} alt={account.name} className={sizeClasses} />;
    }
    // URLs de logos para bancos comuns
    if (name.includes('nubank')) return <img src="https://i.imgur.com/8311S3D.png" alt="Nubank" className={sizeClasses} />;
    if (name.includes('itaú') || name.includes('itau')) return <img src="https://i.imgur.com/uR29mKw.png" alt="Itau" className={sizeClasses} />;
    if (name.includes('inter')) return <img src="https://i.imgur.com/P4MhLq7.png" alt="Inter" className={sizeClasses} />;
    if (name.includes('santander')) return <img src="https://i.imgur.com/2Yq6N2I.png" alt="Santander" className={sizeClasses} />;
    if (name.includes('bradesco')) return <img src="https://i.imgur.com/L7X7q8X.png" alt="Bradesco" className={sizeClasses} />;
    if (name.includes('caixa')) return <img src="https://i.imgur.com/1p9Yq3I.png" alt="Caixa" className={sizeClasses} />;
    if (name.includes('banco do brasil') || name.includes('bb')) return <img src="https://i.imgur.com/n4Xv5hC.png" alt="BB" className={sizeClasses} />;
    if (name.includes('c6')) return <img src="https://i.imgur.com/IsQ77Wd.png" alt="C6" className={sizeClasses} />;
    if (name.includes('btg')) return <img src="https://i.imgur.com/Q2g6y9X.png" alt="BTG" className={sizeClasses} />;
    if (name.includes('paypal')) return <img src="https://i.imgur.com/T5QkH90.png" alt="PayPal" className={sizeClasses} />;
    
    return (
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-slate-100 text-slate-500 shadow-sm border border-slate-200`}>
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

        // 1. Inicializar Saldos (Importante: converter para Number para evitar erros de concatenação de string)
        accounts.forEach(acc => {
            accBalances.set(acc.id, Number(acc.initialBalance) || 0);
            acc.cards?.forEach(c => crdBalances.set(c.id, Number(c.initialBalance) || 0));
        });

        // 2. Processar Transações (Lógica espelhada da AccountsPage)
        transactions.forEach(t => {
            const updateAcc = (id: string, val: number) => accBalances.set(id, (accBalances.get(id) || 0) + val);
            const updateCard = (id: string, val: number) => crdBalances.set(id, (crdBalances.get(id) || 0) + val);

            // Transações de Cartão
            if (t.cardId) {
                if (t.type === TransactionType.EXPENSE) updateCard(t.cardId, -t.amount);
                else if (t.type === TransactionType.INCOME) updateCard(t.cardId, t.amount);
                else if (t.type === TransactionType.TRANSFER && t.destinationAccountId && t.cardId) {
                    updateCard(t.cardId, t.amount);
                }
            } 
            // Transações de Conta Corrente (Dinheiro)
            else {
                if (t.type === TransactionType.INCOME) updateAcc(t.accountId, t.amount);
                else if (t.type === TransactionType.EXPENSE) updateAcc(t.accountId, -t.amount);
            }

            // Lógica de Transferência
            if (t.type === TransactionType.TRANSFER) {
                updateAcc(t.accountId, -t.amount); // Sai da origem
                if (t.destinationAccountId && !t.cardId) {
                    updateAcc(t.destinationAccountId, t.amount); // Entra no destino (se não for cartão)
                }
            }
        });

        // 3. Agregar e Calcular Totais
        let netWorth = 0;
        let cash = 0;
        let debt = 0;

        const result = accounts
            .filter(a => a.isActive)
            .map(acc => {
                const accountBalance = accBalances.get(acc.id) || 0;
                const cardsBalance = acc.cards?.reduce((sum, c) => sum + (crdBalances.get(c.id) || 0), 0) || 0;
                
                const consolidated = accountBalance + cardsBalance;

                // Totais Globais
                netWorth += consolidated;
                
                // Considera "Em Caixa" apenas o saldo positivo da conta corrente
                if (accountBalance > 0) cash += accountBalance;
                
                // Dívidas: Saldo negativo de conta (cheque especial) + Saldo negativo de cartões
                if (accountBalance < 0) debt += accountBalance;
                if (cardsBalance < 0) debt += cardsBalance;

                return {
                    ...acc,
                    accountBalance,
                    cardsBalance,
                    consolidated
                };
            })
            .sort((a, b) => b.consolidated - a.consolidated);

        return { 
            processedAccounts: result, 
            totalNetWorth: netWorth, 
            totalCash: cash, 
            totalDebt: debt 
        };
    }, [accounts, transactions]);

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* Header com Totais */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between h-32">
                    <div className="absolute right-0 top-0 h-full w-1.5 bg-blue-500"></div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Patrimônio Líquido Total</p>
                        <p className={`text-3xl font-bold ${totalNetWorth >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                            {formatCurrency(totalNetWorth)}
                        </p>
                    </div>
                    <p className="text-xs text-slate-400">Soma de todas as contas e faturas</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between h-32">
                    <div className="absolute right-0 top-0 h-full w-1.5 bg-green-500"></div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Disponível em Conta</p>
                        <p className="text-3xl font-bold text-green-600">
                            {formatCurrency(totalCash)}
                        </p>
                    </div>
                    <p className="text-xs text-slate-400">Dinheiro livre para uso</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between h-32">
                    <div className="absolute right-0 top-0 h-full w-1.5 bg-red-500"></div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Comprometido / Faturas</p>
                        <p className="text-3xl font-bold text-red-500">
                            {formatCurrency(totalDebt)}
                        </p>
                    </div>
                    <p className="text-xs text-slate-400">Soma de saldos negativos e cartões</p>
                </div>
            </div>
            
            {/* Lista Detalhada */}
            <div>
                <h2 className="text-xl font-bold text-slate-800 mb-6 px-1 flex items-center gap-2">
                    <BalancesIcon className="w-6 h-6 text-blue-600"/>
                    Detalhamento por Instituição
                </h2>
                
                <div className="grid grid-cols-1 gap-4">
                    {processedAccounts.length === 0 ? (
                        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
                            <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                <BalancesIcon className="w-8 h-8 text-slate-400"/>
                            </div>
                            <h3 className="text-lg font-medium text-slate-800">Nenhuma conta encontrada</h3>
                            <p className="text-slate-500">Adicione contas na aba "Contas" para ver o resumo aqui.</p>
                        </div>
                    ) : (
                        processedAccounts.map(acc => {
                            const hasCards = acc.cards && acc.cards.length > 0;
                            return (
                                <div key={acc.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                                    <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-50">
                                        <div className="flex items-center gap-4">
                                            <BankLogo account={acc} />
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-800 leading-tight">{acc.name}</h3>
                                                <p className="text-xs text-slate-500 font-medium bg-slate-100 inline-block px-2 py-0.5 rounded mt-1">
                                                    {acc.bank || (acc.isCreditCard ? 'Cartão de Crédito' : 'Conta Manual')}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end min-w-[150px]">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-0.5">Saldo Consolidado</span>
                                            <span className={`text-2xl font-bold tracking-tight ${acc.consolidated >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                                                {formatCurrency(acc.consolidated)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Breakdown Area */}
                                    <div className="bg-slate-50/50 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex items-center justify-between bg-white border border-slate-100 p-3 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                                    <MoneyIcon className="w-5 h-5"/>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500 font-medium">Em Conta</p>
                                                    <p className={`font-bold text-sm ${acc.accountBalance >= 0 ? 'text-slate-700' : 'text-red-600'}`}>
                                                        {formatCurrency(acc.accountBalance)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {(hasCards || acc.isCreditCard) && (
                                            <div className="flex items-center justify-between bg-white border border-slate-100 p-3 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-red-50 text-red-500 rounded-lg">
                                                        <CreditCardIcon className="w-5 h-5"/>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-slate-500 font-medium">Fatura / Cartões</p>
                                                        <p className={`font-bold text-sm ${acc.cardsBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {formatCurrency(acc.cardsBalance)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default BalancesPage;
