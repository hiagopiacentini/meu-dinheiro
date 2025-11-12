
import React from 'react';

interface PlaceholderPageProps {
  title: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title }) => {
  return (
    <div className="flex items-center justify-center h-full">
        <div className="text-center p-10 bg-white rounded-xl shadow-sm border border-slate-200">
            <h1 className="text-3xl font-bold mb-4 text-slate-800">{title}</h1>
            <p className="text-slate-500">Esta seção está em desenvolvimento e estará disponível em breve!</p>
        </div>
    </div>
  );
};

export default PlaceholderPage;