import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `npm run dev` proxies the API and photos to a running server (PICTOCRAT_SERVER, default localhost:8095)
const server = process.env.PICTOCRAT_SERVER ?? 'http://localhost:8095'

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': server, '/photos': server } },
})
