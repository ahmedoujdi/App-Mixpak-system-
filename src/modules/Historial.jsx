import React, { useState, useMemo } from "react";
import { History, Search, ShieldCheck, UserCheck, Clock } from "lucide-react";
import { COLORS, inputStyle, StatusBadge } from "./shared.jsx";
import ExportButton from "./ExportModule.jsx";

const MOCK_AUDIT_LOGS = [
  { id: "log-1", module: "Mantenimiento", action: "Creación OT", details: "Se creó la orden OT-2026-001 para Envasadora Rotativa A1", userEmail: "operaciones@mixpak.com", createdAt: "2026-07-30 14:22" },
  { id: "log-2", module: "Materiales", action: "Ajuste de Stock", details: "Reducción de stock en Resina Polietileno HD-120 (-50 kg)", userEmail: "almacen@mixpak.com", createdAt: "2026-07-30 11:05" },
  { id: "log-3", module: "Producción", action: "Cierre de Lote", details: "Lote L-2026-088 marcado como COMPLETADO (4,850 unidades)", userEmail: "planta@mixpak.com", createdAt: "2026-07-29 18:40" },
  { id: "log-4", module: "Calidad", action: "Reporte de Incidencia", details: "Registrada no conformidad REF-QUAL-01 en Lote L-2026-088", userEmail: "calidad@mixpak.com", createdAt: "2026-07-29 09:15" },
];

export default function HistorialModule({ currentUser, globalSearch = "" }) {
  const [logs] = useState(MOCK_AUDIT_LOGS);
  const [searchTerm, setSearchTerm] = useState("");
  const [moduleFilter, setModuleFilter] = useState("todos");

  const effectiveSearch = globalSearch || searchTerm;

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        log.details.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        log.action.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        log.userEmail.toLowerCase().includes(effectiveSearch.toLowerCase());

      const matchesModule = moduleFilter === "todos" || log.module === moduleFilter;

      return matchesSearch && matchesModule;
    });
  }, [logs, effectiveSearch, moduleFilter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "800", color: COLORS.textMain }}>
            Historial de Auditoría & Trazabilidad
          </h1>
          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: COLORS.textMuted }}>
            Registro inmutable de actividades, cambios de estado y eventos del sistema
          </p>
        </div>

        <ExportButton
          moduleName="Historial"
          data={filteredLogs}
          userEmail={currentUser?.email || "operaciones@mixpak.com"}
          search={effectiveSearch}
        />
      </div>

      {/* Controles de búsqueda y filtros */}
      <div style={{ backgroundColor: COLORS.cardBg, border: `1px solid ${COLORS.cardBorder}`, borderRadius: "12px", padding: "16px", display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ position: "relative", minWidth: "260px", flex: 1 }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: COLORS.textMuted }} />
          <input
            type="text"
            placeholder="Buscar por detalle, acción o usuario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ ...inputStyle, paddingLeft: "36px" }}
          />
        </div>

        <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
          <option value="todos">Todos los módulos</option>
          <option value="Mantenimiento">Mantenimiento</option>
          <option value="Materiales">Materiales</option>
          <option value="Producción">Producción</option>
          <option value="Calidad">Calidad</option>
        </select>
      </div>

      {/* Tabla de Registros */}
      <div style={{ backgroundColor: COLORS.cardBg, border: `1px solid ${COLORS.cardBorder}`, borderRadius: "12px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
          <thead>
            <tr style={{ backgroundColor: "rgba(255, 255, 255, 0.02)", borderBottom: `1px solid ${COLORS.cardBorder}` }}>
              <th style={thStyle}>Fecha / Hora</th>
              <th style={thStyle}>Módulo</th>
              <th style={thStyle}>Acción</th>
              <th style={thStyle}>Detalle del Evento</th>
              <th style={thStyle}>Usuario Responsable</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => (
              <tr key={log.id} style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                <td style={{ ...tdStyle, color: COLORS.textMuted, whiteSpace: "nowrap" }}>{log.createdAt}</td>
                <td style={tdStyle}><StatusBadge status={log.module.toUpperCase()} type="info" /></td>
                <td style={{ ...tdStyle, fontWeight: "600" }}>{log.action}</td>
                <td style={tdStyle}>{log.details}</td>
                <td style={{ ...tdStyle, color: COLORS.primary, fontWeight: "500" }}>{log.userEmail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle = { padding: "12px 16px", fontWeight: "600", fontSize: "12px", color: COLORS.textMuted };
const tdStyle = { padding: "12px 16px", color: COLORS.textMain };
