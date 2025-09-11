import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../client';
import '../App.css';

function LoadingPage() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Handle OAuth callback if this is a redirect from OAuth
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (!session) {
          navigate('/login');
          return;
        }

        // Check if this is a new signup by looking for the role in sessionStorage
        const signupRole = sessionStorage.getItem('signupRole');
        
        if (signupRole) {
          // If this is a new signup, redirect to post-signup flow
          navigate('/post-signup');
          return;
        }

        // For existing users, fetch their role and redirect accordingly
        const { data: userData, error: roleError } = await supabase
          .from('users')
          .select('user_role')
          .eq('user_id', session.user.id)
          .single();

        if (roleError || !userData) {
          console.error('Error fetching user role:', roleError?.message || 'No role found');
          navigate('/login');
          return;
        }

        // Redirect based on role for existing users
        if (userData.user_role === 'planner') {
          navigate('/dashboard');
        } else if (userData.user_role === 'vendor') {
          navigate('/vendor-dashboard');
        } else {
          console.error('Unknown role:', userData.user_role);
          navigate('/login');
        }
      } catch (error) {
        console.error('Error in loading page:', error.message);
        navigate('/login');
      }
    };

    handleOAuthCallback();
  }, [navigate, location]);

  return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Loading your dashboard...</p>
    </div>
  );
}

export default LoadingPage;
