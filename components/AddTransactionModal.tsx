
import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType } from '../types';
import { EXPENSE_CATEGORIES } from '../constants';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
}

const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  onAddTransaction,
}) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);

  useEffect(() => {
    if (!isOpen) {
      // Reset form on close
      setDescription('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setType(TransactionType.EXPENSE);
      setCategory(EXPENSE_CATEGORIES[0]);
    }
  }, [isOpen]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !date) {
      alert('Por favor, preencha todos os campos.');
      return;
    }
    
    // This modal is legacy and doesn't support account/item selection.
    // We provide defaults to satisfy the type.
    onAddTransaction({
      description,
      amount: parseFloat(amount),
      date,
      type,
      itemId: '', // Fix compile error
      accountId: '', // Fix compile error
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4 transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Nova Transação</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex space-x-4 mb-4">
            <button
              type="button"
              onClick={() => setType(TransactionType.EXPENSE)}
              className={`w-full py-2 rounded-md transition-colors ${type === TransactionType.EXPENSE ? 'bg-red-500 text-white' : 'bg-gray-200'}`}
            >
              Despesa
            </button>
            <button
              type="button"
              onClick={() => setType(TransactionType.INCOME)}
              className={`w-full py-2 rounded-md transition-colors ${type === TransactionType.INCOME ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
            >
              Receita
            </button>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descrição</label>
            <input
              type="text"
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Valor (R$)</label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              step="0.01"
              min="0"
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          {type === TransactionType.EXPENSE && (
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">Categoria</label>
              <select
                id="category"
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="mt-1 input-style"
              >
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700">Data</label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              Adicionar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTransactionModal;
