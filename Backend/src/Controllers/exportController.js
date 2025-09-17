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

        // Vendor-related code is commented out because the table lacks an event_id column
        // const { data: vendors, error: vendorsError } = await supabase 
        //     .from('vendors') 
        //     .select('*') 
        //     // .eq('event_id', eventId); // This line caused the error
        // if (vendorsError) throw vendorsError; 

        // Fetch event data
        const { data: eventData, error: eventError } = await supabase 
            .from('events') 
            .select('*') 
            .eq('event_id', eventId) 
            .single(); 
        if (eventError) throw eventError; 

        // Prepare data for JSON and CSV 
        const guestsJson = JSON.stringify(guests, null, 2); 
        // const vendorsJson = JSON.stringify(vendors, null, 2); 
        const eventJson = JSON.stringify(eventData, null, 2); 

        const guestsCsvPromise = new Promise((resolve, reject) => { 
            stringify(guests, { header: true }, (err, output) => { 
                if (err) return reject(err); 
                resolve(output); 
            }); 
        }); 
        // const vendorsCsvPromise = new Promise((resolve, reject) => { 
        //     stringify(vendors, { header: true }, (err, output) => { 
        //         if (err) return reject(err); 
        //         resolve(output); 
        //     }); 
        // }); 
        
        // Convert event data to CSV format
        const eventCsvPromise = new Promise((resolve, reject) => {
            const eventArray = eventData ? [eventData] : [];
            stringify(eventArray, { header: true }, (err, output) => {
                if (err) return reject(err);
                resolve(output);
            });
        });

        const guestsCsv = await guestsCsvPromise; 
        // const vendorsCsv = await vendorsCsvPromise; 
        const eventCsv = await eventCsvPromise;

        // Create a ZIP archive 
        const archive = archiver('zip', { zlib: { level: 9 } }); 
        res.setHeader('Content-Type', 'application/zip'); 
        res.setHeader('Content-Disposition', `attachment; filename=event_export_${eventId}.zip`); 
        archive.pipe(res); 

        // Append files to the archive
        archive.append(guestsJson, { name: 'guests.json' }); 
        // archive.append(vendorsJson, { name: 'vendors.json' }); 
        archive.append(eventJson, { name: 'event.json' }); 
        archive.append(guestsCsv, { name: 'guests.csv' }); 
        // archive.append(vendorsCsv, { name: 'vendors.csv' }); 
        archive.append(eventCsv, { name: 'event.csv' });

        await archive.finalize(); 
    } catch (error) { 
        console.error('Error exporting event data:', error); 
        res.status(500).send('Failed to export event data.'); 
    } 
};