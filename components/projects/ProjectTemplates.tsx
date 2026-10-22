import React, { useEffect, useRef, useState } from 'react';
import type { ProjectItem } from '@myorg/types';
import { ModalOverlay } from '@myorg/ui';
import styles from './ProjectTemplates.module.css';

export type TemplateAction =
  | { kind: 'create' }
  | { kind: 'use' | 'convert' | 'restore'; project: ProjectItem };

export function TemplateLibrary({
  templates,
  onEdit,
  onUse,
}: {
  templates: ProjectItem[];
  onEdit: (id: string) => void;
  onUse?: ((project: ProjectItem) => void) | undefined;
}) {
  return (
    <section className={styles.library} aria-label="Project templates">
      <div className={styles.hero}>
        <span className={`material-icons ${styles.heroIcon}`} aria-hidden="true">auto_awesome</span>
        <div>
          <h2>A head start for your next project</h2>
          <p>Build a workflow once. Make it yours every time.</p>
        </div>
      </div>
      {templates.length === 0 ? (
        <div className={styles.empty}>
          <span className="material-icons" aria-hidden="true">dashboard_customize</span>
          <h3>Your best workflows belong here</h3>
          <p>Create a blank template, or open a project and choose Convert to template.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {templates.map(template => {
            const tasks = template.subprojects.reduce((count, subproject) => count + subproject.tasks.length, 0);
            const sections = template.subprojects.filter(subproject => !subproject.isProjectLevel).length;
            return (
              <article key={template.id} className={styles.card} style={{ '--template-color': template.color } as React.CSSProperties}>
                <div className={styles.cardTop}>
                  <span className={`material-icons ${styles.cardIcon}`} aria-hidden="true">dashboard_customize</span>
                  <span className={styles.badge}>Template</span>
                </div>
                <h3>{template.text}</h3>
                <p className={styles.description}>{template.description || template.goal || 'A reusable starting point for your next project.'}</p>
                <div className={styles.meta}>
                  <span>{sections} {sections === 1 ? 'subproject' : 'subprojects'}</span>
                  <span>{tasks} {tasks === 1 ? 'task' : 'tasks'}</span>
                </div>
                <div className={styles.cardActions}>
                  <button type="button" className={styles.textButton} onClick={() => onEdit(template.id)} aria-label={`Edit template ${template.text}`}>
                    <span className="material-icons" aria-hidden="true">edit</span>Edit
                  </button>
                  {onUse && <button type="button" className={styles.primaryButton} onClick={() => onUse(template)} aria-label={`Use template ${template.text}`}>
                    Use template<span className="material-icons" aria-hidden="true">arrow_forward</span>
                  </button>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function TemplateDialog({
  action,
  onClose,
  onConfirm,
}: {
  action: TemplateAction;
  onClose: () => void;
  onConfirm: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(action.kind === 'use' ? action.project.text : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const submitting = useRef(false);
  const needsName = action.kind === 'create' || action.kind === 'use';
  const title = {
    create: 'Create a template',
    use: 'Create project from template',
    convert: 'Convert to template?',
    restore: 'Convert to project?',
  }[action.kind];
  const confirmLabel = {
    create: 'Create template',
    use: 'Create project',
    convert: 'Convert to template',
    restore: 'Convert to project',
  }[action.kind];

  useEffect(() => {
    const previousFocus = document.activeElement;
    const content = contentRef.current;
    content?.setAttribute('aria-labelledby', 'template-dialog-title');
    content?.querySelector<HTMLElement>('input, button')?.focus();
    return () => {
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  return (
    <ModalOverlay open onClose={() => { if (!submitting.current) onClose(); }} className={styles.overlay} contentRef={contentRef} contentClassName={styles.dialog}>
      <form
        onKeyDown={event => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            if (!submitting.current) onClose();
          }
          if (event.key === 'Tab') {
            const focusable = contentRef.current?.querySelectorAll<HTMLElement>('input:not(:disabled), button:not(:disabled)');
            const first = focusable?.[0];
            const last = focusable?.[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }
        }}
        onSubmit={async event => {
          event.preventDefault();
          if (submitting.current || (needsName && !name.trim())) return;
          submitting.current = true;
          setBusy(true);
          setError(null);
          try {
            await onConfirm(name.trim());
            onClose();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to save template changes. Please try again.');
          } finally {
            submitting.current = false;
            setBusy(false);
          }
        }}
        aria-busy={busy}
      >
        <span className={`material-icons ${styles.dialogIcon}`} aria-hidden="true">{action.kind === 'use' ? 'auto_awesome' : 'dashboard_customize'}</span>
        <h2 id="template-dialog-title">{title}</h2>
        <p className={styles.dialogDescription}>
          {action.kind === 'create' && 'Start with a blank canvas. Add subprojects and tasks, then reuse your workflow whenever you need it.'}
          {action.kind === 'use' && <>Based on <strong>{action.project.text}</strong>. Tasks start incomplete, without old dates or assignments. The template stays unchanged.</>}
          {action.kind === 'convert' && <><strong>{action.project.text}</strong> will move to Templates and leave active work and reminders. Its content and members are kept. You can convert it back anytime.</>}
          {action.kind === 'restore' && <><strong>{action.project.text}</strong> will become an active project with its existing content, dates, and assignments. To keep the template, use it to create a new project instead.</>}
        </p>
        {needsName && (
          <label className={styles.field}>
            {action.kind === 'create' ? 'Template name' : 'Project name'}
            <input value={name} onChange={event => setName(event.target.value)} required disabled={busy} placeholder={action.kind === 'create' ? 'e.g. Product launch' : 'Name your project'} />
          </label>
        )}
        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className={styles.dialogActions}>
          <button type="button" className={styles.textButton} disabled={busy} onClick={onClose}>Cancel</button>
          <button type="submit" className={styles.primaryButton} disabled={busy || (needsName && !name.trim())}>{busy ? 'Saving...' : confirmLabel}</button>
        </div>
      </form>
    </ModalOverlay>
  );
}
