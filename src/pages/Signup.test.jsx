import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Signup from './SignUp';
import { describe, test, expect, vi, beforeEach } from 'vitest';

// --- BRINGING THE ROBUST MOCKS BACK ---
// These are required for the component to render without crashing.

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
    createUserWithEmailAndPassword: vi.fn(),
  };
});

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
}));

const mockedUsedNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
   ...vi.importActual('react-router-dom'),
  useNavigate: () => mockedUsedNavigate,
}));


// --- USING THE CORRECT TESTS FOR THE ROLE SELECTION PAGE ---

describe('Signup Role Selection Page', () => {

  beforeEach(() => {
    render(<Signup />);
  });

  test('renders the main heading and role options', () => {
    expect(screen.getByText(/Welcome to/i)).toBeInTheDocument();
    expect(screen.getByText('Event Planner')).toBeInTheDocument();
    expect(screen.getByText('Vendor')).toBeInTheDocument();
  });

  test('applies a "selected" class when a role card is clicked', async () => {
    const user = userEvent.setup();
    
    const plannerRoleCard = screen.getByText('Event Planner').closest('.role-card');
    const vendorRoleCard = screen.getByText('Vendor').closest('.role-card');

    expect(plannerRoleCard).not.toHaveClass('selected');
    expect(vendorRoleCard).not.toHaveClass('selected');

    await user.click(plannerRoleCard);

    expect(plannerRoleCard).toHaveClass('selected');
    expect(vendorRoleCard).not.toHaveClass('selected');
  });

  test('renders the "Sign Up with Google" button', () => {
    expect(screen.getByRole('button', { name: /Sign Up with Google/i })).toBeInTheDocument();
  });

});