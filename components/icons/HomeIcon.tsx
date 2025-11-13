
import React from 'react';

const HomeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a.75.75 0 011.06 0l8.955 8.955a.75.75 0 01-1.06 1.06l-1.72-1.72V21a.75.75 0 01-.75.75H5.25a.75.75 0 01-.75-.75V11.34l-1.72 1.72a.75.75 0 01-1.06-1.061z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 21V13.5A1.5 1.5 0 0013.5 12h-3A1.5 1.5 0 009 13.5V21" />
    </svg>
);

export default HomeIcon;
