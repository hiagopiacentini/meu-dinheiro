import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Category, Subcategory, CategoryItem, TransactionType } from '../types';
import PlusIcon from '../components/icons/PlusIcon';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import SearchIcon from '../components/icons/SearchIcon';
import ChevronRightIcon from '../components/icons/ChevronRightIcon';
import ChevronDownIcon from '../components/icons/ChevronDownIcon';


type ModalType = 'category' | 'subcategory' | 'item';
type ModalAction = 'add' | 'edit';

interface ModalConfig {
    isOpen: boolean;
    type?: ModalType;
    action?: ModalAction;
    data?: Category | Subcategory | CategoryItem | { parentId?: string; parentType?: TransactionType, categoryId?: string };
}

const sampleCategories: Category[] = [
    {
      id: 'cat-food', name: 'Alimentação', type: TransactionType.EXPENSE, color: '#ef4444',
      subcategories: [
        { id: 'sub-restaurants', name: 'Restaurantes', categoryId: 'cat-food', items: [
          { id: 'item-lunch', name: 'Almoço', subcategoryId: 'sub-restaurants', categoryId: 'cat-food' },
          { id: 'item-dinner', name: 'Jantar', subcategoryId: 'sub-restaurants', categoryId: 'cat-food' },
        ]},
        { id: 'sub-supermarket', name: 'Supermercado', categoryId: 'cat-food', items: [] },
      ]
    },
    { id: 'cat-housing', name: 'Moradia', type: TransactionType.EXPENSE, color: '#3b82f6', subcategories: [] },
    { id: 'cat-transport', name: 'Transporte', type: TransactionType.EXPENSE, color: '#8b5cf6', subcategories: [] },
    { id: 'cat-salary', name: 'Salário', type: TransactionType.INCOME, color: '#22c55e', subcategories: [] },
    { id: 'cat-freelance', name: 'Renda Extra', type: TransactionType.INCOME, color: '#16a34a', subcategories: [] },
];

