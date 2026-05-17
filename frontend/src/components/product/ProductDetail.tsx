import React from 'react';
import { Listing } from '@/lib/types';
import Button from '@/components/ui/Button';
import styles from './ProductDetail.module.css';

export interface ProductDetailProps {
  listing: Listing;
  onClose?: () => void;
}

export const ProductDetail: React.FC<ProductDetailProps> = ({ listing, onClose }) => {
  return (
    <section className={styles.panel} aria-live="polite">
      <h2 className={styles.title}>Selected Item Details</h2>
      <div className={styles.meta}>
        <p><strong>Title:</strong> {listing.title}</p>
        <p><strong>Price:</strong> ₫{parseFloat(listing.price).toLocaleString('vi-VN')}</p>
        <p><strong>Condition:</strong> {listing.condition}</p>
        <p><strong>Status:</strong> {listing.status}</p>
        {listing.brand ? <p><strong>Brand:</strong> {listing.brand}</p> : null}
      </div>
      {listing.description ? <p className={styles.description}>{listing.description}</p> : null}
      <div className={styles.actions}>
        {onClose ? <Button variant="primary" size="sm" onClick={onClose}>Close</Button> : null}
      </div>
    </section>
  );
};

export default ProductDetail;
