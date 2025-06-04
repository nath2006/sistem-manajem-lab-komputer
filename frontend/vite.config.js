import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import flowbiteReact from "flowbite-react/plugin/vite";

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 5174,
    host: true
  },
  plugins: [
    react(), 
    tailwindcss(), 
    flowbiteReact()
  ],
})
