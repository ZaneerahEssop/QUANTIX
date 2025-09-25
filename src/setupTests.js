import '@testing-library/jest-dom';
import React from 'react';

process.env.REACT_APP_SUPABASE_URL = 'https://fake.supabase.url';
process.env.REACT_APP_SUPABASE_ANON_KEY = 'fake-anon-key';

// Set up JSDOM environment if it doesn't exist
if (typeof document === 'undefined') {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost/'
  });
  
  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;
  global.HTMLElement = dom.window.HTMLElement;
  
  // Copy all properties from window to global
  Object.keys(dom.window).forEach((property) => {
    if (typeof global[property] === 'undefined') {
      global[property] = dom.window[property];
    }
  });
}

// Mock document.visibilityState for Supabase
Object.defineProperty(document, 'visibilityState', {
  value: 'visible',
  writable: true,
  configurable: true
});

// Mock Supabase client
jest.mock('./client', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: "test-user-id" } }, 
        error: null,
      }),  
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      })),
      signOut: jest.fn(),
      signInWithOAuth: jest.fn().mockResolvedValue({ data: {}, error: null }),
    
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { user_id: "test-user-id" }, error: null }),
      //then: jest.fn(cb => cb({ data: [], error: null })),
    })),
  },
}));



// Mock react-icons
jest.mock('react-icons/fa', () => ({
  FaPlus: () => <div>FaPlus</div>,
  FaTrash: () => <div>FaTrash</div>,
  FaCheck: () => <div>FaCheck</div>,
  FaUser: () => <div>FaUser</div>,
}));

// Mock react-calendar
jest.mock('react-calendar', () => {
  return function MockCalendar() {
    return <div data-testid="mock-calendar">Calendar</div>;
  };
});

// Add event listener mocks
beforeEach(() => {
  // Ensure document exists
  if (typeof document !== 'undefined') {
    document.addEventListener = jest.fn();
    document.removeEventListener = jest.fn();
  }
});

// Clean up after tests
afterEach(() => {
  jest.clearAllMocks();
});

