'use client';

import React from 'react';
import styles from './ProjectPlan.module.css';
import type { PlanSaveState } from './usePlanLinks';

export default function PlanSaveStatus({ state, onDismiss }: { state: PlanSaveState; onDismiss: () => void }) {
  return <>
    {state.status === 'error' && <div role="alert" className={`${styles.saveStatus} ${styles.saveError}`}>
      <span className="material-icons" aria-hidden="true">error_outline</span>
      <span>{state.message}</span>
      <button type="button" aria-label="Dismiss save error" onClick={onDismiss}>
        <span className="material-icons" aria-hidden="true">close</span>
      </button>
    </div>}
    <p role="status" className={state.status === 'idle' || state.status === 'error' ? styles.status : styles.saveStatus}>
      {state.status === 'saving' && <><span className={`material-icons ${styles.saveSpinner}`} aria-hidden="true">sync</span>Saving…</>}
      {state.status === 'saved' && <><span className="material-icons" aria-hidden="true">cloud_done</span>{state.message}</>}
    </p>
  </>;
}
