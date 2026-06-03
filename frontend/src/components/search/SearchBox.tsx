import React from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import styles from './SearchBox.module.css';

export interface SearchBoxProps {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
}

export const SearchBox: React.FC<SearchBoxProps> = ({ value, onValueChange, onSubmit, placeholder = 'Search listings...' }) => {
  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
    >
      <Input
        className={styles.input}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search listings"
      />
      <Button className={styles.button} type="submit" variant="primary" size="sm">
        Search
      </Button>
    </form>
  );
};

export default SearchBox;
