const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestUser() {
  const email = 'test_owner_escolta@example.com';
  const password = 'TestPassword123!';

  // Create auth user
  const { data: user, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (error) {
    console.error('Error creating user:', error);
    if (error.message.includes('already registered')) {
        console.log('User already exists. We will just proceed.');
    } else {
        return;
    }
  }

  const userId = user?.user?.id;
  
  if (userId) {
      console.log('User created:', userId);

      // Give them owner role
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email,
          full_name: 'Test Owner',
          role: 'admin',
          features: {
              dashboard: true,
              leads: true,
              tramites: true
          },
          has_leads_access: true
        });

      if (profileError) {
        console.error('Error updating profile:', profileError);
      } else {
        console.log('Profile updated successfully to admin.');
      }
  } else {
      console.log('Trying to find existing user...');
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
      const existingUser = users.find(u => u.email === email);
      if (existingUser) {
          console.log('Found existing user:', existingUser.id);
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: existingUser.id,
              email,
              full_name: 'Test Owner',
              role: 'admin',
              features: {
                  dashboard: true,
                  leads: true,
                  tramites: true
              },
              has_leads_access: true
            });
            if (!profileError) console.log('Profile updated to admin.');
      }
  }
}

createTestUser();
