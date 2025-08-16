// import React, { useState, useEffect } from 'react';
// import PropTypes from 'prop-types';

// // --- Firebase Imports ---
// // The isFirebaseReady import has been removed.
// import { auth, db } from './firebase/firebase.js'; 
// import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, signInWithCustomToken, signInAnonymously } from 'firebase/auth';
// import { doc, setDoc, getDoc } from 'firebase/firestore';


// // --- Inline SVG Icons (No changes here) ---
// const iconPropTypes = {
//   size: PropTypes.number,
//   className: PropTypes.string
// };

// const LogInIcon = ({ size = 24, className = "" }) => (
//   <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
//     <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
//     <polyline points="10 17 15 12 10 7" />
//     <line x1="15" x2="3" y1="12" y2="12" />
//   </svg>
// );
// LogInIcon.propTypes = iconPropTypes;

// const LogOutIcon = ({ size = 24, className = "" }) => (
//   <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
//     <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
//     <polyline points="16 17 21 12 16 7" />
//     <line x1="21" x2="9" y1="12" y2="12" />
//   </svg>
// );
// LogOutIcon.propTypes = iconPropTypes;

// const LoaderIcon = ({ size = 24, className = "" }) => (
//   <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
//     <path d="M21 12a9 9 0 1 1-6.219-8.56" />
//   </svg>
// );
// LoaderIcon.propTypes = iconPropTypes;

// const UserIcon = ({ size = 24, className = "" }) => (
//   <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
//     <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
//     <circle cx="12" cy="7" r="4" />
//   </svg>
// );
// UserIcon.propTypes = iconPropTypes;

// const XIcon = ({ size = 24, className = "" }) => (
//   <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
//     <path d="M18 6 6 18" />
//     <path d="m6 6 12 12" />
//   </svg>
// );
// XIcon.propTypes = iconPropTypes;

// // RoleCard Component
// const RoleCard = ({ value, label, description, icon, isSelected, onClick }) => (
//   <label
//     className={`role-card bg-white rounded-xl shadow-md p-6 text-center cursor-pointer transition-all duration-200 transform hover:scale-105 border-2 border-transparent
//       ${isSelected ? 'bg-indigo-50 border-indigo-500 shadow-xl' : 'hover:border-indigo-300'}`}
//     onClick={onClick}
//   >
//     <input type="radio" name="role" value={value} checked={isSelected} onChange={() => {}} className="hidden" />
//     <div className="text-4xl mb-4">{icon}</div>
//     <h2 className="text-xl font-semibold mb-2">{label}</h2>
//     <p className="text-gray-600 text-sm">{description}</p>
//   </label>
// );
// RoleCard.propTypes = {
//   value: PropTypes.string.isRequired,
//   label: PropTypes.string.isRequired,
//   description: PropTypes.string.isRequired,
//   icon: PropTypes.node.isRequired,
//   isSelected: PropTypes.bool.isRequired,
//   onClick: PropTypes.func.isRequired,
// };

// // Define the main App component
// export default function App() {
//   // Global variables provided by the environment (if any)
//   const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : '';
//   const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

//   // State variables
//   const [user, setUser] = useState(null);
//   const [userRole, setUserRole] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [view, setView] = useState('login'); // 'login', 'signup', 'dashboard'
//   const [showErrorModal, setShowErrorModal] = useState(false);
//   const [errorMessage, setErrorMessage] = useState('');

//   // Handle authentication state changes
//   useEffect(() => {
//     // The conditional check for isFirebaseReady is removed.

//     const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
//       if (currentUser) {
//         setUser(currentUser);
//         console.log("User authenticated:", currentUser.uid);

//         // Fetch user role from Firestore
//         try {
//           const userRef = doc(db, `artifacts/${appId}/users/${currentUser.uid}/profile/main`);
//           const userSnap = await getDoc(userRef);
//           if (userSnap.exists()) {
//             setUserRole(userSnap.data().role);
//             setView('dashboard');
//           } else {
//             console.log("No user role found, redirecting to signup.");
//             setView('signup');
//           }
//         } catch (error) {
//           console.error("Error fetching user role:", error);
//           setView('signup');
//         }
//       } else {
//         setUser(null);
//         setUserRole(null);
//         console.log("User not authenticated.");
//         setView('login');
//       }
//       setIsLoading(false);
//     });

//     const signInUser = async () => {
//       try {
//         if (initialAuthToken) {
//           await signInWithCustomToken(auth, initialAuthToken);
//         } else if (!auth.currentUser) { // Avoid signing in again if already authenticated
//           await signInAnonymously(auth);
//         }
//       } catch (error) {
//         console.error("Failed to sign in:", error);
//         setIsLoading(false); // Ensure loading stops on error
//       }
//     };
    
