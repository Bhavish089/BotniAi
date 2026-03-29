export interface Environment {
  production: boolean;
  supabaseUrl: string;
  supabaseKey: string;
}

export const environment: Environment = {
  production: false,
  supabaseUrl: 'https://uprrqkvktslztmaonpwm.supabase.co',
  supabaseKey: 'sb_publishable_BnoGrsWezIzrrx__vH_mjA_ACcRS7VQ'
};