
import React from 'react';

const TicketIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-1.5h5.25m-5.25 0h3m-3 0h.008v.008H7.5V16.5zm.375 0a1.5 1.5 0 01-3 0V6a1.5 1.5 0 013 0v10.5zm0 0a1.5 1.5 0 003 0V6a1.5 1.5 0 00-3 0v10.5z" />
    </svg>
);

export default TicketIcon;
