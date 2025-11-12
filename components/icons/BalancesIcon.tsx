import React from 'react';

const BalancesIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 12h18" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 7.5l-9 9" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5l9 9" />
  </svg>
);

export default BalancesIcon;
