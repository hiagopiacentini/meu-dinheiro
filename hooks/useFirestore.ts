import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  addDoc, 
  updateDoc
} from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Account, Transaction, Category, Loan, AnnualGoals } from '../types';
import { sampleCategories } from '../data/demoData';

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
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
      setAccounts(data);
    }, (error) => {
      console.error("Error fetching accounts:", error.message);
    });

    return () => unsubscribe();
  }, [userId]);

  const addAccount = async (account: Omit<Account, 'id'>) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) {
        alert("Erro: Usuário não autenticado.");
        return null;
    }
    try {
        const docRef = await addDoc(collection(db, `users/${currentUid}/accounts`), account);
        return docRef.id;
    } catch (error: any) {
        console.error("Erro ao adicionar conta:", error.message);
        alert(`Erro ao criar conta: ${error.message}`);
        return null;
    }
  };

  const updateAccount = async (account: Account) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) {
        alert("Erro: Usuário não autenticado.");
        return false;
    }
    try {
        const { id, ...data } = account;
        await updateDoc(doc(db, `users/${currentUid}/accounts`, id), data);
        return true;
    } catch (error: any) {
        console.error("Erro ao atualizar conta:", error.message);
        alert(`Erro ao atualizar conta: ${error.message}`);
        return false;
    }
  };

  const deleteAccount = async (id: string) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) {
        alert("Erro: Usuário não autenticado.");
        return false;
    }
    try {
        const path = `users/${currentUid}/accounts/${id}`;
        console.log(`[DEBUG] Tentando excluir conta em: ${path}`);
        await deleteDoc(doc(db, `users/${currentUid}/accounts`, id));
        return true;
    } catch (error: any) {
        console.error("Erro ao excluir conta:", error.message);
        alert(`Erro ao excluir conta (Firebase): ${error.code} - ${error.message}`);
        return false;
    }
  };

  return { accounts, addAccount, updateAccount, deleteAccount };
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
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(data);
    }, (error) => {
      console.error("Error fetching transactions:", error.message);
    });

    return () => unsubscribe();
  }, [userId]);

  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) {
        alert("Erro: Usuário não autenticado.");
        return null;
    }
    try {
        const docRef = await addDoc(collection(db, `users/${currentUid}/transactions`), transaction);
        return docRef.id;
    } catch (error: any) {
        console.error("Erro ao adicionar transação:", error.message);
        alert(`Erro ao salvar transação: ${error.message}`);
        return null;
    }
  };
  
  const addTransactions = async (newTransactions: Omit<Transaction, 'id'>[]) => {
      const currentUid = auth.currentUser?.uid;
      if (!currentUid) {
          alert("Erro: Usuário não autenticado.");
          return false;
      }
      try {
          const batchPromises = newTransactions.map(t => addDoc(collection(db, `users/${currentUid}/transactions`), t));
          await Promise.all(batchPromises);
          return true;
      } catch (error: any) {
          console.error("Erro ao adicionar múltiplas transações:", error.message);
          alert(`Erro ao salvar transações em lote: ${error.message}`);
          return false;
      }
  };

  const updateTransaction = async (transaction: Transaction) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) {
        alert("Erro: Usuário não autenticado.");
        return false;
    }
    try {
        const { id, ...data } = transaction;
        await updateDoc(doc(db, `users/${currentUid}/transactions`, id), data);
        return true;
    } catch (error: any) {
        console.error("Erro ao atualizar transação:", error.message);
        alert(`Erro ao atualizar transação: ${error.message}`);
        return false;
    }
  };

  const deleteTransaction = async (id: string) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) {
        alert("Erro: Usuário não autenticado.");
        return false;
    }
    try {
        const path = `users/${currentUid}/transactions/${id}`;
        console.log(`[DEBUG] Tentando excluir transação em: ${path}`);
        await deleteDoc(doc(db, `users/${currentUid}/transactions`, id));
        return true;
    } catch (error: any) {
        console.error("Erro ao excluir transação:", error.message);
        alert(`Erro ao excluir transação (Firebase): ${error.code} - ${error.message}`);
        return false;
    }
  };
  
  const deleteTransactions = async (ids: string[]) => {
      const currentUid = auth.currentUser?.uid;
      if (!currentUid) {
          alert("Erro: Usuário não autenticado.");
          return false;
      }
      try {
          console.log(`[DEBUG] Tentando excluir ${ids.length} transações em lote.`);
          const batchPromises = ids.map(id => deleteDoc(doc(db, `users/${currentUid}/transactions`, id)));
          await Promise.all(batchPromises);
          return true;
      } catch (error: any) {
          console.error("Erro ao excluir múltiplas transações:", error.message);
          alert(`Erro ao excluir transações em lote: ${error.message}`);
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
        const data = docSnap.data();
        const list = data?.list;
        
        // Deep sanitization to ensure structure is correct even if DB is corrupted
        if (Array.isArray(list)) {
          const sanitizedList = list.map((cat: any) => ({
            ...cat,
            subcategories: Array.isArray(cat.subcategories) 
              ? cat.subcategories.map((sub: any) => ({
                  ...sub,
                  items: Array.isArray(sub.items) ? sub.items : []
                })) 
              : []
          }));
          setCategoriesState(sanitizedList);
        } else {
          setCategoriesState([]);
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
    if (!currentUid) {
        alert("Erro: Usuário não autenticado.");
        return false;
    }
    try {
        await setDoc(doc(db, `users/${currentUid}/settings/categories`), { list: newCategories });
        return true;
    } catch (error: any) {
        console.error("Erro ao salvar categorias:", error.message);
        alert(`Erro ao salvar categorias: ${error.message}`);
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
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan));
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
        alert(`Erro ao salvar empréstimo: ${error.message}`);
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
        alert(`Erro ao atualizar empréstimo: ${error.message}`);
        return false;
    }
  };

  const deleteLoan = async (id: string) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return false;
    try {
        console.log(`[DEBUG] Tentando excluir empréstimo em: users/${currentUid}/loans/${id}`);
        await deleteDoc(doc(db, `users/${currentUid}/loans`, id));
        return true;
    } catch (error: any) {
        console.error("Erro ao excluir empréstimo:", error.message);
        alert(`Erro ao excluir empréstimo: ${error.message}`);
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
        setGoalsState(docSnap.data() as AnnualGoals);
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
        alert(`Erro ao salvar metas: ${error.message}`);
        return false;
    }
  };

  return { goals, setGoals };
};
