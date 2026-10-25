import styles from './ProjectPlan.module.css';

export default function CompletedTaskIcon() {
  return <svg className={styles.completed} viewBox="0 0 16 16" role="img" aria-label="Completed task">
    <path d="m3 8 3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}
