'use client';

import styles from '../styles/components/Banner.module.css';

type Props = {
  icon: string;
  children: React.ReactNode;
};

export default function Banner({ icon, children }: Props) {
  return (
    <div className={styles.banner}>
      <span className={`material-icons ${styles.bannerIcon}`} aria-hidden="true">{icon}</span>
      {children}
    </div>
  );
}