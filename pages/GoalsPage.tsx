
import React, { useState, useMemo, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Transaction, TransactionType, AnnualGoals } from '../types';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const ProgressBar: React.FC<{ value: number, color: string }> = ({ value, color }) => {
    const percentage = Math.max(0, Math.min(100, value));
    return (
        <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className={`${color} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
        </div>
    );
};


const GoalsPage: React.FC = () => {
    const [goals, setGoals] = useLocalStorage<AnnualGoals>('goals', {});
    const [transactions] = useLocalStorage<Transaction[]>('transactions', []);
    
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);

    const [annualInput, setAnnualInput] = useState<string>(String(goals[selectedYear] || ''));

    useEffect(() => {
        setAnnualInput(String(goals[selectedYear] || ''));
    }, [selectedYear, goals]);


    const { annualSavings } = useMemo(() => {
        const startOfYear = new Date(Date.UTC(selectedYear, 0, 1));
        
        const now = new Date();
        const isCurrentYear = selectedYear === now.getFullYear();
        const endOfPeriod = isCurrentYear 
            ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999))
            : new Date(Date.UTC(selectedYear, 11, 31, 23, 59, 59, 999));

        const yearTrans = transactions.filter(t => {
            const date = new Date(t.date);
            const tDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
            return tDate >= startOfYear && tDate <= endOfPeriod && t.type !== TransactionType.TRANSFER;
        });

        const totalSavings = yearTrans.reduce((acc, t) => {
            if (t.type === TransactionType.INCOME) return acc + t.amount;
            if (t.type === TransactionType.EXPENSE) return acc - t.amount;
            return acc;
        }, 0);

        return { annualSavings: totalSavings };
    }, [transactions, selectedYear]);
    
    const handleInputBlur = () => {
        const value = parseFloat(annualInput);
        const newGoal = isNaN(value) || value < 0 ? 0 : value;
        
        if ((goals[selectedYear] || 0) !== newGoal) {
            setGoals(prevGoals => ({
                ...prevGoals,
                [selectedYear]: newGoal
            }));
        }
    };
    
    const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i).reverse();
    const annualGoal = goals[selectedYear] || 0;
    const monthlyGoal = annualGoal / 12;
    const annualProgress = annualGoal > 0 ? (annualSavings / annualGoal) * 100 : 0;

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                    <h2 className="text-xl font-bold text-slate-800">Metas de Economia</h2>
                     <div className="flex items-center self-end md:self-center">
                        <label htmlFor="year-select" className="text-sm font-medium mr-2 text-slate-600">Ano:</label>
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

                <div className="max-w-md mx-auto">
                    <div className="mb-4">
                        <label htmlFor="annual-goal" className="block text-lg font-semibold text-slate-800 mb-2 text-center">
                            Definir Meta Anual de Economia para {selectedYear}
                        </label>
                        <input 
                            type="number"
                            id="annual-goal"
                            value={annualInput}
                            onChange={(e) => setAnnualInput(e.target.value)}
                            onBlur={handleInputBlur}
                            className="input-style w-full text-center text-xl py-3"
                            placeholder="0"
                            min="0"
                        />
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg border border-slate-200">
                        <p className="text-md text-slate-500">Meta Mensal (calculada)</p>
                        <p className="font-bold text-2xl text-blue-600">{formatCurrency(monthlyGoal)}</p>
                    </div>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-lg text-slate-800">Progresso Anual de {selectedYear}</h3>
                <div className="mt-2 space-y-2">
                    <div className="flex justify-between text-sm text-slate-700 font-medium">
                        <span>{formatCurrency(annualSavings)}</span>
                        <span className="text-slate-500">Meta: {formatCurrency(annualGoal)}</span>
                    </div>
                    <ProgressBar value={annualProgress} color="bg-green-500" />
                    <p className="text-right text-sm mt-1 font-semibold text-slate-800">{annualProgress.toFixed(1)}% atingido</p>
                </div>
            </div>
        </div>
    );
};

export default GoalsPage;
