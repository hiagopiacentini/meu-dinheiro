import React from 'react';
import XIcon from '../icons/XIcon';

interface SidebarProps {
  menuItems: { name: string; icon: React.FC<React.SVGProps<SVGSVGElement>> }[];
  activeItem: string;
  setActiveItem: (item: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ menuItems, activeItem, setActiveItem, isOpen, setIsOpen }) => {
  return (
    <>
      <div
        className={`fixed inset-0 bg-black/60 z-30 md:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      ></div>

      <aside className={`fixed inset-y-0 left-0 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col w-64 transform transition-transform duration-300 ease-in-out z-40 ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="flex items-center justify-between p-6">
          <h1 className="text-2xl font-bold text-blue-600 tracking-tight">
            Meu Dinheiro
          </h1>
          <button className="md:hidden p-1 text-slate-500 hover:text-slate-800" onClick={() => setIsOpen(false)} aria-label="Close menu">
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        <nav className="mt-4 flex-1 px-4">
          <ul className="space-y-2">
            {menuItems.map(item => (
              <li key={item.name}>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveItem(item.name);
                    setIsOpen(false);
                  }}
                  className={`flex items-center px-4 py-2.5 rounded-lg transition-colors duration-200 text-sm ${
                    activeItem === item.name
                      ? 'bg-blue-50 text-blue-600 font-semibold'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  <span className="font-medium">{item.name}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
