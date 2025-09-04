// src/pages/DashboardPage.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../client';

export default function PlannerDashboard({ session }) {
  const [loading, setLoading] = useState(true);
  const [todos, setTodos] = useState([]);

  // Fetch data from the 'todos' table
  useEffect(() => {
    async function getTodos() {
      setLoading(true);
      if (!session) return;

      const { user } = session;
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', user.id)
        .order('id', { ascending: true });

      if (error) {
        console.error('Error fetching todos:', error.message);
      } else {
        setTodos(data);
      }
      setLoading(false);
    }
    getTodos();
  }, [session]); // The dependency array ensures this effect runs when the session changes.

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error.message);
    }
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Welcome, {session.user.email}!</h1>
      <button onClick={handleSignOut}>Sign Out</button>
      <hr />
      <h2>Your To-Do List</h2>
      <ul>
        {todos.length > 0 ? (
          todos.map((todo) => (
            <li key={todo.id}>{todo.task}</li>
          ))
        ) : (
          <p>You have no to-do items.</p>
        )}
      </ul>
    </div>
  );
}