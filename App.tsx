
import React, { useState, useEffect } from 'react';
import Sidebar from './components/layout/Sidebar';
import DashboardPage from './pages/DashboardPage';
import AccountsPage from './pages/AccountsPage';
import CategoriesPage from './pages/CategoriesPage';
import TransactionsPage from './pages/TransactionsPage';
import LoansPage from './pages/LoansPage';
import GoalsPage from './pages/GoalsPage';
import ReportsPage from './pages/ReportsPage';
import InvestmentsPage from './pages/InvestmentsPage';
import LoginPage from './pages/LoginPage';
import BalancesPage from './pages/BalancesPage';
import { auth } from './services/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { PrivacyProvider, usePrivacy } from './contexts/PrivacyContext';

import DashboardIcon from './components/icons/DashboardIcon';
import AccountsIcon from './components/icons/AccountsIcon';
import CategoriesIcon from './components/icons/CategoriesIcon';
import TransactionsIcon from './components/icons/TransactionsIcon';
import LoansIcon from './components/icons/LoansIcon';
import GoalsIcon from './components/icons/GoalsIcon';
import ReportsIcon from './components/icons/ReportsIcon';
import MenuIcon from './components/icons/MenuIcon';
import PlusIcon from './components/icons/PlusIcon';
import InvestmentsIcon from './components/icons/InvestmentsIcon';
import BalancesIcon from './components/icons/BalancesIcon';
import EyeIcon from './components/icons/EyeIcon';
import EyeSlashIcon from './components/icons/EyeSlashIcon';

