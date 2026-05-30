import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // <-- NEW: The Tailwind v4 Bridge

export default defineConfig({
  plugins: [
    tailwindcss(), // <-- NEW: Activate it here!
    react()
  ],
})