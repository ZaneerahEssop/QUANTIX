#!/bin/bash

echo "Installing dependencies for QUANTIX Chat System..."

# Install backend dependencies
echo "Installing backend dependencies..."
cd Backend
npm install socket.io

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd ../src
npm install socket.io-client

echo "Dependencies installed successfully!"
echo ""
echo "Next steps:"
echo "1. Run the database schema SQL in your Supabase SQL editor (Backend/database_schema.sql)"
echo "2. Start the backend server: cd Backend && npm run dev"
echo "3. Start the frontend: npm start"
echo ""
echo "The chat system is now ready to use!"
