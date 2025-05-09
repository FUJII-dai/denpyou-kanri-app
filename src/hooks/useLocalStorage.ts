import { useState, useEffect } from 'react';

/**
 * A hook for persisting state in localStorage with proper error handling
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: {
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
    onError?: (error: Error) => void;
  }
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  const serialize = options?.serialize || JSON.stringify;
  const deserialize = options?.deserialize || JSON.parse;
  const onError = options?.onError || console.error;

  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      
      return item ? deserialize(item) : initialValue;
    } catch (error) {
      onError(error instanceof Error ? error : new Error(String(error)));
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      
      setStoredValue(valueToStore);
      
      window.localStorage.setItem(key, serialize(valueToStore));
    } catch (error) {
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  };

  const removeItem = () => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  };

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(deserialize(e.newValue));
        } catch (error) {
          onError(error instanceof Error ? error : new Error(String(error)));
        }
      } else if (e.key === key && e.newValue === null) {
        setStoredValue(initialValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, initialValue, deserialize, onError]);

  return [storedValue, setValue, removeItem];
}
