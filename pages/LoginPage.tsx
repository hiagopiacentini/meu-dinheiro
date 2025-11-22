
import React, { useState } from 'react';
import { sampleAccounts, sampleTransactions, sampleCategories, sampleLoans, sampleGoals } from '../data/demoData';

interface LoginPageProps {
  onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Function to clean up demo data from LocalStorage without deleting user data
  const cleanupDemoData = () => {
    try {
      // 1. Clean Accounts (remove ids containing '-demo')
      const storedAccounts = JSON.parse(localStorage.getItem('accounts') || '[]');
      if (Array.isArray(storedAccounts)) {
        const userAccounts = storedAccounts.filter((acc: any) => !acc.id.includes('-demo'));
        localStorage.setItem('accounts', JSON.stringify(userAccounts));
      }

      // 2. Clean Transactions (remove ids starting with 't-demo')
      const storedTransactions = JSON.parse(localStorage.getItem('transactions') || '[]');
      if (Array.isArray(storedTransactions)) {
        const userTransactions = storedTransactions.filter((t: any) => !String(t.id).startsWith('t-demo'));
        localStorage.setItem('transactions', JSON.stringify(userTransactions));
      }

      // 3. Clean Categories (remove short ids like 'c1', 'sc1' which are demo data, UUIDs are long)
      // We verify if it's the exact sample structure or user data. 
      // If the user has NO categories (only demo), we might want to keep a basic structure, 
      // but the user asked to remove demo data.
      const storedCategories = JSON.parse(localStorage.getItem('categories') || '[]');
      if (Array.isArray(storedCategories)) {
        // Demo categories have simple IDs like 'c1', 'c2'. User categories use crypto.randomUUID (long strings)
        const userCategories = storedCategories.filter((c: any) => c.id.length > 10);
        
        // If user has 0 categories after cleanup, we might want to leave them empty or provide a clean slate
        // For now, we save the filtered list.
        if (userCategories.length !== storedCategories.length) {
             localStorage.setItem('categories', JSON.stringify(userCategories));
        }
      }

    } catch (e) {
      console.error("Erro ao limpar dados de demonstração", e);
    }
  };

  const handleDemoLogin = () => {
    if (window.confirm("Atenção: Entrar no modo Demonstração irá substituir os dados atuais do navegador pelos dados de exemplo. Deseja continuar?")) {
      // Clear existing data and set demo data
      localStorage.setItem('accounts', JSON.stringify(sampleAccounts));
      localStorage.setItem('transactions', JSON.stringify(sampleTransactions));
      localStorage.setItem('categories', JSON.stringify(sampleCategories));
      localStorage.setItem('loans', JSON.stringify(sampleLoans));
      localStorage.setItem('goals', JSON.stringify(sampleGoals));
      onLogin();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === 'hiago.vha@gmail.com' && password === 'nbt1515') {
      // Clean demo data before logging in to ensure user sees only their data
      cleanupDemoData();
      setError('');
      onLogin();
    } else if (email === 'alebarros.vha@gmail.com' && password === 'nbt1515') {
      setError('');
      handleDemoLogin();
    } else {
      setError('Email ou senha inválidos.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight text-center mb-2">
            Sobra+
          </h1>
          <p className="text-center text-slate-500 mb-8">Acesse sua conta para continuar.</p>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-style"
                placeholder="voce@exemplo.com"
                required
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                Senha
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-style"
                placeholder="••••••••"
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <div>
              <button type="submit" className="btn-primary w-full py-3">
                Entrar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
