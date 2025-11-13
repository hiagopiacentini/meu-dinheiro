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
        className={`fixed inset-0 bg-black/40 z-30 md:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      ></div>

      <aside className={`fixed inset-y-0 left-0 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col w-64 transform transition-transform duration-300 ease-in-out z-40 ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="relative flex items-center justify-center px-6 py-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Sobra+
          </h1>
          <button className="md:hidden p-1 text-slate-500 hover:text-slate-800 absolute right-6 top-1/2 -translate-y-1/2" onClick={() => setIsOpen(false)} aria-label="Close menu">
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        <nav className="mt-6 flex-1 px-4">
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
                  className={`flex items-center px-4 py-2.5 rounded-lg transition-colors duration-200 text-sm font-medium ${
                    activeItem === item.name
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-gray-100 hover:text-slate-900'
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  <span>{item.name}</span>
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