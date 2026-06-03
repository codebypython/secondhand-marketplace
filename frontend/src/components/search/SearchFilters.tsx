import React from 'react';
import { ItemCondition, ListingStatus } from '@/lib/types';
import styles from './SearchFilters.module.css';

export interface SearchFilterValue {
  status: ListingStatus | 'ALL';
  condition: ItemCondition | 'ALL';
  maxPrice: string;
}

export interface SearchFiltersProps {
  value: SearchFilterValue;
  onChange: (next: SearchFilterValue) => void;
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({ value, onChange }) => {
  return (
    <div className={styles.wrapper}>
      <select
        className={styles.select}
        value={value.status}
        onChange={(e) => onChange({ ...value, status: e.target.value as SearchFilterValue['status'] })}
      >
        <option value="ALL">All Status</option>
        <option value="AVAILABLE">Available</option>
        <option value="RESERVED">Reserved</option>
        <option value="SOLD">Sold</option>
      </select>

      <select
        className={styles.select}
        value={value.condition}
        onChange={(e) => onChange({ ...value, condition: e.target.value as SearchFilterValue['condition'] })}
      >
        <option value="ALL">All Conditions</option>
        <option value="NEW">New</option>
        <option value="LIKE_NEW">Like New</option>
        <option value="USED">Used</option>
        <option value="DAMAGED">Damaged</option>
      </select>

      <input
        className={styles.input}
        type="number"
        min="0"
        placeholder="Max price (VND)"
        value={value.maxPrice}
        onChange={(e) => onChange({ ...value, maxPrice: e.target.value })}
      />
    </div>
  );
};

export default SearchFilters;
