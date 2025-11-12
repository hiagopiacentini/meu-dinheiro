import React, { useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Category, Subcategory, CategoryItem, TransactionType } from '../types';
import PlusIcon from '../components/icons/PlusIcon';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';

type ModalType = 'category' | 'subcategory' | 'item';
type ModalAction = 'add' | 'edit';

interface ModalConfig {
    isOpen: boolean;
    type?: ModalType;
    action?: ModalAction;
    data?: Category | Subcategory | CategoryItem | { parentId?: string; parentType?: TransactionType, categoryId?: string };
}

const CategoryModal: React.FC<{
    config: ModalConfig;
    onClose: () => void;
    onSave: (type: ModalType, names: string[], data?: any) => void;
    onDelete: (type: ModalType, data: any) => void;
}> = ({ config, onClose, onSave, onDelete }) => {
    // For editing
    const [name, setName] = useState('');
    // For adding multiple
    const [currentName, setCurrentName] = useState('');
    const [namesList, setNamesList] = useState<string[]>([]);


    React.useEffect(() => {
        if (config.isOpen) {
            setName('');
            setCurrentName('');
            setNamesList([]);
            if (config.action === 'edit' && config.data && 'name' in config.data) {
                setName(config.data.name);
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
                onSave(config.type!, finalNames, config.data);
            }
        } else { // 'edit'
            const trimmedName = name.trim();
            if (trimmedName) {
                onSave(config.type!, [trimmedName], config.data);
            }
        }
        
        onClose();
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-6 text-slate-800">{getTitle()}</h2>
                <form onSubmit={handleSubmit}>
                     {config.action === 'add' ? (
                        <>
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
                                    <p className="text-sm font-medium text-slate-600">A serem adicionados:</p>
                                    <ul className="space-y-1">
                                        {namesList.map((n, index) => (
                                            <li key={index} className="flex justify-between items-center bg-slate-100 px-3 py-1.5 rounded-md text-sm">
                                                <span>{n}</span>
                                                <button type="button" onClick={() => removeName(n)} className="text-slate-500 hover:text-red-600 font-bold text-lg leading-none" aria-label={`Remover ${n}`}>
                                                    &times;
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
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
                        </>
                    )}
                    <div className="flex justify-between items-center pt-6">
                        <div>
                           {config.action === 'edit' && (
                               <button
                                   type="button"
                                   onClick={() => onDelete(config.type!, config.data)}
                                   className="flex items-center space-x-2 py-2.5 px-4 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                               >
                                   <TrashIcon className="w-5 h-5" />
                                   <span>Excluir</span>
                               </button>
                           )}
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                            <button type="submit" className="btn-primary">Salvar</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};


const CategoriesPage: React.FC = () => {
    const [categories, setCategories] = useLocalStorage<Category[]>('categories', []);
    const [modalConfig, setModalConfig] = useState<ModalConfig>({ isOpen: false });

    const openModal = (type: ModalType, action: ModalAction, data: any) => {
        setModalConfig({ isOpen: true, type, action, data });
    };

    const closeModal = () => setModalConfig({ isOpen: false });

    const handleSave = (type: ModalType, names: string[], data: any) => {
        if (modalConfig.action === 'add') {
             let newCategories = [...categories];
            names.forEach(name => {
                if (type === 'category') {
                    const newCategory: Category = { id: crypto.randomUUID(), name, type: data.parentType, subcategories: [] };
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
                setCategories(categories.map(cat => cat.id === data.id ? { ...cat, name } : cat));
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
    };

    const handleDelete = (type: ModalType, data: any) => {
        const confirmationText = 'Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.';
        if (window.confirm(confirmationText)) {
            let updatedCategories: Category[];
    
            if (type === 'category') {
                updatedCategories = categories.filter(cat => cat.id !== data.id);
            } else if (type === 'subcategory') {
                updatedCategories = categories.map(cat => {
                    if (cat.id !== data.categoryId) return cat;
                    return {
                        ...cat,
                        subcategories: cat.subcategories.filter(sub => sub.id !== data.id),
                    };
                });
            } else if (type === 'item') {
                updatedCategories = categories.map(cat => {
                    if (cat.id !== data.categoryId) return cat;
                    return {
                        ...cat,
                        subcategories: cat.subcategories.map(sub => {
                            if (sub.id !== data.subcategoryId) return sub;
                            return {
                                ...sub,
                                items: sub.items.filter(item => item.id !== data.id),
                            };
                        }),
                    };
                });
            } else {
                updatedCategories = [...categories];
            }
    
            setCategories(updatedCategories);
            closeModal();
        }
    };
    
    const renderTree = (type: TransactionType) => (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{type === 'income' ? 'Receitas' : 'Despesas'}</h2>
                <button onClick={() => openModal('category', 'add', { parentType: type })} className="btn-primary flex items-center text-sm py-2 px-3">
                    <PlusIcon className="w-4 h-4 mr-1"/> Adicionar Categoria
                </button>
            </div>
            <div className="space-y-3">
                {categories.filter(c => c.type === type).map(category => (
                    <div key={category.id} className="p-3 bg-white border border-slate-200 rounded-lg">
                        <div className="group flex justify-between items-center">
                            <span className="font-semibold text-slate-800">{category.name}</span>
                            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <button onClick={() => openModal('subcategory', 'add', { parentId: category.id })} className="p-1.5 rounded-full hover:bg-slate-100 transition-colors" title="Adicionar Subcategoria">
                                    <PlusIcon className="w-4 h-4 text-green-600" />
                                </button>
                                <button onClick={() => openModal('category', 'edit', category)} className="p-1.5 rounded-full hover:bg-slate-100 transition-colors" title="Editar Categoria">
                                    <PencilIcon className="w-4 h-4 text-blue-600" />
                                </button>
                            </div>
                        </div>
                        <div className="pl-4 mt-2 space-y-2">
                            {category.subcategories.map(subcategory => (
                                <div key={subcategory.id} className="p-3 bg-slate-100 rounded-md border border-slate-200">
                                    <div className="group flex justify-between items-center">
                                        <span className="font-medium text-sm text-slate-700">{subcategory.name}</span>
                                        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                            <button onClick={() => openModal('item', 'add', { parentId: subcategory.id, categoryId: category.id })} className="p-1 rounded-full hover:bg-slate-200 transition-colors" title="Adicionar Item">
                                                <PlusIcon className="w-4 h-4 text-green-600" />
                                            </button>
                                            <button onClick={() => openModal('subcategory', 'edit', subcategory)} className="p-1 rounded-full hover:bg-slate-200 transition-colors" title="Editar Subcategoria">
                                                <PencilIcon className="w-4 h-4 text-blue-600" />
                                            </button>
                                        </div>
                                    </div>
                                    <ul className="pl-4 mt-2 space-y-1">
                                        {subcategory.items.map(item => (
                                            <li key={item.id} className="group text-sm text-slate-600 flex justify-between items-center py-1">
                                                <span>{item.name}</span>
                                                 <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                    <button onClick={() => openModal('item', 'edit', item)} className="p-1 rounded-full hover:bg-slate-200 transition-colors" title="Editar Item">
                                                        <PencilIcon className="w-4 h-4 text-blue-600" />
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderTree(TransactionType.INCOME)}
                {renderTree(TransactionType.EXPENSE)}
            </div>
            <CategoryModal config={modalConfig} onClose={closeModal} onSave={handleSave} onDelete={handleDelete} />
        </div>
    );
};

export default CategoriesPage;