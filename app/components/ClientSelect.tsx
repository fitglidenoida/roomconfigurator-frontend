'use client';

import dynamic from 'next/dynamic';

// Dynamically import react-select with SSR disabled
const ReactSelect = dynamic(() => import('react-select'), { ssr: false });

export default ReactSelect;
