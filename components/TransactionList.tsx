
import React from 'react';
import { Transaction } from '../types';
import TransactionItem from './TransactionItem';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, onDelete }) => {
  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Histórico de Transações</h2>
      {transactions.length === 0 ? (
        <p className="text-center text-gray-500 py-8">Nenhuma transação registrada ainda.</p>
      ) : (
        <div className="space-y-3">
          {transactions.map(transaction => (
            <TransactionItem key={transaction.id} transaction={transaction} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
};

export default TransactionList;