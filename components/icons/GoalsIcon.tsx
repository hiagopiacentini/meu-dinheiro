
import React from 'react';

const GoalsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172V9.406c0-1.609.276-3.286 1.09-4.8.274-.51.928-.797 1.493-.655l2.422.607c.563.141.97.63.97 1.212v4.88c0 .541-.355.975-.826 1.125l-3.213.978zm-8.232 0a7.454 7.454 0 00.982-3.172V9.406c0-1.609-.276-3.286-1.09-4.8-.274-.51-.928-.797-1.493-.655L3.633 4.558c-.563.141-.97.63-.97 1.212v4.88c0 .541.355.975.826 1.125l3.213.978zM12 14.25a3 3 0 100-6 3 3 0 000 6z" />
  </svg>
);

export default GoalsIcon;
