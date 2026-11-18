import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

class ErrorBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <div className="fatal-error"><h1>Something went wrong</h1><p>Reload the app to try again. Your saved inventory remains in this browser.</p><button className="button primary" onClick={() => window.location.reload()}>Reload application</button></div> : this.props.children;
  }
}

createRoot(document.getElementById('root')).render(<ErrorBoundary><App /></ErrorBoundary>);
