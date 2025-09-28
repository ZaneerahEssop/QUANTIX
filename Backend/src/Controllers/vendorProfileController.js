const supabase = require('../Config/supabase');

/**
 * Fetches a single vendor profile by querying both the 'vendors'
 * and 'vendor_services' tables and combining the results.
 */
const getVendorProfile = async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  try {
    // 1. Fetch the main profile data from the 'vendors' table
    const { data: vendorProfile, error: profileError } = await supabase
      .from('vendors')
      .select('*')
      .eq('vendor_id', userId)
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Vendor profile not found.' });
      }
      throw profileError; // Throw other errors to be caught below
    }

    // 2. Fetch all service types for that vendor from the 'vendor_services' table
    const { data: vendorServices, error: servicesError } = await supabase
      .from('vendor_services')
      .select('service_type')
      .eq('vendor_id', userId);

    if (servicesError) {
      throw servicesError; // Throw if fetching services fails
    }

    // 3. Combine the data into the format the frontend expects.
    // The frontend expects a comma-separated string for 'service_type'.
    const serviceTypes = vendorServices.map(service => service.service_type);
    
    const combinedData = {
      ...vendorProfile,
      // Create the comma-separated string from the array of services
      service_type: serviceTypes.join(','), 
    };
    
    // Send the combined data back to the client
    res.status(200).json(combinedData);

  } catch (err) {
    console.error('Error fetching vendor profile:', err.message);
    res.status(500).json({ error: 'Failed to retrieve vendor profile.' });
  }
};

module.exports = {
  getVendorProfile,
};