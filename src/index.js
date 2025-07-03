import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Wait for DOM to be ready
function initApp() {
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    console.error('Root element not found! Looking for element with id="root"');
    document.body.innerHTML = '<div style="color: red; padding: 20px;">Error: Root element not found. Please check the HTML.</div>';
    return;
  }

  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error('Error rendering app:', error);
    rootElement.innerHTML = '<div style="color: red; padding: 20px;">Error rendering app: ' + error.message + '</div>';
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}