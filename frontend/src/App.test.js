import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import App from './App';

// Mock console warnings
beforeAll(() => jest.spyOn(console, 'warn').mockImplementation(() => {}));
afterAll(() => console.warn.mockRestore());

// Mock pages
jest.mock('./pages/Landing', () => () => <div>Landing Page</div>);
jest.mock('./pages/LoginPage', () => () => <div>Login Page</div>);
jest.mock('./pages/SignUpPage', () => () => <div>SignUp Page</div>);
jest.mock('./pages/PlannerDashboard', () => () => <div>Planner Dashboard</div>);
jest.mock('./pages/VendorDashboard', () => () => <div>Vendor Dashboard</div>);
jest.mock('./pages/EditVendorProfile', () => () => <div>Edit Vendor Profile</div>);
jest.mock('./pages/EditPlannerProfile', () => () => <div>Edit Planner Profile</div>);
jest.mock('./pages/LoadingPage', () => () => <div>Loading Page</div>);
jest.mock('./pages/PlannerForm', () => () => <div>Planner Form</div>);
jest.mock('./pages/VendorForm', () => () => <div>Vendor Form</div>);
jest.mock('./pages/PostSignupRedirect', () => () => <div>Post Signup Redirect</div>);
jest.mock('./pages/AddEventForm', () => () => <div>Add Event Form</div>);
jest.mock('./pages/EventDetails', () => () => <div>Event Details</div>);
jest.mock('./pages/VendorServices', () => () => <div>Vendor Services</div>);
jest.mock('./pages/AdminDashboard', () => () => <div>Admin Dashboard</div>);
jest.mock('./pages/PendingApproval', () => () => <div>Pending Approval</div>);

// Mock Supabase
jest.mock('./client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      }))
    }
  }
}));

import { supabase } from './client';

describe('App Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock getSession to return no session by default
    supabase.auth.getSession.mockResolvedValue({
      data: { session: null }
    });

    // Set test environment
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    // Reset process.env
    delete process.env.NODE_ENV;
  });

  test('renders Landing page by default', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Landing Page/i)).toBeInTheDocument();
    });
  });

  test('renders Login page when navigating to /login', async () => {
    window.history.pushState({}, 'Login Page', '/login');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Login Page/i)).toBeInTheDocument();
    });
  });

  test('renders SignUp page when navigating to /signup', async () => {
    window.history.pushState({}, 'SignUp Page', '/signup');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/SignUp Page/i)).toBeInTheDocument();
    });
  });

  test('renders Loading page when navigating to /loading', async () => {
    window.history.pushState({}, 'Loading Page', '/loading');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Loading Page/i)).toBeInTheDocument();
    });
  });

  test('renders PlannerForm when navigating to /planner-form', async () => {
    window.history.pushState({}, 'Planner Form', '/planner-form');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Planner Form/i)).toBeInTheDocument();
    });
  });

  test('renders VendorForm when navigating to /vendor-form', async () => {
    window.history.pushState({}, 'Vendor Form', '/vendor-form');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Vendor Form/i)).toBeInTheDocument();
    });
  });

  test('renders PostSignupRedirect when navigating to /post-signup', async () => {
    window.history.pushState({}, 'Post Signup Redirect', '/post-signup');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Post Signup Redirect/i)).toBeInTheDocument();
    });
  });

});