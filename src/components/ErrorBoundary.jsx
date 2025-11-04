import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #034443 0%, #068987 50%, #07b3b0 75%, #0ad3d0 100%)',
          color: '#fff',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '2rem',
            borderRadius: '10px',
            maxWidth: '600px'
          }}>
            <h1 style={{ marginBottom: '1rem' }}>Oops! Something went wrong</h1>
            <p style={{ marginBottom: '1rem' }}>
              Please try refreshing the page. If the problem persists, make sure you're using a modern browser with HTTPS enabled.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#fff',
                color: '#068987',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '1rem'
              }}
            >
              Refresh Page
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={{ marginTop: '2rem', textAlign: 'left' }}>
                <summary style={{ cursor: 'pointer', marginBottom: '1rem' }}>Error Details</summary>
                <pre style={{
                  background: 'rgba(0,0,0,0.3)',
                  padding: '1rem',
                  borderRadius: '5px',
                  overflow: 'auto',
                  fontSize: '0.85rem'
                }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

