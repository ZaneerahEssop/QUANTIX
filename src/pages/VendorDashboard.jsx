// import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../client';

export default function VendorDashboard() {
  const navigate = useNavigate();

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error.message);
    } else {
      navigate('/login');
    }
  }

  return (
    <div className="profile-container" style={{ maxWidth: '800px', margin: '2rem auto', padding: '2rem', background: 'white', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', textAlign: 'center' }}>
      <h1>Vendor Dashboard</h1>
      <button className="submit-btn" style={{ margin: '1.5rem 0', minWidth: '140px' }} onClick={handleSignOut}>Sign Out</button>
      {/* Add your dashboard content here */}
      <p>Welcome to your vendor dashboard!</p>
    </div>
  );
}
