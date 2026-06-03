import React from 'react';
import styles from './Input.module.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, helperText, icon, id, className = '', ...rest }) => {
  const generatedId = React.useId();
  const resolvedId = id ?? generatedId;
  const inputClassName = [styles.input, error ? styles.inputError : '', icon ? styles.withIcon : '', className].filter(Boolean).join(' ');

  return (
    <label className={styles.field} htmlFor={resolvedId}>
      {label ? <span className={styles.label}>{label}</span> : null}
      <div className={styles.inputWrap}>
        {icon ? <span className={styles.icon}>{icon}</span> : null}
        <input id={resolvedId} className={inputClassName} aria-invalid={Boolean(error)} {...rest} />
      </div>
      {error ? <span className={styles.error}>{error}</span> : helperText ? <span className={styles.help}>{helperText}</span> : null}
    </label>
  );
};

export default Input;

