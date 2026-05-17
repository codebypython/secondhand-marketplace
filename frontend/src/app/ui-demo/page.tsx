import React from 'react';
import UIDemo from '@/components/ui/demo';

export const metadata = { title: 'UI Demo' };

export default function Page() {
  return (
    <main style={{ minHeight: '100vh', padding: 40 }}>
      <UIDemo />
    </main>
  );
}
