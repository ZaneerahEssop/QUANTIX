import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../client';
import { FaSearch, FaTimes } from 'react-icons/fa';
import '../LandingPage.css';

const Navbar = ({ session }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if current route is the planner dashboard
  const isPlannerDashboard = location.pathname === '/dashboard';

  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [vendors, setVendors] = useState([]);
  const [filteredVendors, setFilteredVendors] = useState([]);
  const searchRef = useRef(null);

  // Fetch all vendors on component mount
  useEffect(() => {
    // Mock vendors data as fallback
    const mockVendors = [
      {
        vendor_id: 1,
        business_name: 'The Venue Collective',
        service_type: 'Venue',
        description: 'Beautiful event spaces for all occasions',
        contact_number: '(555) 123-4567',
        email: 'info@venuecollective.com'
      },
      {
        vendor_id: 2,
        business_name: 'Gourmet Delights',
        service_type: 'Catering',
        description: 'Delicious catering services with a variety of menu options',
        contact_number: '(555) 987-6543',
        email: 'info@gourmetdelights.com'
      },
      {
        vendor_id: 3,
        business_name: 'Blooms & Petals',
        service_type: 'Florist',
        description: 'Beautiful floral arrangements for any event',
        contact_number: '(555) 456-7890',
        email: 'info@bloomsandpetals.com'
      },
      {
        vendor_id: 4,
        business_name: 'Melody Makers',
        service_type: 'Music',
        description: 'Live bands and DJs for all your entertainment needs',
        contact_number: '(555) 234-5678',
        email: 'info@melodymakers.com'
      }
    ];

    const fetchVendors = async () => {
      console.log('Fetching vendors...');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Use the same API URL as PlannerDashboard
        const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          ? 'http://localhost:5000'
          : 'https://quantix-production.up.railway.app';

        const response = await fetch(`${API_URL}/api/vendors`, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch vendors: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        if (Array.isArray(data)) {
          console.log('Vendors fetched:', data);
          setVendors(data);
          setFilteredVendors(data);
        } else {
          throw new Error('Invalid vendor data format received');
        }
      } catch (error) {
        console.error('Error fetching vendors:', error);
        // Fallback to mock data in development
        if (process.env.NODE_ENV === 'development') {
          console.warn('Using mock vendor data due to API error');
          setVendors(mockVendors);
          setFilteredVendors(mockVendors);
        }
      }
    };

    fetchVendors();
  }, []); // Empty dependency array since we're not using any external values

  // Debounced search effect
  useEffect(() => {
    const searchTimeout = setTimeout(() => {
      if (!searchTerm || searchTerm.trim() === '') {
        setFilteredVendors(vendors);
        return;
      }

      const searchTermLower = searchTerm.toLowerCase();
      const filtered = vendors.filter(vendor => {
        const matchesName = vendor.business_name && 
                          vendor.business_name.toLowerCase().includes(searchTermLower);
        const matchesService = vendor.service_type && 
                            vendor.service_type.toLowerCase().includes(searchTermLower);
        return matchesName || matchesService;
      });
      
      setFilteredVendors(filtered);
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchTerm, vendors]);

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearch(false);
        setSearchTerm('');
        setFilteredVendors([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (!showSearch) {
      setSearchTerm('');
      setFilteredVendors([]);
    }
  };

  const handleVendorSelect = (vendor) => {
    console.log('Vendor selected:', vendor);
    navigate(`/vendor/${vendor.vendor_id}`);
    setShowSearch(false);
    setSearchTerm('');
    setFilteredVendors(vendors);
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error.message);
    }
  };

  // Determine the correct edit profile path based on the current dashboard
  const getEditProfilePath = () => {
    if (!session?.user) return '/login';
    
    // Check if we're on the vendor dashboard or planner dashboard
    const isVendorDashboard = location.pathname.startsWith('/vendor-dashboard');
    const isPlannerDashboard = location.pathname.startsWith('/dashboard');
    
    // If we're on a specific dashboard, use that to determine the profile type
    if (isVendorDashboard) return '/edit-vendor-profile';
    if (isPlannerDashboard) return '/edit-planner-profile';
    
    // Fallback to user role if not on a specific dashboard
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
      zIndex: 1001,
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
        alignItems: 'center',
        position: 'relative'
      }}>
        {isPlannerDashboard && (
          <div ref={searchRef} style={{ position: 'relative' }}>
          {showSearch ? (
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search vendors..."
                  autoFocus
                  style={{
                    padding: '0.75rem 2.5rem 0.75rem 1rem',
                    borderRadius: '50px',
                    border: '2px solid #e2e8f0',
                    width: '250px',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    paddingRight: '2.5rem',
                    ':focus': {
                      borderColor: 'var(--peach)',
                      boxShadow: '0 0 0 2px rgba(255, 111, 97, 0.2)'
                    }
                  }}
                />
                {!searchTerm ? (
                  <FaSearch 
                    style={{
                      position: 'absolute',
                      right: '40px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#94a3b8',
                      fontSize: '1rem',
                      pointerEvents: 'none'
                    }}
                  />
                ) : null}
              </div>
              <FaTimes 
                onClick={toggleSearch}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  ':hover': {
                    color: '#64748b'
                  }
                }}
              />
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                right: 0,
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                border: '1px solid #e2e8f0',
                maxHeight: '300px',
                overflowY: 'auto',
                zIndex: 1100,
                padding: '4px 0',
                display: searchTerm ? 'block' : 'none'
              }}>
                {filteredVendors.length > 0 ? (
                  filteredVendors.map(vendor => (
                    <div 
                      key={vendor.vendor_id}
                      onClick={() => handleVendorSelect(vendor)}
                      style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                        ':hover': {
                          backgroundColor: '#f8fafc'
                        },
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}
                    >
                      <div style={{ 
                        fontWeight: '600',
                        color: '#1e293b',
                        fontSize: '0.95rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        {vendor.business_name || 'Unnamed Vendor'}
                        <span style={{
                          fontSize: '0.75rem',
                          backgroundColor: '#e2e8f0',
                          color: '#475569',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: '500'
                        }}>
                          {vendor.service_type || 'Vendor'}
                        </span>
                      </div>
                      {vendor.email && (
                        <div style={{ 
                          fontSize: '0.8rem', 
                          color: '#64748b',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {vendor.email}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={{ 
                    padding: '16px', 
                    color: '#64748b',
                    textAlign: 'center',
                    fontStyle: 'italic'
                  }}>
                    {searchTerm ? 'No vendors found' : 'Start typing to search vendors'}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={toggleSearch}
              style={{
                backgroundColor: 'var(--peach)',
                color: 'white',
                border: 'none',
                padding: '0.75rem',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                ':hover': {
                  backgroundColor: 'var(--coral)',
                  transform: 'scale(1.05)'
                }
              }}
              title="Search Vendors"
            >
              <FaSearch />
            </button>
          )}
        </div>
        )}
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
            {location.pathname.startsWith('/vendor-dashboard') && session?.user?.user_metadata?.role === 'vendor' && (
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
