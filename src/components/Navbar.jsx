import React from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import '../LandingPage.css';

const Navbar = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Determine the correct edit profile path based on user role
  // This assumes you have a way to determine the user's role (planner/vendor)
  // You might need to adjust this based on how you're storing/retrieving user role
  const getEditProfilePath = () => {
    // This is a placeholder - you'll need to implement the actual logic
    // to determine if the user is a planner or vendor
    const pathname = window.location.pathname;
    if (pathname.includes('planner')) {
      return '/edit-planner-profile';
    } else if (pathname.includes('vendor')) {
      return '/edit-vendor-profile';
    }
    // Default to planner if can't determine
    return '/edit-planner-profile';
  };

  return (
    <nav>
      <div className="logo"><span className="gradient">Event-ually Perfect</span></div>
      <div className="nav-links">
        <button 
          onClick={() => navigate(getEditProfilePath())} 
          className="nav-button"
        >
          Edit Profile
        </button>
        <button 
          onClick={handleLogout}
          className="nav-button"
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
