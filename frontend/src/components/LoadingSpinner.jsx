import React from 'react';

function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div className="spinner-container">
      <div className="spinner"></div>
      <span className="spinner-text">{text}</span>
    </div>
  );
}

export default LoadingSpinner;
