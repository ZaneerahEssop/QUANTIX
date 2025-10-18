import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { FaSignature, FaExclamationTriangle, FaCheckCircle, FaEdit, FaFileDownload, FaTimes, FaSave, FaPlus, FaTrash, FaClock } from 'react-icons/fa';
import '../styling/eventDetails.css';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '../client';

const SuccessModal = ({ message, onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="modal-close-x-btn">&times;</button>
        <p>{message}</p>
      </div>
    </div>
  );
};

const parseContractContent = (content) => {
    const fields = {};
    const customFields = [];
    if (!content) return { fields, customFields };
    const lines = content.split('\n');
    const standardKeys = ['Hours of Coverage', 'Deliverables', 'Performance Time', 'Service Type', 'Equipment', 'Scope', 'Setup & Teardown', 'Arrangement Types', 'Substitutions', 'Space(s) Provided', 'Capacity', 'Restrictions', 'Service Style', 'Menu', 'Staffing', 'Image Rights', 'Total Fee'];
    const nonEditableKeys = ['The Client', 'The Vendor', 'By Client', 'By Vendor', 'Payment Schedule', 'Payment Methods'];
    lines.forEach(line => {
        const match = line.match(/- \*\*(.*?):\*\* (.*)/);
        if (match) {
            const key = match[1];
            let value = match[2];

            if (value.trim().startsWith('[') && value.trim().endsWith(']')) {
                value = '';
            }
            
            const fieldKey = key.charAt(0).toLowerCase() + key.slice(1).replace(/[\s&]+/g, '');

            if (fieldKey === 'totalFee' || fieldKey === 'hoursOfCoverage') {
                value = value.replace(/[^0-9]/g, '');
            }

            if (standardKeys.includes(key)) {
                fields[fieldKey] = value;
            } else if (!nonEditableKeys.includes(key)) {
                customFields.push({ header: key, value: value });
            }
        }
    });
    if (!fields.totalFee) {
        const feeLine = lines.find(l => l.includes('**Total Fee:**'));
        if (feeLine) {
            // ✨ FIX: Corrected the invalid regex from /[^0--9]/g to /[^0-9]/g
            fields.totalFee = (feeLine.split(':')[1]?.trim().replace(/[^0-9]/g, '') || '');
        }
    }
    return { fields, customFields };
};

const assembleContractContent = (fields, customFields, baseTemplate) => {
    let newContent = baseTemplate || '';
    const replaceValue = (key, value) => {
        const regex = new RegExp(`(\\*\\*${key}:\\*\\*).+`);

        let displayValue = value || '[Not Specified]';
        if (key === 'Total Fee' && value) displayValue = `R${value}`;
        if (key === 'Hours of Coverage' && value) displayValue = `${value} hours`;

        if (newContent.match(regex)) {
             newContent = newContent.replace(regex, `$1 ${displayValue}`);
        }
    };
    Object.keys(fields).forEach(fieldKey => {
        const titleKey = fieldKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        replaceValue(titleKey, fields[fieldKey]);
    });
    const separator = '\n\n---\n\n### 2. Payment Terms';
    const separatorIndex = newContent.indexOf(separator);
    const customFieldLines = customFields
        .filter(field => field.header.trim() && field.value.trim())
        .map(field => `- **${field.header.trim()}:** ${field.value.trim()}`)
        .join('\n');
    if (separatorIndex !== -1) {
        let serviceSection = newContent.slice(0, separatorIndex);
        const restOfContract = newContent.slice(separatorIndex);
        if (customFieldLines) {
            serviceSection += '\n' + customFieldLines;
        }
        newContent = serviceSection + restOfContract;
    }
    return newContent;
};


