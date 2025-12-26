import React, { useState, useMemo, useEffect } from 'react';
import { useGoals, useTransactions, useCategories, useManualSavings } from '../hooks/useFirestore';
import { TransactionType } from '../types';
import PencilIcon from '../components/icons/PencilIcon';
import XIcon from '../components/icons/XIcon';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const ProgressBar: React.FC<{ value: number, color: string }> = ({ value, color }) => {
    const percentage = Math.max(0, Math.min(100, value));
    return (
        <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className={`${color} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
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

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // 0 = Janeiro, 11 = Dezembro

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
        if (year < currentYear) return true; // Anos passados: todos os meses editáveis
        if (year > currentYear) return false; // Anos futuros: nenhum editável
        return monthIndex < currentMonth; // Ano atual: apenas meses estritamente anteriores
    };

    const handleChange = (month: string, value: string) => {
        setMonthlyValues(prev => ({ ...prev, [month]: value }));
    };

    const handleDistribute = () => {
        // Safe string conversion before replace
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
    const activeMonthsCount = months.filter((_, i) => isMonthEditable(i)).length;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg m-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-800">Histórico Manual ({year})</h2>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100"><XIcon className="w-5 h-5 text-slate-500"/></button>
                </div>
                
                <p className="text-sm text-slate-500 mb-6 bg-blue-50 p-3 rounded-lg border border-blue-100">
                    Insira economias realizadas antes de usar o sistema. <br/>
                    <span className="font-semibold">Nota:</span> Apenas meses anteriores ao atual ({months[currentMonth]}) podem ser editados.
                </p>

                {activeMonthsCount > 0 && (
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
                                Distribuir Média
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-2">
                            Isso irá dividir o valor igualmente entre os {activeMonthsCount} meses anteriores disponíveis.
                        </p>
                    </div>
                )}

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
                    <button onClick={handleSave} className="btn-primary">Salvar Ajustes</button>
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
    
    const currentYear = new Date().getFullYear();
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

    const { transactionSavings } = useMemo(() => {
        if (!transactions) return { transactionSavings: 0 };

        const startOfYear = new Date(Date.UTC(selectedYear, 0, 1));
        const endOfPeriod = new Date(Date.UTC(selectedYear, 11, 31, 23, 59, 59, 999));

        const yearTrans = transactions.filter(t => {
            const date = new Date(t.date);
            const tDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
            return tDate >= startOfYear && tDate <= endOfPeriod;
        });

        const totalSavings = yearTrans.reduce((acc, t) => {
            const shouldInclude = !t.itemId || itemBalanceMap.get(t.itemId) !== false;
            
            if (shouldInclude) {
                if (t.type === TransactionType.INCOME) return acc + t.amount;
                if (t.type === TransactionType.EXPENSE) return acc - t.amount;
            }
            return acc;
        }, 0);

        return { transactionSavings: totalSavings };
    }, [transactions, selectedYear, itemBalanceMap]);
    
    // Fix: Explicitly type useMemo to number to resolve 'unknown' type comparison errors at line 322
    const manualSavingsTotal = useMemo<number>(() => {
        if (!manualSavings) return 0;
        const yearData = manualSavings[String(selectedYear)];
        if (!yearData) return 0;
        return (Object.values(yearData) as number[]).reduce((sum: number, val: number) => sum + (val || 0), 0);
    }, [manualSavings, selectedYear]);

    const totalSavings = transactionSavings + manualSavingsTotal;

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
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg text-slate-800">Progresso Anual de {selectedYear}</h3>
                    <button 
                        onClick={() => setIsHistoryModalOpen(true)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                    >
                        <PencilIcon className="w-3.5 h-3.5" />
                        Ajuste Manual / Histórico
                    </button>
                </div>
                
                <div className="mt-2 space-y-2">
                    <div className="flex justify-between text-sm text-slate-700 font-medium">
                        <span>{formatCurrency(totalSavings)}</span>
                        <span className="text-slate-500">Meta: {formatCurrency(annualGoal)}</span>
                    </div>
                    <ProgressBar value={annualProgress} color="bg-green-500" />
                    <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-slate-400">
                            {manualSavingsTotal > 0 && `(Inclui ${formatCurrency(manualSavingsTotal)} manual)`}
                        </p>
                        <p className="text-right text-sm font-semibold text-slate-800">{annualProgress.toFixed(1)}% atingido</p>
                    </div>
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