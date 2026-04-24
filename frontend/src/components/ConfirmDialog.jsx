import React from 'react';

function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) onCancel();
    }}>
      <div className="modal-content" style={{ maxWidth: '420px' }}>
        <div className="confirm-dialog">
          <div className="confirm-icon">&#9888;</div>
          <h3>{title || 'Confirm Delete'}</h3>
          <p>{message || 'Are you sure you want to delete this item? This action cannot be undone.'}</p>
          <div className="btn-group">
            <button className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button className="btn btn-danger" onClick={onConfirm}>
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
