'use client';

import React, { useMemo, useState } from 'react';
import ProductGrid from '@/components/product/ProductGrid';
import SearchBox from '@/components/search/SearchBox';
import SearchFilters, { SearchFilterValue } from '@/components/search/SearchFilters';
import { MOCK_LISTINGS } from '@/lib/constants/mockListings';

const initialFilters: SearchFilterValue = {
  status: 'ALL',
  condition: 'ALL',
  maxPrice: '',
};

export default function SearchDemoPage() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilterValue>(initialFilters);

  const filteredListings = useMemo(() => {
    return MOCK_LISTINGS.filter((listing) => {
      const matchesQuery = !query.trim()
        || listing.title.toLowerCase().includes(query.toLowerCase())
        || (listing.description ?? '').toLowerCase().includes(query.toLowerCase())
        || (listing.brand ?? '').toLowerCase().includes(query.toLowerCase());

      const matchesStatus = filters.status === 'ALL' || listing.status === filters.status;
      const matchesCondition = filters.condition === 'ALL' || listing.condition === filters.condition;
      const matchesPrice = !filters.maxPrice || Number(listing.price) <= Number(filters.maxPrice);

      return matchesQuery && matchesStatus && matchesCondition && matchesPrice;
    });
  }, [query, filters]);

  return (
    <main style={{ padding: 24, background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gap: 16 }}>
        <h1 style={{ color: 'var(--text)' }}>Search & Filter Demo</h1>

        <SearchBox value={query} onValueChange={setQuery} />
        <SearchFilters value={filters} onChange={setFilters} />

        <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
          Found {filteredListings.length} result(s)
        </p>

        <ProductGrid listings={filteredListings} />
      </div>
    </main>
  );
}
