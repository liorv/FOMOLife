import React, { useEffect } from "react";
import PropTypes from "prop-types";
import styles from "./UndoSnackBar.module.css";

export default function UndoSnackBar({
  isOpen = false,
  message = "Action completed",
  onUndo = () => {},
  onDismiss = () => {},
}) {
  // Remove snack bar when it closes
  useEffect(() => {
    if (!isOpen) return;

    // Optional: Auto-dismiss after a long time (e.g., 10 seconds)
    // But since user requires clicking an option, we won't auto-dismiss
    // Only clean up on close
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles.undoSnackBar}>
      <div className={styles.snackContent}>
        <span className={styles.snackMessage}>{message}</span>
        <div className={styles.snackActions}>
          <button className={`${styles.snackButton} ${styles.undoButton}`} onClick={onUndo}>
            Undo
          </button>
          <button className={`${styles.snackButton} ${styles.dismissButton}`} onClick={onDismiss}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

UndoSnackBar.propTypes = {
  isOpen: PropTypes.bool,
  message: PropTypes.string,
  onUndo: PropTypes.func,
  onDismiss: PropTypes.func,
};
