
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

// New icons for better visuals
const DragHandleIcon = () => (
    <svg className="w-4 h-4 text-slate-300" fill="currentColor" viewBox="0 0 24 24">
        <path d="M8 9h2V7H8v2zm0 4h2v-2H8v2zm0 4h2v-2H8v2zm4-10v2h2V7h-2zm0 6h2v-2h-2v2zm0 4h2v-2h-2v2zm4-10v2h2V7h-2zm0 6h2v-2h-2v2zm0 4h2v-2h-2v2z" />
    </svg>
);

type ModalType = 'category' | 'subcategory' | 'item';
type ModalAction = 'add' | 'edit';

interface ModalConfig {
    isOpen: boolean;
    type?: ModalType;
    action?: ModalAction;
    data?: Category | Subcategory | CategoryItem | { parentId?: string; parentType?: TransactionType, categoryId?: string };
}

interface DragItem {
    id: string;
    type: ModalType;
    parentId?: string;
    grandParentId?: string;
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

    useEffect(() => {
        if (config.isOpen) {
            setName('');
            setCurrentName('');
            setNamesList([]);
            if (config.action === 'edit' && config.data) {
                if('name' in config.data) setName(config.data.name);
                if('color' in config.data && config.data.color) setSelectedColor(config.data.color);
                setIncludeInBalance('includeInBalance' in config.data ? config.data.includeInBalance : true);
                setIsFixed('isFixed' in config.data ? !!config.data.isFixed : false);
            } else {
                setSelectedColor(predefinedColors[5]);
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
            default: return '';
        }
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
            if (trimmedCurrent && !finalNames.includes(trimmedCurrent)) finalNames.push(trimmedCurrent);
            if (finalNames.length > 0) await onSave(config.type!, finalNames, config.data, selectedColor, includeInBalance, isFixed);
        } else {
            const trimmedName = name.trim();
            if (trimmedName) await onSave(config.type!, [trimmedName], config.data, selectedColor, includeInBalance, isFixed);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800">{getTitle()}</h2>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full text-slate-400">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                     {config.action === 'add' ? (
                        <div>
                            <label htmlFor="cat-name-multi" className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome(s) (Enter para lista)</label>
                            <input
                                type="text"
                                id="cat-name-multi"
                                value={currentName}
                                onChange={e => setCurrentName(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="input-style"
                                placeholder="Digite e aperte Enter..."
                                autoFocus
                            />
                            {namesList.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {namesList.map((n, index) => (
                                        <span key={index} className="inline-flex items-center bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-semibold">
                                            {n}
                                            <button type="button" onClick={() => removeName(n)} className="ml-1.5 hover:text-blue-900 font-bold">&times;</button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <label htmlFor="cat-name-single" className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome</label>
                            <input
                                type="text"
                                id="cat-name-single"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                                className="input-style"
                                autoFocus
                            />
                        </div>
                    )}

                    {config.type === 'category' && (
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Identidade Visual (Cor)</label>
                            <div className="flex flex-wrap gap-2.5">
                                {predefinedColors.map(color => (
                                    <button 
                                        key={color} 
                                        type="button" 
                                        onClick={() => setSelectedColor(color)}
                                        className={`w-7 h-7 rounded-full transition-all ring-offset-2 ${selectedColor === color ? 'ring-2 ring-blue-500 scale-110' : 'hover:scale-110'}`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                                <input
                                    type="color"
                                    value={selectedColor}
                                    onChange={(e) => setSelectedColor(e.target.value)}
                                    className="w-7 h-7 p-0 border-0 rounded-full cursor-pointer bg-transparent overflow-hidden"
                                />
                            </div>
                        </div>
                    )}

                     {config.type === 'item' && (
                        <div className="space-y-3 bg-slate-50 p-4 rounded-xl">
                            <div className="flex items-center">
                                <input type="checkbox" id="cat-balance" checked={includeInBalance} onChange={e => setIncludeInBalance(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" style={{accentColor: '#2563eb'}}/>
                                <label htmlFor="cat-balance" className="ml-2 block text-sm font-medium text-slate-700">Incluir no balanço financeiro</label>
                            </div>
                            <div className="flex items-center">
                                <input type="checkbox" id="cat-fixed" checked={isFixed} onChange={e => setIsFixed(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" style={{accentColor: '#2563eb'}}/>
                                <label htmlFor="cat-fixed" className="ml-2 block text-sm font-medium text-slate-700">É uma despesa fixa</label>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 mt-8">
                        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
                        <button type="submit" className="btn-primary flex-1">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const CategoriesPage: React.FC<{ addCategoryTrigger: number }> = ({ addCategoryTrigger }) => {
    const { categories, setCategories } = useCategories();
    
    const [modalConfig, setModalConfig] = useState<ModalConfig>({ isOpen: false });
    const [activeTab, setActiveTab] = useState<TransactionType>(TransactionType.EXPENSE);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedItems, setExpandedItems] = useState<{[key: string]: boolean}>({});
    
    const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const [undoBackup, setUndoBackup] = useState<Category[] | null>(null);
    const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const activeTabRef = useRef(activeTab);
    activeTabRef.current = activeTab;

    useEffect(() => {
        if (addCategoryTrigger > 0) openModal('category', 'add', { parentType: activeTabRef.current });
    }, [addCategoryTrigger]);

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
        if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    };

    const handleUndo = async () => {
        if (undoBackup) {
            await setCategories(undoBackup);
            clearUndo();
        }
    };

    const handleSave = async (type: ModalType, names: string[], data: any, color?: string, includeInBalance = true, isFixed = false) => {
        clearUndo();
        let newCategories = [...categories];
        
        if (modalConfig.action === 'add') {
            names.forEach(name => {
                if (type === 'category') {
                    newCategories.push({ id: crypto.randomUUID(), name, type: data.parentType, subcategories: [], color });
                } else if (type === 'subcategory') {
                    newCategories = newCategories.map(cat => cat.id === data.parentId 
                        ? { ...cat, subcategories: [...cat.subcategories, { id: crypto.randomUUID(), name, items: [], categoryId: data.parentId }] } 
                        : cat
                    );
                } else if (type === 'item') {
                    newCategories = newCategories.map(cat => cat.id === data.categoryId ? {
                        ...cat, subcategories: cat.subcategories.map(sub => sub.id === data.parentId 
                            ? { ...sub, items: [...sub.items, { id: crypto.randomUUID(), name, subcategoryId: data.parentId, categoryId: data.categoryId, includeInBalance, isFixed }] } 
                            : sub)
                    } : cat);
                }
            });
        } else {
             const name = names[0];
             if (type === 'category') newCategories = newCategories.map(cat => cat.id === data.id ? { ...cat, name, color } : cat);
             else if (type === 'subcategory') newCategories = newCategories.map(cat => ({...cat, subcategories: cat.subcategories.map(sub => sub.id === data.id ? { ...sub, name } : sub)}));
             else if (type === 'item') newCategories = newCategories.map(cat => ({...cat, subcategories: cat.subcategories.map(sub => ({...sub, items: sub.items.map(item => item.id === data.id ? { ...item, name, includeInBalance, isFixed } : item)}))}));
        }
        
        if (await setCategories(newCategories)) closeModal();
    };

    const handleDelete = async (type: ModalType, data: any) => {
        if (window.confirm('Excluir este item permanentemente?')) {
            const backupState = [...categories];
            let updated: Category[];
            if (type === 'category') updated = categories.filter(cat => cat.id !== data.id);
            else if (type === 'subcategory') updated = categories.map(cat => ({...cat, subcategories: cat.subcategories.filter(sub => sub.id !== data.id)}));
            else updated = categories.map(cat => ({...cat, subcategories: cat.subcategories.map(sub => ({...sub, items: sub.items.filter(item => item.id !== data.id)}))}));
    
            await setCategories(updated);
            setUndoBackup(backupState);
            if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
            undoTimeoutRef.current = setTimeout(() => setUndoBackup(null), 6000);
        }
    };

    // --- Drag and Drop ---
    const handleDragStart = (e: React.DragEvent, item: DragItem) => {
        e.stopPropagation();
        setDraggedItem(item);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.id);
    };

    const handleDragOver = (e: React.DragEvent, id: string) => {
        e.preventDefault(); e.stopPropagation();
        if (draggedItem && draggedItem.id !== id) setDragOverId(id);
    };

    const handleDrop = async (e: React.DragEvent, targetId: string, targetType: ModalType, targetParentId?: string) => {
        e.preventDefault(); e.stopPropagation();
        if (!draggedItem || draggedItem.id === targetId || draggedItem.type !== targetType) { handleDragEnd(); return; }
        if ((draggedItem.type === 'subcategory' || draggedItem.type === 'item') && draggedItem.parentId !== targetParentId) { handleDragEnd(); return; }
        
        clearUndo();
        let newCats = [...categories];
        if (draggedItem.type === 'category') {
            const oldIdx = newCats.findIndex(c => c.id === draggedItem.id), newIdx = newCats.findIndex(c => c.id === targetId);
            const [moved] = newCats.splice(oldIdx, 1); newCats.splice(newIdx, 0, moved);
        } else if (draggedItem.type === 'subcategory') {
            const cIdx = newCats.findIndex(c => c.id === draggedItem.parentId);
            const subs = [...newCats[cIdx].subcategories];
            const oldIdx = subs.findIndex(s => s.id === draggedItem.id), newIdx = subs.findIndex(s => s.id === targetId);
            const [moved] = subs.splice(oldIdx, 1); subs.splice(newIdx, 0, moved);
            newCats[cIdx].subcategories = subs;
        } else if (draggedItem.type === 'item') {
            const cIdx = newCats.findIndex(c => c.id === draggedItem.grandParentId);
            const sIdx = newCats[cIdx].subcategories.findIndex(s => s.id === draggedItem.parentId);
            const items = [...newCats[cIdx].subcategories[sIdx].items];
            const oldIdx = items.findIndex(i => i.id === draggedItem.id), newIdx = items.findIndex(i => i.id === targetId);
            const [moved] = items.splice(oldIdx, 1); items.splice(newIdx, 0, moved);
            newCats[cIdx].subcategories[sIdx].items = items;
        }
        setCategories(newCats); handleDragEnd();
    };

    const handleDragEnd = () => { setDraggedItem(null); setDragOverId(null); };

    const filteredCategories = useMemo(() => {
        const lower = searchTerm.toLowerCase();
        if (!searchTerm) return categories.filter(c => c.type === activeTab);
        return categories.filter(c => c.type === activeTab).filter(cat => {
            if (cat.name.toLowerCase().includes(lower)) return true;
            return cat.subcategories.some(sub => sub.name.toLowerCase().includes(lower) || sub.items.some(i => i.name.toLowerCase().includes(lower)));
        });
    }, [categories, activeTab, searchTerm]);

    const stats = useMemo(() => {
        const cats = categories.filter(c => c.type === activeTab);
        const subCount = cats.reduce((acc, c) => acc + c.subcategories.length, 0);
        const itemCount = cats.reduce((acc, c) => acc + c.subcategories.reduce((a, s) => a + s.items.length, 0), 0);
        const fixedCount = cats.reduce((acc, c) => acc + c.subcategories.reduce((a, s) => a + s.items.filter(i => i.isFixed).length, 0), 0);
        return { catCount: cats.length, subCount, itemCount, fixedCount };
    }, [categories, activeTab]);

    const ActionButtons: React.FC<{onAdd?: () => void, onEdit: () => void, onDelete: () => void}> = ({onAdd, onEdit, onDelete}) => (
         <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
            {onAdd && <button type="button" onClick={(e) => { e.stopPropagation(); onAdd(); }} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors"><PlusIcon className="w-4 h-4"/></button>}
            <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"><PencilIcon className="w-4 h-4"/></button>
            <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"><TrashIcon className="w-4 h-4"/></button>
        </div>
    );
    
    return (
        <div className="space-y-6 pb-12">
            {/* Upper Summary Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Categorias</p>
                    <p className="text-xl font-bold text-slate-700">{stats.catCount}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Subcategorias</p>
                    <p className="text-xl font-bold text-slate-700">{stats.subCount}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Total de Itens</p>
                    <p className="text-xl font-bold text-slate-700">{stats.itemCount}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Itens Fixos</p>
                    <p className="text-xl font-bold text-slate-700">{stats.fixedCount}</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 mb-8">
                    <div className="inline-flex p-1 bg-slate-100 rounded-xl">
                        <button 
                            onClick={() => setActiveTab(TransactionType.EXPENSE)} 
                            className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === TransactionType.EXPENSE ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Despesas
                        </button>
                        <button 
                            onClick={() => setActiveTab(TransactionType.INCOME)} 
                            className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === TransactionType.INCOME ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Receitas
                        </button>
                    </div>
                    <div className="relative flex-1 md:max-w-xs">
                        <SearchIcon className="w-5 h-5 text-slate-400 absolute top-1/2 left-3 -translate-y-1/2 pointer-events-none" />
                        <input 
                            type="text" 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            className="input-style pl-10 border-slate-200 focus:border-blue-400 focus:ring-blue-500/20"
                            placeholder=""
                        />
                    </div>
                </div>
                
                <div className="space-y-4">
                    {filteredCategories.length === 0 ? (
                        <div className="text-center py-20 text-slate-400">Nenhum resultado encontrado para sua busca.</div>
                    ) : (
                        filteredCategories.map(category => (
                            <div 
                                key={category.id} 
                                draggable={!searchTerm} 
                                onDragStart={(e) => handleDragStart(e, { id: category.id, type: 'category' })}
                                onDragOver={(e) => handleDragOver(e, category.id)}
                                onDragEnd={handleDragEnd}
                                onDrop={(e) => handleDrop(e, category.id, 'category')}
                                className={`transition-all ${draggedItem?.id === category.id ? 'opacity-30' : ''}`}
                            >
                                {/* Category Level */}
                                <div 
                                    className={`group flex items-center justify-between p-3 pl-1 rounded-xl hover:bg-slate-50 border-2 border-transparent transition-all cursor-pointer ${expandedItems[category.id] ? 'bg-slate-50/50' : ''} ${dragOverId === category.id ? 'border-blue-500 bg-blue-50/50' : ''}`} 
                                    onClick={(e) => toggleExpand(e, category.id)}
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className="flex items-center">
                                            <div className="mr-2 cursor-grab active:cursor-grabbing hover:bg-slate-200 p-1 rounded transition-colors">
                                                <DragHandleIcon />
                                            </div>
                                            <div className={`transition-transform duration-200 ${expandedItems[category.id] ? 'rotate-0' : '-rotate-90'}`}>
                                                <ChevronDownIcon className="w-4 h-4 text-slate-400" />
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <div className="w-4 h-10 rounded-full" style={{ backgroundColor: category.color || '#cbd5e1' }}></div>
                                            <span className="text-lg font-bold text-slate-800 select-none">{category.name}</span>
                                            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{category.subcategories.length} subs</span>
                                        </div>
                                    </div>
                                    <ActionButtons 
                                        onAdd={() => openModal('subcategory', 'add', { parentId: category.id })}
                                        onEdit={() => openModal('category', 'edit', category)}
                                        onDelete={() => handleDelete('category', category)}
                                     />
                                </div>

                                {/* Subcategories Level */}
                                {expandedItems[category.id] && (
                                    <div className="ml-10 mt-1 border-l-2 border-slate-100 pl-4 space-y-1 py-1">
                                        {category.subcategories.map(subcategory => (
                                            <div 
                                                key={subcategory.id}
                                                draggable={!searchTerm}
                                                onDragStart={(e) => handleDragStart(e, { id: subcategory.id, type: 'subcategory', parentId: category.id })}
                                                onDragOver={(e) => handleDragOver(e, subcategory.id)}
                                                onDragEnd={handleDragEnd}
                                                onDrop={(e) => handleDrop(e, subcategory.id, 'subcategory', category.id)}
                                                className={`transition-all ${draggedItem?.id === subcategory.id ? 'opacity-30' : ''}`}
                                            >
                                                <div 
                                                    className={`group flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer border-2 border-transparent transition-all ${dragOverId === subcategory.id ? 'border-blue-500 bg-blue-50' : ''}`} 
                                                    onClick={(e) => toggleExpand(e, subcategory.id)}
                                                >
                                                    <div className="flex items-center space-x-3">
                                                        <div className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-200">
                                                            <DragHandleIcon />
                                                        </div>
                                                        <div className={`transition-transform duration-200 ${expandedItems[subcategory.id] ? 'rotate-0' : '-rotate-90'}`}>
                                                            {subcategory.items.length > 0 ? <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400" /> : <div className="w-3.5" />}
                                                        </div>
                                                        <span className="text-sm font-semibold text-slate-700 select-none">{subcategory.name}</span>
                                                    </div>
                                                    <ActionButtons 
                                                        onAdd={() => openModal('item', 'add', { parentId: subcategory.id, categoryId: category.id })}
                                                        onEdit={() => openModal('subcategory', 'edit', subcategory)}
                                                        onDelete={() => handleDelete('subcategory', subcategory)}
                                                    />
                                                </div>

                                                {/* Items Level */}
                                                {expandedItems[subcategory.id] && (
                                                    <div className="ml-8 mt-1 border-l-2 border-slate-50 pl-4 space-y-1 pb-2">
                                                        {subcategory.items.map(item => (
                                                            <div 
                                                                key={item.id} 
                                                                draggable={!searchTerm}
                                                                onDragStart={(e) => handleDragStart(e, { id: item.id, type: 'item', parentId: subcategory.id, grandParentId: category.id })}
                                                                onDragOver={(e) => handleDragOver(e, item.id)}
                                                                onDragEnd={handleDragEnd}
                                                                onDrop={(e) => handleDrop(e, item.id, 'item', subcategory.id)}
                                                                className={`group flex items-center justify-between p-2 rounded-lg hover:bg-white hover:shadow-sm border-2 border-transparent transition-all ${dragOverId === item.id ? 'border-blue-500 bg-blue-50' : ''} ${draggedItem?.id === item.id ? 'opacity-30' : ''}`}
                                                            >
                                                                <div className="flex items-center space-x-3">
                                                                    <div className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-100">
                                                                        <DragHandleIcon />
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-sm text-slate-600 select-none">{item.name}</span>
                                                                        {item.isFixed && <span className="bg-orange-50 text-orange-600 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase border border-orange-100">Fixo</span>}
                                                                        {!item.includeInBalance && <span className="bg-slate-100 text-slate-500 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase">Extra-Balanço</span>}
                                                                    </div>
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
                        ))
                    )}
                </div>
            </div>

            {/* Undo Toast */}
            {undoBackup && (
                <div className="fixed bottom-8 right-8 z-50 animate-in slide-in-from-right-10 duration-500">
                    <div className="bg-slate-800 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div>
                        <span className="text-sm font-medium">Alteração realizada.</span>
                        <button 
                            type="button"
                            onClick={handleUndo}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl transition-all text-xs font-bold border border-slate-600"
                        >
                            <ArrowUturnLeftIcon className="w-3.5 h-3.5" />
                            DESFAZER
                        </button>
                    </div>
                </div>
            )}

            <CategoryModal config={modalConfig} onClose={closeModal} onSave={handleSave} />
        </div>
    );
};

export default CategoriesPage;
