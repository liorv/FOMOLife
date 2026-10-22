import React, { useEffect, useId, useRef, useState } from "react";
import styles from "./ProjectActionMenu.module.css";

interface ProjectActionMenuProps {
  label: string;
  icon: string;
  children: React.ReactNode;
}

export default function ProjectActionMenu({
  label,
  icon,
  children,
}: ProjectActionMenuProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const updateAvailableHeight = () => {
      const panel = panelRef.current;
      if (!panel) return;
      panel.style.setProperty(
        "--project-menu-available-height",
        `${Math.max(0, window.innerHeight - panel.getBoundingClientRect().top - 16)}px`,
      );
    };
    updateAvailableHeight();
    const onPointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", updateAvailableHeight);
    window.addEventListener("scroll", updateAvailableHeight, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", updateAvailableHeight);
      window.removeEventListener("scroll", updateAvailableHeight, true);
    };
  }, [open]);

  return (
    <div
      className={styles.container}
      ref={containerRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        className={styles.trigger}
        ref={triggerRef}
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
      >
        <span className="material-icons" aria-hidden="true">
          {icon}
        </span>
        <span>{label === "View options" ? "View" : "More"}</span>
      </button>
      {open && (
        <div
          id={panelId}
          role="group"
          aria-label={label}
          className={styles.panel}
          ref={panelRef}
          onClick={(event) => {
            const button =
              event.target instanceof Element
                ? event.target.closest("button")
                : null;
            if (button && !button.hasAttribute("data-keep-open")) {
              setOpen(false);
              triggerRef.current?.focus();
            }
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
