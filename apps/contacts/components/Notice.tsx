'use client';

import styles from '../styles/components/Notice.module.css';

type Props = {
  type: 'info' | 'error' | 'loading';
  children: React.ReactNode;
};

export default function Notice({ type, children }: Props) {
  const className = type === 'error' ? styles.error : styles.notice;
  return <div className={className}>{children}</div>;
}