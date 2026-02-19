
import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  addDoc, 
  updateDoc,
  writeBatch
} from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Account, Transaction, Category, Loan, AnnualGoals, CDBContract, ManualSavings, MonthlyForecasts, ItemBudgets, ReportNotes, ReportNote } from '../types';
import { sampleCategories } from '../data/demoData';

/**
 * Limpa recursivamente um objeto para garantir que seja serializável em JSON.
 * Resolve problemas de referências circulares e remove objetos complexos do SDK/DOM.
 */
export const deepClean = (data: any, seen = new WeakMap()): any => {
  // 1. Tipos primitivos e básicos
  if (data === null || typeof data !== 'object') {
    if (typeof data === 'function' || typeof data === 'symbol') return undefined;
    return data;
  }

  // 2. Detecção de circularidade precoce
  if (seen.has(data)) {
    return "[Circular]"; // Retorna um placeholder amigável ou undefined para interromper o ciclo
  }

  // 3. Tratamento de instâncias especiais (Date e Timestamps)
  if (data instanceof Date) {
    return data.toISOString();
  }

  if (data.seconds !== undefined && data.nanoseconds !== undefined && typeof data.toDate === 'function') {
    try {
      return data.toDate().toISOString();
    } catch (e) {
      return null;
    }
  }

  // 4. Se chegamos aqui, é um objeto ou array. Registramos a referência ANTES de prosseguir.
  // Usamos um placeholder temporário no WeakMap.
  seen.set(data, true);

  // 5. Tratamento de Arrays
  if (Array.isArray(data)) {
    return data
      .map(item => deepClean(item, seen))
      .filter(val => val !== undefined);
  }

  // 6. Tratamento de objetos com método toJSON (ex: DocumentReference do Firebase)
  // Mas evitamos chamar toJSON em objetos que já tratamos como Date.
  if (typeof data.toJSON === 'function' && !(data instanceof Date)) {
    try {
      const json = data.toJSON();
      if (json !== data) {
        return deepClean(json, seen);
      }
    } catch (e) {
      // Se falhar, prosseguimos como objeto normal
    }
  }

  // 7. Verifica se é um objeto "plano" (POJO)
  // Em builds minificados, a detecção de constructor pode ser sensível.
  const isPlainObject = data.constructor === Object || 
                        data.constructor === undefined || 
                        Object.getPrototypeOf(data) === null;

  if (!isPlainObject) {
    // Se não for um objeto plano (ex: Map, Set, instância de classe complexa),
    // retornamos sua representação em string para segurança total.
    return String(data);
  }

  // 8. Processamento de propriedades de objeto plano
  const result: any = {};
  
  // Usamos Object.keys para pegar apenas propriedades enumeráveis próprias
  Object.keys(data).forEach(key => {
    // Ignora propriedades internas do Firebase/SDKs e funções
    if (key.startsWith('_') || key.startsWith('$')) return;
    
    const val = data[key];
    if (typeof val === 'function') return;

    const cleaned = deepClean(val, seen);
    if (cleaned !== undefined) {
      result[key] = cleaned;
    }
  });
  
  // Atualizamos o valor no WeakMap com o resultado final (opcional, mas bom para cache)
  seen.set(data, result);
  
  return result;
};

const sanitizeFirestoreData = (data: any): any => {
  return deepClean(data);
};

