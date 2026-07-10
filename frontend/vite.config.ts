import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const proxyTarget = {
  target: 'http://localhost:5001',
  changeOrigin: true,
  timeout: 180000,      // 3 minutes (180,000ms) for local Ollama completions
  proxyTimeout: 180000  // 3 minutes
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': proxyTarget,
      '/analyze_resume': proxyTarget,
      '/analyze_job': proxyTarget,
      '/generate_cover_letter': proxyTarget,
      '/tailor_resume': proxyTarget,
      '/generate_interview_questions': proxyTarget,
      '/calculate_ats_score': proxyTarget
    }
  }
});
