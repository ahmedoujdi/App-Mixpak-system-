import React, { Component } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Control de Errores Global (Error Boundary ISO/MES)
 * Captura fallos de ejecución en tiempo real sin romper toda la aplicación.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error crítico en Nexus ERP Engine:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            backgroundColor: "#0B0C10",
            color: "#FFFFFF",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'SF Pro Display', Roboto, sans-serif",
            textAlign: "center"
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              backgroundColor: "rgba(255, 59, 48, 0.15)",
              border: "1px solid rgba(255, 59, 48, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16
            }}
          >
            <AlertTriangle size={28} color="#FF3B30" />
          </div>

          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, letterSpacing: "-0.5px" }}>
            Interrupción en Núcleo ERP / MES
          </h1>
          <p
            style={{
              margin: "8px 0 24px",
              fontSize: 13,
              color: "rgba(255,255,255,0.6)",
              maxWidth: 420,
              lineHeight: 1.5
            }}
          >
            Se ha producido una excepción no controlada en el renderizado de la interfaz. Los datos en segundo plano se mantienen protegidos.
          </p>

          <button
            onClick={this.handleReload}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: "#007AFF",
              color: "#FFF",
              border: "none",
              borderRadius: 10,
              padding: "10px 20px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0, 122, 255, 0.3)"
            }}
          >
            <RefreshCw size={16} /> Reiniciar Sesión SCADA
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Inicialización de la raíz en React 18
const rootElement = document.getElementById("root");

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
