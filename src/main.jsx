import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// 1. Obtención y validación del nodo contenedor en el DOM
const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error(
    "Error crítico: No se encontró el elemento contenedor '#root' en el archivo HTML."
  );
  // Mensaje visual directo de emergencia si el DOM falló completamente
  document.body.innerHTML = `
    <div style="min-height: 100vh; background: #121314; color: #F5F3EC; display: flex; align-items: center; justify-content: center; font-family: sans-serif; padding: 20px; text-align: center;">
      <div>
        <h2 style="color: #FF5252; margin-bottom: 8px;">Error de Inicialización</h2>
        <p style="color: #B9B6AC; font-size: 14px;">No se pudo cargar la aplicación. Por favor, refresca la página o contacta al administrador.</p>
      </div>
    </div>
  `;
} else {
  // 2. Creación del Root y renderizado dentro del modo estricto de React
  const root = ReactDOM.createRoot(rootElement);

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
