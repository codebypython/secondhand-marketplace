import React from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', size = 'md', className = '', disabled = false, children, ...rest }) => {
  const cls = [styles.btn, styles[variant], styles[size], disabled ? styles.disabled : '', className].filter(Boolean).join(' ');
  return (
    <button className={cls} disabled={disabled} {...rest}>
      {children}
    </button>
  );
};

export default Button;
