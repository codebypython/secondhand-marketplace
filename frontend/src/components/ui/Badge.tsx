import React from 'react';
import styles from './Badge.module.css';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', className = '', children, ...rest }) => {
  const cls = [styles.badge, styles[variant], className].filter(Boolean).join(' ');
  return <span className={cls} {...rest}>{children}</span>;
};

export default Badge;
