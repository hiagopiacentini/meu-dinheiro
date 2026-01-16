
import React, { useState, useMemo, useEffect } from 'react';
import { useGoals, useTransactions, useCategories, useManualSavings, useCDBs } from '../hooks/useFirestore';
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

const ManualHistoryModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    year: number;
    manualSavings: { [month: string]: number };
    onSave: (year: number, data: { [month: string]: number }) => Promise<void>;
}> = ({ isOpen, onClose, year, manualSavings, onSave }) => {
    const [monthlyValues, setMonthlyValues] = useState<{ [month: string]: string }>({});
    const [distributeAmount, setDistributeAmount] = useState<string>('');

    const now = getNowGmtMinus4();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    useEffect(() => {
        if(isOpen) {
            const initialValues: { [key: string]: string } = {};
            const savingsData = manualSavings || {}; 
            for(let i=0; i<12; i++) {
                const val = savingsData[String(i)];
                initialValues[String(i)] = (val !== undefined && val !== null) ? String(val) : '';
            }
            setMonthlyValues(initialValues);
            setDistributeAmount('');
        }
    }, [isOpen, manualSavings]);

    const isMonthEditable = (monthIndex: number) => {
        if (year < currentYear) return true; 
        if (year > currentYear) return false; 
        return monthIndex < currentMonth; 
    };

    const handleChange = (month: string, value: string) => {
        setMonthlyValues(prev => ({ ...prev, [month]: value }));
    };

    const handleDistribute = () => {
        const valStr = String(distributeAmount || '');
        const total = parseFloat(valStr.replace(',', '.'));
        if (isNaN(total) || total <= 0) return;

        let eligibleMonthsCount = 0;
        for (let i = 0; i < 12; i++) {
            if (isMonthEditable(i)) eligibleMonthsCount++;
        }

        if (eligibleMonthsCount === 0) {
            alert("Não há meses anteriores disponíveis neste ano para distribuir o valor.");
            return;
        }

        const average = total / eligibleMonthsCount;
        const formattedAverage = average.toFixed(2);

        const newValues = { ...monthlyValues };
        for (let i = 0; i < 12; i++) {
            if (isMonthEditable(i)) {
                newValues[String(i)] = formattedAverage;
            }
        }
        setMonthlyValues(newValues);
    };

    const handleSave = async () => {
        const dataToSave: { [month: string]: number } = {};
        Object.entries(monthlyValues).forEach(([month, value]) => {
            const valStr = String(value || '');
            const normalizedValue = valStr.replace(',', '.');
            const num = parseFloat(normalizedValue);
            if (!isNaN(num) && num !== 0) {
                dataToSave[month] = num;
            }
        });
        await onSave(year, dataToSave);
        onClose();
    };

    if (!isOpen) return null;

    const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg m-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-800">Histórico manual ({year})</h2>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100"><XIcon className="w-5 h-5 text-slate-500"/></button>
                </div>
                
                <p className="text-sm text-slate-500 mb-6 bg-blue-50 p-3 rounded-lg border border-blue-100">
                    Insira economias realizadas antes de usar o sistema. <br/>
                    <span className="font-semibold">Nota:</span> Apenas meses anteriores ao atual ({months[currentMonth]}) podem ser editados.
                </p>

                <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Não lembra mês a mês? Distribua o total:
                    </label>
                    <div className="flex gap-2">
                        <input 
                            type="number" 
                            value={distributeAmount}
                            onChange={e => setDistributeAmount(e.target.value)}
                            className="input-style flex-1"
                            placeholder={`Total acumulado até hoje`}
                            step="0.01"
                        />
                        <button 
                            type="button"
                            onClick={handleDistribute}
                            className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors"
                        >
                            Distribuir média
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {months.map((monthName, index) => {
                        const editable = isMonthEditable(index);
                        return (
                            <div key={index} className={editable ? '' : 'opacity-50 grayscale'}>
                                <label className="block text-xs font-medium text-slate-600 mb-1 flex justify-between">
                                    {monthName}
                                    {!editable && <span className="text-[10px] text-slate-400 italic">(Bloqueado)</span>}
                                </label>
                                <input 
                                    type="number" 
                                    value={monthlyValues[String(index)] || ''} 
                                    onChange={e => handleChange(String(index), e.target.value)}
                                    className={`input-style py-1.5 ${!editable ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                                    placeholder="R$ 0,00"
                                    step="0.01"
                                    disabled={!editable}
                                />
                            </div>
                        );
                    })}
                </div>

                <div className="flex justify-end pt-6">
                    <button onClick={onClose} className="btn-secondary mr-2">Cancelar</button>
                    <button onClick={handleSave} className="btn-primary">Salvar ajustes</button>
                </div>
            </div>
        </div>
    );
};


const GoalsPage: React.FC = () => {
    const { goals, setGoals } = useGoals();
    const { transactions } = useTransactions();
    const { categories } = useCategories();
    const { manualSavings, updateManualSavings } = useManualSavings();
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

    const monthlyPerformance = useMemo(() => {
        const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const yearManual = (manualSavings && manualSavings[String(selectedYear)]) || {};
        const now = getNowGmtMinus4();
        
        return months.map((name, index) => {
            const startOfMonth = new Date(Date.UTC(selectedYear, index, 1));
            const isThisMonth = selectedYear === now.getFullYear() && index === now.getMonth();
            
            // REGRA: Se for o mês atual, filtramos APENAS até hoje para bater com a dashboard.
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

            // Somar rendimentos de CDB do período
            let investmentProfitInMonth = 0;
            cdbs.forEach(cdb => {
                (cdb.yieldHistory || []).forEach(y => {
                    const yDate = new Date(y.date);
                    const yUTC = new Date(Date.UTC(yDate.getUTCFullYear(), yDate.getUTCMonth(), yDate.getUTCDate()));
                    if (yUTC >= startOfMonth && yUTC <= endOfCalculatedPeriod) {
                        investmentProfitInMonth += y.amount;
                    }
                });
            });

            const manual = yearManual[String(index)] || 0;
            return {
                name,
                fullName: ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][index],
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
            setGoals({
                ...goals,
                [selectedYear]: newGoal
            });
        }
    };
    
    const handleSaveManual = async (year: number, data: { [month: string]: number }) => {
        if (updateManualSavings) {
            await updateManualSavings({
                ...manualSavings,
                [String(year)]: data
            });
        }
    };
    
    const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i).reverse();
    const annualGoal = goals[selectedYear] || 0;
    const monthlyGoal = annualGoal / 12;
    const annualProgress = annualGoal > 0 ? (totalSavings / annualGoal) * 100 : 0;

    return (
        <div className="space-y-6 pb-10">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                    <h2 className="text-xl font-bold text-slate-800">Metas de economia</h2>
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
                        <label htmlFor="annual-goal" className="block text-sm font-medium text-slate-500 mb-2 text-center">
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
                        <p className="text-xs text-slate-400 font-medium mb-1">Esforço mensal necessário</p>
                        <p className="font-bold text-xl text-slate-700">{formatCurrency(monthlyGoal)}</p>
                    </div>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">Progresso consolidado</h3>
                        <p className="text-sm text-slate-500 font-normal">Soma de todos os meses do ano</p>
                    </div>
                    <button 
                        onClick={() => setIsHistoryModalOpen(true)}
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-lg font-bold transition-all flex items-center gap-2"
                    >
                        <PencilIcon className="w-3.5 h-3.5" />
                        Ajuste manual
                    </button>
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
                <h3 className="font-bold text-lg text-slate-800 mb-6">Desempenho mês a mês</h3>
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

            <ManualHistoryModal 
                isOpen={isHistoryModalOpen} 
                onClose={() => setIsHistoryModalOpen(false)} 
                year={selectedYear}
                manualSavings={(manualSavings && manualSavings[String(selectedYear)]) || {}}
                onSave={handleSaveManual}
            />
        </div>
    );
};

export default GoalsPage;
