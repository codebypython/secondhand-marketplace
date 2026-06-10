import React from 'react';
import { Listing } from '@/lib/types';
import Badge from '@/components/ui/Badge';
import styles from './ProductCard.module.css';

const conditionLabels: Record<string, string> = {
  NEW: "Mới",
  LIKE_NEW: "Như mới",
  USED: "Đã dùng",
  DAMAGED: "Hỏng / Trầy xước",
};

const statusLabels: Record<string, string> = {
  AVAILABLE: "Đang bán",
  RESERVED: "Đã đặt trước",
  SOLD: "Đã bán",
  HIDDEN: "Đã ẩn",
};

const statusVariants: Record<string, any> = {
  AVAILABLE: 'default',
  RESERVED: 'warning',
  SOLD: 'danger',
  HIDDEN: 'default',
};

export interface ProductCardProps {
  listing: Listing;
  onClick?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ listing, onClick }) => {
  const firstImage = listing.image_urls?.[0] || '/placeholder.jpg';
  const ownerName = listing.owner?.profile?.display_name || listing.owner?.email || 'Unknown';
  const ownerInitial = ownerName.charAt(0).toUpperCase();

  return (
    <div className={styles.card} onClick={onClick} role="article">
      <div className={styles.imageWrap}>
        <img
          src={firstImage}
          alt={listing.title}
          className={styles.image}
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect fill=%22%23333%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%22 y=%2250%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-size=%2212%22%3ENo Image%3C/text%3E%3C/svg%3E';
          }}
        />
        <div className={styles.badges}>
          <Badge variant={statusVariants[listing.status] || 'default'}>
            {statusLabels[listing.status] || listing.status}
          </Badge>
        </div>
      </div>

      <div className={styles.content}>
        <h3 className={styles.title}>{listing.title}</h3>

        <div className={styles.meta}>
          <span className={styles.condition}>{conditionLabels[listing.condition] || listing.condition}</span>
          {listing.brand && <span>• {listing.brand}</span>}
        </div>

        <div className={styles.price}>₫{parseFloat(listing.price).toLocaleString('vi-VN')}</div>

        <div className={styles.owner}>
          <div className={styles.ownerAvatar}>{ownerInitial}</div>
          <span>{ownerName}</span>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
