const url = 'https://kjestbshetpglycmmrem.supabase.co/rest/v1/clubs?select=*&limit=1';
const apikey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqZXN0YnNoZXRwZ2x5Y21tcmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNjIyMjYsImV4cCI6MjEwMjYzODIyNn0.hd5pwayAu7o3fcVekqo6UvMTJL_qYIj_gwUtQyKQFao';
fetch(url, {
  method: 'GET',
  headers: {
    'apikey': apikey,
    'Content-Type': 'application/json'
  }
}).then(res => res.json()).then(console.log).catch(console.error);
