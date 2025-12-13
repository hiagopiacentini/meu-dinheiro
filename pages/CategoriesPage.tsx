
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useCategories } from '../hooks/useFirestore';
import { Category, Subcategory, CategoryItem, TransactionType } from '../types';
import PlusIcon from '../components/icons/PlusIcon';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import SearchIcon from '../components/icons/SearchIcon';
import ChevronRightIcon from '../components/icons/ChevronRightIcon';
import ChevronDownIcon from '../components/icons/ChevronDownIcon';
import ArrowUturnLeftIcon from '../components/icons/ArrowUturnLeftIcon';


type ModalType = 'category' | 'subcategory' | 'item';
type ModalAction = 'add' | 'edit';

interface ModalConfig {
    isOpen: boolean;
    type?: ModalType;
    action?: ModalAction;
    data?: Category | Subcategory | CategoryItem | { parentId?: string; parentType?: TransactionType, categoryId?: string };
}

// Drag item type definition
interface DragItem {
    id: string;
    type: ModalType;
    parentId?: string; // For subcategories (categoryId) and items (subcategoryId)
    grandParentId?: string; // For items (categoryId)
}

const CategoryModal: React.FC<{
    config: ModalConfig;
    onClose: () => void;
    onSave: (type: ModalType, names: string[], data?: any, color?: string, includeInBalance?: boolean, isFixed?: boolean) => Promise<void>;
}> = ({ config, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [currentName, setCurrentName] = useState('');
    const [namesList, setNamesList] = useState<string[]>([]);
    const [selectedColor, setSelectedColor] = useState<string>('#3b82f6');
    const [includeInBalance, setIncludeInBalance] = useState(true);
    const [isFixed, setIsFixed] = useState(false);
    
    const predefinedColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899'];

    React.useEffect(() => {
        if (config.isOpen) {
            setName('');
            setCurrentName('');
            setNamesList([]);
            if (config.action === 'edit' && config.data) {
                if('name' in config.data) setName(config.data.name);
                if('color' in config.data && config.data.color) setSelectedColor(config.data.color);
                
                if('includeInBalance' in config.data) {
                    setIncludeInBalance(config.data.includeInBalance);
                } else {
                    setIncludeInBalance(true);
                }

                if ('isFixed' in config.data) {
                    setIsFixed(!!config.data.isFixed);
                } else {
                    setIsFixed(false);
                }
            } else {
                setSelectedColor(predefinedColors[5]); // Default to blue
                setIncludeInBalance(true);
                setIsFixed(false);
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (config.action === 'add') {
            const finalNames = [...namesList];
            const trimmedCurrent = currentName.trim();
            if (trimmedCurrent && !finalNames.includes(trimmedCurrent)) {
                finalNames.push(trimmedCurrent);
            }
            if (finalNames.length > 0) {
                await onSave(config.type!, finalNames, config.data, selectedColor, includeInBalance, isFixed);
            }
        } else { // 'edit'
            const trimmedName = name.trim();
            if (trimmedName) {
                await onSave(config.type!, [trimmedName], config.data, selectedColor, includeInBalance, isFixed);
            }
        }
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
                     {config.type === 'item' && (
                        <div className="space-y-3 mt-4 pt-4 border-t border-slate-200">
                            <div className="flex items-center">
                                <input type="checkbox" id="cat-balance" checked={includeInBalance} onChange={e => setIncludeInBalance(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"/>
                                <label htmlFor="cat-balance" className="ml-2 block text-sm text-slate-800">Incluir no balanço (receitas/despesas)</label>
                            </div>
                            <div className="flex items-center">
                                <input type="checkbox" id="cat-fixed" checked={isFixed} onChange={e => setIsFixed(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"/>
                                <label htmlFor="cat-fixed" className="ml-2 block text-sm text-slate-800">É um Gasto Fixo?</label>
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
    const { categories, setCategories } = useCategories();
    
    const [modalConfig, setModalConfig] = useState<ModalConfig>({ isOpen: false });
    const [activeTab, setActiveTab] = useState<TransactionType>(TransactionType.EXPENSE);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [expandedItems, setExpandedItems] = useState<{[key: string]: boolean}>({ 'cat-food': true, 'sub-restaurants': true });
    
    // Drag and Drop State
    const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);

    // Undo State
    const [undoBackup, setUndoBackup] = useState<Category[] | null>(null);
    const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const addCategoryTriggerRef = useRef(addCategoryTrigger);
    const activeTabRef = useRef(activeTab);
    activeTabRef.current = activeTab;

    useEffect(() => {
        if (addCategoryTrigger > addCategoryTriggerRef.current) {
            openModal('category', 'add', { parentType: activeTabRef.current })
        }
        addCategoryTriggerRef.current = addCategoryTrigger;
    }, [addCategoryTrigger]);

    // Clean up timer on unmount
    useEffect(() => {
        return () => {
            if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
        };
    }, []);

    const openModal = (type: ModalType, action: ModalAction, data: any) => {
        setModalConfig({ isOpen: true, type, action, data });
    };

    const closeModal = () => setModalConfig({ isOpen: false });

    const toggleExpand = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
    }

    const clearUndo = () => {
        setUndoBackup(null);
        if (undoTimeoutRef.current) {
            clearTimeout(undoTimeoutRef.current);
            undoTimeoutRef.current = null;
        }
    };

    const handleUndo = async () => {
        if (undoBackup) {
            await setCategories(undoBackup);
            clearUndo();
        }
    };

    const handleSave = async (type: ModalType, names: string[], data: any, color?: string, includeInBalance = true, isFixed = false) => {
        // Clear undo history when a new action is performed to prevent data conflicts
        clearUndo();

        let newCategories = [...categories];
        
        if (modalConfig.action === 'add') {
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
                    const newItem: CategoryItem = { id: crypto.randomUUID(), name, subcategoryId: data.parentId, categoryId: data.categoryId, includeInBalance, isFixed };
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
        } else if (modalConfig.action === 'edit') {
             const name = names[0];
             if (type === 'category') {
                newCategories = newCategories.map(cat => cat.id === data.id ? { ...cat, name, color } : cat);
            }
            if (type === 'subcategory') {
                newCategories = newCategories.map(cat => ({
                     ...cat,
                     subcategories: cat.subcategories.map(sub => sub.id === data.id ? { ...sub, name } : sub)
                }));
            }
            if (type === 'item') {
                 newCategories = newCategories.map(cat => ({
                    ...cat,
                    subcategories: cat.subcategories.map(sub => ({
                        ...sub,
                        items: sub.items.map(item => item.id === data.id ? { ...item, name, includeInBalance, isFixed } : item)
                    }))
                }));
            }
        }
        
        const success = await setCategories(newCategories);
        if (success) {
            closeModal();
        }
    };

    const handleDelete = async (type: ModalType, data: any) => {
        const confirmationText = 'Tem certeza que deseja excluir? Esta ação removerá todos os sub-itens associados.';
        if (window.confirm(confirmationText)) {
            // Backup current state for Undo
            const backupState = [...categories];
            
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
    
            await setCategories(updatedCategories);
            closeModal();

            // Setup Undo Notification
            setUndoBackup(backupState);
            if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
            undoTimeoutRef.current = setTimeout(() => {
                setUndoBackup(null);
            }, 6000); // 6 seconds to undo
        }
    };
    
    // --- Drag and Drop Handlers ---

    const handleDragStart = (e: React.DragEvent, item: DragItem) => {
        e.stopPropagation();
        setDraggedItem(item);
        // Required for Firefox
        e.dataTransfer.effectAllowed = 'move';
        // Hide the default drag image slightly or keep it
        e.dataTransfer.setData('text/plain', item.id); // Required
    };

    const handleDragOver = (e: React.DragEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (draggedItem && draggedItem.id !== id) {
            setDragOverId(id);
        }
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
        setDragOverId(null);
    };

    const handleDrop = async (e: React.DragEvent, targetId: string, targetType: ModalType, targetParentId?: string, targetGrandParentId?: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (!draggedItem || draggedItem.id === targetId) {
            handleDragEnd();
            return;
        }

        // Ensure we are dropping into the same list (same parent)
        if (draggedItem.type !== targetType) {
             handleDragEnd();
             return;
        }
        
        if (draggedItem.type === 'subcategory' && draggedItem.parentId !== targetParentId) {
             handleDragEnd();
             return;
        }

        if (draggedItem.type === 'item' && draggedItem.parentId !== targetParentId) {
             handleDragEnd();
             return;
        }
        
        // Clear undo when reordering
        clearUndo();

        // Logic to reorder
        let newCategories = [...categories];

        if (draggedItem.type === 'category') {
            const oldIndex = newCategories.findIndex(c => c.id === draggedItem.id);
            const newIndex = newCategories.findIndex(c => c.id === targetId);
            if (oldIndex !== -1 && newIndex !== -1) {
                const [moved] = newCategories.splice(oldIndex, 1);
                newCategories.splice(newIndex, 0, moved);
            }
        } 
        else if (draggedItem.type === 'subcategory') {
            const catIndex = newCategories.findIndex(c => c.id === draggedItem.parentId);
            if (catIndex !== -1) {
                const category = { ...newCategories[catIndex] };
                const subcategories = [...category.subcategories];
                const oldIndex = subcategories.findIndex(s => s.id === draggedItem.id);
                const newIndex = subcategories.findIndex(s => s.id === targetId);
                
                if (oldIndex !== -1 && newIndex !== -1) {
                    const [moved] = subcategories.splice(oldIndex, 1);
                    subcategories.splice(newIndex, 0, moved);
                    category.subcategories = subcategories;
                    newCategories[catIndex] = category;
                }
            }
        }
        else if (draggedItem.type === 'item') {
            const catIndex = newCategories.findIndex(c => c.id === draggedItem.grandParentId);
            if (catIndex !== -1) {
                const category = { ...newCategories[catIndex] };
                const subcategories = [...category.subcategories];
                const subIndex = subcategories.findIndex(s => s.id === draggedItem.parentId);
                
                if (subIndex !== -1) {
                    const subcategory = { ...subcategories[subIndex] };
                    const items = [...subcategory.items];
                    const oldIndex = items.findIndex(i => i.id === draggedItem.id);
                    const newIndex = items.findIndex(i => i.id === targetId);
                    
                    if (oldIndex !== -1 && newIndex !== -1) {
                        const [moved] = items.splice(oldIndex, 1);
                        items.splice(newIndex, 0, moved);
                        subcategory.items = items;
                        subcategories[subIndex] = subcategory;
                        category.subcategories = subcategories;
                        newCategories[catIndex] = category;
                    }
                }
            }
        }

        setCategories(newCategories);
        handleDragEnd();
    };

    const filteredCategories = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        
        // Removed sorting logic to preserve Drag & Drop order
        // Only filtering logic remains
        
        if (!searchTerm) {
            return categories.filter(c => c.type === activeTab);
        }

        return categories
            .filter(c => c.type === activeTab)
            .filter(cat => {
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
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                 <div className="p-1 bg-slate-100 rounded-lg flex space-x-1 self-start">
                    <button onClick={() => setActiveTab(TransactionType.EXPENSE)} className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === TransactionType.EXPENSE ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Despesas</button>
                    <button onClick={() => setActiveTab(TransactionType.INCOME)} className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === TransactionType.INCOME ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Receitas</button>
                </div>
                <div className="relative w-full sm:max-w-xs">
                    {!isSearchFocused && !searchTerm && <SearchIcon className="w-5 h-5 text-slate-400 absolute top-1/2 left-3 -translate-y-1/2 pointer-events-none"/>}
                    <input 
                        type="text" 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                        className="input-style pl-10"/>
                </div>
            </div>
            
            <div className="space-y-2 mb-10">
                {filteredCategories.map(category => (
                    <div 
                        key={category.id} 
                        draggable={!searchTerm} 
                        onDragStart={(e) => handleDragStart(e, { id: category.id, type: 'category' })}
                        onDragOver={(e) => handleDragOver(e, category.id)}
                        onDragEnd={handleDragEnd}
                        onDrop={(e) => handleDrop(e, category.id, 'category')}
                        className={`transition-all duration-200 ${draggedItem?.id === category.id ? 'opacity-50' : ''}`}
                    >
                        <div 
                            className={`group flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer ${dragOverId === category.id ? 'border-2 border-blue-400' : ''}`} 
                            onClick={(e) => toggleExpand(e, category.id)}
                        >
                             <div className="flex items-center space-x-3">
                                <button className="p-1" onClick={(e) => toggleExpand(e, category.id)} aria-label={expandedItems[category.id] ? 'Recolher' : 'Expandir'}>
                                    {expandedItems[category.id] ? <ChevronDownIcon className="w-4 h-4 text-slate-400"/> : <ChevronRightIcon className="w-4 h-4 text-slate-400"/>}
                                </button>
                                <CategoryColorSquare color={category.color} />
                                <span className="font-semibold text-slate-800 select-none">{category.name}</span>
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
                                    <div 
                                        key={subcategory.id}
                                        draggable={!searchTerm}
                                        onDragStart={(e) => handleDragStart(e, { id: subcategory.id, type: 'subcategory', parentId: category.id })}
                                        onDragOver={(e) => handleDragOver(e, subcategory.id)}
                                        onDragEnd={handleDragEnd}
                                        onDrop={(e) => handleDrop(e, subcategory.id, 'subcategory', category.id)}
                                        className={`${draggedItem?.id === subcategory.id ? 'opacity-50' : ''}`}
                                    >
                                        <div 
                                            className={`group flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer ${dragOverId === subcategory.id ? 'border-2 border-blue-400 bg-blue-50' : ''}`} 
                                            onClick={(e) => toggleExpand(e, subcategory.id)}
                                        >
                                             <div className="flex items-center space-x-3">
                                                 <button className="p-1" onClick={(e) => toggleExpand(e, subcategory.id)} aria-label={expandedItems[subcategory.id] ? 'Recolher' : 'Expandir'}>
                                                    {subcategory.items.length > 0 && (expandedItems[subcategory.id] ? <ChevronDownIcon className="w-4 h-4 text-slate-400"/> : <ChevronRightIcon className="w-4 h-4 text-slate-400"/>)}
                                                    {subcategory.items.length === 0 && <div className="w-6"></div>}
                                                </button>
                                                <span className="font-medium text-sm text-slate-700 select-none">{subcategory.name}</span>
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
                                                     <div 
                                                        key={item.id} 
                                                        draggable={!searchTerm}
                                                        onDragStart={(e) => handleDragStart(e, { id: item.id, type: 'item', parentId: subcategory.id, grandParentId: category.id })}
                                                        onDragOver={(e) => handleDragOver(e, item.id)}
                                                        onDragEnd={handleDragEnd}
                                                        onDrop={(e) => handleDrop(e, item.id, 'item', subcategory.id, category.id)}
                                                        className={`group flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 ${dragOverId === item.id ? 'border-2 border-blue-400 bg-blue-50' : ''} ${draggedItem?.id === item.id ? 'opacity-50' : ''}`}
                                                     >
                                                         <div className="flex items-center space-x-2">
                                                            <span className="text-sm text-slate-500 select-none">{item.name}</span>
                                                            {item.isFixed && <span className="bg-slate-200 text-slate-600 text-[10px] px-1.5 py-0.5 rounded font-medium">FIXO</span>}
                                                         </div>
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

            {/* Undo Toast Notification */}
            {undoBackup && (
                <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-slate-800 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
                        <span className="text-sm font-medium">Item excluído.</span>
                        <button 
                            onClick={handleUndo}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors text-sm font-semibold border border-slate-600"
                        >
                            <ArrowUturnLeftIcon className="w-4 h-4" />
                            Desfazer
                        </button>
                        <button onClick={clearUndo} className="ml-1 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-700">
                             <span className="sr-only">Fechar</span>
                             &times;
                        </button>
                    </div>
                </div>
            )}

             <CategoryModal config={modalConfig} onClose={closeModal} onSave={handleSave} />
        </div>
    );
};

export default CategoriesPage;
