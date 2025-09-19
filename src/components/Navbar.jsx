import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../client';
import '../LandingPage.css';

const Navbar = ({ session }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error.message);
    }
  };

  // Determine the correct edit profile path based on user role
  const getEditProfilePath = () => {
    if (!session?.user) return '/login';
    
    // Check user role from session or user_metadata
    const userRole = session.user.user_metadata?.role || 'planner';
    
    return userRole === 'vendor' 
      ? '/edit-vendor-profile' 
      : '/edit-planner-profile';
  };

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1.25rem 3rem',
      backgroundColor: 'white',
      boxShadow: '0 2px 15px rgba(0,0,0,0.1)',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      height: '80px',
      boxSizing: 'border-box'
    }}>
      <div 
        className="logo" 
        style={{
          fontSize: '1.75rem',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
        onClick={() => navigate('/')}
      >
        <span className="gradient">Event-ually Perfect</span>
      </div>
      
      <div className="nav-links" style={{
        display: 'flex',
        gap: '1rem',
        alignItems: 'center'
      }}>
        {session?.user && (
          <>
            <button 
              onClick={() => navigate(getEditProfilePath())}
              style={{
                backgroundColor: 'var(--peach)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '50px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '1rem',
                transition: 'all 0.2s',
                ':hover': {
                  backgroundColor: 'var(--coral)',
                  transform: 'translateY(-2px)'
                }
              }}
            >
              Edit Profile
            </button>
            {session?.user?.user_metadata?.role === 'vendor' && (
              <button 
                onClick={() => navigate('/vendor/services')}
                style={{
                  backgroundColor: 'var(--peach)',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '50px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '1rem',
                  transition: 'all 0.2s',
                  ':hover': {
                    backgroundColor: 'var(--coral)',
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                My Services
              </button>
            )}
            <button 
              onClick={handleLogout}
              style={{
                backgroundColor: 'var(--peach)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '50px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '1rem',
                transition: 'all 0.2s',
                ':hover': {
                  backgroundColor: 'var(--coral)',
                  transform: 'translateY(-2px)'
                }
              }}
            >
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
