import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock the Firebase config globals
beforeEach(() => {
  global.__firebase_config = {};
  global.__initial_auth_token = '';
  global.__app_id = 'test-app';
});

test('renders login view by default', () => {
  render(<App />);
  const welcomeText = screen.getByText(/Welcome to Event-ually Perfect/i);
  expect(welcomeText).toBeInTheDocument();
  
  const loginButton = screen.getByText(/Login with Google/i);
  expect(loginButton).toBeInTheDocument();
});
