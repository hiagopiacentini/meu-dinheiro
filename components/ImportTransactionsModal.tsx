
import React, { useState, useMemo, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, TransactionType, Category } from '../types';
import XIcon from './icons/XIcon';
import SparklesIcon from './icons/SparklesIcon';
import PrivateValue from './PrivateValue';
import UploadIcon from './icons/UploadIcon';
import ArrowUturnLeftIcon from './icons/ArrowUturnLeftIcon';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface ImportTransactionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    categories: Category[];
    accountId: string;
    onImport: (transactions: Omit<Transaction, 'id'>[]) => Promise<void>;
}

const ImportTransactionsModal: React.FC<ImportTransactionsModalProps> = ({ isOpen, onClose, categories, accountId, onImport }) => {
    const [importMode, setImportMode] = useState<'text' | 'file'>('file');
    const [rawText, setRawText] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analyzedData, setAnalyzedData] = useState<any[]>([]);
    const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set());
    const fileInputRef = useRef<HTMLInputElement>(null);

    const categoryOptions = useMemo(() => {
        const options: { id: string, name: string, fullPath: string, type: TransactionType }[] = [];
        categories.forEach(cat => {
            cat.subcategories.forEach(sub => {
                sub.items.forEach(item => {
                    options.push({ 
                        id: item.id, 
                        name: item.name, 
                        fullPath: `${cat.name} > ${sub.name} > ${item.name}`,
                        type: cat.type
                    });
                });
            });
        });
        return options;
    }, [categories]);

    if (!isOpen) return null;

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const base64String = (reader.result as string).split(',')[1];
                resolve(base64String);
            };
            reader.onerror = error => reject(error);
        });
    };

    const fileToText = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsText(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const handleAnalyze = async () => {
        if (importMode === 'text' && !rawText.trim()) return;
        if (importMode === 'file' && !selectedFile) return;

        setIsAnalyzing(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const categoryContext = categoryOptions.map(c => ({ id: c.id, name: c.name, path: c.fullPath, type: c.type }));

            let contents: any;
            const promptText = `Analise este extrato bancário e extraia todas as transações financeiras.
                            Retorne um array JSON seguindo estritamente o esquema fornecido.
                            
                            REGRAS DE EXTRAÇÃO:
                            1. Datas: Converta para YYYY-MM-DD. Se o ano não estiver claro, use ${new Date().getFullYear()}.
                            2. Descrição: Limpe nomes de estabelecimentos (remova "PG *", "PIX -", etc).
                            3. Tipo: Identifique se é 'expense' (débito/saída) ou 'income' (crédito/entrada).
                            4. Categorias: Mapeie cada item ao ID de categoria mais provável da lista abaixo.
                            
                            LISTA DE CATEGORIAS DISPONÍVEIS:
                            ${JSON.stringify(categoryContext)}`;

            if (importMode === 'file' && selectedFile) {
                const isCsv = selectedFile.name.toLowerCase().endsWith('.csv') || selectedFile.type === 'text/csv';
                
                if (isCsv) {
                    const textContent = await fileToText(selectedFile);
                    contents = `${promptText}\n\nCONTEÚDO DO EXTRATO (CSV):\n${textContent}`;
                } else {
                    const base64Data = await fileToBase64(selectedFile);
                    contents = {
                        parts: [
                            {
                                inlineData: {
                                    mimeType: 'application/pdf',
                                    data: base64Data
                                }
                            },
                            { text: promptText }
                        ]
                    };
                }
            } else {
                contents = `${promptText}\n\nCONTEÚDO DO EXTRATO (TEXTO):\n${rawText}`;
            }

            const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: contents,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                date: { type: Type.STRING, description: "Data no formato YYYY-MM-DD" },
                                description: { type: Type.STRING, description: "Descrição limpa da transação" },
                                amount: { type: Type.NUMBER, description: "Valor absoluto (positivo)" },
                                type: { type: Type.STRING, description: "expense ou income" },
                                itemId: { type: Type.STRING, description: "ID da categoria mapeada" }
                            },
                            required: ["date", "description", "amount", "type"]
                        }
                    }
                }
            });

            const results = JSON.parse(response.text || "[]");
            setAnalyzedData(results);
            setSelectedIndexes(new Set(results.map((_: any, i: number) => i)));
        } catch (error: any) {
            console.error("Erro na análise da IA:", error);
            const msg = error?.message || "";
            if (msg.includes("no pages")) {
                alert("O arquivo PDF parece estar vazio ou protegido. Tente converter para texto ou colar as informações manualmente.");
            } else {
                alert("Não foi possível processar o extrato. Tente colar o texto manualmente ou use um arquivo menor.");
            }
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 10 * 1024 * 1024) {
                alert("O arquivo é muito grande. Tente um arquivo de até 10MB.");
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleConfirm = async () => {
        const toImport = analyzedData
            .filter((_, i) => selectedIndexes.has(i))
            .map(item => ({
                description: item.description,
                amount: item.amount,
                date: item.date,
                type: item.type === 'income' ? TransactionType.INCOME : TransactionType.EXPENSE,
                accountId: accountId,
                itemId: item.itemId || ''
            }));

        if (toImport.length > 0) {
            await onImport(toImport);
            resetModal();
            onClose();
        }
    };

    const resetModal = () => {
        setRawText('');
        setSelectedFile(null);
        setAnalyzedData([]);
        setSelectedIndexes(new Set());
    };

    const updateAnalyzedItem = (index: number, field: string, value: any) => {
        const newData = [...analyzedData];
        newData[index] = { ...newData[index], [field]: value };
        setAnalyzedData(newData);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 tracking-normal">
                            <SparklesIcon className="w-5 h-5 text-blue-600" />
                            Importação inteligente
                        </h2>
                        <p className="text-sm text-slate-500 font-normal tracking-normal">Carregue seu extrato (PDF/CSV) e a IA organizará tudo.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><XIcon className="w-6 h-6"/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {analyzedData.length === 0 ? (
                        <div className="space-y-6">
                            <div className="flex p-1 bg-slate-100 rounded-xl w-fit mx-auto mb-4">
                                <button 
                                    onClick={() => setImportMode('file')}
                                    className={`px-6 py-2 text-sm font-medium rounded-lg transition-all tracking-normal ${importMode === 'file' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Upload de arquivo
                                </button>
                                <button 
                                    onClick={() => setImportMode('text')}
                                    className={`px-6 py-2 text-sm font-medium rounded-lg transition-all tracking-normal ${importMode === 'text' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Colar texto
                                </button>
                            </div>

                            {importMode === 'file' ? (
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-slate-300 rounded-3xl p-12 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group"
                                >
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.csv" />
                                    <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                        <UploadIcon className="w-8 h-8 text-blue-600" />
                                    </div>
                                    {selectedFile ? (
                                        <div>
                                            <p className="font-medium text-slate-800 text-lg tracking-normal">{selectedFile.name}</p>
                                            <p className="text-sm text-slate-500 mt-1 tracking-normal">{(selectedFile.size / 1024).toFixed(1)} KB • Pronto para analisar</p>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-lg font-medium text-slate-700 tracking-normal">Clique ou arraste o extrato aqui</p>
                                            <p className="text-sm text-slate-400 mt-2 font-normal tracking-normal">Suporta arquivos PDF ou CSV baixados do banco</p>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <textarea
                                    value={rawText}
                                    onChange={e => setRawText(e.target.value)}
                                    className="w-full h-64 p-4 border-2 border-slate-200 rounded-2xl focus:border-blue-500 focus:ring-0 transition-all text-sm font-mono placeholder:text-slate-400 tracking-normal"
                                    placeholder="Copie as transações do app do banco e cole aqui..."
                                ></textarea>
                            )}

                            <div className="flex justify-center">
                                <button
                                    onClick={handleAnalyze}
                                    disabled={isAnalyzing || (importMode === 'text' ? !rawText.trim() : !selectedFile)}
                                    className="btn-primary px-10 py-4 rounded-2xl shadow-xl shadow-blue-200 disabled:opacity-50 disabled:shadow-none text-base tracking-normal font-medium"
                                >
                                    {isAnalyzing ? (
                                        <span className="flex items-center gap-3">
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Processando extrato...
                                        </span>
                                    ) : "Analisar com inteligência artificial"}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                <span className="text-sm font-medium text-slate-700 tracking-normal">{selectedIndexes.size} lançamentos encontrados no arquivo</span>
                                <button 
                                    onClick={() => setAnalyzedData([])} 
                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-blue-600 rounded-xl text-xs font-medium transition-all shadow-sm tracking-normal"
                                >
                                    <ArrowUturnLeftIcon className="w-3 h-3" />
                                    Trocar arquivo
                                </button>
                            </div>
                            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-slate-500 text-[11px] font-bold uppercase tracking-normal border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-4 w-12 text-center">Sel.</th>
                                            <th className="px-4 py-4">Data</th>
                                            <th className="px-4 py-4 min-w-[200px]">Descrição</th>
                                            <th className="px-4 py-4">Categoria sugerida</th>
                                            <th className="px-4 py-4 text-right">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {analyzedData.map((item, idx) => {
                                            const isSelected = selectedIndexes.has(idx);
                                            return (
                                                <tr key={idx} className={`hover:bg-blue-50/20 transition-colors ${isSelected ? 'bg-white' : 'bg-slate-50/50 opacity-40'}`}>
                                                    <td className="px-4 py-4 text-center">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={isSelected} 
                                                            onChange={() => {
                                                                const next = new Set(selectedIndexes);
                                                                if (next.has(idx)) next.delete(idx);
                                                                else next.add(idx);
                                                                setSelectedIndexes(next);
                                                            }}
                                                            className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-4 text-slate-500 whitespace-nowrap font-medium tracking-normal">
                                                        {new Date(item.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <input 
                                                            type="text" 
                                                            value={item.description} 
                                                            onChange={(e) => updateAnalyzedItem(idx, 'description', e.target.value)}
                                                            className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-slate-50/50 focus:ring-0 font-medium text-slate-800 tracking-normal px-3 py-1.5 rounded-lg h-9 transition-all outline-none"
                                                            title="Clique para editar a descrição"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <select 
                                                            value={item.itemId || ''} 
                                                            onChange={(e) => updateAnalyzedItem(idx, 'itemId', e.target.value)}
                                                            className="input-style py-1.5 text-xs h-9 bg-white border-slate-200 font-medium tracking-normal"
                                                        >
                                                            <option value="">Selecione...</option>
                                                            {categoryOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.fullPath}</option>)}
                                                        </select>
                                                    </td>
                                                    <td className={`px-4 py-4 text-right font-medium tracking-normal text-base ${item.type === 'expense' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                        <PrivateValue>{formatCurrency(item.amount)}</PrivateValue>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
                    <button onClick={onClose} className="btn-secondary px-8 py-3 rounded-xl font-medium tracking-normal">Fechar</button>
                    {analyzedData.length > 0 && (
                        <button onClick={handleConfirm} className="btn-primary px-10 py-3 rounded-xl shadow-lg shadow-blue-200 font-medium tracking-normal">
                            Salvar {selectedIndexes.size} lançamentos
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImportTransactionsModal;
