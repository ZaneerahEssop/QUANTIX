export const supabase = {
  auth: {
    getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    signOut: jest.fn(),
    signInWithOAuth: jest.fn().mockResolvedValue({ data: {}, error: null }),
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: "test-user-id" } }, 
      error: null,
    }),
    updateUser: jest.fn().mockResolvedValue({ data: { user: { id: "test-user-id" }}, error: null }),
  },
  from: jest.fn(() => {
    const builder = {
      select: jest.fn(() => builder),
      insert: jest.fn(() => Promise.resolve({ error: null })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null })), 
      })),
      delete: jest.fn(() => builder),
      eq: jest.fn(() => builder),
      order: jest.fn(() => builder),
      single: jest.fn(() => Promise.resolve({ data: { user_id: "test-user-id" }, error: null })),
    };
    return builder;
  }),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(() => Promise.resolve({ error: null })),
      getPublicUrl: jest.fn(() => ({ data: { publicUrl: "http://mockurl.com/pic.png" } })),
    })),
  },
};
