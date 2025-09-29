const supabase = require('../Config/supabase');
const archiver = require('archiver');
const { stringify } = require('csv-stringify');

exports.exportEventData = async (req, res) => {
    try {
        const { eventId } = req.params;

        // Fetch guests data
        const { data: guests, error: guestsError } = await supabase
            .from('guests')
            .select('*')
            .eq('event_id', eventId);
        if (guestsError) throw guestsError;

        // --- START: MODIFIED VENDOR FETCHING LOGIC ---
        
        // 1. Get IDs of accepted vendors from the 'vendor_requests' table
        // This query now filters by both the event and the 'accepted' status.
        const { data: acceptedRequests, error: requestsError } = await supabase
            .from('vendor_requests')         // Using the specified table
            .select('vendor_id')             // IMPORTANT: Assumes this column links to the 'vendors' table
            .eq('event_id', eventId)         // Filter by the correct event
            .eq('status', 'accepted');       // AND only include requests with 'accepted' status
        
        if (requestsError) throw requestsError;

        // Create an array of just the vendor IDs from the accepted requests
        const vendorIds = acceptedRequests.map(request => request.vendor_id);

        let vendors = []; // Default to an empty array
        // 2. Fetch the full vendor details using the collected IDs
        if (vendorIds.length > 0) {
            const { data: vendorData, error: vendorsError } = await supabase
                .from('vendors')
                .select('*')
                .in('vendor_id', vendorIds); // Use .in() to get all vendors matching the IDs
            
            if (vendorsError) throw vendorsError;
            vendors = vendorData;
        }
        // --- END: MODIFIED VENDOR FETCHING LOGIC ---

        // Fetch event data
        const { data: eventData, error: eventError } = await supabase
            .from('events')
            .select('*')
            .eq('event_id', eventId)
            .single();
        if (eventError) throw eventError;

        // Prepare data for JSON and CSV 
        const guestsJson = JSON.stringify(guests, null, 2);
        const vendorsJson = JSON.stringify(vendors, null, 2);
        const eventJson = JSON.stringify(eventData, null, 2);

        const guestsCsvPromise = new Promise((resolve, reject) => {
            stringify(guests, { header: true }, (err, output) => {
                if (err) return reject(err);
                resolve(output);
            });
        });
        
        const vendorsCsvPromise = new Promise((resolve, reject) => {
            stringify(vendors, { header: true }, (err, output) => {
                if (err) return reject(err);
                resolve(output);
            });
        });
        
        const eventCsvPromise = new Promise((resolve, reject) => {
            const eventArray = eventData ? [eventData] : [];
            stringify(eventArray, { header: true }, (err, output) => {
                if (err) return reject(err);
                resolve(output);
            });
        });

        const guestsCsv = await guestsCsvPromise;
        const vendorsCsv = await vendorsCsvPromise;
        const eventCsv = await eventCsvPromise;

        // Create a ZIP archive 
        const archive = archiver('zip', { zlib: { level: 9 } });
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=event_export_${eventId}.zip`);
        archive.pipe(res);

        // Append files to the archive
        archive.append(guestsJson, { name: 'guests.json' });
        archive.append(vendorsJson, { name: 'vendors.json' });
        archive.append(eventJson, { name: 'event.json' });
        archive.append(guestsCsv, { name: 'guests.csv' });
        archive.append(vendorsCsv, { name: 'vendors.csv' });
        archive.append(eventCsv, { name: 'event.csv' });

        await archive.finalize();
    } catch (error) {
        console.error('Error exporting event data:', error);
        res.status(500).send('Failed to export event data.');
    }
};