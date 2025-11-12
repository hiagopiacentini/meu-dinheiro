import React, { useState } from 'react';
import Sidebar from './components/layout/Sidebar';
import DashboardPage from './pages/DashboardPage';
import AccountsPage from './pages/AccountsPage';
import CategoriesPage from './pages/CategoriesPage';
import TransactionsPage from './pages/TransactionsPage';
import LoansPage from './pages/LoansPage';
import BalancesPage from './pages/BalancesPage';
import GoalsPage from './pages/GoalsPage';
import ReportsPage from './pages/ReportsPage';

import DashboardIcon from './components/icons/DashboardIcon';
import AccountsIcon from './components/icons/AccountsIcon';
import CategoriesIcon from './components/icons/CategoriesIcon';
import TransactionsIcon from './components/icons/TransactionsIcon';
import LoansIcon from './components/icons/LoansIcon';
import BalancesIcon from './components/icons/BalancesIcon';
import GoalsIcon from './components/icons/GoalsIcon';
import ReportsIcon from './components/icons/ReportsIcon';
import MenuIcon from './components/icons/MenuIcon';


const App: React.FC = () => {
  const [activePage, setActivePage] = useState('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const renderPage = () => {
    switch (activePage) {
      case 'Dashboard':
        return <DashboardPage />;
      case 'Contas':
        return <AccountsPage />;
      case 'Categorias':
        return <CategoriesPage />;
      case 'Lançamentos':
        return <TransactionsPage />;
      case 'Empréstimos':
        return <LoansPage />;
      case 'Saldos':
        return <BalancesPage />;
      case 'Metas':
        return <GoalsPage />;
      case 'Relatórios':
        return <ReportsPage />;
      default:
        return <DashboardPage />;
    }
  };

  const menuItems = [
    { name: 'Dashboard', icon: DashboardIcon },
    { name: 'Contas', icon: AccountsIcon },
    { name: 'Categorias', icon: CategoriesIcon },
    { name: 'Lançamentos', icon: TransactionsIcon },
    { name: 'Empréstimos', icon: LoansIcon },
    { name: 'Saldos', icon: BalancesIcon },
    { name: 'Relatórios', icon: ReportsIcon },
    { name: 'Metas', icon: GoalsIcon },
  ];

  return (
    <>
    <style>{`
      .input-style { 
        padding: 0.625rem 0.75rem; 
        background-color: white; 
        border: 1px solid #e2e8f0; 
        border-radius: 0.5rem; 
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); 
        outline: none; 
        transition: border-color 0.2s, box-shadow 0.2s;
        width: 100%;
      } 
      .input-style:focus { 
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3); 
        border-color: #3b82f6; 
      }
      .btn-primary { 
        padding: 0.625rem 1rem; 
        background-color: #2563eb; 
        color: white; 
        border-radius: 0.5rem; 
        font-weight: 500; 
        transition: background-color 0.2s;
        border: none;
        cursor: pointer;
      } 
      .btn-primary:hover { 
        background-color: #1d4ed8; 
      }
      .btn-secondary { 
        padding: 0.625rem 1rem; 
        background-color: #f1f5f9; 
        color: #0f172a; 
        border-radius: 0.5rem; 
        font-weight: 500; 
        transition: background-color 0.2s;
        border: 1px solid #e2e8f0;
        cursor: pointer;
      } 
      .btn-secondary:hover {
        background-color: #e2e8f0;
      }
    `}</style>
      <div className="min-h-screen bg-slate-100 text-slate-800 font-sans">
        <Sidebar
          menuItems={menuItems}
          activeItem={activePage}
          setActiveItem={setActivePage}
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
        />
        <div className="md:ml-64 flex flex-col min-h-screen">
          <header className="flex items-center p-4 md:p-6 bg-slate-100/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-200 md:border-none">
            <button
              className="md:hidden mr-4 p-1 text-slate-600 hover:bg-slate-200 rounded-md"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open menu"
            >
              <MenuIcon className="w-6 h-6" />
            </button>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">{activePage}</h1>
          </header>
          <main className="flex-1 p-4 md:p-6">
            {renderPage()}
          </main>
        </div>
      </div>
    </>
  );
};

export default App;