export const useAccounts = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [userId, setUserId] = useState<string | null>(auth.currentUser?.uid || null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : null);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!userId) {
      setAccounts([]);
      return;
    }
    const q = query(collection(db, `users/${userId}/accounts`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...sanitizeFirestoreData(doc.data()) } as Account));
      data.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setAccounts(data);
    }, (error) => {
      console.error("Error fetching accounts:", error.message);
    });
    return () => unsubscribe();
  }, [userId]);

  const addAccount = async (account: Omit<Account, 'id'>) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return null;
    try {
        const cleanedData = deepClean(account);
        const newOrder = accounts.length > 0 ? (Math.max(...accounts.map(a => a.order || 0)) + 1) : 0;
        const docRef = await addDoc(collection(db, `users/${currentUid}/accounts`), { ...cleanedData, order: newOrder });
        return docRef.id;
    } catch (error: any) {
        console.error("Erro ao adicionar conta:", error.message);
        return null;
    }
  };

  const updateAccount = async (account: Account) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return false;
    try {
        const { id, ...data } = account;
        const cleanedData = deepClean(data);
        await updateDoc(doc(db, `users/${currentUid}/accounts`, id), cleanedData);
        return true;
    } catch (error: any) {
        console.error("Erro ao atualizar conta:", error.message);
        return false;
    }
  };

  const reorderAccounts = async (updatedOrderAccounts: { id: string, order: number }[]) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return false;
    try {
        const batch = writeBatch(db);
        updatedOrderAccounts.forEach((acc) => {
            const ref = doc(db, `users/${currentUid}/accounts`, acc.id);
            batch.update(ref, { order: acc.order });
        });
        await batch.commit();
        return true;
    } catch (error: any) {
        console.error("Erro ao reordenar contas:", error.message);
        return false;
    }
  };

  const deleteAccount = async (id: string) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return false;
    try {
        await deleteDoc(doc(db, `users/${currentUid}/accounts`, id));
        return true;
    } catch (error: any) {
        console.error("Erro ao excluir conta:", error.message);
        return false;
    }
  };

  return { accounts, addAccount, updateAccount, reorderAccounts, deleteAccount };
};

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userId, setUserId] = useState<string | null>(auth.currentUser?.uid || null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : null);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!userId) {
      setTransactions([]);
      return;
    }
    const q = query(collection(db, `users/${userId}/transactions`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...sanitizeFirestoreData(doc.data()) } as Transaction));
      setTransactions(data);
    }, (error) => {
      console.error("Error fetching transactions:", error.message);
    });
    return () => unsubscribe();
  }, [userId]);

  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return null;
    try {
        const cleanedData = deepClean({ ...transaction, createdAt: new Date().toISOString() });
        const docRef = await addDoc(collection(db, `users/${currentUid}/transactions`), cleanedData);
        return docRef.id;
    } catch (error: any) {
        console.error("Erro ao adicionar transação:", error.message);
        return null;
    }
  };
  
  const addTransactions = async (newTransactions: Omit<Transaction, 'id'>[]) => {
      const currentUid = auth.currentUser?.uid;
      if (!currentUid) return false;
      try {
          const timestamp = new Date().toISOString();
          const batchPromises = newTransactions.map(t => {
              const cleaned = deepClean({ ...t, createdAt: timestamp });
              return addDoc(collection(db, `users/${currentUid}/transactions`), cleaned);
          });
          await Promise.all(batchPromises);
          return true;
      } catch (error: any) {
          console.error("Erro ao adicionar múltiplas transações:", error.message);
          return false;
      }
  };

  const updateTransaction = async (transaction: Transaction) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return false;
    try {
        const { id, ...data } = transaction;
        const cleanedData = deepClean(data);
        await updateDoc(doc(db, `users/${currentUid}/transactions`, id), cleanedData);
        return true;
    } catch (error: any) {
        console.error("Erro ao atualizar transação:", error.message);
        return false;
    }
  };

  const deleteTransaction = async (id: string) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return false;
    try {
        await deleteDoc(doc(db, `users/${currentUid}/transactions`, id));
        return true;
    } catch (error: any) {
        console.error("Erro ao excluir transação:", error.message);
        return false;
    }
  };
  
  const deleteTransactions = async (ids: string[]) => {
      const currentUid = auth.currentUser?.uid;
      if (!currentUid) return false;
      try {
          const batchPromises = ids.map(id => deleteDoc(doc(db, `users/${currentUid}/transactions`, id)));
          await Promise.all(batchPromises);
          return true;
      } catch (error: any) {
          console.error("Erro ao excluir múltiplas transações:", error.message);
          return false;
      }
  }

  return { transactions, addTransaction, addTransactions, updateTransaction, deleteTransaction, deleteTransactions };
};

