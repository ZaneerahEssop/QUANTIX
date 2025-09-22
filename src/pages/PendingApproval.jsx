import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import "../styling/PendingApproval.css";
import { supabase } from "../client";
import { FaClock } from "react-icons/fa";

export default function PendingApprovalPage() {
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [session,setSession] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (!session?.user) {
        navigate("/login");
        return;
      }

      // fetch vendor status
      const { data: vendor, error } = await supabase
        .from("vendors")
        .select("status")
        .eq("vendor_id", session.user.id)
        .single();

      if (error || !vendor) {
        console.error("Error fetching vendor status:", error?.message);
        setStatus("pending");
      } else if (vendor.status === "accepted") {
        navigate("/vendor-dashboard"); // redirect accepted vendors
      } else if (vendor.status === "pending") {
        setStatus("pending");
      } else if (vendor.status === "rejected") {
        setStatus("rejected");
      } else {
        setStatus("pending"); // fallback
      }

      setLoading(false);
    };

    checkStatus();
  }, [navigate]);

  if (loading) return <p>Loading...</p>;

  return (
    <>
      <Navbar session={session} showOnlyLogout={true} />
      <div className="pending-container">
        <div className="pending-card">
          {status === "pending" && (
            <>
              <FaClock className="pulsing-clock" size={50} />
              <h2>Application Under Review</h2>
              <p>
                Thank you for registering as a vendor. Your application is
                currently under review by our admins.
              </p>
              <p>
                Once approved, you’ll gain access to your vendor dashboard and
                can start listing your services.
              </p>
            </>
          )}

          {status === "rejected" && (
            <>
              <h2>Application Rejected</h2>
              <p>
                Unfortunately, your vendor application has been rejected by our
                admins.
              </p>
            </>
          )}

          {status !== "pending" && status !== "rejected" && (
            <>
              <h2>Unknown Status</h2>
              <p>
                We couldn’t determine your application status. 
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
