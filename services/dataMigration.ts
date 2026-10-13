import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  writeBatch,
  query,
  limit
} from 'firebase/firestore';
import { db, defaultDb } from './firebase';
import { 
  sampleAccounts, 
  sampleTransactions, 
  sampleCategories, 
  sampleLoans, 
  sampleGoals, 
  sampleCDBs 
} from '../data/demoData';
import { deepClean } from '../hooks/useFirestore';

/**
 * Carrega a base completa de dados de demonstração (contas, lançamentos, CDBs, metas e categorias)
 * diretamente no Firestore do usuário autenticado.
 */
export async function seedUserData(userId: string): Promise<boolean> {
  if (!userId) return false;

  try {
    // 1. Salvar Categorias
    await setDoc(doc(db, `users/${userId}/settings/categories`), {
      list: deepClean(sampleCategories)
    });

    // 2. Salvar Metas Anuais
    await setDoc(doc(db, `users/${userId}/settings/goals`), deepClean(sampleGoals));

    // 3. Salvar Contas (em batch)
    const accountsBatch = writeBatch(db);
    sampleAccounts.forEach((acc, index) => {
      const accRef = doc(db, `users/${userId}/accounts`, acc.id);
      accountsBatch.set(accRef, deepClean({ ...acc, order: index }));
    });
    await accountsBatch.commit();

    // 4. Salvar CDBs (em batch)
    if (sampleCDBs && sampleCDBs.length > 0) {
      const cdbBatch = writeBatch(db);
      sampleCDBs.forEach(cdb => {
        const cdbRef = doc(db, `users/${userId}/cdb_contracts`, cdb.id);
        cdbBatch.set(cdbRef, deepClean(cdb));
      });
      await cdbBatch.commit();
    }

    // 5. Salvar Transações (em batches de até 400 por segurança)
    const chunkSize = 400;
    for (let i = 0; i < sampleTransactions.length; i += chunkSize) {
      const chunk = sampleTransactions.slice(i, i + chunkSize);
      const tBatch = writeBatch(db);
      chunk.forEach(t => {
        const tRef = doc(db, `users/${userId}/transactions`, t.id);
        tBatch.set(tRef, deepClean({ ...t, createdAt: new Date().toISOString() }));
      });
      await tBatch.commit();
    }

    // 6. Salvar Empréstimos (se houver)
    if (sampleLoans && sampleLoans.length > 0) {
      const loansBatch = writeBatch(db);
      sampleLoans.forEach(loan => {
        const loanRef = doc(db, `users/${userId}/loans`, loan.id);
        loansBatch.set(loanRef, deepClean(loan));
      });
      await loansBatch.commit();
    }

    return true;
  } catch (error) {
    console.error("Erro ao popular dados de exemplo para o usuário:", error);
    return false;
  }
}

/**
 * Verifica se a base do usuário está vazia e tenta migrar de:
 * 1) defaultDb (caso tenha gravado no banco default antes da configuração nomeada)
 * 2) localStorage (caso tenha dados salvos localmente no navegador)
 */
