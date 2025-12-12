
import React, { useState, useMemo } from 'react';
import { useTransactions, useCategories, useAccounts } from '../hooks/useFirestore';
import { TransactionType } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, ComposedChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import DateRangePickerModal from '../components/DateRangePickerModal';
import ChevronDownIcon from '../components/icons/ChevronDownIcon';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];
const RADIAN = Math.PI / 180;

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

// Helper for custom labels in Pie Chart
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12} fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const KpiCard: React.FC<{ title: string, value: string, subtext?: string, colorClass?: string }> = ({ title, value, subtext, colorClass = "text-slate-800" }) => (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</h3>
        <div className="mt-2">
            <span className={`text-3xl font-bold ${colorClass}`}>{value}</span>
            {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
        </div>
    </div>
);

const ReportsPage: React.FC = () => {
    const { transactions } = useTransactions();
    const { categories } = useCategories();
    const { accounts } = useAccounts();

    // Default: Last 6 months
    const [period, setPeriod] = useState<'30days' | '3months' | '6months' | 'year' | 'all'>('6months');

    // Mappings
    const categoryMap = useMemo(() => {
        const map = new Map<string, { name: string, color?: string }>();
        categories.forEach(cat => {
            cat.subcategories.forEach(sub => {
                sub.items.forEach(item => {
                    map.set(item.id, { name: cat.name, color: cat.color });
                });
            });
        });
        return map;
    }, [categories]);

    const itemBalanceMap = useMemo(() => {
        const map = new Map<string, boolean>();
        categories.forEach(cat => cat.subcategories.forEach(sub => sub.items.forEach(item => map.set(item.id, item.includeInBalance))));
        return map;
    }, [categories]);

    const accountMap = useMemo(() => new Map(accounts.map(acc => [acc.id, acc])), [accounts]);

    // Data Processing based on period
    const filteredTransactions = useMemo(() => {
        const now = new Date();
        let startDate = new Date();
        
        switch (period) {
            case '30days': startDate.setDate(now.getDate() - 30); break;
            case '3months': startDate.setMonth(now.getMonth() - 3); break;
            case '6months': startDate.setMonth(now.getMonth() - 6); break;
            case 'year': startDate.setFullYear(now.getFullYear() - 1); break;
            case 'all': startDate = new Date(0); break;
        }

        return transactions.filter(t => {
            const tDate = new Date(t.date);
            // Adjust for timezone offset for accurate comparison
            const tDateUTC = new Date(Date.UTC(tDate.getUTCFullYear(), tDate.getUTCMonth(), tDate.getUTCDate()));
            return tDateUTC >= startDate;
        }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [transactions, period]);

    // --- REPORT 1: Evolution (Bar + Line) ---
    const evolutionData = useMemo(() => {
        const data = new Map<string, { name: string, Receitas: number, Despesas: number, Saldo: number, sortKey: number }>();
        
        filteredTransactions.forEach(t => {
            if (t.itemId && itemBalanceMap.get(t.itemId) === false) return; // Skip non-balance items

            const date = new Date(t.date);
            const key = `${date.getUTCMonth()}/${date.getUTCFullYear()}`; // 0/2023
            const label = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' });
            const sortKey = date.getUTCFullYear() * 100 + date.getUTCMonth();

            if (!data.has(key)) {
                data.set(key, { name: label, Receitas: 0, Despesas: 0, Saldo: 0, sortKey });
            }

            const entry = data.get(key)!;
            if (t.type === TransactionType.INCOME) {
                entry.Receitas += t.amount;
                entry.Saldo += t.amount;
            } else if (t.type === TransactionType.EXPENSE) {
                entry.Despesas += t.amount;
                entry.Saldo -= t.amount;
            }
        });

        return Array.from(data.values()).sort((a, b) => a.sortKey - b.sortKey);
    }, [filteredTransactions, itemBalanceMap]);

    // --- REPORT 2: Expenses by Payment Method (Account/Card) ---
    const paymentMethodData = useMemo(() => {
        const data = new Map<string, number>();

        filteredTransactions.forEach(t => {
            if (t.type !== TransactionType.EXPENSE) return;
            if (t.itemId && itemBalanceMap.get(t.itemId) === false) return;

            const account = accountMap.get(t.accountId);
            let label = account ? account.name : 'Conta Excluída';
            
            // Logic to append Card Name if available
            if (t.cardId && account?.cards) {
                const card = account.cards.find(c => c.id === t.cardId);
                if (card) {
                    label = `${account.name} - ${card.name}`;
                } else {
                    label = `${account.name} (Cartão)`;
                }
            } else if (account?.cards && account.cards.length > 0 && !t.cardId) {
                 // Account has cards but none selected -> Likely Debit/Transfer
                 label = `${account.name} (Débito/Conta)`;
            }

            data.set(label, (data.get(label) || 0) + t.amount);
        });

        return Array.from(data.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10); // Top 10 methods
    }, [filteredTransactions, accountMap, itemBalanceMap]);

    // --- REPORT 3: Expenses by Main Category ---
    const categoryChartData = useMemo(() => {
        const data = new Map<string, number>();
        let total = 0;

        filteredTransactions.forEach(t => {
            if (t.type !== TransactionType.EXPENSE) return;
            if (t.itemId && itemBalanceMap.get(t.itemId) === false) return;

            const catInfo = categoryMap.get(t.itemId || '');
            const name = catInfo ? catInfo.name : 'Outros';
            
            data.set(name, (data.get(name) || 0) + t.amount);
            total += t.amount;
        });

        return Array.from(data.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredTransactions, categoryMap, itemBalanceMap]);

    // --- REPORT 4: Day of Week Heatmap (Simplified to Bar Chart) ---
    const dayOfWeekData = useMemo(() => {
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const values = Array(7).fill(0);
        const counts = Array(7).fill(0); // To calculate average if needed, here using total

        filteredTransactions.forEach(t => {
            if (t.type !== TransactionType.EXPENSE) return;
            if (t.itemId && itemBalanceMap.get(t.itemId) === false) return;

            // Important: Use UTC methods or handle timezone to get correct day
            const date = new Date(t.date); 
            // Fix day of week issue by adding timezone offset logic or simple UTC
            const dayIndex = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()).getDay();
            
            values[dayIndex] += t.amount;
            counts[dayIndex] += 1;
        });

        return days.map((day, index) => ({
            name: day,
            value: values[index]
        }));
    }, [filteredTransactions, itemBalanceMap]);

    // --- KPIs ---
    const kpis = useMemo(() => {
        let totalInc = 0;
        let totalExp = 0;
        let maxExpense = { desc: '', val: 0 };
        let daysCount = 0;
        
        if (filteredTransactions.length > 0) {
            const first = new Date(filteredTransactions[0].date);
            const last = new Date(filteredTransactions[filteredTransactions.length - 1].date);
            const diffTime = Math.abs(last.getTime() - first.getTime());
            daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
        }

        filteredTransactions.forEach(t => {
            if (t.itemId && itemBalanceMap.get(t.itemId) === false) return;

            if (t.type === TransactionType.INCOME) totalInc += t.amount;
            if (t.type === TransactionType.EXPENSE) {
                totalExp += t.amount;
                if (t.amount > maxExpense.val) {
                    maxExpense = { desc: t.description, val: t.amount };
                }
            }
        });

        const savingsRate = totalInc > 0 ? ((totalInc - totalExp) / totalInc) * 100 : 0;
        const avgDaily = daysCount > 0 ? totalExp / daysCount : 0;

        return {
            savingsRate,
            avgDaily,
            maxExpense,
            totalExp
        };
    }, [filteredTransactions, itemBalanceMap]);


    return (
        <div className="space-y-8 pb-10">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Relatórios Inteligentes</h2>
                    <p className="text-slate-500 text-sm">Análise detalhada do seu comportamento financeiro.</p>
                </div>
                <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm overflow-x-auto">
                    {[
                        { id: '30days', label: '30 Dias' },
                        { id: '3months', label: '3 Meses' },
                        { id: '6months', label: '6 Meses' },
                        { id: 'year', label: '1 Ano' },
                        { id: 'all', label: 'Tudo' }
                    ].map(opt => (
                        <button
                            key={opt.id}
                            onClick={() => setPeriod(opt.id as any)}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                                period === opt.id 
                                ? 'bg-slate-800 text-white shadow' 
                                : 'text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard 
                    title="Taxa de Poupança" 
                    value={`${kpis.savingsRate.toFixed(1)}%`} 
                    colorClass={kpis.savingsRate > 20 ? 'text-green-600' : kpis.savingsRate > 0 ? 'text-blue-600' : 'text-red-600'}
                    subtext="Da sua renda foi economizada"
                />
                <KpiCard 
                    title="Média Diária" 
                    value={formatCurrency(kpis.avgDaily)} 
                    subtext="Gasto médio por dia no período"
                />
                <KpiCard 
                    title="Maior Despesa" 
                    value={formatCurrency(kpis.maxExpense.val)} 
                    subtext={kpis.maxExpense.desc || '-'}
                    colorClass="text-red-600"
                />
                <KpiCard 
                    title="Total Gasto" 
                    value={formatCurrency(kpis.totalExp)}
                    subtext="Neste período selecionado" 
                />
            </div>

            {/* Chart 1: Financial Evolution */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Evolução Financeira</h3>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={evolutionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(val) => `R$${val/1000}k`} />
                            <Tooltip 
                                cursor={{fill: 'transparent'}}
                                contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                                formatter={(value: number) => formatCurrency(value)}
                            />
                            <Legend wrapperStyle={{paddingTop: '20px'}} />
                            <Bar dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                            <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                            <Line type="monotone" dataKey="Saldo" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: '#fff'}} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart 2: Expenses by Payment Method (With Cards) */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Por Meio de Pagamento</h3>
                    <p className="text-xs text-slate-500 mb-6">Análise detalhada por conta e cartões</p>
                    <div className="h-80 w-full">
                        {paymentMethodData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={paymentMethodData} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                    <XAxis type="number" hide />
                                    <YAxis 
                                        type="category" 
                                        dataKey="name" 
                                        width={120} 
                                        tick={{fill: '#475569', fontSize: 11}} 
                                        interval={0}
                                    />
                                    <Tooltip 
                                        cursor={{fill: 'rgba(241, 245, 249, 0.5)'}}
                                        contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0'}}
                                        formatter={(value: number) => formatCurrency(value)}
                                    />
                                    <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={24}>
                                        {paymentMethodData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400">Sem dados de despesas.</div>
                        )}
                    </div>
                </div>

                {/* Chart 3: Expenses by Category */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Raio-X das Categorias</h3>
                    <div className="h-80 w-full flex flex-col sm:flex-row items-center">
                        <div className="w-full sm:w-1/2 h-64">
                             {categoryChartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categoryChartData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={renderCustomizedLabel}
                                            innerRadius={60}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            paddingAngle={2}
                                            dataKey="value"
                                        >
                                            {categoryChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                    </PieChart>
                                </ResponsiveContainer>
                             ) : (
                                <div className="flex items-center justify-center h-full text-slate-400">Sem dados.</div>
                             )}
                        </div>
                        <div className="w-full sm:w-1/2 mt-4 sm:mt-0 pl-0 sm:pl-6">
                            <ul className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                {categoryChartData.map((entry, index) => (
                                    <li key={index} className="flex justify-between items-center text-sm">
                                        <div className="flex items-center">
                                            <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                                            <span className="text-slate-700 truncate max-w-[120px]" title={entry.name}>{entry.name}</span>
                                        </div>
                                        <span className="font-medium text-slate-900">{formatCurrency(entry.value)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart 4: Day of Week Trend */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Gastos por Dia da Semana</h3>
                <p className="text-xs text-slate-500 mb-6">Identifique em quais dias da semana você costuma gastar mais.</p>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dayOfWeekData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                            <Tooltip 
                                cursor={{fill: 'rgba(241, 245, 249, 0.5)'}}
                                contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0'}}
                                formatter={(value: number) => formatCurrency(value)}
                            />
                            <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default ReportsPage;
