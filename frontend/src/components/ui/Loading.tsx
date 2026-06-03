import React from 'react';
import styles from './Loading.module.css';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
}

export function Spinner({ size = 20, className = '', style, ...rest }: SpinnerProps) {
  return <div className={[styles.spinner, className].filter(Boolean).join(' ')} style={{ width: size, height: size, ...style }} aria-label="Loading" role="status" {...rest} />;
}

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ width = '100%', height = 16, className = '', style, ...rest }: SkeletonProps) {
  return <div className={[styles.skeleton, className].filter(Boolean).join(' ')} style={{ width, height, ...style }} aria-hidden="true" {...rest} />;
}

export default Spinner;
