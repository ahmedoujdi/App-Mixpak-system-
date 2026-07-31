import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "./firebase.js";
import { 
  History, 
  Search, 
  Download, 
  Filter, 
  ShieldAlert, 
  Activity, 
  User, 
  Clock, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  KeyRound, 
  FileSpreadsheet,
  Terminal,
  Cpu,
  Eye,
  RefreshCw
} from "lucide-react";
import { 
  primaryButtonStyle, 
  ghostButtonStyle, 
  secondaryButtonStyle, 
  inputStyle, 
  CenteredMessage, 
  EmptyState, 
  ModalShell, 
  exportToCsv, 
  inDateRange, 
  DateRangeFilter, 
  formatTimestamp 
} from "./shared.jsx";

export default function Historial({ user }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [limitCount, setLimitCount] = useState(100);
  
  // Filtros de Auditoría
  const [searchTerm, setSearchTerm] = useState("");
  const [filterModule, setFilterModule] = useState("todos");
  const [filterSeverity, setFilterSeverity] = useState("todos"); // "todos" | "info" | "warning" | "critical" | "signature"
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Estado para Inspección de Payload en Modal
  const [selectedLog, setSelectedLog] = useState(null);

  // Carga en tiempo real de los Registros de Actividad de Firestore
  useEffect(() => {
    const q = query(
      collection(db, "activity_logs"), 
      orderBy("timestamp", "desc"), 
      limit(limitCount)
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setLogs(docs);
      setLoading(false);
    });

    return () => unsub();
  }, [limitCount]);

  // Filtrado de Logs en Cliente
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesModule = filterModule === "todos" || log.module === filterModule;
      
      // Clasificación de Severidad Dinámica basada en Acción/Detalles
      let severity = "info";
      const actionText = `${log.action} ${log.details}`.toLowerCase();
      if (actionText.includes("firma") || actionText.includes("aprobado")) severity = "signature";
      else if (actionText.includes("no conformidad") || actionText.includes("falla") || actionText.includes("rechazado")) severity = "critical";
      else if (actionText.includes("edicion") || actionText.includes("modificacion") || actionText.includes("stock bajo")) severity = "warning";

      const matchesSeverity = filterSeverity === "todos" || severity === filterSeverity;

      const matchesSearch = 
        (log.action || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.details || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.user || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.module || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDate = inDateRange(log.timestamp, fromDate, toDate);

      return matchesModule && matchesSeverity && matchesSearch && matchesDate;
    });
  }, [logs, filterModule, filterSeverity, searchTerm, fromDate, toDate]);

  // Métricas de Auditoría en Tiempo Real
  const metrics = useMemo(() => {
    const total = logs.length;
    const signatures = logs.filter((l) => (l.action || "").toLowerCase().includes("firma") || (l.action || "").toLowerCase().includes("aprobado")).length;
    const criticalEvents = logs.filter((l) => (l.action || "").toLowerCase().includes("no conformidad") || (l.details || "").toLowerCase().includes("falla")).length;
    
    // Contorno por Módulo
    const modulesCount = logs.reduce((acc, curr) => {
      const mod = curr.module || "General";
      acc[mod] = (acc[mod] || 0) + 1;
      return acc;
    }, {});

    return { total, signatures, criticalEvents, modulesCount };
  }, [logs]);

  if (loading) {
    return <CenteredMessage text="Accediendo al Registro Inmutable de Auditoría SCADA..." />;
  }

  return (
    <div style={{ maxWidth: 1350, margin: "0 auto", paddingBottom: 50 }}>
      
      {/* HEADER PRINCIPAL */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ background: "rgba(88,86,214,0.15)", color: "#5856D6", fontSize: 10, fontWeight: 900, padding: "2px 8px", borderRadius: 4 }}>
              TRAZABILIDAD ISO 27001 & REGISTROS DE SEGURIDAD
            </span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, color: "#fff", letterSpacing: "-0.5px" }}>
            Historial & Bitácora de Auditoría
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
            Monitoreo en tiempo real de transacciones, firmas digitales, modificaciones de stock y eventos del sistema.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => exportToCsv("auditoria_planta_enterprise", filteredLogs)} style={ghostButtonStyle}>
            <Download size={16} /> Exportar Registro CSV
          </button>
        </div>
      </div>

      {/* STRIP DE KPIS AUDITORÍA */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "rgba(88, 86, 214, 0.08)", border: "1px solid rgba(88, 86, 214, 0.2)", borderRadius: 16, padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#5856D6" }}>EVENTOS REGISTRADOS</span>
            <History size={18} color="#5856D6" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginTop: 6 }}>{metrics.total}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>Muestra actual en memoria</div>
        </div>

        <div style={{ background: "rgba(52, 199, 89, 0.08)", border: "1px solid rgba(52, 199, 89, 0.2)", borderRadius: 16, padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#34C759" }}>FIRMAS DIGITALES</span>
            <KeyRound size={18} color="#34C759" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginTop: 6 }}>{metrics.signatures}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>Aprobaciones autorizadas</div>
        </div>

        <div style={{ background: "rgba(255, 59, 48, 0.08)", border: "1px solid rgba(255, 59, 48, 0.2)", borderRadius: 16, padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#FF3B30" }}>ALERTAS / DESVIACIONES</span>
            <AlertTriangle size={18} color="#FF3B30" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginTop: 6 }}>{metrics.criticalEvents}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>Eventos de falla o CAPA</div>
        </div>
      </div>

      {/* FILTROS AVANZADOS & CANTIDAD DE REGISTROS */}
      <div 
        style={{ 
          background: "rgba(255,255,255,0.02)", 
          border: "1px solid rgba(255,255,255,0.06)", 
          borderRadius: 16, 
          padding: 16, 
          marginBottom: 20,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: 260 }}>
          <Search size={16} color="rgba(255,255,255,0.4)" style={{ position: "absolute", left: 12, top: 12 }} />
          <input 
            type="text" 
            placeholder="Buscar por acción, usuario, módulo o detalle técnico..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            style={{ ...inputStyle, paddingLeft: 38 }} 
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <select value={filterModule} onChange={(e) => setFilterModule(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
            <option value="todos" style={{ background: "#12141d" }}>Todos los Módulos</option>
            <option value="Producción" style={{ background: "#12141d" }}>Producción</option>
            <option value="Inventario" style={{ background: "#12141d" }}>Inventario</option>
            <option value="Calidad" style={{ background: "#12141d" }}>Calidad</option>
            <option value="Mantenimiento" style={{ background: "#12141d" }}>Mantenimiento</option>
            <option value="Aprobaciones" style={{ background: "#12141d" }}>Aprobaciones</option>
          </select>

          <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
            <option value="todos" style={{ background: "#12141d" }}>Todas las Categorías</option>
            <option value="signature" style={{ background: "#12141d" }}>Firmas & Aprobaciones</option>
            <option value="critical" style={{ background: "#12141d" }}>Fallas & CAPA</option>
            <option value="warning" style={{ background: "#12141d" }}>Modificaciones</option>
            <option value="info" style={{ background: "#12141d" }}>Informativos / Sistema</option>
          </select>

          <select value={limitCount} onChange={(e) => setLimitCount(Number(e.target.value))} style={{ ...inputStyle, width: "auto" }}>
            <option value={50} style={{ background: "#12141d" }}>50 logs</option>
            <option value={100} style={{ background: "#12141d" }}>100 logs</option>
            <option value={250} style={{ background: "#12141d" }}>250 logs</option>
          </select>

          <DateRangeFilter from={fromDate} to={toDate} onFromChange={setFromDate} onToChange={setToDate} />
        </div>
      </div>

      {/* TABLA ENTERPRISE DE AUDITORÍA DE AUDITORÍA */}
      {filteredLogs.length === 0 ? (
        <EmptyState 
          Icon={History} 
          title="Sin Eventos Registrados" 
          message="No se encontraron entradas en la bitácora bajo los criterios de filtrado seleccionados." 
        />
      ) : (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13, color: "#fff" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)", fontSize: 11, textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
                <th style={{ padding: "14px 16px" }}>Marca de Tiempo</th>
                <th style={{ padding: "14px 16px" }}>Usuario / Operador</th>
                <th style={{ padding: "14px 16px" }}>Módulo</th>
                <th style={{ padding: "14px 16px" }}>Acción Auditada</th>
                <th style={{ padding: "14px 16px" }}>Detalles de la Operación</th>
                <th style={{ padding: "14px 16px", textAlign: "right" }}>Inspeccionar</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const actionLower = (log.action || "").toLowerCase();
                const isSignature = actionLower.includes("firma") || actionLower.includes("aprobado");
                const isCritical = actionLower.includes("no conformidad") || actionLower.includes("falla");

                return (
                  <tr key={log.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "14px 16px", whiteSpace: "nowrap", fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Clock size={13} color="rgba(255,255,255,0.4)" />
                        {formatTimestamp(log.timestamp)}
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 6 }}>
                        <User size={13} color="#007AFF" />
                        {log.user || "Sistema"}
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 4, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.8)" }}>
                        {log.module || "General"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ 
                        fontWeight: 800, 
                        color: isSignature ? "#34C759" : isCritical ? "#FF3B30" : "#fff" 
                      }}>
                        {log.action}
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", color: "rgba(255,255,255,0.7)", maxWidth: 350, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {log.details || "Sin información adicional"}
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <button 
                        onClick={() => setSelectedLog(log)} 
                        style={{ ...ghostButtonStyle, padding: "4px 8px", fontSize: 11 }}
                      >
                        <Eye size={13} /> Payload
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL PAYLOAD TÉCNICO SCADA */}
      {selectedLog && (
        <ModalShell title="Payload de Evento Auditado" onClose={() => setSelectedLog(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, color: "#007AFF", fontWeight: 800, marginBottom: 4 }}>METADATOS DEL LOG</div>
              <div style={{ fontSize: 13, color: "#fff", fontWeight: 700 }}>ID Log: {selectedLog.id}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
                Ejecutado por: {selectedLog.user} | Módulo: {selectedLog.module}
              </div>
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>Detalles Inmutables:</div>
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", padding: 12, borderRadius: 8, fontSize: 13, color: "rgba(255,255,255,0.85)", fontFamily: "monospace" }}>
              {selectedLog.details || "No se adjuntaron metadatos JSON al evento."}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <button onClick={() => setSelectedLog(null)} style={secondaryButtonStyle}>
                Cerrar Visor
              </button>
            </div>
          </div>
        </ModalShell>
      )}

    </div>
  );
}
