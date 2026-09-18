import {
    defineConfig
} from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        // host: escucha en todas las interfaces y no solo en localhost, que
        // es lo que necesita el reenvío de puertos de Codespaces.
        host: true,
        port: 3000,
        // Vite solo responde a los dominios que conoce (protección contra
        // DNS rebinding). El punto inicial permite cualquier subdominio, así
        // sigue valiendo aunque cambie el nombre del Codespace.
        allowedHosts: ['.app.github.dev']
    },
    build: {
        outDir: 'dist'
    }
})