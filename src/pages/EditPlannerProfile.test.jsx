// src/pages/__tests__/EditPlannerProfile.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditPlannerProfile from '../EditPlannerProfile';
import { vi } from 'vitest';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
}));

// Mock Firebase auth and firestore
vi.mock('../firebase', () => ({
  auth: { currentUser: { uid: 'test-uid', email: 'test@example.com' } },
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
}));

describe('EditPlannerProfile Component', () => {
  const navigateMock = vi.fn();

  beforeEach(() => {
    useNavigate.mockReturnValue(navigateMock);
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        full_name: 'Test User',
        phone: '1234567890',
        bio: 'Test bio',
        profilePic: 'http://example.com/pic.jpg',
      }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading initially and then form', async () => {
    render(<EditPlannerProfile />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();

    // Wait for form to render
    await waitFor(() => {
      expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Bio/i)).toBeInTheDocument();
    });
  });

  it('updates form inputs and submits', async () => {
    render(<EditPlannerProfile />);

    // Wait for form
    await waitFor(() => screen.getByLabelText(/Full Name/i));

    // Update inputs
    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'Updated User' },
    });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), {
      target: { value: '0987654321' },
    });
    fireEvent.change(screen.getByLabelText(/Bio/i), {
      target: { value: 'Updated bio' },
    });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalledWith(expect.anything(), {
        full_name: 'Updated User',
        phone: '0987654321',
        bio: 'Updated bio',
        profilePic: 'http://example.com/pic.jpg',
      });
      expect(navigateMock).toHaveBeenCalledWith('/planner-dashboard');
    });
  });

  it('navigates back when cancel button clicked', async () => {
    render(<EditPlannerProfile />);
    await waitFor(() => screen.getByRole('button', { name: /Cancel/i }));

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(navigateMock).toHaveBeenCalledWith('/planner-dashboard');
  });

  it('handles profile picture change', async () => {
    render(<EditPlannerProfile />);
    await waitFor(() => screen.getByLabelText(/Full Name/i));

    const file = new File(['dummy content'], 'profile.png', { type: 'image/png' });
    const input = screen.getByLabelText(/Full Name/i).closest('form').querySelector('input[type="file"]');

    fireEvent.change(input, { target: { files: [file] } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        profilePic: expect.stringContaining('blob:'),
      }));
    });
  });
});