//     signInUser();

//     return () => unsubscribe();
//   }, [appId, initialAuthToken]);

//   // --- Utility functions ---
//   const showModal = (message) => {
//     setErrorMessage(message);
//     setShowErrorModal(true);
//   };

//   const handleLogout = async () => {
//     try {
//       await signOut(auth);
//     } catch (error) {
//       console.error("Error signing out:", error);
//     }
//   };

//   // --- Google Sign In/Sign Up Logic ---
//   const handleGoogleSignIn = async () => {
//     try {
//       const provider = new GoogleAuthProvider();
//       const result = await signInWithPopup(auth, provider);
//       const currentUser = result.user;

//       const userRef = doc(db, `artifacts/${appId}/users/${currentUser.uid}/profile/main`);
//       const userSnap = await getDoc(userRef);
      
//       if (!userSnap.exists()) {
//         setView('signup');
//       } else {
//         setUserRole(userSnap.data().role);
//         setView('dashboard');
//       }
//     } catch (error) {
//       console.error("Error signing in with Google:", error);
//       showModal(`Failed to sign in with Google. Check if the Google Sign-In provider is enabled in your Firebase project. Details: ${error.message}`);
//     }
//   };

//   const handleGoogleSignUp = async (role) => {
//     if (!role) {
//       showModal('Please select a role to sign up.');
//       return;
//     }
//     try {
//       const provider = new GoogleAuthProvider();
//       const result = await signInWithPopup(auth, provider);
//       const currentUser = result.user;

//       const userRef = doc(db, `artifacts/${appId}/users/${currentUser.uid}/profile/main`);
//       await setDoc(userRef, {
//         name: currentUser.displayName,
//         email: currentUser.email,
//         role: role,
//       });

//       setUser(currentUser);
//       setUserRole(role);
//       setView('dashboard');
//     } catch (error) {
//       console.error("Error signing up with Google:", error);
//       showModal(`Failed to sign up with Google. Check if the Google Sign-In provider is enabled in your Firebase project. Details: ${error.message}`);
//     }
//   };
  
//   // --- Components for different views ---
//   const Modal = () => (
//     <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
//       <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center space-y-4">
//         <div className="flex justify-end">
//           <button onClick={() => setShowErrorModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
//             <XIcon size={24} />
//           </button>
//         </div>
//         <h3 className="text-xl font-bold text-red-600">Error</h3>
//         <p className="text-gray-700">{errorMessage}</p>
//       </div>
//     </div>
//   );

//   const LoginView = () => (
//     <main className="profile-container p-8 rounded-2xl shadow-xl border-t-4 border-blush w-full max-w-md bg-white text-center">
//       <h1 className="text-3xl font-bold mb-2">
//         Welcome to <span className="text-blush">Event-ually Perfect</span>
//       </h1>
//       <p className="text-gray-500 mb-8 text-lg">
//         Login to get started planning or managing your event experience.
//       </p>
//       <button
//         onClick={handleGoogleSignIn}
//         className="submit-btn w-full px-6 py-3 border border-transparent text-lg font-medium rounded-xl text-white shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blush bg-gradient-to-r from-coral to-peach"
//       >
//         <span className="flex items-center justify-center gap-2">
//           <LogInIcon size={24} />
//           Login with Google
//         </span>
//       </button>
//       <p className="text-gray-500 mt-6">
//         First time? <button onClick={() => setView('signup')} className="text-blush hover:text-coral font-semibold transition-colors">Sign up here</button>
//       </p>
//     </main>
//   );

//   const SignupView = () => {
//     const [selectedRole, setSelectedRole] = useState(null);

//     return (
//       <main className="profile-container p-8 rounded-2xl shadow-xl border-t-4 border-blush w-full max-w-2xl bg-white text-center">
//         <h1 className="text-3xl font-bold mb-2">
//           Welcome to <span className="text-blush">Event-ually Perfect</span>
//         </h1>
//         <p className="text-gray-500 mb-8 text-lg">
//           Select your role to get started with a tailored experience.
//         </p>
//         <div className="flex flex-col sm:flex-row gap-6 justify-center mb-8">
//           <RoleCard
//             value="planner"
//             label="Event Planner"
//             description="Organize events, find vendors, and manage your projects all in one place."
//             icon="🗒️"
//             isSelected={selectedRole === 'planner'}
//             onClick={() => setSelectedRole('planner')}
//           />
//           <RoleCard
//             value="vendor"
//             label="Vendor"
//             description="Showcase your services, connect with planners, and grow your business."
//             icon="🏪"
//             isSelected={selectedRole === 'vendor'}
//             onClick={() => setSelectedRole('vendor')}
//           />
//         </div>
//         <button
//           onClick={() => handleGoogleSignUp(selectedRole)}
//           className="submit-btn w-full sm:w-auto px-8 py-3 border border-transparent text-lg font-medium rounded-xl text-white bg-gradient-to-r from-coral to-peach shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blush disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:hover:scale-100"
//         >
//           <span className="flex items-center justify-center gap-2">
//             <LogInIcon size={24} />
//             Sign Up with Google
//           </span>
//         </button>
//         <p className="text-gray-500 mt-6">
//           Already have an account? <button onClick={() => setView('login')} className="text-blush hover:text-coral font-semibold transition-colors">Log in here</button>
//         </p>
//       </main>
//     );
//   };
  
