import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Landing from '../pages/Landing';

//to silence the console warnings: 
beforeAll(() => jest.spyOn(console, 'warn').mockImplementation(() => {}));
afterAll(() => console.warn.mockRestore());

//Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock CSS import
jest.mock('../LandingPage.css', () => ({}));

describe('Landing Page', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  test('renders headings and buttons', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );

    const eventTitles = screen.getAllByText(/Event-ually Perfect/i);     // Use getAllByText for elements that appear multiple times
    expect(eventTitles.length).toBeGreaterThan(0);
    
    expect(screen.getByRole('button', { name: /Sign Up/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Login/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Get Started/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Let's Create Together/i })).toBeInTheDocument();
  });

  test('navigates correctly when buttons are clicked', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );


    const signUpButtons = screen.getAllByRole('button', { name: /Sign Up/i });
    fireEvent.click(signUpButtons[0]); // Click the first Sign Up button
    expect(mockNavigate).toHaveBeenCalledWith('/signup');

    fireEvent.click(screen.getByRole('button', { name: /Get Started/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/signup');

    fireEvent.click(screen.getByRole('button', { name: /Let's Create Together/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/signup');

    const loginButtons = screen.getAllByRole('button', { name: /Login/i });
    fireEvent.click(loginButtons[0]); // Click Login button
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});