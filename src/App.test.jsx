import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App.jsx';
import { describe, test, expect, vi } from 'vitest';

// --- Mocks are all correct ---
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock('firebase/analytics', () => ({
  getAnalytics: vi.fn(),
}));

vi.mock('firebase/auth', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getAuth: vi.fn(),
    onAuthStateChanged: vi.fn(),
  };
});

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
}));
// --- End of Mock Block ---

describe('App Component Routing', () => {
  test('renders the landing page for the root path', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    // --- THIS LINE IS THE ONLY CHANGE ---
    // Instead of looking for "Welcome...", we look for the unique text
    // from the hero section's paragraph, which is guaranteed to be there.
    expect(screen.getByText(/We give you all the tools needed/i)).toBeInTheDocument();
  });

  test('renders the signup page when navigating to /signup', () => {
    render(
      <MemoryRouter initialEntries={['/signup']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText(/Select your role to get started/i)).toBeInTheDocument();
  });
});