export const useCategories = () => {
  const [categories, setCategoriesState] = useState<Category[]>(sampleCategories);
  const [userId, setUserId] = useState<string | null>(auth.currentUser?.uid || null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : null);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const docRef = doc(db, `users/${userId}/settings/categories`);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = sanitizeFirestoreData(docSnap.data());
        const list = data?.list;
        if (Array.isArray(list)) {
          setCategoriesState(list);
        }
      } else {
        setDoc(docRef, { list: sampleCategories }).catch(err => console.error("Erro init categories", err.message));
      }
    }, (error) => {
      console.error("Error fetching categories:", error.message);
    });
    return () => unsubscribe();
  }, [userId]);

  const setCategories = async (newCategories: Category[]) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return false;
    try {
        const cleaned = deepClean(newCategories);
        await setDoc(doc(db, `users/${currentUid}/settings/categories`), { list: cleaned });
        return true;
    } catch (error: any) {
        console.error("Erro ao salvar categorias:", error.message);
        return false;
    }
  };

  return { categories, setCategories };
};

export const useLoans = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [userId, setUserId] = useState<string | null>(auth.currentUser?.uid || null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : null);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!userId) {
      setLoans([]);
      return;
    }
    const q = query(collection(db, `users/${userId}/loans`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...sanitizeFirestoreData(doc.data()) } as Loan));
      setLoans(data);
    }, (error) => {
      console.error("Error fetching loans:", error.message);
    });
    return () => unsubscribe();
  }, [userId]);

  const addLoan = async (loan: Omit<Loan, 'id'>) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return null;
    try {
        const cleanedData = deepClean(loan);
        const docRef = await addDoc(collection(db, `users/${currentUid}/loans`), cleanedData);
        return docRef.id;
    } catch (error: any) {
        console.error("Erro ao adicionar empréstimo:", error.message);
        return null;
    }
  };

  const updateLoan = async (loan: Loan) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return false;
    try {
        const { id, ...data } = loan;
        const cleanedData = deepClean(data);
        await updateDoc(doc(db, `users/${currentUid}/loans`, id), cleanedData);
        return true;
    } catch (error: any) {
        console.error("Erro ao atualizar empréstimo:", error.message);
        return false;
    }
  };

  const deleteLoan = async (id: string) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return false;
    try {
        await deleteDoc(doc(db, `users/${currentUid}/loans`, id));
        return true;
    } catch (error: any) {
        console.error("Erro ao excluir empréstimo:", error.message);
        return false;
    }
  };

  return { loans, addLoan, updateLoan, deleteLoan };
};

export const useGoals = () => {
  const [goals, setGoalsState] = useState<AnnualGoals>({});
  const [userId, setUserId] = useState<string | null>(auth.currentUser?.uid || null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : null);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const docRef = doc(db, `users/${userId}/settings/goals`);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setGoalsState(sanitizeFirestoreData(docSnap.data()) as AnnualGoals);
      }
    }, (error) => {
      console.error("Error fetching goals:", error.message);
    });
    return () => unsubscribe();
  }, [userId]);

  const setGoals = async (newGoals: AnnualGoals) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return false;
    try {
        const cleaned = deepClean(newGoals);
        await setDoc(doc(db, `users/${currentUid}/settings/goals`), cleaned);
        return true;
    } catch (error: any) {
        console.error("Erro ao salvar metas:", error.message);
        return false;
    }
  };

  return { goals, setGoals };
};

export const useManualSavings = () => {
  const [manualSavings, setManualSavings] = useState<ManualSavings>({});
  const [userId, setUserId] = useState<string | null>(auth.currentUser?.uid || null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : null);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const docRef = doc(db, `users/${userId}/settings/manual_savings`);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setManualSavings(sanitizeFirestoreData(docSnap.data()) as ManualSavings);
      } else {
        setManualSavings({});
      }
    }, (error) => {
      console.error("Error fetching manual savings:", error.message);
    });
    return () => unsubscribe();
  }, [userId]);

  const updateManualSavings = async (newManualSavings: ManualSavings) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return false;
    try {
        const cleaned = deepClean(newManualSavings);
        await setDoc(doc(db, `users/${currentUid}/settings/manual_savings`), cleaned);
        return true;
    } catch (error: any) {
        console.error("Erro ao salvar economias manuais:", error.message);
        return false;
    }
  };

  return { manualSavings, updateManualSavings };
};

