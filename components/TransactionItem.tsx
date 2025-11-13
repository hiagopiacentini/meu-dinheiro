
import React from 'react';
import { Transaction, TransactionType } from '../types';
import TrashIcon from './icons/TrashIcon';
import IncomeIcon from './icons/IncomeIcon';
import ExpenseIcon from './icons/ExpenseIcon';

interface TransactionItemProps {
  transaction: Transaction;
  onDelete: (id: string) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

const TransactionItem: React.FC<TransactionItemProps> = ({ transaction, onDelete }) => {
  const isIncome = transaction.type === TransactionType.INCOME;
  const amountColor = isIncome ? 'text-green-500' : 'text-red-500';

  return (
    <div className={`flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 transition-shadow hover:shadow-md`}>
      <div className="flex items-center space-x-4">
        <div className={`p-2 rounded-full ${isIncome ? 'bg-green-100' : 'bg-red-100'}`}>
          {isIncome ? <IncomeIcon className="w-5 h-5 text-green-500" /> : <ExpenseIcon className="w-5 h-5 text-red-500" />}
        </div>
        <div>
          <p className="font-semibold text-slate-800">{transaction.description}</p>
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <span>{formatDate(transaction.date)}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <span className={`font-semibold ${amountColor}`}>{formatCurrency(transaction.amount)}</span>
        <button
          onClick={() => onDelete(transaction.id)}
          className="text-slate-400 hover:text-red-500 transition-colors"
          aria-label="Deletar transação"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default TransactionItem;