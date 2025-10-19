import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

// --- FIX: Create a persistent mock for the query chain ---
// Renamed to start with "mock" to avoid hoisting issues with jest.mock()
const mockQueryChain = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
};

// Mock Supabase to use the persistent query mock
jest.mock('./client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      }))
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { user_role: 'planner' }, error: null }),
    })),
  }
}));

import { supabase } from './client';

// Helper function to render the App with MemoryRouter
const renderWithRouter = (initialRoute = '/') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <App />
    </MemoryRouter>
  );
};

describe('App Component', () => {
  beforeEach(() => {
    // Clear mocks but not their implementations
    jest.clearAllMocks();

    // Default mocks for each test
    supabase.auth.getSession.mockResolvedValue({
      data: { session: null }
    });
    mockQueryChain.single.mockResolvedValue({ data: null, error: null });
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
  });

  // --- Public Routes Tests ---
  test('renders Landing page by default', async () => {
    renderWithRouter('/');
    await waitFor(() => {
      expect(screen.getByText(/Landing Page/i)).toBeInTheDocument();
    });
  });

  test('renders Login page when navigating to /login', async () => {
    renderWithRouter('/login');
    await waitFor(() => {
      expect(screen.getByText(/Login Page/i)).toBeInTheDocument();
    });
  });

  test('renders SignUp page when navigating to /signup', async () => {
    renderWithRouter('/signup');
    await waitFor(() => {
      expect(screen.getByText(/SignUp Page/i)).toBeInTheDocument();
    });
  });

  // --- Special Routes Tests ---
  test('renders Loading page when navigating to /loading', async () => {
    renderWithRouter('/loading');
    await waitFor(() => {
      expect(screen.getByText(/Loading Page/i)).toBeInTheDocument();
    });
  });

  test('renders PlannerForm when navigating to /planner-form', async () => {
    renderWithRouter('/planner-form');
    await waitFor(() => {
      expect(screen.getByText(/Planner Form/i)).toBeInTheDocument();
    });
  });

  test('renders VendorForm when navigating to /vendor-form', async () => {
    renderWithRouter('/vendor-form');
    await waitFor(() => {
      expect(screen.getByText(/Vendor Form/i)).toBeInTheDocument();
    });
  });

  test('renders PostSignupRedirect when navigating to /post-signup', async () => {
    renderWithRouter('/post-signup');
    await waitFor(() => {
      expect(screen.getByText(/Post Signup Redirect/i)).toBeInTheDocument();
    });
  });

  // --- Protected Routes Tests ---
  describe('Protected Routes', () => {
    test('redirects to /login from /dashboard when not authenticated', async () => {
      renderWithRouter('/dashboard');
      await waitFor(() => {
        expect(screen.getByText(/Login Page/i)).toBeInTheDocument();
      });
    });

    test('renders PlannerDashboard when authenticated', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: '123' } } }
      });
      // --- FIX: Configure the mock for this specific test case ---
      mockQueryChain.single.mockResolvedValue({
        data: { user_role: 'planner' },
        error: null
      });
      renderWithRouter('/dashboard');
      await waitFor(() => {
        expect(screen.getByText(/Planner Dashboard/i)).toBeInTheDocument();
      });
    });

    test('renders EventDetails when authenticated', async () => {
        supabase.auth.getSession.mockResolvedValue({
          data: { session: { user: { id: '123' } } }
        });
        // --- FIX: Configure the mock for this specific test case ---
        mockQueryChain.single.mockResolvedValue({
          data: { user_role: 'planner' },
          error: null
        });
        renderWithRouter('/viewEvent/some-event-id');
        await waitFor(() => {
          expect(screen.getByText(/Event Details/i)).toBeInTheDocument();
        });
      });
  });
});

