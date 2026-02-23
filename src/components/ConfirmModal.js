import React from "react";
import PropTypes from "prop-types";

export default function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="confirm-modal-overlay">
      <div className="confirm-modal" role="dialog" aria-modal="true">
        <span className="material-icons warning-icon" aria-hidden="true">
          warning
        </span>
        <div className="confirm-message">{message}</div>
        <div className="confirm-buttons">
          <button className="confirm-btn" onClick={onConfirm}>
            Delete
          </button>
          <button className="cancel-btn" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

ConfirmModal.propTypes = {
  message: PropTypes.string.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};
