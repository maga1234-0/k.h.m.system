
'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function ForecastingPage() {
  useEffect(() => {
    redirect('/');
  }, []);

  return null;
}
