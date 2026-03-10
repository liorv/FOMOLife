'use client';

import styles from '../styles/components/SearchBar.module.css';

type Props = {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  isEmbedded: boolean;
};

export default function SearchBar({ searchTerm, onSearchChange, isEmbedded }: Props) {
  if (isEmbedded) return null;

  return (
    <div className={styles.searchContainer}>
      <span className={`material-icons ${styles.searchIcon}`}>search</span>
      <input
        type="text"
        placeholder="Search contacts"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className={styles.searchInput}
      />
    </div>
  );
}