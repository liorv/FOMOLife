'use client';

import styles from '../styles/components/EmptyState.module.css';

type Props = {
  type: 'no-contacts' | 'no-search-results';
};

export default function EmptyState({ type }: Props) {
  if (type === 'no-search-results') {
    return (
      <div className={styles.empty}>
        <span className={`material-icons ${styles.emptyIcon}`} aria-hidden="true">search_off</span>
        <p>No contacts match your search.</p>
        <p className={styles.emptySub}>Try a different search term.</p>
      </div>
    );
  }

  return (
    <div className={styles.empty}>
      <span className={`material-icons ${styles.emptyIcon}`} aria-hidden="true">people_outline</span>
      <p>No contacts yet.</p>
      <p className={styles.emptySub}>Use the add button to create a new contact.</p>
    </div>
  );
}