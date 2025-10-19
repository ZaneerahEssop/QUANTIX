import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

beforeAll(() => jest.spyOn(console, 'warn').mockImplementation(() => {}));
afterAll(() => jest.restoreAllMocks());

jest.mock('./pages/Landing', () => () => <div>Landing Page</div>);
jest.mock('./pages/LoginPage', () => () => <div>Login Page</div>);
jest.mock('./pages/SignUpPage', () => () => <div>Sign Up Page</div>);
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

jest.mock('./client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      })),
    },
    from: jest.fn(),
  }
}));

import { supabase } from './client';

const renderWithRouter = (initialRoute = '/') =>
  render(<MemoryRouter initialEntries={[initialRoute]}><App /></MemoryRouter>);


beforeAll(() => {
  delete window.location;
  window.location = { replace: jest.fn() };
});

beforeEach(() => {
  jest.clearAllMocks();
  supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
  supabase.from.mockReturnValue({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  });
});

//  Public Routes
test('renders Landing page by default', async () => {
  renderWithRouter('/');
  await waitFor(() => expect(screen.getByText(/Landing Page/i)).toBeInTheDocument());
});

test('renders Login page when navigating to /login', async () => {
  renderWithRouter('/login');
  await waitFor(() => expect(screen.getByText(/Login Page/i)).toBeInTheDocument());
});

test('renders SignUp page when navigating to /signup', async () => {
  renderWithRouter('/signup');
  await waitFor(() => expect(screen.getByText(/Sign Up Page/i)).toBeInTheDocument());
});

// special rputes
test('renders Loading page when navigating to /loading', async () => {
  renderWithRouter('/loading');
  await waitFor(() => expect(screen.getByText(/Loading Page/i)).toBeInTheDocument());
});

test('renders PlannerForm when navigating to /planner-form', async () => {
  renderWithRouter('/planner-form');
  await waitFor(() => expect(screen.getByText(/Planner Form/i)).toBeInTheDocument());
});

test('renders VendorForm when navigating to /vendor-form', async () => {
  renderWithRouter('/vendor-form');
  await waitFor(() => expect(screen.getByText(/Vendor Form/i)).toBeInTheDocument());
});

test('renders PostSignupRedirect when navigating to /post-signup', async () => {
  renderWithRouter('/post-signup');
  await waitFor(() => expect(screen.getByText(/Post Signup Redirect/i)).toBeInTheDocument());
});

//protected routes
const protectedRoutes = [
  ['/dashboard', 'Planner Dashboard'],
  ['/vendor-dashboard', 'Vendor Dashboard'],
  ['/admin-dashboard', 'Admin Dashboard'],
  ['/edit-vendor-profile', 'Edit Vendor Profile'],
  ['/edit-planner-profile', 'Edit Planner Profile'],
  ['/add-event', 'Add Event Form'],
  ['/vendor/services', 'Vendor Services'],
  ['/vendors/123/services', 'Vendor Services'],
  ['/pending-approval', 'Pending Approval'],
  ['/viewEvent/xyz', 'Event Details'],
];

protectedRoutes.forEach(([route, text]) => {
  test(`renders ${text} when authenticated`, async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: '123' } } },
    });
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { user_role: 'planner' }, error: null }),
    });

    renderWithRouter(route);
    await waitFor(() => expect(screen.getByText(new RegExp(text, 'i'))).toBeInTheDocument());
  });
});

// Redirect to /login if not authenticated
test('redirects to /login from /dashboard when not authenticated', async () => {
  renderWithRouter('/dashboard');
  await waitFor(() => expect(screen.getByText(/Login Page/i)).toBeInTheDocument());
});

//role-based redirects
test('redirects to planner dashboard when role is planner', async () => {
    window.location.pathname = '/';
  supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: '123' } } } });
  supabase.from.mockReturnValue({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: { user_role: 'planner' }, error: null }),
  });

  renderWithRouter('/');
  await waitFor(() => expect(window.location.replace).toHaveBeenCalledWith('/dashboard'));
});

test('redirects to vendor dashboard when role is vendor', async () => {
    window.location.pathname = '/';
  supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: '123' } } } });
  supabase.from.mockReturnValue({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: { user_role: 'vendor' }, error: null }),
  });

  renderWithRouter('/');
  await waitFor(() => expect(window.location.replace).toHaveBeenCalledWith('/vendor-dashboard'));
});

test('warns and redirects to login when role is unknown', async () => {
  const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: '123' } } } });
  supabase.from.mockReturnValue({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: { user_role: 'unknown' }, error: null }),
  });

  renderWithRouter('/');
  await waitFor(() => {
    expect(consoleSpy).toHaveBeenCalledWith('Unknown user role:', 'unknown');
    expect(window.location.replace).toHaveBeenCalledWith('/login');
  });

  consoleSpy.mockRestore();
});
