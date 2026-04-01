
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
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Parâmetros para abrir a página de contas em um estado específico
  const [accountsPageParams, setAccountsPageParams] = useState<{ accountId: string, filterType: 'overview' | 'card' | 'investments' } | null>(null);

  const { isPrivacyMode, togglePrivacy } = usePrivacy();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setIsAuthenticated(true);
        setUserName(currentUser.displayName || '');
        localStorage.removeItem('isDemoMode'); // Se logou real, limpa flag de demo
      } else {
        // Verifica se está no modo demonstração via localStorage
        const isDemo = localStorage.getItem('isDemoMode') === 'true';
        if (isDemo) {
          setIsAuthenticated(true);
          setUserName('Usuário Demo');
        } else {
          setIsAuthenticated(false);
          setUserName('');
        }
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
  
  const handleLogin = async () => {
    if (auth.currentUser) {
        try {
            await auth.currentUser.reload();
            setUserName(auth.currentUser.displayName || '');
            localStorage.removeItem('isDemoMode');
        } catch (e) {
            console.warn("User profile reload failed:", e);
        }
        setIsAuthenticated(true);
    } else {
        // Se não tem currentUser mas chamou login, provavelmente é o Demo Mode
        const isDemo = localStorage.getItem('isDemoMode') === 'true';
        if (isDemo) {
            setIsAuthenticated(true);
            setUserName('Usuário Demo');
        }
    }
    setActivePage('Dashboard');
  };

  const handleLogout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Erro ao tentar fazer logout no Firebase:", error);
    } finally {
        localStorage.removeItem('isDemoMode');
        setIsAuthenticated(false);
        setUserName('');
        setActivePage('Dashboard');
        setAccountsPageParams(null);
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

  return (
    <>
      <div className="min-h-screen bg-gray-50 text-slate-700 font-sans">
        {!isAuthenticated ? (
          <LoginPage onLogin={handleLogin} />
        ) : (
          <>
            <Sidebar
              menuItems={menuItems}
              activeItem={activePage}
              setActiveItem={setActivePage}
              isOpen={isSidebarOpen}
              setIsOpen={setIsSidebarOpen}
              userName={userName}
            />
            <div className="md:ml-64 flex flex-col h-screen">
              <header className="sticky top-0 z-20 flex items-center justify-between p-3 md:p-6 bg-white border-b border-slate-200">
                <div className="flex items-center min-w-0">
                  <button
                    className="md:hidden mr-3 p-2 text-slate-500 hover:bg-gray-100 rounded-lg transition-colors"
                    onClick={() => setIsSidebarOpen(true)}
                    aria-label="Open menu"
                  >
                    <MenuIcon className="w-6 h-6" />
                  </button>
                  <div className="min-w-0">
                    <h1 className="text-xl md:text-3xl font-bold text-slate-900 tracking-tight truncate">
                      {activePage === 'Contas' ? 'Minhas Contas' : activePage === 'Categorias' ? 'Gerenciar Categorias' : activePage}
                    </h1>
                    {pageSubtitles[activePage] && <p className="text-[10px] md:text-sm text-slate-500 mt-0.5 truncate hidden sm:block">{pageSubtitles[activePage]}</p>}
                  </div>
                </div>
                <div className="flex items-center space-x-1 md:space-x-4">
                  <button 
                    onClick={togglePrivacy}
                    className={`p-2 rounded-full transition-colors ${isPrivacyMode ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}
                    title={isPrivacyMode ? "Desativar Modo Privacidade" : "Ativar Modo Privacidade"}
                  >
                    {isPrivacyMode ? <EyeSlashIcon className="w-5 h-5 md:w-6 md:h-6" /> : <EyeIcon className="w-5 h-5 md:w-6 md:h-6" />}
                  </button>

                  {activePage === 'Contas' && (
                      <button
                          onClick={handleAddAccountClick}
                          className="btn-primary flex items-center justify-center p-2 sm:px-4 sm:py-2 sm:space-x-2"
                          title="Nova Conta"
                      >
                          <PlusIcon className="w-5 h-5" />
                          <span className="hidden sm:inline">Nova Conta</span>
                      </button>
                  )}
                  {activePage === 'Categorias' && (
                      <button
                          onClick={handleAddCategoryClick}
                          className="btn-primary flex items-center justify-center p-2 sm:px-4 sm:py-2 sm:space-x-2"
                          title="Nova Categoria"
                      >
                          <PlusIcon className="w-5 h-5" />
                          <span className="hidden sm:inline">Nova Categoria</span>
                      </button>
                  )}
                  {activePage === 'Lançamentos' && (
                      <button
                          onClick={handleAddTransactionClick}
                          className="btn-primary flex items-center justify-center p-2 sm:px-4 sm:py-2 sm:space-x-2"
                          title="Novo Lançamento"
                      >
                          <PlusIcon className="w-5 h-5" />
                          <span className="hidden sm:inline">Novo Lançamento</span>
                      </button>
                  )}
                  <button onClick={handleLogout} className="btn-secondary text-xs md:text-sm px-3 py-2">
                    Sair
                  </button>
                </div>
              </header>
              <main className="flex-1 p-4 md:p-6 overflow-y-auto">
                {renderPage()}
              </main>
            </div>
          </>
        )}
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
