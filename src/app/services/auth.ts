import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Replace these with your actual keys from Supabase Dashboard -> Settings -> API
  private supabase: SupabaseClient = createClient(
    'https://your-project-id.supabase.co', 
    'your-anon-public-key'
  );

  // These keep your UI in sync (Logged in vs Logged out)
  currentUser = signal<any>(null);
  isLoggedIn = signal<boolean>(false);

  constructor() {}

  async login(credentials: { email: string; pass: string }) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.pass,
    });

    if (error) return { success: false, message: error.message };

    this.currentUser.set(data.user);
    this.isLoggedIn.set(true);
    return { success: true };
  }

  async register(email: string, pass: string) {
    const { data, error } = await this.supabase.auth.signUp({ email, password: pass });
    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  async logout() {
    await this.supabase.auth.signOut();
    this.currentUser.set(null);
    this.isLoggedIn.set(false);
  }
}