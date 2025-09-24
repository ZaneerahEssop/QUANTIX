import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { supabase } from '../client';

const SearchContainer = styled.div`
  position: relative;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid #e9ecef;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.5rem 1rem;
  border: 1px solid #ffd0b3;
  border-radius: 9999px;
  font-size: 0.9rem;
  background: #fff;
  color: #5c3c2e;
  transition: all 0.2s;
  
  &:focus {
    outline: none;
    border-color: #ffb38a;
    box-shadow: 0 0 0 2px rgba(255, 179, 138, 0.3);
  }
  
  &::placeholder {
    color: #c4a99a;
  }
`;

const SearchResults = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e9ecef;
  border-top: none;
  border-radius: 0 0 8px 8px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 10;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const VendorItem = styled.div`
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #ffede1;
  }
  
  .name {
    font-weight: 600;
    color: #5c3c2e;
    margin-bottom: 2px;
  }
  
  .category {
    font-size: 0.8rem;
    color: #8c6b5e;
  }
`;

const VendorSearch = ({ onSelectVendor, selectedVendorId }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [allVendors, setAllVendors] = useState([]);

  // Fetch all vendors on component mount
  useEffect(() => {
    const fetchVendors = async () => {
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
          setAllVendors(data);
        } else {
          console.warn('Invalid vendor data format received, using empty array');
          setAllVendors([]);
        }
      } catch (error) {
        console.error('Error fetching vendors:', error);
        // Fallback to mock data in development
        if (process.env.NODE_ENV === 'development') {
          console.warn('Using mock vendor data due to API error');
          setAllVendors([
            {
              vendor_id: 1,
              business_name: 'The Venue Collective',
              service_type: 'Venue',
              description: 'Beautiful event spaces for all occasions'
            },
            {
              vendor_id: 2,
              business_name: 'Gourmet Delights',
              service_type: 'Catering',
              description: 'Delicious catering services with a variety of menu options'
            },
            {
              vendor_id: 3,
              business_name: 'Blooms & Petals',
              service_type: 'Florist',
              description: 'Beautiful floral arrangements for any event'
            },
            {
              vendor_id: 4,
              business_name: 'Melody Makers',
              service_type: 'Music',
              description: 'Live bands and DJs for all your entertainment needs'
            },
            {
              vendor_id: 5,
              business_name: 'Photo Magic',
              service_type: 'Photography',
              description: 'Professional photography services for all events'
            }
          ]);
        } else {
          setAllVendors([]);
        }
      }
    };

    fetchVendors();
  }, []);

  // Search vendors by business name or service type
  const searchVendors = useCallback(async (query) => {
    if (!query.trim()) return [];
    
    const queryLower = query.toLowerCase();
    
    return allVendors.filter(vendor => {
      const matchesName = vendor.business_name && 
                        vendor.business_name.toLowerCase().includes(queryLower);
      const matchesService = vendor.service_type && 
                          vendor.service_type.toLowerCase().includes(queryLower);
      return matchesName || matchesService;
    }).map(vendor => ({
      id: vendor.vendor_id,
      name: vendor.business_name,
      category: vendor.service_type
    }));
  }, [allVendors]);

  // Handle search input changes with debounce
  useEffect(() => {
    const search = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      
      setIsSearching(true);
      try {
        const results = await searchVendors(searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error('Error searching vendors:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };
    
    const timerId = setTimeout(search, 300);
    return () => clearTimeout(timerId);
  }, [searchQuery, searchVendors]);

  const handleVendorSelect = (vendor) => {
    setSearchQuery(vendor.name);
    setSearchResults([]);
    if (onSelectVendor) {
      onSelectVendor(vendor);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    if (onSelectVendor) {
      onSelectVendor(null);
    }
  };

  return (
    <SearchContainer>
      <div style={{ position: 'relative' }}>
        <SearchInput
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search vendors..."
        />
        {searchQuery && (
          <button 
            onClick={handleClearSearch}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: '#8c6b5e',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            ×
          </button>
        )}
      </div>
      
      {searchResults.length > 0 && (
        <SearchResults>
          {searchResults.map((vendor) => (
            <VendorItem 
              key={vendor.id} 
              onClick={() => handleVendorSelect(vendor)}
              style={{
                backgroundColor: selectedVendorId === vendor.id ? '#ffe4d6' : 'transparent'
              }}
            >
              <div className="name">{vendor.name}</div>
              <div className="category">{vendor.category}</div>
            </VendorItem>
          ))}
        </SearchResults>
      )}
      
      {isSearching && searchQuery && searchResults.length === 0 && (
        <SearchResults>
          <div style={{ padding: '1rem', color: '#8c6b5e', textAlign: 'center' }}>
            Searching vendors...
          </div>
        </SearchResults>
      )}
      
      {!isSearching && searchQuery && searchResults.length === 0 && (
        <SearchResults>
          <div style={{ padding: '1rem', color: '#8c6b5e', textAlign: 'center' }}>
            No vendors found. Try a different search term.
          </div>
        </SearchResults>
      )}
    </SearchContainer>
  );
};

export default VendorSearch;
