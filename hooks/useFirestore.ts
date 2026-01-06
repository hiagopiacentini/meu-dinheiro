
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
import { Account, Transaction, Category, Loan, AnnualGoals, CDBContract, ManualSavings } from '../types';
import { sampleCategories } from '../data/demoData';

/**
 * Limpeza profunda e cycle-proof para garantir que apenas dados puros (POJOs) sejam enviados ao Firestore.
 * Utiliza WeakMap para rastrear referências e Object.keys para evitar propriedades de sistema/SDK.
 */
export const deepClean = (data: any, seen = new WeakMap()): any => {
  // Primitivos e null
  if (data === null || typeof data !== 'object') {
    return typeof data === 'function' ? undefined : data;
  }
  
  // Evita recursão infinita em estruturas circulares
  if (seen.has(data)) return "[Circular]";
  
  // Tratamento para Datas
  if (data instanceof Date) return data.toISOString();
  
  // Tratamento para Timestamps do Firebase (duck typing para evitar importação extra)
  if (data.seconds !== undefined && data.nanoseconds !== undefined && typeof data.toDate === 'function') {
    try {
      return data.toDate().toISOString();
    } catch (e) {
      return null;
    }
  }

  // Cria o contêiner de destino (Array ou Objeto)
  const result: any = Array.isArray(data) ? [] : {};
  
  // Registra no mapa ANTES de recursar nos filhos
  seen.set(data, result);

  if (Array.isArray(data)) {
    data.forEach((item, i) => {
      const cleaned = deepClean(item, seen);
      if (cleaned !== undefined) result[i] = cleaned;
    });
  } else {
    // Usamos Object.keys para pegar apenas propriedades PRÓPRIAS e evitar protótipos de classes do SDK
    Object.keys(data).forEach(key => {
      const val = data[key];
      // Ignora funções e propriedades internas do Firebase que começam com _
      if (typeof val !== 'function' && !key.startsWith('_')) {
        const cleaned = deepClean(val, seen);
        if (cleaned !== undefined) {
          result[key] = cleaned;
        }
      }
    });
  }
  
  return result;
};

const sanitizeFirestoreData = (data: any): any => {
  return deepClean(data);
};

// --- ACCOUNTS HOOK ---
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

// --- TRANSACTIONS HOOK ---
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

// --- CATEGORIES HOOK ---
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

// --- LOANS HOOK ---
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

// --- GOALS HOOK ---
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

// --- MANUAL SAVINGS HOOK ---
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

// --- CDB INVESTMENTS HOOK ---
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