const AppContent: React.FC = () => {
  const [activePage, setActivePage] = useState('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [addTransactionTrigger, setAddTransactionTrigger] = useState(0);
  const [addAccountTrigger, setAddAccountTrigger] = useState(0);
  const [addCategoryTrigger, setAddCategoryTrigger] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [accountsPageParams, setAccountsPageParams] = useState<{ accountId: string, filterType: 'overview' | 'card' | 'investments' } | null>(null);

  const { isPrivacyMode, togglePrivacy } = usePrivacy();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        setIsSettingPassword(false);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddTransactionClick = () => {
    setAddTransactionTrigger(Date.now());
  };

  const handleAddAccountClick = () => {
    setAddAccountTrigger(Date.now());
  };

  const handleAddCategoryClick = () => {
    setAddCategoryTrigger(Date.now());
  };
  
  const handleLoginComplete = () => {
    setIsSettingPassword(false);
    setActivePage('Dashboard');
  };

  const handleLogout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Erro ao tentar fazer logout no Firebase:", error);
    } finally {
        setIsAuthenticated(false);
        setIsSettingPassword(false);
        setActivePage('Dashboard');
    }
  };

  const navigateToAccount = (accountId: string, filterType: 'overview' | 'card' | 'investments') => {
    setAccountsPageParams({ accountId, filterType });
    setActivePage('Contas');
  };

  const renderPage = () => {
    switch (activePage) {
      case 'Dashboard':
        return <DashboardPage />;
      case 'Contas':
        return <AccountsPage 
                  addAccountTrigger={addAccountTrigger} 
                  initialParams={accountsPageParams}
                  onParamsProcessed={() => setAccountsPageParams(null)}
               />;
      case 'Categorias':
        return <CategoriesPage addCategoryTrigger={addCategoryTrigger}/>;
      case 'Lançamentos':
        return <TransactionsPage addTransactionTrigger={addTransactionTrigger} />;
      case 'Investimentos':
        return <InvestmentsPage onNavigateToAccount={navigateToAccount} />;
      case 'Empréstimos':
        return <LoansPage />;
      case 'Metas':
        return <GoalsPage />;
      case 'Relatórios':
        return <ReportsPage />;
      case 'Saldos':
        return <BalancesPage />;
      default:
        return <DashboardPage />;
    }
  };

  const menuItems = [
    { name: 'Dashboard', icon: DashboardIcon },
    { name: 'Saldos', icon: BalancesIcon },
    { name: 'Contas', icon: AccountsIcon },
    { name: 'Categorias', icon: CategoriesIcon },
    { name: 'Lançamentos', icon: TransactionsIcon },
    { name: 'Investimentos', icon: InvestmentsIcon },
    { name: 'Empréstimos', icon: LoansIcon },
    { name: 'Relatórios', icon: ReportsIcon },
    { name: 'Metas', icon: GoalsIcon },
  ];

  const pageSubtitles: { [key: string]: string } = {
      'Dashboard': 'Sua visão geral financeira personalizada.',
      'Saldos': 'Resumo consolidado do patrimônio e caixa.',
      'Contas': 'Visualize todas as suas contas bancárias e carteiras digitais.',
      'Categorias': 'Organize suas receitas e despesas com categorias e subcategorias.',
      'Lançamentos': 'Adicione, edite e visualize todas as suas transações.',
      'Investimentos': 'Gerencie seus contratos de CDB e acompanhe rendimentos.',
      'Empréstimos': 'Gerencie transferências internas e acompanhe o fluxo de quitações.',
      'Relatórios': 'Análises detalhadas, DRE e evolução do seu fluxo de caixa.',
      'Metas': 'Planeje suas economias anuais e monitore seu desempenho.',
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Carregando...</div>;
  }

  // Se não estiver autenticado OU se estiver no processo de criar senha após o Google Login
  if (!isAuthenticated || isSettingPassword) {
    return <LoginPage onLogin={handleLoginComplete} onGoogleLoginStart={() => setIsSettingPassword(true)} />;
  }

  return (
    <>
    <style>{`
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      ::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 4px;
      }
      ::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 4px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }

      .input-style {
        background-color: #ffffff;
        border: 1px solid #cbd5e1;
        color: #1e293b;
        border-radius: 0.5rem;
        padding: 0.625rem 0.75rem;
        transition: border-color 0.2s, box-shadow 0.2s;
        width: 100%;
        font-size: 0.875rem;
      }
      .input-style:focus {
        outline: 2px solid transparent;
        outline-offset: 2px;
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.4);
      }
      select.input-style {
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
        background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%2364748b'%3e%3cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd' /%3e%3c/svg%3e");
        background-position: right 0.75rem center;
        background-repeat: no-repeat;
        background-size: 1.25em 1.25em;
        padding-right: 2.5rem;
      }
      .btn-primary {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.625rem 1rem;
        background-color: #2563eb;
        color: white;
        border-radius: 0.5rem;
        font-weight: 600;
        font-size: 0.875rem;
        transition: background-color 0.2s;
        border: none;
        cursor: pointer;
      }
      .btn-primary:hover {
        background-color: #1d4ed8;
      }
      .btn-secondary {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.625rem 1rem;
        background-color: #ffffff;
        color: #334155;
        border-radius: 0.5rem;
        font-weight: 600;
        font-size: 0.875rem;
        transition: background-color 0.2s, border-color 0.2s;
        border: 1px solid #cbd5e1;
        cursor: pointer;
      }
      .btn-secondary:hover {
        background-color: #f8fafc;
      }
    `}</style>
      <div className="min-h-screen bg-gray-50 text-slate-700 font-sans">
        <Sidebar
          menuItems={menuItems}
          activeItem={activePage}
          setActiveItem={setActivePage}
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
        />
        <div className="md:ml-64 flex flex-col h-screen">
          <header className="sticky top-0 z-20 flex items-center justify-between p-4 md:p-6 bg-white border-b border-slate-200">
            <div className="flex items-center">
              <button
                className="md:hidden mr-4 p-1 text-slate-500 hover:bg-gray-100 rounded-md"
                onClick={() => setIsSidebarOpen(true)}
                aria-label="Open menu"
              >
                <MenuIcon className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                  {activePage === 'Contas' ? 'Minhas Contas' : activePage === 'Categorias' ? 'Gerenciar Categorias' : activePage}
                </h1>
                {pageSubtitles[activePage] && <p className="text-sm text-slate-500 mt-1">{pageSubtitles[activePage]}</p>}
              </div>
            </div>
            <div className="flex items-center space-x-2 md:space-x-4">
              <button 
                onClick={togglePrivacy}
                className={`p-2 rounded-full transition-colors ${isPrivacyMode ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}
                title={isPrivacyMode ? "Desativar Modo Privacidade" : "Ativar Modo Privacidade"}
              >
                {isPrivacyMode ? <EyeSlashIcon className="w-6 h-6" /> : <EyeIcon className="w-6 h-6" />}
              </button>

              {activePage === 'Contas' && (
                  <button
                      onClick={handleAddAccountClick}
                      className="btn-primary hidden sm:flex items-center space-x-2"
                  >
                      <PlusIcon className="w-5 h-5" />
                      <span>Nova Conta</span>
                  </button>
              )}
              {activePage === 'Categorias' && (
                  <button
                      onClick={handleAddCategoryClick}
                      className="btn-primary hidden sm:flex items-center space-x-2"
                  >
                      <PlusIcon className="w-5 h-5" />
                      <span>Nova Categoria</span>
                  </button>
              )}
              <button onClick={handleLogout} className="btn-secondary">
                Sair
              </button>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-y-auto">
            {renderPage()}
          </main>
        </div>
      </div>
    </>
  );
};

const App: React.FC = () => {
  return (
    <PrivacyProvider>
      <AppContent />
    </PrivacyProvider>
  );
};

export default App;
