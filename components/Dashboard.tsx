
import React from 'react';
import IncomeIcon from './icons/IncomeIcon';
import ExpenseIcon from './icons/ExpenseIcon';

interface DashboardProps {
  balance: number;
  totalIncome: number;
  totalExpenses: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const DashboardCard: React.FC<{ title: string; amount: number; color: string; children: React.ReactNode }> = ({ title, amount, color, children }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-lg flex items-center space-x-4 transition-transform transform hover:-translate-y-1">
      <div className={`p-3 rounded-full ${color}`}>
        {children}
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{formatCurrency(amount)}</p>
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ balance, totalIncome, totalExpenses }) => {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col justify-center">
        <p className="text-sm text-gray-500 font-medium">Saldo Atual</p>
        <p className={`text-3xl font-bold ${balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {formatCurrency(balance)}
        </p>
      </div>
      <DashboardCard title="Receitas" amount={totalIncome} color="bg-green-100">
        <IncomeIcon className="w-6 h-6 text-green-500" />
      </DashboardCard>
      <DashboardCard title="Despesas" amount={totalExpenses} color="bg-red-100">
        <ExpenseIcon className="w-6 h-6 text-red-500" />
      </DashboardCard>
    </section>
  );
};

export default Dashboard;