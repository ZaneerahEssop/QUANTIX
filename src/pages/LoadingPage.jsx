import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../client';
import '../App.css';

function LoadingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate('/login');
          return;
        }

        // Fetch user role
        const { data, error } = await supabase
          .from('users')
          .select('user_role')
          .eq('user_id', session.user.id)
          .single();

        if (error || !data) {
          console.error('Error fetching user role:', error?.message || 'No role found');
          navigate('/login');
          return;
        }

        // Redirect based on role
        if (data.user_role === 'planner') {
          navigate('/dashboard');
        } else if (data.user_role === 'vendor') {
          navigate('/vendor-dashboard');
        } else {
          console.error('Unknown role:', data.role);
          navigate('/login');
        }
      } catch (error) {
        console.error('Error in loading page:', error.message);
        navigate('/login');
      }
    };

    checkUserAndRedirect();
  }, [navigate]);

  return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Loading your dashboard...</p>
    </div>
  );
}

export default LoadingPage;
