
import React, { useState } from 'react';
import { sampleAccounts, sampleTransactions, sampleCategories, sampleLoans, sampleGoals } from '../data/demoData';
import { auth } from '../services/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  GoogleAuthProvider, 
  signInWithPopup,
  updatePassword
} from 'firebase/auth';
import { deepClean } from '../hooks/useFirestore';
import GoogleIcon from '../components/icons/GoogleIcon';
import LockClosedIcon from '../components/icons/LockClosedIcon';

const safeStringify = (obj: any): string => {
  try {
    const cleaned = deepClean(obj);
    return JSON.stringify(cleaned);
  } catch (error) {
    console.error("Erro fatal na serialização segura no Login:", error);
    return "null"; 
  }
};

interface LoginPageProps {
  onLogin: () => void;
  onGoogleLoginStart?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onGoogleLoginStart }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [domainError, setDomainError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showSetPassword, setShowSetPassword] = useState(false);

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

  const handleGoogleLogin = async () => {
    setError('');
    setDomainError(false);
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      if (onGoogleLoginStart) onGoogleLoginStart();
      await signInWithPopup(auth, provider);
      cleanupDemoData();
      setShowSetPassword(true);
    } catch (err: any) {
      console.error("Google Login Error:", err);
      const errorCode = err.code || '';
      const errorMessage = err.message || '';

      if (errorCode === 'auth/unauthorized-domain' || errorMessage.includes('unauthorized-domain')) {
        setDomainError(true);
        setError(`Domínio não autorizado. Adicione "${window.location.hostname}" no Console do Firebase.`);
      } else {
        setError('Falha ao autenticar com o Google. Tente novamente.');
      }
      setLoading(false);
    }
  };

  const handleCreatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, password);
        onLogin();
      }
    } catch (err: any) {
      console.error("Error setting password:", err);
      setError('Erro ao definir senha. Você pode entrar e definir depois no seu perfil.');
    } finally {
      setLoading(false);
    }
  };

  const copyHostname = () => {
    navigator.clipboard.writeText(window.location.hostname);
    alert('Domínio copiado! Agora cole-o no Console do Firebase.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDomainError(false);
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
      if (err.code === 'auth/invalid-credential') {
        setError('Email ou senha incorretos.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este email já está em uso.');
      } else {
        setError(`Erro ao processar login. Verifique seus dados.`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (showSetPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 animate-in fade-in duration-700">
        <div className="w-full max-w-md">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <LockClosedIcon className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight text-center mb-2">
              Segurança
            </h1>
            <p className="text-center text-slate-500 text-sm leading-relaxed mb-8 px-4">
              Defina uma senha para poder acessar sua conta futuramente também usando apenas seu e-mail.
            </p>

            <form onSubmit={handleCreatePassword} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nova Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-style h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                  placeholder="Mínimo 6 caracteres"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Confirmar Senha</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-style h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                  placeholder="Repita a senha"
                  required
                />
              </div>

              {error && (
                <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl">
                  <p className="text-rose-600 text-xs font-semibold text-center leading-relaxed">{error}</p>
                </div>
              )}

              <div className="pt-2">
                <button type="submit" className="btn-primary w-full h-12 shadow-lg shadow-blue-200 rounded-xl" disabled={loading}>
                  {loading ? 'Processando...' : 'Salvar e Acessar Conta'}
                </button>
              </div>
              
              <button 
                type="button" 
                onClick={onLogin} 
                className="w-full text-slate-400 text-xs font-bold hover:text-slate-600 transition-colors uppercase tracking-widest pt-2"
              >
                Pular por enquanto
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 animate-in fade-in duration-500">
      <div className="w-full max-w-md">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50">
          <div className="mb-10 text-center">
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-2">
              Sobra+
            </h1>
            <p className="text-slate-400 font-medium">Controle financeiro inteligente.</p>
          </div>

          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 rounded-xl h-12 text-slate-700 font-bold hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-[0.98] disabled:opacity-50 mb-8 shadow-sm"
          >
            <GoogleIcon className="w-5 h-5" />
            <span>Entrar com Google</span>
          </button>

          <div className="relative flex items-center mb-8">
            <div className="flex-grow border-t border-slate-100"></div>
            <span className="flex-shrink mx-4 text-slate-300 text-[10px] font-bold uppercase tracking-widest">ou use e-mail</span>
            <div className="flex-grow border-t border-slate-100"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
                <div>
                  <label htmlFor="name" className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Seu Nome</label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-style h-12 bg-slate-50 border-slate-200 focus:bg-white"
                    placeholder="Como quer ser chamado?"
                    required={isSignUp}
                  />
                </div>
            )}
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">E-mail</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-style h-12 bg-slate-50 border-slate-200 focus:bg-white"
                placeholder="seu@email.com"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Senha</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-style h-12 bg-slate-50 border-slate-200 focus:bg-white"
                placeholder="••••••••"
                required
              />
            </div>

            {domainError && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-3">
                <p className="text-amber-800 text-xs font-bold">Domínio não autorizado no Firebase.</p>
                <div className="space-y-2 text-[11px] text-amber-900 font-medium">
                  <p>1. Vá em Autenticação {" > "} Configurações</p>
                  <p>2. Clique em Domínios Autorizados</p>
                  <p>3. Adicione o domínio abaixo:</p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-white border border-amber-200 px-2 py-1 rounded text-[10px] font-mono flex-1 truncate">{window.location.hostname}</code>
                  <button type="button" onClick={copyHostname} className="bg-amber-600 text-white px-2 py-1 rounded text-[9px] font-bold uppercase">Copiar</button>
                </div>
              </div>
            )}

            {error && !domainError && (
              <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl">
                <p className="text-rose-600 text-xs font-semibold text-center">{error}</p>
              </div>
            )}

            <div className="pt-2">
              <button type="submit" className="btn-primary w-full h-12 rounded-xl shadow-lg shadow-blue-200" disabled={loading}>
                {loading ? 'Processando...' : (isSignUp ? 'Criar minha conta' : 'Acessar sistema')}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center border-t border-slate-50 pt-6">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setDomainError(false);
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-bold uppercase tracking-widest transition-colors"
            >
              {isSignUp ? 'Já possui conta? Entrar' : 'Não tem conta? Cadastrar grátis'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;
