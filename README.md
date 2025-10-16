# QUANTIX

##  Event Planning Website

Event-ually Perfect is a full-stack event planning platform that connects event planners and vendors within a unified digital ecosystem. The system streamlines the event management workflow, promotes real-time collaboration, and centralizes communication and data management. Event-ually Perfect provides an end-to-end solution that enables planners to create and manage events, discover and engage vendors, negotiate and manage contracts, invite and track guests, exchange messages in real-time, find inspiration, and export event-related data and artifacts. Vendors, in turn, can maintain detailed profiles, manage requests, and communicate seamlessly with planners.

## 🚀 Features
| 🧾 **Guest Management** | Create & update guest lists, send Gmail invitations, and track RSVP responses. |
| 🛍️ **Vendors & Requests** | Discover vendors, send requests, and view detailed vendor profiles (name, business, contact). |
| 📜 **Contracts** | Create and manage contract records between planners and vendors. |
| 💬 **Real-Time Chat** | Planner-vendor chat with persistent sidebar history, unread count tracking, and profanity filtering. |
| 🗓️ **Event Blueprint** | Build schedules, notes, and details; export as CSV/JSON or print-friendly format. |
| 📸 **Unsplash Integration** | Search for and preview event inspiration photos with proper attribution and download tracking. |
| ✉️ **Email Invitations** | Automatically send Gmail-backed invites with event details and themes. |
| 🔐 **Authentication & Data** | Supabase-backed user auth, events, messages, and guests with secure session management. |

## 🔗 Visit our site
Click [here](http://quantix-frontend.vercel.app/)

## 👥 Our Team
Karabo Bopape   
Ammaarah Cassim   
Zaneerah Essop   
Raeesa Lorgat   
Tariro Muvevi   
Imaan Saloojee   

## 🖥 Tech Stack 
 -Frontend: Javascript xml, ReactJS  
 -Backend: NodeJS, ExpressJS
 -Database: Supabase
 -Authentication: Google OAuth   
 -CI/CD Pipeline: Github actions      
 -Testing: Jest 

## Local Setup and Installation

1. Clone the repository  
`git clone https://github.com/ZaneerahEssop/QUANTIX.git`
2. Install dependencies  
```
cd QUANTIX-11/Backend && npm install
cd ../frontend && npm install
```
3. Configure environment variables (minimal)
- Backend `.env`:
  - `REACT_APP_BASE_URL=http://localhost:3000` (CORS)
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - `UNSPLASH_ACCESS_KEY`, `UNSPLASH_API_BASE=https://api.unsplash.com`
  - `MODERATION_API_URL`, `MODERATION_API_KEY`
  - `GMAIL_USER`, `GMAIL_APP_PASSWORD` (16‑char App Password)
- Frontend `.env` (optional):
  - `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`
4. Start the backend  
```
cd Backend
npm run dev   # or npm start
```
5. Start the frontend  
```
cd ../frontend
npm start
```
Frontend: `http://localhost:3000`  |  Backend: `http://localhost:5000`
