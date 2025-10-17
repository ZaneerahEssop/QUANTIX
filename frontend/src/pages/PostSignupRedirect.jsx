import React from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../client";

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
        const { data: existingUser } = await supabase
          .from("users")
          .select("user_id, user_role")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (!existingUser) {
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
        } else if (existingUser.user_role && existingUser.user_role !== role) {
          // Role conflict: prevent sign-up with same email for a different role
          // Clear stored role and sign out
          sessionStorage.removeItem('signupRole');
          await supabase.auth.signOut();
          const params = new URLSearchParams({
            conflict: '1',
            existingRole: existingUser.user_role,
            intendedRole: role,
          });
          navigate(`/signup?${params.toString()}`, { replace: true });
          return;
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