const ContractManagement = ({ eventData, currentUser, vendor, isVendorAccepted, onBack }) => {
    const contractContentRef = useRef(null);
    const [contract, setContract] = useState(null);
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [newRevision, setNewRevision] = useState('');
    const [signatureName, setSignatureName] = useState('');
    const [contractFields, setContractFields] = useState({});
    const [customFields, setCustomFields] = useState([]);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [modalMessage, setModalMessage] = useState("");
    const API_URL = process.env.REACT_APP_API_URL;
    const isPlanner = currentUser?.role === 'planner';
    const isVendor = currentUser?.role === 'vendor';

    const generateContractTemplate = useCallback((event, vendorInfo, planner) => {
        let servicesSection = `### 1. Services Provided\n* The Vendor will provide ${vendorInfo.service_type} services as agreed upon.`;
        const serviceType = vendorInfo.service_type.toLowerCase();
        if (serviceType === 'catering') { servicesSection = `### 1. Services Provided (Catering)\n- **Service Style:** [e.g., Buffet]\n- **Menu:** Final menu to be confirmed.\n- **Staffing:** [Number] servers.`; }
        else if (serviceType === 'photography') { servicesSection = `### 1. Services Provided (Photography)\n- **Hours of Coverage:** [e.g., 8 hours]\n- **Deliverables:** [e.g., Digital gallery]\n- **Image Rights:** The Client is granted a personal use license.`; }
        else if (serviceType === 'music') { servicesSection = `### 1. Services Provided (Music)\n- **Performance Time:** [e.g., 4 hours]\n- **Service Type:** [e.g., DJ Services]\n- **Equipment:** [e.g., Full PA System]`; }
        else if (serviceType === 'decor') { servicesSection = `### 1. Services Provided (Decor & Styling)\n- **Scope:** [e.g., Ceremony and Reception areas]\n- **Setup & Teardown:** Vendor is responsible for setup and teardown.`; }
        else if (serviceType === 'flowers') { servicesSection = `### 1. Services Provided (Floral Design)\n- **Arrangement Types:** [e.g., Bridal Bouquet]\n- **Substitutions:** Vendor reserves the right to make suitable substitutions.`; }
        else if (serviceType === 'venue') { servicesSection = `### 1. Venue Rental\n- **Space(s) Provided:** [e.g., Grand Ballroom]\n- **Capacity:** [e.g., 150 guests]\n- **Restrictions:** [e.g., Music must end by 11:00 PM]`; }
        
        const clientName = (planner?.role === 'planner' ? planner.name : event.planner_name) || 'The Planner';

        return `
# Service Agreement
**Event:** ${event.name}
**Date:** ${new Date(event.start_time).toLocaleDateString()}
---
### Parties
- **The Client:** ${clientName} ("Client")
- **The Vendor:** ${vendorInfo?.business_name || 'The Vendor'} ("Vendor")
This agreement is effective as of the date of the last signature.
---
${servicesSection}
---
### 2. Payment Terms
- **Total Fee:** [Specify Total Cost in R]
- **Payment Schedule:**
    - A 50% non-refundable retainer is due upon signing.
    - The final balance is due 30 days prior to the event date.
- **Payment Methods:** Payments can be made via EFT.
---
### 3. Cancellation Policy
- **By Client:** Cancellation by the Client forfeits the non-refundable retainer.
- **By Vendor:** In the unlikely event the Vendor must cancel, a full refund will be issued.
---
### Signatures
*By signing below, both parties agree to the terms outlined in this contract.*
`;
    }, []);

    const fetchContract = useCallback(async () => {
        if (!isVendorAccepted) { setIsLoading(false); return; }
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/contracts/event/${eventData.event_id}/vendor/${vendor.vendor_id}`);
            let data = null;
            if (response.status === 404) { data = null; } 
            else if (!response.ok) { throw new Error(`Server responded with status: ${response.status}`); } 
            else { data = await response.json(); }
            let currentContent = '';
            if (data) {
                setContract(data);
                currentContent = data.content || generateContractTemplate(eventData, vendor, currentUser);
            } else if (isVendor) {
                currentContent = generateContractTemplate(eventData, vendor, currentUser);
                setContract(null);
            }
            setContent(currentContent);
            const { fields, customFields } = parseContractContent(currentContent);
            setContractFields(fields);
            setCustomFields(customFields);
        } catch (error) {
            console.error("Failed to fetch contract:", error);
            setModalMessage(`Could not load contract. Error: ${error.message}`);
            setShowSuccessModal(true);
        } finally {
            setIsLoading(false);
        }
    }, [API_URL, eventData, vendor, currentUser, isVendor, isVendorAccepted, generateContractTemplate]);

    // Set up real-time subscription for contract updates
    useEffect(() => {
        if (!eventData?.event_id || !vendor?.vendor_id) return;
        
        const subscription = supabase
            .channel(`contract_${eventData.event_id}_${vendor.vendor_id}`)
            .on('postgres_changes', 
                {
                    event: '*',
                    schema: 'public',
                    table: 'contracts',
                    filter: `event_id=eq.${eventData.event_id}`
                },
                (payload) => {
                    if (payload.new && payload.new.vendor_id === vendor.vendor_id) {
                        setContract(payload.new);
                        // Only update content if it's a new contract or if we don't have content yet
                        if (!content || payload.eventType === 'INSERT') {
                            const currentContent = payload.new.content || generateContractTemplate(eventData, vendor, currentUser);
                            setContent(currentContent);
                            const { fields, customFields } = parseContractContent(currentContent);
                            setContractFields(fields);
                            setCustomFields(customFields);
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [eventData, vendor, currentUser, content, generateContractTemplate]);

    useEffect(() => { fetchContract(); }, [fetchContract]);

    const handleFieldChange = (field, value) => {
        if (field === 'totalFee' || field === 'hoursOfCoverage') {
            const sanitizedValue = value.replace(/[^0-9]/g, '');
            const numValue = Number(sanitizedValue);
    
            if (field === 'totalFee' && numValue > 1000000) {
                return;
            }
            if (field === 'hoursOfCoverage' && numValue > 48) {
                return;
            }
            
            setContractFields(prev => ({ ...prev, [field]: sanitizedValue }));
            return;
        }
        
        setContractFields(prev => ({ ...prev, [field]: value }));
    };

    const handleCustomFieldChange = (index, field, value) => {
        const updatedFields = [...customFields];
        updatedFields[index][field] = value;
        setCustomFields(updatedFields);
    };
    const addCustomField = () => { setCustomFields([...customFields, { header: '', value: '' }]); };
    const removeCustomField = (index) => { setCustomFields(customFields.filter((_, i) => i !== index)); };

    const handleSaveContract = async () => {
        const baseTemplate = generateContractTemplate(eventData, vendor, currentUser);
        const newContent = assembleContractContent(contractFields, customFields, baseTemplate);
        setContent(newContent); 
        const statusOnSave = contract?.status === 'revisions_requested' ? 'pending_planner_signature' : (contract?.status || 'pending_planner_signature');
        try {
            const response = await fetch(`${API_URL}/api/contracts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event_id: eventData.event_id, vendor_id: vendor.vendor_id, content: newContent, status: statusOnSave })
            });
            if (!response.ok) { throw new Error(`Server responded with status: ${response.status}`); }
            const savedContract = await response.json();
            setContract(savedContract);
            setIsEditing(false);
            setModalMessage("Contract saved successfully!");
            setShowSuccessModal(true);
        } catch (error) {
            console.error("Failed to save contract:", error);
            setModalMessage(`Error: Could not save contract. ${error.message}`);
            setShowSuccessModal(true);
        }
    };
    
    const handleAddRevision = async (e) => {
        e.preventDefault();
        if (!newRevision.trim() || !contract) return;
        try {
            const response = await fetch(`${API_URL}/api/contracts/${contract.id}/revise`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ revision: { requested_by: currentUser.name, comment: newRevision, timestamp: new Date().toISOString() } })
            });
            const updatedContract = await response.json();
            setContract(updatedContract);
            setNewRevision('');
        } catch (error) { console.error("Failed to add revision:", error); }
    };

    const handleSignContract = async () => {
        if (!signatureName.trim() || !contract) { alert("Please type your full name to sign."); return; }
        try {
            const response = await fetch(`${API_URL}/api/contracts/${contract.id}/sign`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: isPlanner ? 'planner' : 'vendor', signature: signatureName })
            });
            const updatedContract = await response.json();
            setContract(updatedContract);
            setSignatureName('');
        } catch (error) { console.error("Failed to sign contract:", error); }
    };

    const handleExportContract = () => {
        const input = contractContentRef.current;
        if (!input) { alert("Could not find contract content to export."); return; }
        html2canvas(input, { scale: 2 }).then((canvas) => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const canvasWidth = canvas.width;
                const canvasHeight = canvas.height;
                const ratio = canvasWidth / canvasHeight;
                let imgWidth = pdfWidth - 20;
                let imgHeight = imgWidth / ratio;
                if (imgHeight > pdfHeight - 20) {
                    imgHeight = pdfHeight - 20;
                    imgWidth = imgHeight * ratio;
                }
                const x = (pdfWidth - imgWidth) / 2;
                const y = 10;
                pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
                pdf.save(`contract_${eventData.event_id}_${vendor.vendor_id}.pdf`);
            });
    };

    if (isLoading) return <div className="loading">Loading contract...</div>;
    
    const canEdit = isVendor && contract?.status !== 'active';
    const canSign = (isPlanner && contract && !contract.planner_signature) || (isVendor && contract && !contract.vendor_signature && contract.planner_signature);
    const canRevise = contract && contract.status !== 'active';

    return (
        <div className="contract-section">
            {showSuccessModal && (
                <SuccessModal
                    message={modalMessage}
                    onClose={() => setShowSuccessModal(false)}
                />
            )}
            <div className="section-header">
                <h2>Contract: {vendor.business_name}</h2>
                <div className="header-actions">
                     <button onClick={onBack} className="back-button small-back">← Back to Vendors</button>
                    {content && <button onClick={handleExportContract} className="export-button"><FaFileDownload /> Export as PDF</button>}
                    {canEdit && !isEditing && <button onClick={() => setIsEditing(true)} className="edit-button"><FaEdit /> Edit Contract</button>}
                </div>
            </div>

            {contract?.status === 'revisions_requested' && (
                <div className="status-banner revisions">
                    <FaExclamationTriangle /> 
                    {isPlanner
                        ? "You have requested revisions. Awaiting vendor updates."
                        : "Revisions requested. Please review comments and update the contract."
                    }
                </div>
            )}

            {contract?.status === 'active' && <div className="status-banner active"><FaCheckCircle /> This contract is active and has been signed by both parties.</div>}

            {isVendor && contract && contract.status === 'pending_planner_signature' && !contract.planner_signature && (
                <div className="status-banner pending">
                    <FaClock /> Contract is with the planner for review and signature.
                </div>
            )}
            {isPlanner && contract?.planner_signature && !contract?.vendor_signature && contract?.status !== 'active' && (
                <div className="status-banner pending">
                    <FaClock /> You have signed the contract. Waiting for the vendor's signature.
                </div>
            )}


            {isEditing && canEdit ? (
                <div className="contract-form-editor">
                    <h3>Edit Contract Details</h3>
                    <div className="form-field-group">
                        <label>Total Fee (R)</label>
                        <input 
                            type="text" 
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={contractFields.totalFee || ''} 
                            onChange={(e) => handleFieldChange('totalFee', e.target.value)} 
                            placeholder="e.g., 15000"
                        />
                    </div>
                    
                    {vendor.service_type.toLowerCase() === 'photography' && (
                        <>
                            <div className="form-field-group">
                                <label>Hours of Coverage</label>
                                <input 
                                    type="text" 
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={contractFields.hoursOfCoverage || ''} 
                                    onChange={(e) => handleFieldChange('hoursOfCoverage', e.target.value)} 
                                    placeholder="e.g., 8"
                                />
                            </div>
                            <div className="form-field-group"><label>Deliverables</label><textarea value={contractFields.deliverables || ''} onChange={(e) => handleFieldChange('deliverables', e.target.value)} placeholder="e.g., High-resolution digital gallery"/></div>
                        </>
                    )}
                    {vendor.service_type.toLowerCase() === 'music' && (
                        <>
                           <div className="form-field-group"><label>Performance Time</label><input type="text" value={contractFields.performanceTime || ''} onChange={(e) => handleFieldChange('performanceTime', e.target.value)} placeholder="e.g., 4 hours"/></div>
                            <div className="form-field-group"><label>Service Type</label><input type="text" value={contractFields.serviceType || ''} onChange={(e) => handleFieldChange('serviceType', e.target.value)} placeholder="e.g., DJ Services, Live Band"/></div>
                            <div className="form-field-group"><label>Equipment</label><textarea value={contractFields.equipment || ''} onChange={(e) => handleFieldChange('equipment', e.target.value)} placeholder="e.g., Full PA System, DJ Decks"/></div>
                        </>
                    )}
                     {vendor.service_type.toLowerCase() === 'catering' && (
                        <>
                           <div className="form-field-group"><label>Service Style</label><input type="text" value={contractFields.serviceStyle || ''} onChange={(e) => handleFieldChange('serviceStyle', e.target.value)} placeholder="e.g., Buffet, Plated Dinner"/></div>
                            <div className="form-field-group"><label>Staffing</label><input type="text" value={contractFields.staffing || ''} onChange={(e) => handleFieldChange('staffing', e.target.value)} placeholder="e.g., 2 servers and 1 bartender"/></div>
                        </>
                    )}
                     {vendor.service_type.toLowerCase() === 'venue' && (
                        <>
                           <div className="form-field-group"><label>Space(s) Provided</label><input type="text" value={contractFields.spaceSProvided || ''} onChange={(e) => handleFieldChange('spaceSProvided', e.target.value)} placeholder="e.g., Grand Ballroom and Gardens"/></div>
                           <div className="form-field-group"><label>Capacity</label><input type="text" value={contractFields.capacity || ''} onChange={(e) => handleFieldChange('capacity', e.target.value)} placeholder="e.g., 150 guests"/></div>
                           <div className="form-field-group"><label>Restrictions</label><textarea value={contractFields.restrictions || ''} onChange={(e) => handleFieldChange('restrictions', e.target.value)} placeholder="e.g., All music must end by 11:00 PM"/></div>
                        </>
                    )}
                    {vendor.service_type.toLowerCase() === 'decor' && (
                        <div className="form-field-group"><label>Scope</label><textarea value={contractFields.scope || ''} onChange={(e) => handleFieldChange('scope', e.target.value)} placeholder="e.g., Full styling for ceremony and reception areas"/></div>
                    )}
                     {vendor.service_type.toLowerCase() === 'flowers' && (
                        <div className="form-field-group"><label>Arrangement Types</label><textarea value={contractFields.arrangementTypes || ''} onChange={(e) => handleFieldChange('arrangementTypes', e.target.value)} placeholder="e.g., Bridal bouquet, 10 centerpieces, ceremony arch"/></div>
                    )}
                    
                    <div className="custom-fields-section">
                        <h4>Custom Contract Clauses</h4>
                        {customFields.map((field, index) => (
                            <div key={index} className="custom-field-row">
                                <input type="text" className="custom-field-header" value={field.header} onChange={(e) => handleCustomFieldChange(index, 'header', e.target.value)} placeholder="Clause Header (e.g., Travel Fee)"/>
                                <textarea className="custom-field-value" value={field.value} onChange={(e) => handleCustomFieldChange(index, 'value', e.target.value)} placeholder="Clause Details" rows="2"/>
                                <button type="button" onClick={() => removeCustomField(index)} className="remove-custom-field-btn"><FaTrash /></button>
                            </div>
                        ))}
                        <button type="button" onClick={addCustomField} className="add-custom-field-btn"><FaPlus /> Add Custom Field</button>
                    </div>

                    <div className="edit-actions">
                        <button onClick={() => { setIsEditing(false); fetchContract(); }} className="new-button"><FaTimes /> Cancel</button>
                        <button onClick={handleSaveContract} className="save-button"><FaSave /> Save Contract</button>
                    </div>
                </div>
            ) : (
                <div ref={contractContentRef}>
                    <div className="markdown-content contract-view">
                        <ReactMarkdown>{content || "No contract content available."}</ReactMarkdown>
                    </div>
                    <div className="signatures-and-revisions">
                        <div className="signatures-section">
                            <h3>Signatures</h3>
                            <div className="signature-box">
                                <strong>Planner:</strong>
                                {contract?.planner_signature ? <p className="signed"><FaSignature /> {contract.planner_signature} on {new Date(contract.planner_signed_at).toLocaleDateString()}</p>
                                : (isPlanner && canSign) ? <div className="sign-form"><input type="text" value={signatureName} onChange={(e) => setSignatureName(e.target.value)} placeholder="Type full name to sign" /><button onClick={handleSignContract}>Sign</button></div>
                                : <p>Pending Signature...</p>}
                            </div>
                            <div className="signature-box">
                                <strong>Vendor:</strong>
                                {contract?.vendor_signature ? <p className="signed"><FaSignature /> {contract.vendor_signature} on {new Date(contract.vendor_signed_at).toLocaleDateString()}</p>
                                : (isVendor && canSign) ? <div className="sign-form"><input type="text" value={signatureName} onChange={(e) => setSignatureName(e.target.value)} placeholder="Type full name to sign" /><button onClick={handleSignContract}>Sign</button></div>
                                : <p>Pending Signature...</p>}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {canRevise && isPlanner && !contract?.planner_signature && (
                <div className="revisions-section standalone-revisions">
                    <h3>Request Revisions</h3>
                    <form onSubmit={handleAddRevision} className="revision-form">
                        <textarea value={newRevision} onChange={(e) => setNewRevision(e.target.value)} placeholder="e.g., Please clarify payment terms..."></textarea>
                        <button type="submit">Submit Revision</button>
                    </form>
                </div>
            )}

            {contract?.revisions?.length > 0 && (
                <div className="revisions-history">
                    <h3>Revision History</h3>
                    <ul>
                        {contract.revisions.slice().reverse().map((rev, index) => (
                            <li key={index}>
                                <p><strong>{rev.requested_by}</strong> ({new Date(rev.timestamp).toLocaleString()}):</p>
                                <blockquote>"{rev.comment}"</blockquote>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default ContractManagement;