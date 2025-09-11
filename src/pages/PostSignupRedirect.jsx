import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../client";
import { CONFIG } from "../config";

export default function PostSignupRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    async function handleRedirect() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session || !session.user) {
        navigate("/login");
        return;
      }
      // Get role from sessionStorage
      const role = sessionStorage.getItem("signupRole");
      if (role) {
        // Check if user exists in users table
        const { data: userExists } = await supabase
          .from("users")
          .select("user_id")
          .eq("user_id", session.user.id)
          .single();
        if (!userExists) {
            // Upsert user into users table (insert or update)
            const { error: insertError } = await supabase.from("users").upsert([
              {
                user_id: session.user.id,
                name: session.user.user_metadata?.name || "",
                user_role: role,
                is_admin: false,
                created_at: new Date().toISOString(),
              },
            ]);
            if (insertError) {
              console.error("Error inserting user:", insertError.message);
            }
        }
        // Clear the role from sessionStorage after use
        sessionStorage.removeItem('signupRole');
        
        // Determine the correct path based on role
        const redirectPath = role === "planner" ? "/planner-form" : 
                           role === "vendor" ? "/vendor-form" : "/";
        
        // Use the current origin to ensure we stay on the same domain
        const redirectUrl = `${window.location.origin}${redirectPath}`;
        console.log('Redirecting to:', redirectUrl); // Debug log
        window.location.href = redirectUrl;
      } else {
        // If no role, fallback to dashboard
        navigate("/dashboard");
      }
    }
    handleRedirect();
  }, [navigate]);

  return <div>Loading...</div>;
}
