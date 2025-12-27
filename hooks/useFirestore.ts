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
 * Sanitiza dados vindos do Firestore para garantir que sejam objetos planos (POJOs)
 * e converte objetos de Timestamp do Firebase para strings ISO.
 */
const sanitizeFirestoreData = (data: any): any => {
  if (data === null || typeof data !== 'object') return data;
  
  if (Array.isArray(data)) {
    return data.map(sanitizeFirestoreData);
  }

  // Verifica se é um Timestamp do Firebase (possui segundos e nanossegundos)
  if (typeof data.toDate === 'function') {
    return data.toDate().toISOString();
  }

  const sanitized: any = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      sanitized[key] = sanitizeFirestoreData(data[key]);
    }
  }
  return sanitized;
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
        const newOrder = accounts.length > 0 ? (Math.max(...accounts.map(a => a.order || 0)) + 1) : 0;
        const docRef = await addDoc(collection(db, `users/${currentUid}/accounts`), { ...account, order: newOrder });
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
        await updateDoc(doc(db, `users/${currentUid}/accounts`, id), data);
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
        const dataToSave = { ...transaction, createdAt: new Date().toISOString() };
        const docRef = await addDoc(collection(db, `users/${currentUid}/transactions`), dataToSave);
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
          const batchPromises = newTransactions.map(t => addDoc(collection(db, `users/${currentUid}/transactions`), { ...t, createdAt: timestamp }));
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
        await updateDoc(doc(db, `users/${currentUid}/transactions`, id), data);
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
        await setDoc(doc(db, `users/${currentUid}/settings/categories`), { list: newCategories });
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
        const docRef = await addDoc(collection(db, `users/${currentUid}/loans`), loan);
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
        await updateDoc(doc(db, `users/${currentUid}/loans`, id), data);
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
        await setDoc(doc(db, `users/${currentUid}/settings/goals`), newGoals);
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
        await setDoc(doc(db, `users/${currentUid}/settings/manual_savings`), newManualSavings);
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
        const docRef = await addDoc(collection(db, `users/${currentUid}/cdb_contracts`), cdb);
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
        await updateDoc(doc(db, `users/${currentUid}/cdb_contracts`, id), data);
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