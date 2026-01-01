
import React, { useState } from 'react';
import { sampleAccounts, sampleTransactions, sampleCategories, sampleLoans, sampleGoals } from '../data/demoData';
import { auth } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

interface LoginPageProps {
  onLogin: () => void;
}

const safeStringify = (obj: any): string => {
  const cache = new Set();
  try {
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (cache.has(value)) {
          return '[Circular]';
        }
        cache.add(value);
      }
      return value;
    });
  } catch (error) {
    console.error("Erro na serialização segura:", error);
    return "null"; 
  }
};

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const cleanupDemoData = () => {
    try {
      const storedAccountsStr = localStorage.getItem('accounts');
      if (storedAccountsStr) {
          const storedAccounts = JSON.parse(storedAccountsStr);
          if (Array.isArray(storedAccounts)) {
            const userAccounts = storedAccounts.filter((acc: any) => acc && acc.id && typeof acc.id === 'string' && !acc.id.includes('-demo'));
            localStorage.setItem('accounts', safeStringify(userAccounts));
          }
      }

      const storedTransactionsStr = localStorage.getItem('transactions');
      if (storedTransactionsStr) {
          const storedTransactions = JSON.parse(storedTransactionsStr);
          if (Array.isArray(storedTransactions)) {
            const userTransactions = storedTransactions.filter((t: any) => t && t.id && !String(t.id).startsWith('t-demo'));
            localStorage.setItem('transactions', safeStringify(userTransactions));
          }
      }

      const storedCategoriesStr = localStorage.getItem('categories');
      if (storedCategoriesStr) {
          const storedCategories = JSON.parse(storedCategoriesStr);
          if (Array.isArray(storedCategories)) {
            const userCategories = storedCategories.filter((c: any) => c && c.id && c.id.length > 10);
            if (userCategories.length !== storedCategories.length) {
                 localStorage.setItem('categories', safeStringify(userCategories));
            }
          }
      }
    } catch (e) {
      console.error("Erro ao limpar dados de demonstração", e);
    }
  };

  const handleDemoLogin = () => {
    if (window.confirm("Atenção: Entrar no modo Demonstração irá substituir os dados atuais do navegador pelos dados de exemplo. Deseja continuar?")) {
      try {
        localStorage.setItem('accounts', safeStringify(sampleAccounts));
        localStorage.setItem('transactions', safeStringify(sampleTransactions));
        localStorage.setItem('categories', safeStringify(sampleCategories));
        localStorage.setItem('loans', safeStringify(sampleLoans));
        localStorage.setItem('goals', safeStringify(sampleGoals));
        onLogin();
      } catch (e) {
        console.error("Error setting demo data:", e);
        alert("Erro ao carregar dados de demonstração.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    if (!isSignUp && trimmedEmail === 'alebarros.vha@gmail.com' && password === 'nbt1515') {
      handleDemoLogin();
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        if (!trimmedName) {
            setError('Por favor, informe seu nome.');
            setLoading(false);
            return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        await updateProfile(userCredential.user, {
            displayName: trimmedName
        });
        cleanupDemoData();
        onLogin();
      } else {
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
        cleanupDemoData();
        onLogin();
      }
    } catch (err: any) {
      console.warn("Login attempt failed:", err.code);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Email ou senha incorretos.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este email já está em uso.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else if (err.code === 'auth/invalid-email') {
        setError('O email informado é inválido.');
      } else {
        setError(`Erro ao ${isSignUp ? 'criar conta' : 'realizar login'}. Tente novamente.`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight text-center mb-2">
            {isSignUp ? 'Criar Conta' : 'Sobra+'}
          </h1>
          <p className="text-center text-slate-500 mb-8">
            {isSignUp ? 'Preencha os dados abaixo para começar.' : 'Acesse sua conta para continuar.'}
          </p>
          <form onSubmit={handleSubmit} className="space-y-6">
            {isSignUp && (
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                    Nome
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-style"
                    placeholder="Seu Nome"
                    required={isSignUp}
                    autoFocus={isSignUp}
                  />
                </div>
            )}
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
                autoFocus={!isSignUp}
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
              <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
                {loading ? 'Carregando...' : (isSignUp ? 'Criar Conta' : 'Entrar')}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setName('');
              }}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors focus:outline-none"
            >
              {isSignUp ? 'Já tem uma conta? Entre' : 'Não tem uma conta? Crie agora'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;
