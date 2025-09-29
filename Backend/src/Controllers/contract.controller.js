// src/Controllers/contract.controller.js

const supabase = require("../Config/supabase");

// Get a contract based on event and vendor IDs
const getContract = async (req, res) => {
    const { eventId, vendorId } = req.params;
    try {
        const { data, error } = await supabase
            .from("contracts")
            .select("*")
            .eq("event_id", eventId)
            .eq("vendor_id", vendorId)
            .maybeSingle(); // Use maybeSingle to return null instead of error if not found

        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Create or Update a contract (Upsert). Used by vendors.
const upsertContract = async (req, res) => {
    console.log('✅ --- UPSERT CONTRACT CONTROLLER REACHED --- ✅'); // <-- ADD THIS
    console.log('Request Body:', req.body); // <-- AND THIS
    const { event_id, vendor_id, content, status } = req.body;
    try {
        const { data, error } = await supabase
            .from("contracts")
            .upsert({ 
                event_id, 
                vendor_id, 
                content, 
                status: status || 'pending_planner_signature', // Update status
                updated_at: new Date().toISOString() 
            }, { onConflict: 'event_id, vendor_id' }) // This handles the create/update logic
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Add a revision request. Used by planners.
const addRevision = async (req, res) => {
    const { contractId } = req.params;
    const { revision } = req.body; // revision object: { requested_by, comment, timestamp }
    try {
        // First, get the current revisions
        const { data: contract, error: fetchError } = await supabase
            .from("contracts")
            .select("revisions")
            .eq("id", contractId)
            .single();

        if (fetchError) throw fetchError;

        const updatedRevisions = [...(contract.revisions || []), revision];

        const { data, error } = await supabase
            .from("contracts")
            .update({ 
                revisions: updatedRevisions, 
                status: 'revisions_requested',
                updated_at: new Date().toISOString()
            })
            .eq("id", contractId)
            .select()
            .single();
        
        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: `Failed to add revision: ${err.message}` });
    }
};

// Sign the contract. Used by both planners and vendors.
const signContract = async (req, res) => {
    const { contractId } = req.params;
    const { role, signature } = req.body; // role: 'planner' or 'vendor'
    
    try {
        let updateData = {};
        if (role === 'planner') {
            updateData.planner_signature = signature;
            updateData.planner_signed_at = new Date().toISOString();
        } else if (role === 'vendor') {
            updateData.vendor_signature = signature;
            updateData.vendor_signed_at = new Date().toISOString();
        } else {
            return res.status(400).json({ error: "Invalid role specified." });
        }

        const { data: updatedContract, error } = await supabase
            .from("contracts")
            .update(updateData)
            .eq("id", contractId)
            .select()
            .single();

        if (error) throw error;

        // If both parties have now signed, update the status to 'active'
        if (updatedContract.planner_signature && updatedContract.vendor_signature) {
            const { data: finalContract, error: finalError } = await supabase
                .from("contracts")
                .update({ status: 'active' })
                .eq("id", contractId)
                .select()
                .single();
            
            if (finalError) throw finalError;
            return res.status(200).json(finalContract);
        }

        res.status(200).json(updatedContract);
    } catch (err) {
        res.status(500).json({ error: `Failed to sign contract: ${err.message}` });
    }
};

// Add this function to your existing contract.controller.js

// Export a contract's content as a .md file
const exportContract = async (req, res) => {
    const { contractId } = req.params;
    try {
        const { data: contract, error } = await supabase
            .from("contracts")
            .select("content, event_id, vendor_id")
            .eq("id", contractId)
            .single();

        if (error) throw error;
        if (!contract) return res.status(404).json({ error: "Contract not found." });

        // Set headers to trigger a file download
        res.setHeader('Content-Type', 'text/markdown; charset=UTF-8');
        res.setHeader(
            'Content-Disposition', 
            `attachment; filename="contract_${contract.event_id}_${contract.vendor_id}.md"`
        );
        
        // Send the contract content as the response body
        res.status(200).send(contract.content);

    } catch (err) {
        res.status(500).json({ error: `Failed to export contract: ${err.message}` });
    }
};


module.exports = { getContract, upsertContract, addRevision, signContract, exportContract };