import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true
      },
      '/analyze_resume': 'http://localhost:5001',
      '/analyze_job': 'http://localhost:5001',
      '/generate_cover_letter': 'http://localhost:5001',
      '/tailor_resume': 'http://localhost:5001',
      '/generate_interview_questions': 'http://localhost:5001',
      '/calculate_ats_score': 'http://localhost:5001'
    }
  }
});
