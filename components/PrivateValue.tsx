
import React from 'react';
import { usePrivacy } from '../contexts/PrivacyContext';

interface PrivateValueProps {
  children: React.ReactNode;
  blurIntensity?: 'sm' | 'md' | 'lg';
  className?: string;
}

const PrivateValue: React.FC<PrivateValueProps> = ({ children, blurIntensity = 'md', className = '' }) => {
  const { isPrivacyMode } = usePrivacy();

  if (!isPrivacyMode) {
    return <span className={className}>{children}</span>;
  }

  // When privacy mode is on, we apply a blur filter and prevent text selection
  return (
    <span 
      className={`select-none transition-all duration-300 filter ${isPrivacyMode ? `blur-${blurIntensity}` : ''} ${className}`}
      style={isPrivacyMode ? { textShadow: '0 0 8px rgba(0,0,0,0.5)', color: 'transparent' } : {}}
    >
      {children}
    </span>
  );
};

export default PrivateValue;