export const useForecasts = () => {
  const [forecasts, setForecasts] = useState<MonthlyForecasts>({});
  const [userId, setUserId] = useState<string | null>(auth.currentUser?.uid || null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : null);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const docRef = doc(db, `users/${userId}/settings/forecasts`);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setForecasts(sanitizeFirestoreData(docSnap.data()) as MonthlyForecasts);
      } else {
        setForecasts({});
      }
    }, (error) => {
      console.error("Error fetching forecasts:", error.message);
    });
    return () => unsubscribe();
  }, [userId]);

  const updateForecasts = async (newForecasts: MonthlyForecasts) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return false;
    try {
        const cleaned = deepClean(newForecasts);
        await setDoc(doc(db, `users/${currentUid}/settings/forecasts`), cleaned);
        return true;
    } catch (error: any) {
        console.error("Erro ao salvar previsões:", error.message);
        return false;
    }
  };

  return { forecasts, updateForecasts };
};

export const useItemBudgets = () => {
  const [itemBudgets, setItemBudgets] = useState<ItemBudgets>({});
  const [userId, setUserId] = useState<string | null>(auth.currentUser?.uid || null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : null);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const docRef = doc(db, `users/${userId}/settings/item_budgets`);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setItemBudgets(sanitizeFirestoreData(docSnap.data()) as ItemBudgets);
      } else {
        setItemBudgets({});
      }
    }, (error) => {
      console.error("Error fetching item budgets:", error.message);
    });
    return () => unsubscribe();
  }, [userId]);

  const updateItemBudgets = async (newItemBudgets: ItemBudgets) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return false;
    try {
        const cleaned = deepClean(newItemBudgets);
        await setDoc(doc(db, `users/${currentUid}/settings/item_budgets`), cleaned);
        return true;
    } catch (error: any) {
        console.error("Erro ao salvar orçamentos por item:", error.message);
        return false;
    }
  };

  return { itemBudgets, updateItemBudgets };
};

export const useReportNotes = () => {
  const [notesData, setNotesData] = useState<ReportNotes>({ list: [] });
  const [userId, setUserId] = useState<string | null>(auth.currentUser?.uid || null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : null);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const docRef = doc(db, `users/${userId}/settings/report_notes_v2`);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = sanitizeFirestoreData(docSnap.data()) as ReportNotes;
        if (data && Array.isArray(data.list)) {
            setNotesData(data);
        }
      } else {
        setNotesData({ list: [] });
      }
    }, (error) => {
      console.error("Error fetching report notes:", error.message);
    });
    return () => unsubscribe();
  }, [userId]);

  const updateReportNotes = async (newNotes: ReportNote[]) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return false;
    try {
        const cleaned = deepClean({ list: newNotes });
        await setDoc(doc(db, `users/${currentUid}/settings/report_notes_v2`), cleaned);
        return true;
    } catch (error: any) {
        console.error("Erro ao salvar observações:", error.message);
        return false;
    }
  };

  return { reportNotes: notesData.list, updateReportNotes };
};

export const useCDBs = () => {
  const [cdbs, setCdbs] = useState<CDBContract[]>([]);
  const [userId, setUserId] = useState<string | null>(auth.currentUser?.uid || null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : null);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!userId) {
      setCdbs([]);
      return;
    }
    const q = query(collection(db, `users/${userId}/cdb_contracts`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...sanitizeFirestoreData(doc.data()) } as CDBContract));
      setCdbs(data);
    }, (error) => {
      console.error("Error fetching CDBs:", error.message);
    });
    return () => unsubscribe();
  }, [userId]);

  const addCDB = async (cdb: Omit<CDBContract, 'id'>) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return null;
    try {
        const cleanedData = deepClean(cdb);
        const docRef = await addDoc(collection(db, `users/${currentUid}/cdb_contracts`), cleanedData);
        return docRef.id;
    } catch (error: any) {
        console.error("Erro ao adicionar CDB:", error.message);
        return null;
    }
  };

  const updateCDB = async (cdb: CDBContract) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return false;
    try {
        const { id, ...data } = cdb;
        const cleanedData = deepClean(data);
        await updateDoc(doc(db, `users/${currentUid}/cdb_contracts`, id), cleanedData);
        return true;
    } catch (error: any) {
        console.error("Erro ao atualizar CDB:", error.message);
        return false;
    }
  };

  const deleteCDB = async (id: string) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return false;
    try {
        await deleteDoc(doc(db, `users/${currentUid}/cdb_contracts`, id));
        return true;
    } catch (error: any) {
        console.error("Erro ao excluir CDB:", error.message);
        return false;
    }
  };

  return { cdbs, addCDB, updateCDB, deleteCDB };
};
