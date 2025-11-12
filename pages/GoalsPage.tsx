import React, { useState, useMemo, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Transaction, TransactionType } from '../types';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface YearlyGoals {
  [year: string]: number[];
}

const ProgressBar: React.FC<{ value: number, color: string }> = ({ value, color }) => {
    const percentage = Math.max(0, Math.min(100, value));
    return (
        <div className="w-full bg-slate-200 rounded-full h-2.5">
            <div className={`${color} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
        </div>
    );
};


const GoalsPage: React.FC = () => {
    const [goals, setGoals] = useLocalStorage<YearlyGoals>('goals', {});
    const [transactions] = useLocalStorage<Transaction[]>('transactions', []);
    
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);

    // Local state for input values to avoid re-renders on every keypress
    const [monthlyInputs, setMonthlyInputs] = useState<string[]>(
        (goals[selectedYear] || Array(12).fill(0)).map(String)
    );

    // Update local inputs when year or main goals state changes
    useEffect(() => {
        const yearGoals = goals[selectedYear] || Array(12).fill(0);
        setMonthlyInputs(yearGoals.map(String));
    }, [selectedYear, goals]);


    const { monthlySavings, annualSavings } = useMemo(() => {
        const savingsByMonth = Array(12).fill(0);

        transactions.forEach(t => {
            const tDate = new Date(t.date);
            const tYear = tDate.getUTCFullYear();
            
            if (tYear !== selectedYear || t.type === TransactionType.TRANSFER) return;

            const tMonth = tDate.getUTCMonth();

            if (t.type === TransactionType.INCOME) {
                savingsByMonth[tMonth] += t.amount;
            } else if (t.type === TransactionType.EXPENSE) {
                savingsByMonth[tMonth] -= t.amount;
            }
        });
        
        const totalAnnualSavings = savingsByMonth.reduce((sum, current) => sum + current, 0);

        return { 
            monthlySavings: savingsByMonth,
            annualSavings: totalAnnualSavings
        };
    }, [transactions, selectedYear]);

    const handleInputChange = (monthIndex: number, value: string) => {
        const newInputs = [...monthlyInputs];
        newInputs[monthIndex] = value;
        setMonthlyInputs(newInputs);
    };

    const handleInputBlur = (monthIndex: number) => {
        const value = parseFloat(monthlyInputs[monthIndex]);
        const newGoal = isNaN(value) || value < 0 ? 0 : value;

        const currentYearGoals = goals[selectedYear] || Array(12).fill(0);
        const updatedYearGoals = [...currentYearGoals];
        updatedYearGoals[monthIndex] = newGoal;

        setGoals({
            ...goals,
            [selectedYear]: updatedYearGoals,
        });
    };

    const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i).reverse();
    const months = [ "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro" ];
    
    const currentYearGoals = goals[selectedYear] || Array(12).fill(0);
    const annualGoal = currentYearGoals.reduce((sum, goal) => sum + goal, 0);
    const annualProgress = annualGoal > 0 ? (annualSavings / annualGoal) * 100 : 0;

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4">
                    <h2 className="text-xl font-bold text-slate-800">Metas de Economia</h2>
                     <div className="flex items-center self-end md:self-center">
                        <label htmlFor="year-select" className="text-sm font-medium mr-2">Ano:</label>
                        <select 
                            id="year-select" 
                            value={selectedYear} 
                            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                            className="input-style w-32 py-2"
                        >
                            {yearOptions.map(year => <option key={year} value={year}>{year}</option>)}
                        </select>
                    </div>
                </div>

                <h3 className="font-bold text-lg text-slate-700">Resumo Anual de {selectedYear}</h3>
                <div className="mt-2 space-y-2">
                    <div className="flex justify-between text-sm text-slate-600 font-medium">
                        <span>{formatCurrency(annualSavings)}</span>
                        <span className="text-slate-500">Meta: {formatCurrency(annualGoal)}</span>
                    </div>
                    <ProgressBar value={annualProgress} color="bg-green-500" />
                    <p className="text-right text-sm mt-1 font-semibold">{annualProgress.toFixed(1)}% atingido</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {months.map((monthName, index) => {
                    const monthGoal = currentYearGoals[index];
                    const monthSaved = monthlySavings[index];
                    const monthProgress = monthGoal > 0 ? (monthSaved / monthGoal) * 100 : 0;
                    
                    return (
                        <div key={index} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                            <h4 className="font-bold text-lg text-slate-800 mb-3">{monthName}</h4>
                            
                            <div className="flex items-center space-x-2 mb-3">
                                <label htmlFor={`goal-${index}`} className="text-sm font-medium text-slate-600 whitespace-nowrap">Meta:</label>
                                <input 
                                    type="number"
                                    id={`goal-${index}`}
                                    value={monthlyInputs[index]}
                                    onChange={(e) => handleInputChange(index, e.target.value)}
                                    onBlur={() => handleInputBlur(index)}
                                    className="input-style w-full"
                                    placeholder="0"
                                    min="0"
                                />
                            </div>

                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-slate-600 font-medium">
                                    <span>Economizado: {formatCurrency(monthSaved)}</span>
                                    <span>{monthProgress.toFixed(0)}%</span>
                                </div>
                                <ProgressBar value={monthProgress} color="bg-blue-500" />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default GoalsPage;
