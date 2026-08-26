import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const supabaseUrl =
    env.VITE_SUPABASE_URL ||
    env.NEXT_PUBLIC_SUPABASE_URL ||
    env.SUPABASE_URL ||
    '';
  const supabaseAnonKey =
    env.VITE_SUPABASE_ANON_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_ANON_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    '';
  const supabaseBucket =
    env.VITE_SUPABASE_STORAGE_BUCKET ||
    env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ||
    env.SUPABASE_STORAGE_BUCKET ||
    'coralhub-media';
  const supabaseMaxUploadMb =
    env.VITE_SUPABASE_MAX_UPLOAD_MB ||
    env.NEXT_PUBLIC_SUPABASE_MAX_UPLOAD_MB ||
    env.SUPABASE_MAX_UPLOAD_MB ||
    '50';

  return {
    logLevel: 'error',
    plugins: [react()],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
      'import.meta.env.VITE_SUPABASE_STORAGE_BUCKET': JSON.stringify(supabaseBucket),
      'import.meta.env.VITE_SUPABASE_MAX_UPLOAD_MB': JSON.stringify(supabaseMaxUploadMb),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
