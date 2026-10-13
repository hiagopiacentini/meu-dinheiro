
import React, { useState } from 'react';
import { sampleAccounts, sampleTransactions, sampleCategories, sampleLoans, sampleGoals } from '../data/demoData';
import { auth } from '../services/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  GoogleAuthProvider, 
  signInWithPopup 
} from 'firebase/auth';
import { deepClean } from '../hooks/useFirestore';
import GoogleIcon from '../components/icons/GoogleIcon';
import firebaseConfig from '../firebase-applet-config.json';

/**
 * Serializa um objeto para JSON de forma segura, removendo referências circulares
 * e limpando objetos complexos utilizando o deepClean centralizado.
 */
const safeStringify = (obj: any): string => {
  try {
    const cleaned = deepClean(obj);
    return JSON.stringify(cleaned);
  } catch (error) {
    console.error("Erro fatal na serialização segura no Login:", error);
    // Se ainda assim falhar (ex: stringify de algo nativo bizarro), retorna string vazia
    return "null"; 
  }
};

interface LoginPageProps {
  onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [domainError, setDomainError] = useState(false);
  const [copiedHost, setCopiedHost] = useState(false);
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
        localStorage.setItem('isDemoMode', 'true');
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
      await signInWithPopup(auth, provider);
      onLogin();
    } catch (err: any) {
      console.error("Google Login Error:", err);
      
      const errorCode = err.code || '';
      const errorMessage = err.message || '';

      if (errorCode === 'auth/unauthorized-domain' || errorMessage.includes('unauthorized-domain')) {
        setDomainError(true);
      } else if (errorCode === 'auth/popup-closed-by-user') {
        // Ignorar
      } else {
        setError('Falha ao autenticar com o Google. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const copyHostname = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedHost(true);
    setTimeout(() => setCopiedHost(false), 3000);
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
        onLogin();
      } else {
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
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

          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-700 font-semibold hover:bg-slate-50 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 mb-3"
          >
            <GoogleIcon className="w-5 h-5" />
            <span>Continuar com Google</span>
          </button>

          {domainError && (
            <div className="mb-6 bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-3 text-left">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded text-[10px] font-bold uppercase tracking-wider">Ajuste de Domínio</span>
                  <p className="text-amber-900 text-xs font-bold">Domínio não autorizado no Firebase</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setDomainError(false)} 
                  className="text-amber-500 hover:text-amber-800 text-xs font-bold"
                  title="Fechar aviso"
                >
                  ✕
                </button>
              </div>
              
              <p className="text-amber-800 text-xs leading-relaxed">
                O Google bloqueou o pop-up porque o endereço deste app ainda não foi adicionado aos domínios autorizados do seu projeto Firebase (<b>{firebaseConfig.projectId}</b>).
              </p>

              <div className="space-y-1.5 text-[11px] text-amber-900 bg-amber-100/60 p-2.5 rounded-lg">
                <p className="font-semibold">Passo a passo rápido:</p>
                <p>1. Clique em <b>Abrir Configurações do Firebase</b> abaixo.</p>
                <p>2. Na aba <b>Configurações &gt; Domínios autorizados</b>, clique em <b>Adicionar domínio</b>.</p>
                <p>3. Cole <code className="bg-white/80 px-1 py-0.5 rounded font-mono font-bold text-amber-950">run.app</code> (recomendado para cobrir todos os previews) ou o endereço exato abaixo.</p>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <input 
                    readOnly 
                    value={window.location.hostname} 
                    className="bg-white border border-amber-300 px-2.5 py-1.5 rounded-lg text-xs font-mono text-slate-700 flex-1 truncate select-all focus:outline-none"
                  />
                  <button 
                    type="button" 
                    onClick={() => copyHostname(window.location.hostname)} 
                    className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap"
                  >
                    {copiedHost ? '✓ Copiado!' : 'Copiar Domínio'}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    type="button" 
                    onClick={() => copyHostname('run.app')} 
                    className="flex-1 bg-white border border-amber-300 hover:bg-amber-50 text-amber-900 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors truncate text-center"
                    title="Copiar 'run.app' para autorizar todos os subdomínios"
                  >
                    Copiar coringa <b>run.app</b>
                  </button>
                  <a 
                    href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 bg-amber-700 hover:bg-amber-800 text-white px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-center transition-colors"
                  >
                    Abrir no Firebase ↗
                  </a>
                </div>
              </div>

              <p className="text-[10px] text-amber-700/80 italic pt-1">
                Dica: Você também pode entrar instantaneamente criando uma conta por E-mail e Senha abaixo ou usando o Modo Demonstração.
              </p>
            </div>
          )}

          <div className="relative flex items-center mb-6">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4 text-slate-400 text-xs font-bold uppercase tracking-widest">ou entre com e-mail</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                    Nome completo
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
                E-mail
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

            {error && (
              <div className="bg-red-50 border border-red-100 p-4 rounded-lg">
                <p className="text-red-600 text-xs font-medium whitespace-pre-wrap leading-relaxed">
                  {error}
                </p>
              </div>
            )}

            <div>
              <button type="submit" className="btn-primary w-full py-3 shadow-lg shadow-blue-100" disabled={loading}>
                {loading ? 'Carregando...' : (isSignUp ? 'Criar Conta' : 'Entrar')}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center border-t border-slate-100 pt-6">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setDomainError(false);
                setName('');
              }}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors focus:outline-none"
            >
              {isSignUp ? 'Já tem uma conta? Faça login' : 'Não tem uma conta? Cadastre-se gratuitamente'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;
