
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
        <div className="relative flex flex-col items-center justify-center px-6 py-10">
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">
            Sobra+
          </h1>
          <button className="md:hidden p-1 text-slate-500 hover:text-slate-800 absolute right-6 top-8" onClick={() => setIsOpen(false)} aria-label="Close menu">
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        <nav className="mt-2 flex-1 px-4">
          <ul className="space-y-1">
            {menuItems.map(item => (
              <li key={item.name}>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveItem(item.name);
                    setIsOpen(false);
                  }}
                  className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 text-sm tracking-normal ${
                    activeItem === item.name
                      ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-100'
                      : 'text-slate-500 font-semibold hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <item.icon className={`w-5 h-5 mr-3 ${activeItem === item.name ? 'opacity-100' : 'text-slate-400'}`} />
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