export async function checkAndAutoMigrate(userId: string): Promise<{
  hasData: boolean;
  migratedFrom?: 'defaultDb' | 'localStorage';
}> {
  if (!userId) return { hasData: false };

  try {
    // 1. Verifica se já existem contas no banco atual
    const currentAccountsSnap = await getDocs(query(collection(db, `users/${userId}/accounts`), limit(1)));
    if (!currentAccountsSnap.empty) {
      return { hasData: true };
    }

    // 2. Se o banco atual está vazio, tenta verificar se há dados no defaultDb (se diferente)
    if (defaultDb !== db) {
      try {
        const defaultAccountsSnap = await getDocs(collection(defaultDb, `users/${userId}/accounts`));
        if (!defaultAccountsSnap.empty) {
          console.log(`Migrando dados do defaultDb para o banco atual para o usuário ${userId}...`);
          
          // Migrar contas
          const accBatch = writeBatch(db);
          defaultAccountsSnap.docs.forEach(docSnap => {
            accBatch.set(doc(db, `users/${userId}/accounts`, docSnap.id), docSnap.data());
          });
          await accBatch.commit();

          // Migrar transações
          const defaultTransSnap = await getDocs(collection(defaultDb, `users/${userId}/transactions`));
          if (!defaultTransSnap.empty) {
            const tBatch = writeBatch(db);
            defaultTransSnap.docs.forEach(docSnap => {
              tBatch.set(doc(db, `users/${userId}/transactions`, docSnap.id), docSnap.data());
            });
            await tBatch.commit();
          }

          // Migrar CDBs
          const defaultCdbsSnap = await getDocs(collection(defaultDb, `users/${userId}/cdb_contracts`));
          if (!defaultCdbsSnap.empty) {
            const cBatch = writeBatch(db);
            defaultCdbsSnap.docs.forEach(docSnap => {
              cBatch.set(doc(db, `users/${userId}/cdb_contracts`, docSnap.id), docSnap.data());
            });
            await cBatch.commit();
          }

          // Migrar Empréstimos
          const defaultLoansSnap = await getDocs(collection(defaultDb, `users/${userId}/loans`));
          if (!defaultLoansSnap.empty) {
            const lBatch = writeBatch(db);
            defaultLoansSnap.docs.forEach(docSnap => {
              lBatch.set(doc(db, `users/${userId}/loans`, docSnap.id), docSnap.data());
            });
            await lBatch.commit();
          }

          // Migrar Configurações (categorias, metas, etc.)
          const defaultSettingsSnap = await getDocs(collection(defaultDb, `users/${userId}/settings`));
          if (!defaultSettingsSnap.empty) {
            const sBatch = writeBatch(db);
            defaultSettingsSnap.docs.forEach(docSnap => {
              sBatch.set(doc(db, `users/${userId}/settings`, docSnap.id), docSnap.data());
            });
            await sBatch.commit();
          }

          return { hasData: true, migratedFrom: 'defaultDb' };
        }
      } catch (errDefault) {
        console.warn("Nenhum dado encontrado no defaultDb ou sem permissão:", errDefault);
      }
    }

    // 3. Tenta migrar do localStorage (se houver contas locais salvas)
    const localAccountsStr = localStorage.getItem('accounts');
    if (localAccountsStr) {
      try {
        const localAccounts = JSON.parse(localAccountsStr);
        if (Array.isArray(localAccounts) && localAccounts.length > 0) {
          console.log("Migrando dados do localStorage para o Firestore...");
          const accBatch = writeBatch(db);
          localAccounts.forEach((acc: any, index: number) => {
            const docId = acc.id || `acc-${Date.now()}-${index}`;
            accBatch.set(doc(db, `users/${userId}/accounts`, docId), deepClean({ ...acc, order: index }));
          });
          await accBatch.commit();

          // Transações do localStorage
          const localTransStr = localStorage.getItem('transactions');
          if (localTransStr) {
            const localTrans = JSON.parse(localTransStr);
            if (Array.isArray(localTrans) && localTrans.length > 0) {
              const tBatch = writeBatch(db);
              localTrans.forEach((t: any, index: number) => {
                const docId = t.id || `t-${Date.now()}-${index}`;
                tBatch.set(doc(db, `users/${userId}/transactions`, docId), deepClean(t));
              });
              await tBatch.commit();
            }
          }

          // Metas do localStorage
          const localGoalsStr = localStorage.getItem('goals');
          if (localGoalsStr) {
            const localGoals = JSON.parse(localGoalsStr);
            await setDoc(doc(db, `users/${userId}/settings/goals`), deepClean(localGoals));
          }

          return { hasData: true, migratedFrom: 'localStorage' };
        }
      } catch (errLocal) {
        console.warn("Erro ao migrar dados do localStorage:", errLocal);
      }
    }

    return { hasData: false };
  } catch (error) {
    console.error("Erro ao verificar/migrar dados:", error);
    return { hasData: false };
  }
}
