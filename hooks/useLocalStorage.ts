import { useState, useEffect, Dispatch, SetStateAction } from 'react';

/**
 * Serializa um objeto para JSON de forma segura, tratando referências circulares
 * e omitindo instâncias de classes complexas que podem causar erros de recursão.
 */
const safeStringify = (obj: any) => {
  const cache = new WeakSet();
  try {
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        // Detecta circularidade real
        if (cache.has(value)) {
          return '[Circular]';
        }
        cache.add(value);

        // Verifica se é um objeto plano ou array.
        // Instâncias de classes (como as do Firebase) costumam ter protótipos customizados.
        const proto = Object.getPrototypeOf(value);
        const isPlain = proto === Object.prototype || proto === null || Array.isArray(value);

        if (!isPlain) {
          // Se o objeto tem toJSON, usamos. Senão, omitimos para evitar erros.
          if (typeof value.toJSON === 'function') return value.toJSON();
          return undefined; 
        }
      }
      return value;
    });
  } catch (error) {
    console.error("Falha crítica ao serializar objeto:", error);
    return "[]"; 
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