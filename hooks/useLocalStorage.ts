
import { useState, useEffect, Dispatch, SetStateAction } from 'react';

const safeStringify = (obj: any) => {
  const cache = new Set();
  try {
    return JSON.stringify(obj, (key, value) => {
      if (typeof value !== 'object' || value === null) {
        return value;
      }

      if (cache.has(value)) {
        return '[Circular]';
      }
      
      // Detect circularity
      cache.add(value);

      // Robust check to only serialize plain objects and arrays.
      // This prevents issues with internal library instances (Firebase, Recharts, DOM nodes)
      // which often contain circular references and are minified with short names (Y, Ka, etc.)
      const proto = Object.getPrototypeOf(value);
      const isPlainObject = proto === Object.prototype || proto === null;
      const isArray = Array.isArray(value);

      if (!isPlainObject && !isArray) {
        return undefined; // Omit complex/class instances
      }
      
      return value;
    });
  } catch (error) {
    console.error("Error stringifying object in safeStringify:", error);
    return "[]"; 
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
      const stringified = safeStringify(storedValue);
      window.localStorage.setItem(key, stringified);
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
