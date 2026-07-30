import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";

// ⚠️ RUTAS CORREGIDAS CON ../
import { db } from "../firebase.js";
import { History, Download, Filter, Search } from "lucide-react";
import {
  COLORS,
  inputStyle,
  ghostButtonStyle,
  exportToCsv,
  inDateRange,
  CenteredMessage,
  DateRangeFilter,
} from "../shared.jsx";

export default function Historial() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState("");
  const [selectedModule, setSelectedModule] = useState("todos");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const q = query(
      collection(db, "activity_logs"),
      orderBy("timestamp", "desc"),
      limit(200)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setLogs(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }))
        );
        setLoading(false);
      },
      (err) => {
        console.error("Error al cargar historial:", err);
        setLoading(false);
      }
    );

    return unsub;
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Filtro módulo
      if (selectedModule !== "todos" && log.module !== selectedModule) {
        return false;
      }
      // Filtro fechas
      if (!inDateRange(log.timestamp, dateFrom, dateTo)) {
        return false;
      }
      // Filtro texto libre
      if (search) {
        const text = `${log.user || ""} ${log.action || ""} ${log.details || ""}`.toLowerCase();
        if (!text.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [logs, selectedModule, dateFrom, dateTo, search]);

  const modulesList = ["todos", "Producción", "Calidad", "Materiales", "Aprobaciones"];

  return (
    <div>
      {/* Título */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <h1 style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 20, textTransform: "uppercase", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <History size={22} color={COLORS.steel} /> Historial de Actividades
        </h1>

        <button
          onClick={() =>
            exportToCsv(
              "historial-actividad",
              filteredLogs.map((l) => ({
                fecha: l.timestamp?.toDate ? l.timestamp.toDate().toLocaleString() : "",
                usuario: l.user,
                modulo: l.module,
                accion: l.action,
                detalles: l.details,
              }))
            )
          }
          style={ghostButtonStyle}
        >
          <Download size={16} /> Exportar CSV
        </button>
      </div>

      {/* Barra de Filtros */}
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, padding: 12, borderRadius: 6, marginBottom: 18, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        {/* Búsqueda */}
        <div style={{ position: "relative", flex: "1 1 180px" }}>
          <Search size={14} color={COLORS.textMuted} style={{ position: "absolute", left: 9, top: 10 }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por usuario o acción..."
            style={{ ...inputStyle, paddingLeft: 28, fontSize: 12 }}
          />
        </div>

        {/* Módulo */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Filter size={14} color={COLORS.textMuted} />
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            style={{ ...inputStyle, width: "auto", fontSize: 12, padding: "6px 10px" }}
          >
            {modulesList.map((m) => (
              <option key={m} value={m}>
                {m === "todos" ? "Todos los módulos" : m}
              </option>
            ))}
          </select>
        </div>

        {/* Rango de Fechas */}
        <DateRangeFilter
          from={dateFrom}
          to={dateTo}
          onFromChange={setDateFrom}
          onToChange={setDateTo}
        />
      </div>

      {/* Listado / Tabla */}
      {loading ? (
        <CenteredMessage text="Cargando historial..." />
      ) : filteredLogs.length === 0 ? (
        <CenteredMessage text="No hay registros que coincidan con los filtros seleccionados." />
      ) : (
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 6, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${COLORS.border}`, background: "#0f1722", color: COLORS.textMuted, fontSize: 11, textTransform: "uppercase" }}>
                <th style={{ padding: "10px 14px" }}>Fecha / Hora</th>
                <th style={{ padding: "10px 14px" }}>Usuario</th>
                <th style={{ padding: "10px 14px" }}>Módulo</th>
                <th style={{ padding: "10px 14px" }}>Acción</th>
                <th style={{ padding: "10px 14px" }}>Detalles</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const dateStr = log.timestamp?.toDate
                  ? log.timestamp.toDate().toLocaleString()
                  : "Reciente";

                return (
                  <tr key={log.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                    <td style={{ padding: "10px 14px", color: COLORS.textMuted, whiteSpace: "nowrap", fontFamily: "monospace", fontSize: 11 }}>
                      {dateStr}
                    </td>
                    <td style={{ padding: "10px 14px", fontWeight: 600 }}>{log.user || "Anónimo"}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ background: "#0f1722", border: `1px solid ${COLORS.border}`, padding: "2px 6px", borderRadius: 3, fontSize: 11 }}>
                        {log.module}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", color: COLORS.steel, fontWeight: 600 }}>{log.action}</td>
                    <td style={{ padding: "10px 14px", color: COLORS.textMuted, maxWidt: 300 }}>{log.details || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
