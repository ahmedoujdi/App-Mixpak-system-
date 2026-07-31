import React, { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase.js";
import {
  useTheme,
  StatCard,
  CenteredMessage,
  calculateKPIs,
  primaryButtonStyle,
  ghostButtonStyle,
  exportToPdf,
  exportToCsv,
} from "../shared.jsx";
import {
  Wrench,
  Package,
  Clock,
  Activity,
  ShieldCheck,
  FileText,
  Download,
  TrendingUp,
} from "lucide-react";

export default function Dashboard() {
  const { theme } = useTheme();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "maintenance_logs"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setLogs(docs);
      setLoading(false);
    }, () => setLoading(false));

    return () => unsub();
  }, []);

  if (loading) return <CenteredMessage text="Cargando panel principal..." />;

  const kpis = calculateKPIs(logs);
  const pendingLogs = logs.filter((l) => l.status === "Pendiente" || l.status === "En Proceso");
  const completedLogs = logs.filter((l) => l.status === "Completado");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 60 }}>
      {/* CABECERA CON ACCIONES */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, background: theme.panel, padding: "16px 20px", borderRadius: 12, border: `1px solid ${theme.panelBorder}`, boxShadow: theme.shadow }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: theme.text }}>
            PANEL DE CONTROL INDUSTRIAL
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: theme.textMuted }}>
            Monitoreo en tiempo real de mantenimiento e indicadores KPI
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => exportToCsv("mantenimientos", logs)} style={ghostButtonStyle(theme)}>
            <Download size={14} /> CSV
          </button>
          <button onClick={() => exportToPdf("Reporte Dashboard", ["Equipo", "Estado", "Técnico"], logs.map(l => [l.equipment, l.status, l.technician]), "dashboard")} style={primaryButtonStyle(theme)}>
            <FileText size={14} /> Reporte PDF
          </button>
        </div>
      </div>

      {/* METRICAS KPIS */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <TrendingUp size={16} color={theme.primary} />
          <span style={{ fontSize: 12, fontWeight: 700, color: theme.textMuted, textTransform: "uppercase" }}>
            Indicadores Clave (KPIs)
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <StatCard label="MTTR (Tiempo Reparación)" value={kpis.mttr} color={theme.safety} Icon={Clock} />
          <StatCard label="MTBF (Entre Fallas)" value={kpis.mtbf} color={theme.steel} Icon={Activity} />
          <StatCard label="Disponibilidad Planta" value={kpis.availability} color={theme.green} Icon={ShieldCheck} />
        </div>
      </div>

      {/* METRICAS DE TRABAJO */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <StatCard label="Órdenes Pendientes" value={pendingLogs.length} color={theme.safety} Icon={Wrench} />
        <StatCard label="Órdenes Completadas" value={completedLogs.length} color={theme.green} Icon={Wrench} />
        <StatCard label="Total de Registros" value={logs.length} color={theme.primary} Icon={Package} />
      </div>
    </div>
  );
}
