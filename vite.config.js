import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Permite probar la app en tu teléfono conectado a la misma red WiFi
    port: 5173,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true, // Limpia la carpeta dist antes de cada build para evitar archivos obsoletos
    chunkSizeWarningLimit: 1000, // Evita avisos molestos de tamaño durante la compilación
  },
});
