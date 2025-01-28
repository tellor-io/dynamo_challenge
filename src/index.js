import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Global error handler
if (typeof window !== 'undefined') {
  window.onerror = function(message, source, lineno, colno, error) {
    console.log('Caught global error:', { message, source });
    return true; // Prevents the error from being shown in console
  };

  window.addEventListener('unhandledrejection', function(event) {
    console.log('Caught unhandled rejection:', event.reason);
    event.preventDefault();
  });
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.log('Error boundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }
    return this.props.children;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
); 