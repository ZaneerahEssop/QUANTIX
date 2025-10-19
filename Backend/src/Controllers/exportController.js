const supabase = require('../Config/supabase');
const archiver = require('archiver');
const { stringify } = require('csv-stringify');

const PUBLIC_TOKEN = process.env.EXPORT_PUBLIC_TOKEN || null;

exports.exportEventData = async (req, res) => {
  try {
    const { eventId } = req.params;

    // --- Optional Public Token Check ---
    if (PUBLIC_TOKEN) {
      const token = req.header('x-export-token') || req.query.token; // Use req.header, alias for req.get
      if (!token || token !== PUBLIC_TOKEN) {
        return res.status(403).send('Forbidden: invalid or missing token');
      }
    }

    // --- Fetch Guests (excluding email) ---
    const { data: guests, error: guestsError } = await supabase
      .from('guests')
      .select('guest_id, created_at, event_id, name, rsvp_status, cell_number, dietary_info')
      .eq('event_id', eventId);
    if (guestsError) throw guestsError;

    // --- Fetch Accepted Vendor IDs ---
    const { data: acceptedRequests, error: requestsError } = await supabase
      .from('vendor_requests')
      .select('vendor_id')
      .eq('event_id', eventId)
      .eq('status', 'accepted');
    if (requestsError) throw requestsError;

    const vendorIds = acceptedRequests.map(r => r.vendor_id);

    let vendors = [];
    if (vendorIds.length > 0) {
      // --- Fetch Vendors (excluding contact_number) ---
      const { data: vendorData, error: vendorsError } = await supabase
        .from('vendors')
        .select('vendor_id, name, category, company_name, email, created_at, updated_at')
        .in('vendor_id', vendorIds);
      if (vendorsError) throw vendorsError;
      vendors = vendorData;
    }

    // --- Fetch Event Info ---
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('event_id', eventId)
      .single();
    if (eventError) throw eventError;

    // --- Prepare JSON + CSV Files ---
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

    const [guestsCsv, vendorsCsv, eventCsv] = await Promise.all([
      guestsCsvPromise,
      vendorsCsvPromise,
      eventCsvPromise
    ]);

    // --- Create ZIP Archive ---
    const archive = archiver('zip', { zlib: { level: 9 } });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=event_export_${eventId}.zip`);
    archive.pipe(res);

    // Add files to archive
    archive.append(guestsJson, { name: 'guests_public.json' });
    archive.append(vendorsJson, { name: 'vendors_public.json' });
    archive.append(eventJson, { name: 'event.json' });
    archive.append(guestsCsv, { name: 'guests_public.csv' });
    archive.append(vendorsCsv, { name: 'vendors_public.csv' });
    archive.append(eventCsv, { name: 'event.csv' });

    await archive.finalize();
  } catch (error) {
    console.error('Error exporting event data:', error);
    res.status(500).send('Failed to export event data.');
  }
};