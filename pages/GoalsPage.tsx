
import React, { useState, useMemo, useEffect } from 'react';
import { useGoals, useTransactions, useCategories, useManualSavings, useCDBs, useForecasts, useItemBudgets } from '../hooks/useFirestore';
import { TransactionType, Category, Subcategory, CategoryItem } from '../types';
import PencilIcon from '../components/icons/PencilIcon';
import XIcon from '../components/icons/XIcon';
import PrivateValue from '../components/PrivateValue';
import CheckIcon from '../components/icons/CheckIcon';
import ChevronDownIcon from '../components/icons/ChevronDownIcon';
import ChevronRightIcon from '../components/icons/ChevronRightIcon';

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
        <div className={`w-full bg-slate-100 rounded-full ${height}`}>
            <div className={`${color} ${height} rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
        </div>
    );
};

const AccordionItem: React.FC<{ 
    title: string; 
    children: React.ReactNode; 
    amount?: number;
    amountColor?: string;
    level?: 1 | 2;
}> = ({ title, children, amount, amountColor = "text-slate-600", level = 1 }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const containerClasses = level === 1 
        ? "border border-slate-200 rounded-xl bg-white shadow-sm mb-3" 
        : "border-l-2 border-slate-100 ml-2 mb-2 last:mb-0";
    
    const buttonClasses = level === 1
        ? "w-full flex items-center justify-between p-4 text-left focus:outline-none transition-colors hover:bg-slate-50/80"
        : "w-full flex items-center justify-between p-3 text-left focus:outline-none transition-colors hover:bg-slate-50/50 rounded-r-lg";

    return (
        <div className={containerClasses}>
            <button onClick={() => setIsOpen(!isOpen)} className={buttonClasses}>
                <div className="flex items-center gap-3">
                    <div className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                        <ChevronDownIcon className={`${level === 1 ? 'w-4 h-4' : 'w-3.5 h-3.5'} text-slate-400`} />
                    </div>
                    <span className={`${level === 1 ? 'font-bold text-slate-800' : 'font-medium text-slate-600 text-sm'} tracking-normal`}>{title}</span>
                </div>
                {amount !== undefined && (
                    <span className={`${level === 1 ? 'font-bold text-sm' : 'font-semibold text-xs'} ${amountColor} tracking-normal`}>
                        <PrivateValue>{formatCurrency(amount)}</PrivateValue>
                    </span>
                )}
            </button>
            {isOpen && (
                <div className={`${level === 1 ? 'p-4 pt-0 border-t border-slate-50' : 'p-3 pt-1'} animate-in slide-in-from-top-1 duration-200`}>
                    {children}
                </div>
            )}
        </div>
    );
};

const GoalsPage: React.FC = () => {
    const { goals, setGoals } = useGoals();
    const { transactions } = useTransactions();
    const { categories } = useCategories();
    const { manualSavings, updateManualSavings } = useManualSavings();
    const { forecasts, updateForecasts } = useForecasts();
    const { itemBudgets, updateItemBudgets } = useItemBudgets();
    const { cdbs } = useCDBs();
    
    const nowRef = getNowGmtMinus4();
    const currentYear = nowRef.getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState(nowRef.getMonth());
    const [annualInput, setAnnualInput] = useState<string>('');

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

    const handleItemBudgetChange = async (itemId: string, value: string) => {
        const numValue = parseFloat(value.replace(',', '.')) || 0;
        const newItemBudgets = { ...itemBudgets };
        const yearKey = String(selectedYear);
        const monthKey = String(selectedMonth);

        if (!newItemBudgets[yearKey]) newItemBudgets[yearKey] = {};
        if (!newItemBudgets[yearKey][monthKey]) newItemBudgets[yearKey][monthKey] = {};
        
        newItemBudgets[yearKey][monthKey][itemId] = numValue;
        await updateItemBudgets(newItemBudgets);
    };

    const itemPlanningTotals = useMemo(() => {
        const yearKey = String(selectedYear);
        const monthKey = String(selectedMonth);
        const currentBudgets = itemBudgets[yearKey]?.[monthKey] || {};
        
        let totalIncome = 0;
        let totalExpense = 0;

        categories.forEach(cat => {
            cat.subcategories.forEach(sub => {
                sub.items.forEach(item => {
                    const val = currentBudgets[item.id] || 0;
                    if (cat.type === TransactionType.INCOME) totalIncome += val;
                    else if (cat.type === TransactionType.EXPENSE) totalExpense += val;
                });
            });
        });

        return { totalIncome, totalExpense, plannedSurplus: totalIncome - totalExpense };
    }, [categories, itemBudgets, selectedYear, selectedMonth]);

    const annualGoal = goals[selectedYear] || 0;
    const monthlyGoal = annualGoal / 12;
    const annualProgress = annualGoal > 0 ? (totalSavings / annualGoal) * 100 : 0;
    const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i).reverse();

    const categorizedData = useMemo(() => {
        // Para planejamento, usamos apenas categorias não arquivadas
        const incomes = categories.filter(c => c.type === TransactionType.INCOME && !c.isArchived);
        const expenses = categories.filter(c => c.type === TransactionType.EXPENSE && !c.isArchived);
        return { incomes, expenses };
    }, [categories]);

    return (
        <div className="space-y-6 pb-12">
            <style>{`
                /* Remove number input arrows */
                input[type=number]::-webkit-inner-spin-button, 
                input[type=number]::-webkit-outer-spin-button { 
                    -webkit-appearance: none; 
                    margin: 0; 
                }
                input[type=number] {
                    -moz-appearance: textfield;
                }
            `}</style>

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
                    <p className="text-sm text-slate-500 font-medium">Defina quanto espera ganhar para calcular seu teto de gastos diário.</p>
                </div>

                <div className="overflow-x-auto -mx-6 px-6">
                    <table className="w-full text-sm min-w-[600px]">
                        <thead className="bg-slate-50 text-slate-500">
                            <tr className="text-[11px] font-bold tracking-normal border-b border-slate-100">
                                <th className="py-3 px-4 text-left font-medium">Mês</th>
                                <th className="py-3 px-4 text-right font-medium">Previsão receita (R$)</th>
                                <th className="py-3 px-4 text-right font-medium">Economia esperada</th>
                                <th className="py-3 px-4 text-right font-medium">Teto de gastos</th>
                                <th className="py-3 px-4 text-right font-medium">Limite diário</th>
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

            {/* PLANEJAMENTO POR ITEM */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 mb-8">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800 tracking-tight">Planejamento detalhado por item</h3>
                        <p className="text-sm text-slate-500 font-medium">Controle o que entra e o que sai com precisão cirúrgica.</p>
                    </div>
                    <div className="flex items-center bg-slate-50 p-1.5 rounded-xl border border-slate-200 shadow-sm">
                        <span className="text-xs font-medium text-slate-500 mr-3 ml-2 tracking-normal">Mês do plano:</span>
                        <select 
                            value={selectedMonth} 
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                            className="bg-white border-slate-200 rounded-lg text-sm font-bold py-2 px-4 focus:ring-blue-500 shadow-sm text-slate-700 outline-none hover:border-blue-300 transition-all"
                        >
                            {monthsNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Lista Accordion Aninhada */}
                    <div className="lg:col-span-8 space-y-10">
                        <div>
                            <h4 className="text-xs font-bold text-emerald-600 uppercase mb-4 px-1 flex items-center gap-2 tracking-normal">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                Previsão de entradas
                            </h4>
                            {categorizedData.incomes.map(cat => {
                                const budgets = itemBudgets[String(selectedYear)]?.[String(selectedMonth)] || {};
                                const subcategories = cat.subcategories.filter(s => !s.isArchived);
                                if (subcategories.length === 0) return null;
                                
                                const catTotal = subcategories.reduce((acc, sub) => acc + sub.items.filter(i => !i.isArchived).reduce((a, i) => a + (budgets[i.id] || 0), 0), 0);

                                return (
                                    <AccordionItem key={cat.id} title={cat.name} amount={catTotal} amountColor="text-emerald-600">
                                        {subcategories.map(sub => {
                                            const items = sub.items.filter(i => !i.isArchived);
                                            if (items.length === 0) return null;
                                            
                                            const subTotal = items.reduce((acc, i) => acc + (budgets[i.id] || 0), 0);
                                            return (
                                                <AccordionItem key={sub.id} title={sub.name} amount={subTotal} amountColor="text-emerald-500/80" level={2}>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 pt-1">
                                                        {items.map(item => (
                                                            <div key={item.id} className="flex flex-col">
                                                                <label className="text-[11px] font-medium text-slate-500 mb-1.5 ml-0.5 tracking-normal">{item.name}</label>
                                                                <div className="relative">
                                                                    <input 
                                                                        type="number"
                                                                        value={budgets[item.id] || ''}
                                                                        onChange={(e) => handleItemBudgetChange(item.id, e.target.value)}
                                                                        className="input-style text-right py-2 pr-3 text-sm font-bold border-slate-200 hover:border-slate-300 focus:border-emerald-500 transition-all"
                                                                        placeholder="0,00"
                                                                        step="0.01"
                                                                    />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </AccordionItem>
                                            );
                                        })}
                                    </AccordionItem>
                                );
                            })}
                        </div>

                        <div>
                            <h4 className="text-xs font-bold text-rose-600 uppercase mb-4 px-1 flex items-center gap-2 tracking-normal">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                                Limites de despesas
                            </h4>
                            {categorizedData.expenses.map(cat => {
                                const budgets = itemBudgets[String(selectedYear)]?.[String(selectedMonth)] || {};
                                const subcategories = cat.subcategories.filter(s => !s.isArchived);
                                if (subcategories.length === 0) return null;
                                
                                const catTotal = subcategories.reduce((acc, sub) => acc + sub.items.filter(i => !i.isArchived).reduce((a, i) => a + (budgets[i.id] || 0), 0), 0);

                                return (
                                    <AccordionItem key={cat.id} title={cat.name} amount={catTotal} amountColor="text-rose-600">
                                        {subcategories.map(sub => {
                                            const items = sub.items.filter(i => !i.isArchived);
                                            if (items.length === 0) return null;
                                            
                                            const subTotal = items.reduce((acc, i) => acc + (budgets[i.id] || 0), 0);
                                            return (
                                                <AccordionItem key={sub.id} title={sub.name} amount={subTotal} amountColor="text-rose-500/80" level={2}>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 pt-1">
                                                        {items.map(item => (
                                                            <div key={item.id} className="flex flex-col">
                                                                <label className="text-[11px] font-medium text-slate-500 mb-1.5 ml-0.5 tracking-normal">{item.name}</label>
                                                                <div className="relative">
                                                                    <input 
                                                                        type="number"
                                                                        value={budgets[item.id] || ''}
                                                                        onChange={(e) => handleItemBudgetChange(item.id, e.target.value)}
                                                                        className="input-style text-right py-2 pr-3 text-sm font-bold border-slate-200 hover:border-slate-300 focus:border-rose-500 transition-all"
                                                                        placeholder="0,00"
                                                                        step="0.01"
                                                                    />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </AccordionItem>
                                            );
                                        })}
                                    </AccordionItem>
                                );
                            })}
                        </div>
                    </div>

                    {/* Card de Resumo - Clean & Blue Edition */}
                    <div className="lg:col-span-4">
                        <div className="sticky top-24 bg-blue-50/40 rounded-2xl p-6 border border-blue-100 shadow-sm">
                            <h4 className="text-xs font-bold text-blue-800 uppercase tracking-normal mb-6 border-b border-blue-100 pb-4">
                                Resumo • {monthsNames[selectedMonth]}
                            </h4>
                            
                            <div className="space-y-5 mb-8">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-slate-500">Total receitas</span>
                                    <span className="text-base font-bold text-emerald-600">{formatCurrency(itemPlanningTotals.totalIncome)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-slate-500">Total despesas</span>
                                    <span className="text-base font-bold text-rose-600">{formatCurrency(itemPlanningTotals.totalExpense)}</span>
                                </div>
                                <div className="pt-4 border-t border-blue-100 flex justify-between items-center">
                                    <span className="text-sm font-bold text-blue-900">Sobra prevista</span>
                                    <span className={`text-2xl font-black ${itemPlanningTotals.plannedSurplus >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                                        {formatCurrency(itemPlanningTotals.plannedSurplus)}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl p-5 border border-blue-200 shadow-sm">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[11px] font-bold text-blue-700 uppercase tracking-normal">Atingimento da meta</span>
                                    <span className="text-xs font-bold text-slate-400">Meta: {formatCurrency(monthlyGoal)}</span>
                                </div>
                                {monthlyGoal > 0 ? (
                                    <>
                                        <ProgressBar 
                                            value={(itemPlanningTotals.plannedSurplus / monthlyGoal) * 100} 
                                            color={itemPlanningTotals.plannedSurplus >= monthlyGoal ? "bg-emerald-500" : "bg-amber-500"} 
                                            height="h-1.5"
                                        />
                                        <p className="text-[10px] mt-4 italic text-slate-500 font-medium leading-relaxed">
                                            {itemPlanningTotals.plannedSurplus >= monthlyGoal 
                                                ? "✅ O plano atual é suficiente para bater sua meta! Continue assim." 
                                                : "⚠️ Atenção: O planejamento atual está abaixo da meta de economia necessária."}
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-[10px] text-slate-400 italic">Defina uma meta anual de economia acima para comparar.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800 tracking-tight">Progresso consolidado</h3>
                        <p className="text-sm text-slate-500 font-medium">Soma de todos os meses do ano</p>
                    </div>
                </div>
                
                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-3xl font-bold text-slate-800"><PrivateValue>{formatCurrency(totalSavings)}</PrivateValue></p>
                            <p className="text-sm text-slate-500 font-medium">economizados de {formatCurrency(annualGoal)}</p>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {monthlyPerformance.map((month, idx) => {
                        const monthProgress = monthlyGoal > 0 ? (month.realized / monthlyGoal) * 100 : 0;
                        const isGoalMet = month.realized >= monthlyGoal && monthlyGoal > 0;
                        
                        return (
                            <div key={idx} className={`p-4 rounded-xl border transition-all ${month.isCurrent ? 'border-blue-200 bg-blue-50/30' : 'border-slate-100 hover:bg-slate-50'}`}>
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className={`font-bold ${month.isCurrent ? 'text-blue-700' : 'text-slate-700'} tracking-normal`}>
                                        {month.fullName}
                                        {month.isCurrent && <span className="ml-2 text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full uppercase tracking-tighter">Hoje</span>}
                                    </h4>
                                    {isGoalMet && <CheckIcon className="w-4 h-4 text-green-500" />}
                                </div>

                                <div className="flex justify-between items-baseline mb-1">
                                    <span className="text-sm font-bold text-slate-800 tracking-normal"><PrivateValue>{formatCurrency(month.realized)}</PrivateValue></span>
                                    <span className={`text-xs font-bold ${isGoalMet ? 'text-green-600' : 'text-slate-400'}`}>
                                        {monthProgress.toFixed(0)}%
                                    </span>
                                </div>

                                <ProgressBar 
                                    value={monthProgress} 
                                    color={isGoalMet ? "bg-green-500" : month.realized < 0 ? "bg-red-500" : "bg-blue-400"} 
                                    height="h-1.5"
                                />
                                
                                <div className="flex justify-between mt-2 text-[10px] font-medium text-slate-400 tracking-normal">
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
