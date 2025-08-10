import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '',
  define: {
    __API_BASE__: JSON.stringify(process.env.VITE_API_BASE || ''),
    __API_TOKEN__: JSON.stringify(process.env.VITE_API_TOKEN || '')
  }
})