//   const DashboardView = () => (
//     <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
//       <div className="p-8 text-center max-w-xl mx-auto space-y-6">
//         <h1 className="text-4xl font-bold text-white mb-4">
//           Hello, {user?.displayName}!
//         </h1>
//         <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
//           <div className="flex items-center justify-center space-x-2 text-indigo-400">
//             <UserIcon size={24} />
//             <p className="text-lg font-semibold">User ID:</p>
//           </div>
//           <p className="font-mono text-sm text-gray-400 mt-2 break-all">{user?.uid}</p>
//           <p className="text-gray-300 mt-4">
//             You are logged in as a <span className="font-bold text-indigo-300">{userRole}</span>.
//           </p>
//         </div>
//         <button
//           onClick={handleLogout}
//           className="w-full sm:w-auto flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors duration-200 shadow-md transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
//         >
//           <LogOutIcon className="mr-2" size={20} />
//           Sign Out
//         </button>
//       </div>
//     </div>
//   );

//   // --- Main App Renderer ---
//   if (isLoading) {
//     return (
//       <div className="min-h-screen bg-gray-950 flex items-center justify-center">
//         <LoaderIcon className="animate-spin text-indigo-400" size={48} />
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen flex items-center justify-center p-4 font-sans bg-background-gradient">
//       <style>
//         {`
//           @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
//           body { font-family: 'Poppins', sans-serif; }
//           .bg-background-gradient {
//             background: radial-gradient(circle at 100% 0%, #E2C5AE, #E5ACBF);
//           }
//           .text-blush { color: #E5ACBF; }
//           .border-blush { border-color: #E5ACBF; }
//           .text-coral { color: #F6A28C; }
//           .from-coral { --tw-gradient-from: #F6A28C; }
//           .to-peach { --tw-gradient-to: #E8B180; }
//           .submit-btn {
//             background: linear-gradient(45deg, #F6A28C, #E8B180);
//           }
//           .role-card {
//             box-shadow: 0 4px 18px rgba(0,0,0,0.07);
//           }
//           .role-card.selected {
//             box-shadow: 0 8px 32px rgba(45, 45, 130, 0.13);
//             border-color: #E5ACBF;
//             background-color: hsl(260, 35%, 95%);
//           }
//           .animate-spin {
//             animation: spin 1s linear infinite;
//           }
//           @keyframes spin {
//             from { transform: rotate(0deg); }
//             to { transform: rotate(360deg); }
//           }
//         `}
//       </style>
//       {showErrorModal && <Modal />}
//       {view === 'login' && <LoginView />}
//       {view === 'signup' && <SignupView />}
//       {view === 'dashboard' && <DashboardView />}
//     </div>
//   );
// }




import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    signOut, 
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// --- 1. Firebase Configuration ---
// The global __firebase_config variable will be used here.
// Do not replace it manually.
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
// eslint-disable-next-line no-unused-vars
const db = getFirestore(app);

