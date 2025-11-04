import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// Global error handler
if (typeof window !== 'undefined') {
  window.onerror = function(message, source, lineno, colno, error) {
    console.error('Global error:', {
      message,
      source,
      lineno,
      colno,
      error
    });
    return false; // Let other handlers run
  };

  window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled rejection:', {
      reason: event.reason?.toString(),
      promise: event.promise
    });
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
); 