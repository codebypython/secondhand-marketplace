import React from 'react';
import { Listing } from '@/lib/types';
import ProductCard from './ProductCard';
import styles from './ProductGrid.module.css';
import { Skeleton } from '@/components/ui/Loading';

export interface ProductGridProps {
  listings: Listing[];
  loading?: boolean;
  onProductClick?: (listing: Listing) => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({ listings, loading = false, onProductClick }) => {
  if (loading) {
    return (
      <div className={styles.grid}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={`skeleton-${index}`} width="100%" height={300} />
        ))}
      </div>
    );
  }

  if (!listings.length) {
    return <p style={{ color: 'var(--text-muted)' }}>No listings found.</p>;
  }

  return (
    <div className={styles.grid}>
      {listings.map((listing) => (
        <ProductCard
          key={listing.id}
          listing={listing}
          onClick={() => onProductClick?.(listing)}
        />
      ))}
    </div>
  );
};

export default ProductGrid;