// --- 2. Style Objects ---
const styles = {
    // Layouts & Containers
    appContainer: {
        minHeight: '100vh',
        backgroundColor: '#f7fafc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
    },
    authContainer: {
        width: '100%',
        maxWidth: '448px',
        margin: '0 auto',
        textAlign: 'center',
        backgroundColor: '#fff',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        borderRadius: '0.75rem',
        padding: '2.5rem 2rem',
    },
    // Typography
    heading: {
        fontSize: '1.875rem',
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#1f2937',
        marginBottom: '0.5rem',
    },
    subheading: {
        color: '#6b7280',
        marginBottom: '2rem',
    },
    errorText: {
        backgroundColor: '#fee2e2',
        border: '1px solid #fca5a5',
        color: '#b91c1c',
        padding: '0.75rem 1rem',
        borderRadius: '0.5rem',
        marginBottom: '1rem',
        textAlign: 'center',
        fontSize: '0.875rem',
    },
    welcomeText: {
        color: '#4b5563',
        marginBottom: '1.5rem',
        fontSize: '1.125rem',
    },
    userHighlight: {
        fontWeight: 'bold',
        color: '#1f2937',
    },
    // Buttons
    button: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        fontWeight: 'bold',
        padding: '0.75rem 1.5rem',
        borderRadius: '0.5rem',
        border: 'none',
        cursor: 'pointer',
        width: '100%',
        transition: 'background-color 0.2s, box-shadow 0.2s',
        fontSize: '1rem',
    },
    buttonGoogle: {
        backgroundColor: '#4285F4',
        color: '#fff',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    },
    buttonGoogleHover: {
        backgroundColor: '#357ae8',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    },
    buttonDanger: {
        backgroundColor: '#ef4444',
    },
    buttonDangerHover: {
        backgroundColor: '#dc2626',
    },
    googleIcon: {
        width: '24px',
        height: '24px',
        marginRight: '12px',
        backgroundColor: '#fff',
        borderRadius: '50%',
        padding: '2px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    }
};

// --- 3. Custom Hooks & Components ---
const useHover = () => {
    const [isHovered, setIsHovered] = useState(false);
    const hoverProps = {
        onMouseEnter: () => setIsHovered(true),
        onMouseLeave: () => setIsHovered(false),
    };
    return [isHovered, hoverProps];
};

const GoogleIcon = () => (
    <div style={styles.googleIcon}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20px" height="20px">
            <path fill="#EA4335" d="M24 9.5c3.9 0 6.9 1.6 9 3.6l6.8-6.8C35.9 2.6 30.4 0 24 0 14.9 0 7.2 5.1 3 12.6l7.6 5.9C12.4 13.1 17.7 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.9 24.5c0-1.6-.1-3.2-.4-4.7H24v9h12.8c-.6 2.9-2.2 5.4-4.7 7.1l7.6 5.9c4.4-4.1 7.1-10.1 7.1-17.3z"/>
            <path fill="#FBBC05" d="M10.6 28.5c-.3-.9-.5-1.9-.5-2.9s.2-2 .5-2.9l-7.6-5.9C1.2 20.5 0 24.1 0 28c0 3.9 1.2 7.5 3 10.7l7.6-5.9c-.3-.8-.5-1.8-.5-2.8z"/>
            <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.7l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-3.6-13.4-8.5l-7.6 5.9C7.2 42.9 14.9 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
        </svg>
    </div>
);

// --- 4. Authentication Components ---

// A. LoginView Component
function LoginView() {
    const [error, setError] = useState(null);
    const [isHovered, hoverProps] = useHover();

    const handleGoogleSignIn = async () => {
        const provider = new GoogleAuthProvider();
        try {
            setError(null);
            const result = await signInWithPopup(auth, provider);
            console.log('Signed in with Google:', result.user);
        } catch (err) {
            console.error("Error signing in with Google:", err);
            setError(err.message);
        }
    };

    return (
        <div style={styles.authContainer}>
            <h1 style={styles.heading}>Welcome</h1>
            <p style={styles.subheading}>Sign in to continue</p>
            {error && <p style={styles.errorText}>{error}</p>}
            <button
                onClick={handleGoogleSignIn}
                style={{
                    ...styles.button,
                    ...styles.buttonGoogle,
                    ...(isHovered && styles.buttonGoogleHover),
                }}
                {...hoverProps}
            >
                <GoogleIcon />
                Sign in with Google
            </button>
        </div>
    );
}

// B. Home Component (for authenticated users)
function Home({ user }) {
    const [isHovered, hoverProps] = useHover();

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            console.log('User signed out');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    return (
        <div style={styles.authContainer}>
            <h1 style={styles.heading}>Welcome back!</h1>
            <p style={styles.welcomeText}>
                You are logged in as <span style={styles.userHighlight}>{user.displayName || 'User'}</span>.
            </p>
            <button
                onClick={handleSignOut}
                style={{
                    ...styles.button,
                    ...styles.buttonDanger,
                    ...(isHovered && styles.buttonDangerHover),
                }}
                {...hoverProps}
            >
                Sign Out
            </button>
        </div>
    );
}

// --- 5. Main App Component ---
export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        
        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div style={styles.appContainer}>
                <p style={{ fontSize: '1.25rem', color: '#4b5563' }}>Loading...</p>
            </div>
        );
    }

    return (
        <div style={styles.appContainer}>
            {user ? <Home user={user} /> : <LoginView />}
        </div>
    );
}
