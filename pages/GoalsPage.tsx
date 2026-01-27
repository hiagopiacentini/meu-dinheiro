
import React, { useState, useMemo, useEffect } from 'react';
import { useGoals, useTransactions, useCategories, useManualSavings, useCDBs, useForecasts } from '../hooks/useFirestore';
import { TransactionType } from '../types';
import PencilIcon from '../components/icons/PencilIcon';
import XIcon from '../components/icons/XIcon';
import PrivateValue from '../components/PrivateValue';
import CheckIcon from '../components/icons/CheckIcon';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const getNowGmtMinus4 = () => {
    const now = new Date();
    const offset = -4 * 60 * 60 * 1000;
    const localOffset = now.getTimezoneOffset() * 60 * 1000;
    return new Date(now.getTime() + localOffset + offset);
}

const ProgressBar: React.FC<{ value: number, color: string, height?: string }> = ({ value, color, height = "h-2.5" }) => {
    const percentage = Math.max(0, Math.min(100, value));
    return (
        <div className={`w-full bg-gray-100 rounded-full ${height}`}>
            <div className={`${color} ${height} rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
        </div>
    );
};

const GoalsPage: React.FC = () => {
    const { goals, setGoals } = useGoals();
    const { transactions } = useTransactions();
    const { categories } = useCategories();
    const { manualSavings, updateManualSavings } = useManualSavings();
    const { forecasts, updateForecasts } = useForecasts();
    const { cdbs } = useCDBs();
    
    const nowRef = getNowGmtMinus4();
    const currentYear = nowRef.getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [annualInput, setAnnualInput] = useState<string>('');
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    useEffect(() => {
        if (goals) {
            setAnnualInput(String(goals[selectedYear] || ''));
        }
    }, [selectedYear, goals]);

    const itemBalanceMap = useMemo(() => {
        const map = new Map<string, boolean>();
        if (categories) {
            categories.forEach(cat => cat.subcategories.forEach(sub => sub.items.forEach(item => map.set(item.id, item.includeInBalance))));
        }
        return map;
    }, [categories]);

    const yieldCategoryId = useMemo(() => {
        for (const cat of categories) {
            for (const sub of cat.subcategories) {
                for (const item of sub.items) {
                    const itemName = item.name.toLowerCase().trim();
                    if (itemName === 'rendimento' || itemName === 'rendimentos') return item.id;
                }
            }
        }
        return null;
    }, [categories]);

    const monthsNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    const monthlyPerformance = useMemo(() => {
        const yearManual = (manualSavings && manualSavings[String(selectedYear)]) || {};
        const now = getNowGmtMinus4();
        
        return monthsNames.map((fullName, index) => {
            const startOfMonth = new Date(Date.UTC(selectedYear, index, 1));
            const isThisMonth = selectedYear === now.getFullYear() && index === now.getMonth();
            
            const endOfCalculatedPeriod = isThisMonth 
                ? new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999))
                : new Date(Date.UTC(selectedYear, index + 1, 0, 23, 59, 59, 999));

            const monthTransactions = transactions.filter(t => {
                const date = new Date(t.date);
                const tDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
                return tDate >= startOfMonth && tDate <= endOfCalculatedPeriod;
            });

            const transactionSavings = monthTransactions.reduce((acc, t) => {
                const shouldInclude = !t.itemId || itemBalanceMap.get(t.itemId) !== false;
                const isRedemptionProfit = t.itemId === yieldCategoryId;

                if (shouldInclude) {
                    if (t.type === TransactionType.INCOME && !isRedemptionProfit) return acc + t.amount;
                    if (t.type === TransactionType.EXPENSE) return acc - t.amount;
                }
                return acc;
            }, 0);

            let investmentProfitInMonth = 0;
            cdbs.forEach(cdb => {
                const history = Array.isArray(cdb.yieldHistory) ? cdb.yieldHistory : [];
                history.forEach(y => {
                    const yDate = new Date(y.date);
                    const yUTC = new Date(Date.UTC(yDate.getUTCFullYear(), yDate.getUTCMonth(), yDate.getUTCDate()));
                    if (yUTC >= startOfMonth && yUTC <= endOfCalculatedPeriod) {
                        investmentProfitInMonth += y.amount;
                    }
                });
            });

            const manual = yearManual[String(index)] || 0;
            return {
                name: fullName.substring(0, 3),
                fullName,
                realized: transactionSavings + investmentProfitInMonth + manual,
                isCurrent: isThisMonth
            };
        });
    }, [transactions, selectedYear, itemBalanceMap, manualSavings, cdbs, yieldCategoryId]);

    const totalSavings = useMemo(() => monthlyPerformance.reduce((acc, m) => acc + m.realized, 0), [monthlyPerformance]);

    const handleInputBlur = () => {
        const value = parseFloat(annualInput);
        const newGoal = isNaN(value) || value < 0 ? 0 : value;
        if (setGoals && (goals[selectedYear] || 0) !== newGoal) {
            setGoals({ ...goals, [selectedYear]: newGoal });
        }
    };
    
    const handleForecastChange = async (monthIndex: number, value: string) => {
        const numValue = parseFloat(value.replace(',', '.')) || 0;
        const newForecasts = { ...forecasts };
        if (!newForecasts[String(selectedYear)]) newForecasts[String(selectedYear)] = {};
        newForecasts[String(selectedYear)][String(monthIndex)] = numValue;
        await updateForecasts(newForecasts);
    };
    
    const annualGoal = goals[selectedYear] || 0;
    const monthlyGoal = annualGoal / 12;
    const annualProgress = annualGoal > 0 ? (totalSavings / annualGoal) * 100 : 0;
    const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i).reverse();

    return (
        <div className="space-y-6 pb-12">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Metas de economia</h2>
                     <div className="flex items-center self-end md:self-center">
                        <label htmlFor="year-select" className="text-sm font-medium mr-2 text-slate-600">Ano de referência:</label>
                        <select 
                            id="year-select" 
                            value={selectedYear} 
                            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                            className="input-style w-32 py-2 font-bold"
                        >
                            {yearOptions.map(year => <option key={year} value={year}>{year}</option>)}
                        </select>
                    </div>
                </div>

                <div className="max-w-md mx-auto">
                    <div className="mb-4">
                        <label htmlFor="annual-goal" className="block text-sm font-medium text-slate-500 mb-2 text-center tracking-normal">
                            Meta de economia anual ({selectedYear})
                        </label>
                        <input 
                            type="number"
                            id="annual-goal"
                            value={annualInput}
                            onChange={(e) => setAnnualInput(e.target.value)}
                            onBlur={handleInputBlur}
                            className="input-style w-full text-center text-3xl font-bold py-4 text-blue-600"
                            placeholder="0"
                            min="0"
                        />
                    </div>
                    <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-400 font-medium mb-1 tracking-normal uppercase">Esforço mensal necessário</p>
                        <p className="font-bold text-xl text-slate-700">{formatCurrency(monthlyGoal)}</p>
                    </div>
                </div>
            </div>
            
            {/* PLANEJAMENTO MENSAL DE FATURAMENTO */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="mb-6">
                    <h3 className="font-bold text-lg text-slate-800 tracking-tight">Planejamento de faturamento</h3>
                    <p className="text-sm text-slate-500 font-normal">Defina quanto espera ganhar para calcular seu teto de gastos diário.</p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500">
                            <tr className="text-[11px] font-bold tracking-normal border-b border-slate-100">
                                <th className="py-3 px-4 text-left">Mês</th>
                                <th className="py-3 px-4 text-right">Previsão receita (R$)</th>
                                <th className="py-3 px-4 text-right">Economia esperada</th>
                                <th className="py-3 px-4 text-right">Teto de gastos</th>
                                <th className="py-3 px-4 text-right">Limite diário</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {monthsNames.map((m, idx) => {
                                const forecast = forecasts[String(selectedYear)]?.[String(idx)] || 0;
                                const maxSpend = Math.max(0, forecast - monthlyGoal);
                                const daysInMonth = new Date(selectedYear, idx + 1, 0).getDate();
                                const dailyLimit = maxSpend / daysInMonth;
                                
                                return (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-3 px-4 font-semibold text-slate-700">{m}</td>
                                        <td className="py-3 px-4 text-right">
                                            <input 
                                                type="number"
                                                value={forecast || ''}
                                                onChange={(e) => handleForecastChange(idx, e.target.value)}
                                                className="w-32 text-right bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-500 focus:outline-none font-bold text-slate-800 transition-all"
                                                placeholder="0,00"
                                                step="0.01"
                                            />
                                        </td>
                                        <td className="py-3 px-4 text-right text-slate-500 font-medium">{formatCurrency(monthlyGoal)}</td>
                                        <td className="py-3 px-4 text-right font-bold text-slate-800">{formatCurrency(maxSpend)}</td>
                                        <td className="py-3 px-4 text-right">
                                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">
                                                {formatCurrency(dailyLimit)} / dia
                                            </span>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800 tracking-tight">Progresso consolidado</h3>
                        <p className="text-sm text-slate-500 font-normal">Soma de todos os meses do ano</p>
                    </div>
                </div>
                
                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-3xl font-bold text-slate-800"><PrivateValue>{formatCurrency(totalSavings)}</PrivateValue></p>
                            <p className="text-sm text-slate-500">economizados de {formatCurrency(annualGoal)}</p>
                        </div>
                        <div className="text-right">
                            <span className={`text-2xl font-bold ${annualProgress >= 100 ? 'text-green-600' : 'text-blue-600'}`}>
                                {annualProgress.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                    <ProgressBar value={annualProgress} color={annualProgress >= 100 ? "bg-green-500" : "bg-blue-600"} height="h-4" />
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-lg text-slate-800 mb-6 tracking-tight">Desempenho realizado</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {monthlyPerformance.map((month, idx) => {
                        const monthProgress = monthlyGoal > 0 ? (month.realized / monthlyGoal) * 100 : 0;
                        const isGoalMet = month.realized >= monthlyGoal && monthlyGoal > 0;
                        
                        return (
                            <div key={idx} className={`p-4 rounded-xl border transition-all ${month.isCurrent ? 'border-blue-200 bg-blue-50/30' : 'border-slate-100 hover:bg-slate-50'}`}>
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className={`font-bold ${month.isCurrent ? 'text-blue-700' : 'text-slate-700'}`}>
                                        {month.fullName}
                                        {month.isCurrent && <span className="ml-2 text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full uppercase tracking-tighter">Hoje</span>}
                                    </h4>
                                    {isGoalMet && <CheckIcon className="w-4 h-4 text-green-500" />}
                                </div>

                                <div className="flex justify-between items-baseline mb-1">
                                    <span className="text-sm font-bold text-slate-800"><PrivateValue>{formatCurrency(month.realized)}</PrivateValue></span>
                                    <span className={`text-xs font-bold ${isGoalMet ? 'text-green-600' : 'text-slate-400'}`}>
                                        {monthProgress.toFixed(0)}%
                                    </span>
                                </div>

                                <ProgressBar 
                                    value={monthProgress} 
                                    color={isGoalMet ? "bg-green-500" : month.realized < 0 ? "bg-red-500" : "bg-blue-400"} 
                                    height="h-1.5"
                                />
                                
                                <div className="flex justify-between mt-2 text-[10px] font-medium text-slate-400">
                                    <span>Realizado</span>
                                    <span>Meta: {formatCurrency(monthlyGoal)}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default GoalsPage;
