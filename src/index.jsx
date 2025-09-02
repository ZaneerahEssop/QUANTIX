import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

// This is the standard entry point for a React application.
// It finds the 'root' div in your public/index.html file.
const root = ReactDOM.createRoot(document.getElementById('root'));

// By wrapping <App /> in <BrowserRouter>, we provide routing to the entire app.
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
