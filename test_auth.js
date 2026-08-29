const url = 'https://kjestbshetpglycmmrem.supabase.co/auth/v1/token?grant_type=password';
const apikey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqZXN0YnNoZXRwZ2x5Y21tcmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNjIyMjYsImV4cCI6MjEwMjYzODIyNn0.hd5pwayAu7o3fcVekqo6UvMTJL_qYIj_gwUtQyKQFao';
fetch(url, {
  method: 'POST',
  headers: {
    'apikey': apikey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ email: 'techspark@ritchennai.edu.in', password: 'password123' })
}).then(res => res.json()).then(console.log).catch(console.error);
