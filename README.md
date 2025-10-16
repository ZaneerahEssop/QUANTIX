# QUANTIX

##  Event Planning Website

Event-ually Perfect is a full-stack event planning platform that connects event planners and vendors within a unified digital ecosystem. The system streamlines the event management workflow, promotes real-time collaboration, and centralizes communication and data management. Event-ually Perfect provides an end-to-end solution that enables planners to create and manage events, discover and engage vendors, negotiate and manage contracts, invite and track guests, exchange messages in real-time, find inspiration, and export event-related data and artifacts. Vendors, in turn, can maintain detailed profiles, manage requests, and communicate seamlessly with planners.

## 🚀 Features
- **Guest Management**: Create/update guests, send email invitations, and track responses.
- **Vendors & Requests**: Discover vendors, manage requests, and view vendor profiles (business name + contact).
- **Contracts**: Create and manage simple contract records between planners and vendors.
- **Chat**: Planner–vendor conversations with persistent sidebar history, unread counts, and profanity filtering.
- **Event Blueprint**: Build event schedules, notes, and details; export data as CSV/JSON and print-friendly docs.
- **Unsplash Event Ideas**: Search and preview inspiration photos in `EventDetails` with proper attribution and download tracking.
- **Email Invites**: Sends Gmail-backed invitations including event date/time, planner name, and optional theme.
- **Authentication & Data**: Supabase-backed users, events, conversations, messages, and guests.

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
