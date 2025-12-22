
import { useState, useEffect, Dispatch, SetStateAction } from 'react';

// Robust stringify to avoid crashes from circular references and non-serializable objects
const safeStringify = (obj: any) => {
  const cache = new Set();
  try {
    return JSON.stringify(obj, (key, value) => {
      // 1. Handle non-object values early
      if (typeof value !== 'object' || value === null) {
        return value;
      }

      // 2. Prevent circular references
      if (cache.has(value)) {
        return '[Circular]';
      }
      cache.add(value);

      // 3. Block problematic types and minified library internal structures
      // 'Y' and 'Ka' are known minified names in Recharts/D3/Firebase that cause issues
      const ctorName = value.constructor?.name;
      if (
          value instanceof Node || 
          value instanceof Window ||
          value instanceof Event ||
          ctorName === 'Y' || 
          ctorName === 'Ka' ||
          ctorName === 'e' || 
          (value && 'nodeType' in value)
      ) {
          return undefined;
      }
      
      return value;
    });
  } catch (error) {
    console.error("Error stringifying object in safeStringify:", error);
    return JSON.stringify({ error: "Unserializable data" }); // Fallback
  } finally {
      cache.clear();
  }
};

export function useLocalStorage<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error("Error reading from localStorage:", error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      // Use safeStringify to prevent crashes if storedValue contains circular references
      const stringified = safeStringify(storedValue);
      window.localStorage.setItem(key, stringified);
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