const CategoryModal: React.FC<{
    config: ModalConfig;
    onClose: () => void;
    onSave: (type: ModalType, names: string[], data?: any, color?: string) => void;
}> = ({ config, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [currentName, setCurrentName] = useState('');
    const [namesList, setNamesList] = useState<string[]>([]);
    const [selectedColor, setSelectedColor] = useState<string>('#3b82f6');
    
    const predefinedColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899'];

    React.useEffect(() => {
        if (config.isOpen) {
            setName('');
            setCurrentName('');
            setNamesList([]);
            if (config.action === 'edit' && config.data) {
                if('name' in config.data) setName(config.data.name);
                if('color' in config.data && config.data.color) setSelectedColor(config.data.color);
            } else {
                setSelectedColor(predefinedColors[5]); // Default to blue
            }
        }
    }, [config]);

    if (!config.isOpen) return null;

    const getTitle = () => {
        const actionText = config.action === 'add' ? 'Nova' : 'Editar';
        switch (config.type) {
            case 'category': return `${actionText} Categoria`;
            case 'subcategory': return `${actionText} Subcategoria`;
            case 'item': return `${actionText} Item`;
        }
        return '';
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const trimmedName = currentName.trim();
            if (trimmedName && !namesList.includes(trimmedName)) {
                setNamesList([...namesList, trimmedName]);
                setCurrentName('');
            }
        }
    };
    
    const removeName = (nameToRemove: string) => {
        setNamesList(namesList.filter(n => n !== nameToRemove));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (config.action === 'add') {
            const finalNames = [...namesList];
            const trimmedCurrent = currentName.trim();
            if (trimmedCurrent && !finalNames.includes(trimmedCurrent)) {
                finalNames.push(trimmedCurrent);
            }
            if (finalNames.length > 0) {
                onSave(config.type!, finalNames, config.data, selectedColor);
            }
        } else { // 'edit'
            const trimmedName = name.trim();
            if (trimmedName) {
                onSave(config.type!, [trimmedName], config.data, selectedColor);
            }
        }
        
        onClose();
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-6 text-slate-800">{getTitle()}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                     {config.action === 'add' ? (
                        <div>
                            <label htmlFor="cat-name-multi" className="block text-sm font-medium text-slate-700">
                                Nome(s) (pressione Enter para adicionar)
                            </label>
                            <input
                                type="text"
                                id="cat-name-multi"
                                value={currentName}
                                onChange={e => setCurrentName(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="mt-1 block w-full input-style"
                                autoFocus
                            />
                            {namesList.length > 0 && (
                                <div className="mt-3 space-y-2 max-h-40 overflow-y-auto pr-2">
                                    <p className="text-sm font-medium text-slate-500">A serem adicionados:</p>
                                    <ul className="space-y-1">
                                        {namesList.map((n, index) => (
                                            <li key={index} className="flex justify-between items-center bg-gray-100 px-3 py-1.5 rounded-md text-sm text-slate-800">
                                                <span>{n}</span>
                                                <button type="button" onClick={() => removeName(n)} className="text-slate-500 hover:text-red-500 font-bold text-lg leading-none" aria-label={`Remover ${n}`}>
                                                    &times;
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <label htmlFor="cat-name-single" className="block text-sm font-medium text-slate-700">Nome</label>
                            <input
                                type="text"
                                id="cat-name-single"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                                className="mt-1 block w-full input-style"
                                autoFocus
                            />
                        </div>
                    )}
                    {config.type === 'category' && (
                        <div>
                           <label className="block text-sm font-medium text-slate-700">Cor</label>
                            <div className="mt-2 flex flex-wrap gap-3 items-center">
                                {predefinedColors.map(color => {
                                    const isSelected = selectedColor === color;
                                    return (
                                        <button 
                                            key={color} 
                                            type="button" 
                                            onClick={() => setSelectedColor(color)}
                                            className={`w-8 h-8 rounded-full border-2 transition-all ${isSelected ? 'border-blue-500 scale-110' : 'border-transparent hover:border-slate-300'}`}
                                            style={{ backgroundColor: color }}
                                            aria-label={`Selecionar cor ${color}`}
                                        />
                                    )
                                })}
                                 <div className="relative w-8 h-8 group">
                                    <input
                                        type="color"
                                        value={selectedColor}
                                        onChange={(e) => setSelectedColor(e.target.value)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div 
                                        className="w-8 h-8 rounded-full border-2 border-slate-300 pointer-events-none" 
                                        style={{ backgroundColor: selectedColor }}
                                        title="Cor customizada"
                                    ></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="flex justify-end space-x-3 pt-6">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                        <button type="submit" className="btn-primary">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const CategoryColorSquare: React.FC<{ color?: string }> = ({ color }) => {
    return (
        <div 
            className={`w-9 h-9 rounded-lg`}
            style={{ backgroundColor: color || '#e2e8f0' /* slate-200 */ }}
        ></div>
    );
}

const CategoriesPage: React.FC<{ addCategoryTrigger: number }> = ({ addCategoryTrigger }) => {
    const [categories, setCategories] = useLocalStorage<Category[]>('categories', sampleCategories);
    const [modalConfig, setModalConfig] = useState<ModalConfig>({ isOpen: false });
    const [activeTab, setActiveTab] = useState<TransactionType>(TransactionType.EXPENSE);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedItems, setExpandedItems] = useState<{[key: string]: boolean}>({ 'cat-food': true, 'sub-restaurants': true });
    const addCategoryTriggerRef = useRef(addCategoryTrigger);
    const activeTabRef = useRef(activeTab);
    activeTabRef.current = activeTab;

    useEffect(() => {
        if (addCategoryTrigger > addCategoryTriggerRef.current) {
            openModal('category', 'add', { parentType: activeTabRef.current })
        }
        addCategoryTriggerRef.current = addCategoryTrigger;
    }, [addCategoryTrigger]);

    const openModal = (type: ModalType, action: ModalAction, data: any) => {
        setModalConfig({ isOpen: true, type, action, data });
    };

    const closeModal = () => setModalConfig({ isOpen: false });

    const toggleExpand = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
    }

    const handleSave = (type: ModalType, names: string[], data: any, color?: string) => {
        if (modalConfig.action === 'add') {
             let newCategories = [...categories];
            names.forEach(name => {
                if (type === 'category') {
                    const newCategory: Category = { id: crypto.randomUUID(), name, type: data.parentType, subcategories: [], color };
                    newCategories.push(newCategory);
                }
                if (type === 'subcategory') {
                    const newSub: Subcategory = { id: crypto.randomUUID(), name, items: [], categoryId: data.parentId };
                    newCategories = newCategories.map(cat => 
                        cat.id === data.parentId 
                        ? { ...cat, subcategories: [...cat.subcategories, newSub] } 
                        : cat
                    );
                }
                if (type === 'item') {
                    const newItem: CategoryItem = { id: crypto.randomUUID(), name, subcategoryId: data.parentId, categoryId: data.categoryId };
                    newCategories = newCategories.map(cat => {
                        if (cat.id === data.categoryId) {
                            const updatedSubcategories = cat.subcategories.map(sub => 
                                sub.id === data.parentId 
                                ? { ...sub, items: [...sub.items, newItem] } 
                                : sub
                            );
                            return { ...cat, subcategories: updatedSubcategories };
                        }
                        return cat;
                    });
                }
            });
            setCategories(newCategories);
        } else if (modalConfig.action === 'edit') {
             const name = names[0];
             if (type === 'category') {
                setCategories(categories.map(cat => cat.id === data.id ? { ...cat, name, color } : cat));
            }
            if (type === 'subcategory') {
                setCategories(categories.map(cat => {
                     const updatedSubcategories = cat.subcategories.map(sub => sub.id === data.id ? { ...sub, name } : sub);
                     return { ...cat, subcategories: updatedSubcategories };
                }));
            }
            if (type === 'item') {
                 setCategories(categories.map(cat => {
                    const updatedSubcategories = cat.subcategories.map(sub => {
                        const updatedItems = sub.items.map(item => item.id === data.id ? { ...item, name } : item);
                        return { ...sub, items: updatedItems };
                    });
                    return { ...cat, subcategories: updatedSubcategories };
                }));
            }
        }
        closeModal();
    };

    const handleDelete = (type: ModalType, data: any) => {
        const confirmationText = 'Tem certeza que deseja excluir? Esta ação não pode ser desfeita e removerá todos os sub-itens associados.';
        if (window.confirm(confirmationText)) {
            let updatedCategories: Category[];
    
            if (type === 'category') {
                updatedCategories = categories.filter(cat => cat.id !== data.id);
            } else if (type === 'subcategory') {
                updatedCategories = categories.map(cat => ({
                    ...cat,
                    subcategories: cat.subcategories.filter(sub => sub.id !== data.id),
                }));
            } else if (type === 'item') {
                updatedCategories = categories.map(cat => ({
                    ...cat,
                    subcategories: cat.subcategories.map(sub => ({
                        ...sub,
                        items: sub.items.filter(item => item.id !== data.id),
                    })),
                }));
            } else {
                updatedCategories = [...categories];
            }
    
            setCategories(updatedCategories);
            closeModal();
        }
    };
    
    const filteredCategories = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        return categories
            .filter(c => c.type === activeTab)
            .filter(cat => {
                if (!searchTerm) return true;
                if (cat.name.toLowerCase().includes(lowerSearch)) return true;
                return cat.subcategories.some(sub => {
                    if (sub.name.toLowerCase().includes(lowerSearch)) return true;
                    return sub.items.some(item => item.name.toLowerCase().includes(lowerSearch));
                });
            });
    }, [categories, activeTab, searchTerm]);

    const ActionButtons: React.FC<{onAdd?: () => void, onEdit: () => void, onDelete: () => void}> = ({onAdd, onEdit, onDelete}) => (
         <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {onAdd && <button onClick={(e) => { e.stopPropagation(); onAdd(); }} className="p-1.5 rounded-md hover:bg-gray-100" title="Adicionar"><PlusIcon className="w-4 h-4 text-green-500"/></button>}
            <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1.5 rounded-md hover:bg-gray-100" title="Editar"><PencilIcon className="w-4 h-4 text-blue-500"/></button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 rounded-md hover:bg-gray-100" title="Excluir"><TrashIcon className="w-4 h-4 text-red-500"/></button>
        </div>
    );
    
    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                 <div className="p-1 bg-slate-100 rounded-lg flex space-x-1 self-start">
                    <button onClick={() => setActiveTab(TransactionType.EXPENSE)} className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === TransactionType.EXPENSE ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Despesas</button>
                    <button onClick={() => setActiveTab(TransactionType.INCOME)} className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === TransactionType.INCOME ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Receitas</button>
                </div>
                <div className="relative w-full sm:max-w-xs">
                    <SearchIcon className="w-5 h-5 text-slate-400 absolute top-1/2 left-3 -translate-y-1/2"/>
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="input-style pl-10"/>
                </div>
            </div>
            
            <div className="space-y-2">
                {filteredCategories.map(category => (
                    <div key={category.id}>
                        <div className="group flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={(e) => toggleExpand(e, category.id)}>
                             <div className="flex items-center space-x-3">
                                <button className="p-1" onClick={(e) => toggleExpand(e, category.id)} aria-label={expandedItems[category.id] ? 'Recolher' : 'Expandir'}>
                                    {expandedItems[category.id] ? <ChevronDownIcon className="w-4 h-4 text-slate-400"/> : <ChevronRightIcon className="w-4 h-4 text-slate-400"/>}
                                </button>
                                <CategoryColorSquare color={category.color} />
                                <span className="font-semibold text-slate-800">{category.name}</span>
                             </div>
                            <ActionButtons 
                                onAdd={() => openModal('subcategory', 'add', { parentId: category.id })}
                                onEdit={() => openModal('category', 'edit', category)}
                                onDelete={() => handleDelete('category', category)}
                             />
                        </div>
                        {expandedItems[category.id] && (
                            <div className="pl-12 space-y-1 mt-1">
                                {category.subcategories.map(subcategory => (
                                    <div key={subcategory.id}>
                                        <div className="group flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={(e) => toggleExpand(e, subcategory.id)}>
                                             <div className="flex items-center space-x-3">
                                                 <button className="p-1" onClick={(e) => toggleExpand(e, subcategory.id)} aria-label={expandedItems[subcategory.id] ? 'Recolher' : 'Expandir'}>
                                                    {subcategory.items.length > 0 && (expandedItems[subcategory.id] ? <ChevronDownIcon className="w-4 h-4 text-slate-400"/> : <ChevronRightIcon className="w-4 h-4 text-slate-400"/>)}
                                                    {subcategory.items.length === 0 && <div className="w-6"></div>}
                                                </button>
                                                <span className="font-medium text-sm text-slate-700">{subcategory.name}</span>
                                             </div>
                                            <ActionButtons 
                                                onAdd={() => openModal('item', 'add', { parentId: subcategory.id, categoryId: category.id })}
                                                onEdit={() => openModal('subcategory', 'edit', subcategory)}
                                                onDelete={() => handleDelete('subcategory', subcategory)}
                                            />
                                        </div>
                                         {expandedItems[subcategory.id] && (
                                             <div className="pl-12 space-y-1 mt-1">
                                                 {subcategory.items.map(item => (
                                                     <div key={item.id} className="group flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                                                         <span className="text-sm text-slate-500">{item.name}</span>
                                                          <ActionButtons 
                                                            onEdit={() => openModal('item', 'edit', item)}
                                                            onDelete={() => handleDelete('item', item)}
                                                        />
                                                     </div>
                                                 ))}
                                             </div>
                                         )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
             <CategoryModal config={modalConfig} onClose={closeModal} onSave={handleSave} />
        </div>
    );
};

export default CategoriesPage;