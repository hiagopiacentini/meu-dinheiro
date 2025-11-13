
import React from 'react';

const ShoppingCartIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c.51 0 .962-.343 1.087-.835l1.823-6.44a1.125 1.125 0 00-.142-1.082A1.125 1.125 0 0021 5.25H5.378M7.5 14.25L5.106 5.165m0 0A2.25 2.25 0 015.378 3h13.242a2.25 2.25 0 012.248 2.032l-1.823 6.441A2.25 2.25 0 0118.982 13.5H9.75M7.5 14.25h.008v.008H7.5v-.008z" />
    </svg>
);

export default ShoppingCartIcon;
