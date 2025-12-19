
import { useState, useEffect, Dispatch, SetStateAction } from 'react';

// Robust stringify to avoid crashes from circular references and non-serializable objects
const safeStringify = (obj: any) => {
  const cache = new Set();
  try {
    return JSON.stringify(obj, (key, value) => {
      // Ignore DOM elements and potential circular emitters like 'src' in native objects or library internal structures
      if (
          value instanceof Node || 
          (value && typeof value === 'object' && 'nodeType' in value) ||
          value instanceof Window ||
          value instanceof Event ||
          (value && typeof value === 'object' && value.constructor && value.constructor.name === 'Y') // Specific fix for constructors named 'Y' in error
      ) {
          return undefined;
      }
      
      if (typeof value === 'object' && value !== null) {
        if (cache.has(value)) {
          // Circular reference found, discard key
          return '[Circular]';
        }
        // Store value in our collection
        cache.add(value);
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
