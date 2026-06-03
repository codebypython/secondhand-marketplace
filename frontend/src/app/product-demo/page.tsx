'use client';
import React, { useState } from 'react';
import ProductGrid from '@/components/product/ProductGrid';
import ProductDetail from '@/components/product/ProductDetail';
import { MOCK_LISTINGS } from '@/lib/constants/mockListings';
import { Listing } from '@/lib/types';

export default function ProductDemoPage() {
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  return (
    <main style={{ padding: 24, background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ color: 'var(--text)', fontFamily: 'var(--font-family-sans)', marginBottom: 24 }}>
          Product Grid Demo
        </h1>

        <ProductGrid listings={MOCK_LISTINGS} onProductClick={setSelectedListing} />

        {selectedListing ? <ProductDetail listing={selectedListing} onClose={() => setSelectedListing(null)} /> : null}
      </div>
    </main>
  );
}
