import { Injectable, signal, computed } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase: SupabaseClient;
  currentUser = signal<any>(null);
  isLoggedIn = computed(() => !!this.currentUser());

  getSupabase() {
    return this.supabase;
  }

  // Replace getAccessToken() in auth.ts with this:
async getAccessToken(): Promise<string | null> {
    try {
        // First try to get current session
        const { data, error } = await this.supabase.auth.getSession();
        if (error || !data.session) {
            // Try to refresh
            const { data: refreshData, error: refreshError } = await this.supabase.auth.refreshSession();
            if (refreshError || !refreshData.session) {
                // Session dead — redirect to login
                this.currentUser.set(null);
                return null;
            }
            return refreshData.session.access_token;
        }
        return data.session.access_token;
    } catch {
        return null;
    }
}

  constructor() {
    this.supabase = createClient(
    environment.supabaseUrl, 
    environment.supabaseKey,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
        }
    }
  );  
}

  async register(email: string, password: string, fullName: string, phone: string, role: string) {
    // Step 1: Create Auth User
    const { data, error } = await this.supabase.auth.signUp({ email, password });
    
    if (error) return { success: false, message: error.message };

    // Step 2: Insert Profile (Now protected by the new RLS policy)
    if (data.user) {
      const { error: dbError } = await this.supabase
        .from('profiles')
        .insert([{ 
          id: data.user.id, 
          full_name: fullName, 
          email: email,
          phone: phone, 
          role: role 
        }]);
      
      if (dbError) return { success: false, message: dbError.message };
    }
    return { success: true };
  }

  async login(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, message: error.message };

    const { data: profile } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    this.currentUser.set(profile);
    return { success: true };
  }

  async logout() {
    await this.supabase.auth.signOut();
    this.currentUser.set(null);
  }
}