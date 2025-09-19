import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

//to silence the console warnings: 
beforeAll(() => jest.spyOn(console, 'warn').mockImplementation(() => {}));
afterAll(() => console.warn.mockRestore());

//mocking pages so they render quickly
jest.mock('./pages/Landing', () => () => <div>Landing Page</div>);
jest.mock('./pages/LoginPage', () => () => <div>Login Page</div>);
jest.mock('./pages/SignUpPage', () => () => <div>SignUp Page</div>);
jest.mock('./pages/PlannerDashboard', () => () => <div>Planner Dashboard</div>);
jest.mock('./pages/VendorDashboard', () => () => <div>Vendor Dashboard</div>);
jest.mock('./pages/EditVendorProfile', () => () => <div>Edit Vendor Profile</div>);
jest.mock('./pages/EditPlannerProfile', () => () => <div>Edit Planner Profile</div>);
jest.mock('./pages/LoadingPage', () => () => <div>Loading Page</div>);



describe('App Component', () => {
  test('renders without crashing', async () => {
    render(   
        <App />  
    );

    await waitFor(() => {
      expect(screen.getByText(/Landing Page/i)).toBeInTheDocument();
    });
  });
});
