
import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { deepClean } from './useFirestore';

/**
 * Serializa um objeto para JSON de forma segura, removendo referências circulares
 * e limpando objetos complexos do SDK utilizando a lógica centralizada de deepClean.
 */
const safeStringify = (obj: any): string => {
  try {
    const cleaned = deepClean(obj);
    return JSON.stringify(cleaned);
  } catch (error) {
    console.error("Falha crítica ao serializar objeto para localStorage:", error);
    return "null"; 
  }
};

export function useLocalStorage<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error("Erro ao ler do localStorage:", error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      const stringified = safeStringify(storedValue);
      window.localStorage.setItem(key, stringified);
    } catch (error) {
      console.error("Erro ao salvar no localStorage:", error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
