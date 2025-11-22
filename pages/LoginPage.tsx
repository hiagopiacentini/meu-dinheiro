
import React, { useState } from 'react';
import { sampleAccounts, sampleTransactions, sampleCategories, sampleLoans, sampleGoals } from '../data/demoData';

interface LoginPageProps {
  onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleDemoLogin = () => {
    // Clear existing data and set demo data
    localStorage.setItem('accounts', JSON.stringify(sampleAccounts));
    localStorage.setItem('transactions', JSON.stringify(sampleTransactions));
    localStorage.setItem('categories', JSON.stringify(sampleCategories));
    localStorage.setItem('loans', JSON.stringify(sampleLoans));
    localStorage.setItem('goals', JSON.stringify(sampleGoals));
    onLogin();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === 'hiago.vha@gmail.com' && password === 'nbt1515') {
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