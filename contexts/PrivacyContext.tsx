
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface PrivacyContextType {
  isPrivacyMode: boolean;
  togglePrivacy: () => void;
}

const PrivacyContext = createContext<PrivacyContextType>({
  isPrivacyMode: false,
  togglePrivacy: () => {},
});

export const PrivacyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Default to false or load from localStorage if persistence is desired
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);

  const togglePrivacy = () => {
    setIsPrivacyMode(prev => !prev);
  };

  return (
    <PrivacyContext.Provider value={{ isPrivacyMode, togglePrivacy }}>
      {children}
    </PrivacyContext.Provider>
  );
};

export const usePrivacy = () => useContext(PrivacyContext);
