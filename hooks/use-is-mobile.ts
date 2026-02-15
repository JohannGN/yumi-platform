'use client';

import { useState, useEffect } from 'react';
import { isMobileDevice } from '@/config/tokens';

export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    setMobile(isMobileDevice());

    const handleResize = () => setMobile(isMobileDevice());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return mobile;
}
