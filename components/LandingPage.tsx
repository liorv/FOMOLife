'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './LandingPage.module.css';

export default function LandingPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Image
          src="/assets/logo_fomo.png"
          alt="FOMO Life logo"
          width={64}
          height={64}
          priority
          className={styles.logo}
        />
        <span className={styles.logoText}>FOMO Life</span>
        <Link href="/login" className={styles.signInBtn}>
          Sign in
        </Link>
      </header>

      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>
          Never Miss a Beat
        </h1>
        <p className={styles.heroSubtitle}>
          Your free, community-built productivity hub for tasks, projects, and collaboration.
        </p>
        <Link href="/login" className={styles.ctaBtn}>
          Get Started
        </Link>
      </section>

      <section className={styles.features}>
        <div className={styles.featureCard}>
          <span className={styles.featureIcon} aria-hidden="true">💀</span>
          <h2 className={styles.featureTitle}>Tasks</h2>
          <p className={styles.featureDesc}>
            Capture and organize everything you need to do.
          </p>
        </div>

        <div className={styles.featureCard}>
          <span className={styles.featureIcon} aria-hidden="true">🔥</span>
          <h2 className={styles.featureTitle}>Projects</h2>
          <p className={styles.featureDesc}>
            Break goals into manageable projects with AI help.
          </p>
        </div>

        <div className={styles.featureCard}>
          <span className={styles.featureIcon} aria-hidden="true">⚡</span>
          <h2 className={styles.featureTitle}>People</h2>
          <p className={styles.featureDesc}>
            Connect with collaborators and track progress.
          </p>
        </div>

        <div className={styles.featureCard}>
          <span className={styles.featureIcon} aria-hidden="true">🖥️</span>
          <h2 className={styles.featureTitle}>AI</h2>
          <p className={styles.featureDesc}>
            Smart assistance for planning and productivity.
          </p>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>
          Free forever ·{' '}
          <Link href="/privacy" className={styles.footerLink}>Privacy</Link>
          {' · '}
          <Link href="/terms" className={styles.footerLink}>Terms</Link>
        </p>
      </footer>
    </main>
  );
}
