const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function createOverallCoordinators() {
  const accounts = [
    { email: 'clubs@rit.edu', password: 'password123', role: 'OVERALL_CLUBS_ADMIN', name: 'Overall Clubs Coordinator' },
    { email: 'centres@rit.edu', password: 'password123', role: 'OVERALL_CENTRES_ADMIN', name: 'Overall Centres Coordinator' }
  ];

  for (const account of accounts) {
    // 1. Create Auth User
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true
    });

    if (authError) {
      if (authError.code === 'email_exists' || authError.message.includes('already registered')) {
        console.log(`Account ${account.email} already exists. Updating role...`);
        const { data: usersData } = await supabase.auth.admin.listUsers();
        const existingUser = usersData.users.find(u => u.email === account.email);
        if (existingUser) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ role: account.role })
            .eq('id', existingUser.id);
          if (profileError) console.error("Error updating profile role:", profileError);
          else console.log(`Successfully assigned role ${account.role} to existing ${account.email}`);
        }
      } else {
        console.error("Error creating user:", account.email, authError);
      }
    } else if (authData.user) {
      console.log(`Created auth user ${account.email}`);
      
      // 2. Update Profile with Role
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          role: account.role
        })
        .eq('id', authData.user.id);
        
      if (profileError) {
        console.error("Error updating profile role:", profileError);
      } else {
        console.log(`Successfully assigned role ${account.role} to ${account.email}`);
      }
    }
  }
}

createOverallCoordinators();
