
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4 md:px-6 py-4">
        <h1 className="text-2xl md:text-3xl font-bold text-indigo-600">
          Controle Financeiro
        </h1>
        <p className="text-gray-500">Sua vida financeira sob controle.</p>
      </div>
    </header>
  );
};

export default Header;