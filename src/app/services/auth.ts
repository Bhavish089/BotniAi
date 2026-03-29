import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // We use (environment as any) here to bypass the TS2339 error on these two lines
  private supabase: SupabaseClient = createClient(
    (environment as any).supabaseUrl,
    (environment as any).supabaseKey
  );

  currentUser = signal<User | null>(null);
  isLoggedIn = signal<boolean>(false);

  constructor() {
    // Check for existing session on app load
    this.supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        this.currentUser.set(data.user);
        this.isLoggedIn.set(true);
      }
    });
  }

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
    const { data, error } = await this.supabase.auth.signUp({ 
      email: email, 
      password: pass 
    });

    if (error) return { success: false, message: error.message };

    // Auto-login after successful registration
    this.currentUser.set(data.user);
    this.isLoggedIn.set(true);
    return { success: true };
  }

  async logout() {
    await this.supabase.auth.signOut();
    this.currentUser.set(null);
    this.isLoggedIn.set(false);
  }
}