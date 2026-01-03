
import { useState, useEffect, Dispatch, SetStateAction } from 'react';

/**
 * Serializa um objeto para JSON de forma segura, removendo referências circulares.
 * Se encontrar um ciclo, substitui o valor por "[Circular]".
 */
const safeStringify = (obj: any): string => {
  const cache = new WeakSet();
  try {
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (cache.has(value)) {
          return '[Circular]';
        }
        cache.add(value);
      }
      return value;
    });
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
