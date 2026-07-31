import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase.js";
import { 
  TrendingUp, 
  Layers, 
  ShieldCheck, 
  Clock, 
  AlertCircle, 
  PackageCheck, 
  ArrowUpRight, 
  ArrowDownRight, 
  Activity, 
  CheckCircle2, 
  AlertOctagon 
} from "lucide-react";
import { primaryButtonStyle, ghostButtonStyle, CenteredMessage } from "../shared.jsx";

export default function Dashboard({ user, onNavigate }) {
  const [materials, setMaterials] = useState([]);
  const [qualityIssues, setQualityIssues] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Escuchar Materiales
    const unsubMaterials = onSnapshot(collection(db, "inventory_materials"), (snap) => {
      setMaterials(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    // 2. Escuchar Calidad
    const unsubQuality = onSnapshot(collection(db, "quality_issues"), (snap) => {
      setQualityIssues(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    // 3. Escuchar Aprobaciones
    const unsubApprovals = onSnapshot(collection(db, "approvals"), (snap) => {
      setApprovals(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    // 4. Escuchar Registro de Actividad
    const qLogs = query(collection(db, "activity_logs"), orderBy("timestamp", "desc"), limit(6));
    const unsubLogs = onSnapshot(qLogs, (snap) => {
      setRecentLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => {
      unsubMaterials();
      unsubQuality();
      unsubApprovals();
      unsubLogs();
    };
  }, []);

  // Cálculos de KPIs
  const metrics = useMemo(() => {
    const totalValuation = materials.reduce((acc, m) => acc + (m.stock || 0) * (m.cost || 0), 0);
    const lowStockItems = materials.filter((m) => (m.stock || 0) <= (m.minStock || 5));
    const openQualityIssues = qualityIssues.filter((q) => q.status !== "cerrada");
    const criticalQuality = openQualityIssues.filter((q) => q.severity === "critica");
    const pendingApprovals = approvals.filter((a) => a.status === "pendiente");

    return {
      totalMaterials: materials.length,
      totalValuation,
      lowStockCount: lowStockItems.length,
      lowStockItems,
      openQualityCount: openQualityIssues.length,
      criticalQualityCount: criticalQuality.length,
      pendingApprovalsCount: pendingApprovals.length,
      pendingApprovals,
    };
  }, [materials, qualityIssues, approvals]);

  if (loading) return <CenteredMessage text="Cargando Dashboard Ejecutivo..." />;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 40 }}>
      {/* Saludo y Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <span style={{ background: "rgba(0, 122, 255, 0.15)", color: "#007AFF", padding: "4px 8px", borderRadius: 6, fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
            EXECUTIVE OVERVIEW
          </span>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: "6px 0 0", letterSpacing: "-0.5px" }}>
            Panel General de Operaciones
          </h1>
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.03)", padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
          Usuario: <strong style={{ color: "#fff" }}>{user.email}</strong>
        </div>
      </div>

      {/* Grid de KPIs Principales */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 28 }}>
        <KpiCard 
          label="Valorización de Inventario" 
          value={`$${metrics.totalValuation.toLocaleString()}`} 
          subtext={`${metrics.totalMaterials} ítems en catálogo`}
          icon={PackageCheck} 
          accentColor="#34C759" 
        />
        <KpiCard 
          label="Alertas de Stock Bajo" 
          value={metrics.lowStockCount} 
          subtext="Requieren reposición inmediata"
          icon={AlertCircle} 
          accentColor="#FF3B30" 
          alert={metrics.lowStockCount > 0}
          onClick={() => onNavigate && onNavigate("materiales")}
        />
        <KpiCard 
          label="Incidencias de Calidad" 
          value={metrics.openQualityCount} 
          subtext={`${metrics.criticalQualityCount} en severidad crítica`}
          icon={ShieldCheck} 
          accentColor="#FF9500" 
          onClick={() => onNavigate && onNavigate("calidad")}
        />
        <KpiCard 
          label="Aprobaciones Pendientes" 
          value={metrics.pendingApprovalsCount} 
          subtext="Esperando firma o revisión"
          icon={Clock} 
          accentColor="#5856D6" 
          badge={metrics.pendingApprovalsCount > 0 ? "Pendiente" : null}
          onClick={() => onNavigate && onNavigate("aprobaciones")}
        />
      </div>

      {/* Panel de Trabajo de 2 Columnas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: 20, marginBottom: 28 }}>
        
        {/* Columna Izquierda: Acciones Requeridas y Alertas Urgentes */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          
          {/* Tarjeta: Aprobaciones Pendientes de Atención */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8, color: "#fff" }}>
                <Clock size={18} color="#FF9500" /> Requieren tu Aprobación
              </h3>
              {onNavigate && (
                <button onClick={() => onNavigate("aprobaciones")} style={{ background: "none", border: "none", color: "#007AFF", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  Ver todas →
                </button>
              )}
            </div>

            {metrics.pendingApprovals.length === 0 ? (
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", padding: "12px 0" }}>No hay solicitudes esperando tu revisión en este momento.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {metrics.pendingApprovals.slice(0, 3).map((item) => (
                  <div key={item.id} style={{ background: "rgba(0,0,0,0.2)", padding: 12, borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{item.title}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Por: {item.requestedBy}</div>
                    </div>
                    {onNavigate && (
                      <button onClick={() => onNavigate("aprobaciones")} style={{ ...primaryButtonStyle, padding: "5px 10px", fontSize: 11, borderRadius: 6 }}>
                        Revisar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tarjeta: Materiales con Stock Crítico */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8, color: "#fff" }}>
                <AlertCircle size={18} color="#FF3B30" /> Stock por Debajo del Mínimo
              </h3>
              {onNavigate && (
                <button onClick={() => onNavigate("materiales")} style={{ background: "none", border: "none", color: "#007AFF", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  Ir a Materiales →
                </button>
              )}
            </div>

            {metrics.lowStockItems.length === 0 ? (
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", padding: "12px 0" }}>Todos los materiales se encuentran en niveles óptimos de stock.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {metrics.lowStockItems.slice(0, 3).map((mat) => (
                  <div key={mat.id} style={{ background: "rgba(255, 59, 48, 0.08)", padding: 12, borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid rgba(255, 59, 48, 0.2)" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{mat.name}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>SKU: {mat.code || "N/A"}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#FF3B30" }}>{mat.stock} {mat.unit}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Mínimo: {mat.minStock}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Timeline de Actividad Reciente */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column" }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8, color: "#fff" }}>
            <Activity size={18} color="#007AFF" /> Auditoría de Actividad Reciente
          </h3>

          {recentLogs.length === 0 ? (
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", padding: "20px 0" }}>No hay registros de actividad recientes.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
              {recentLogs.map((log) => (
                <div key={log.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: 10 }}>
                  <div style={{ background: "rgba(0, 122, 255, 0.15)", color: "#007AFF", padding: 6, borderRadius: 8, marginTop: 2 }}>
                    <Activity size={14} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
                      {log.action || "Acción"} <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.6)" }}>en {log.module || "Sistema"}</span>
                    </div>
                    {log.target && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>{log.target}</div>}
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                      {log.user} • {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Hace un momento"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, subtext, icon: Icon, accentColor, badge, alert, onClick }) {
  return (
    <div 
      onClick={onClick}
      style={{ 
        background: "rgba(255,255,255,0.02)", 
        border: `1px solid ${alert ? "rgba(255, 59, 48, 0.4)" : "rgba(255,255,255,0.06)"}`, 
        borderRadius: 16, 
        padding: "18px 20px", 
        position: "relative",
        cursor: onClick ? "pointer" : "default",
        transition: "transform 0.15s ease",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{label}</span>
        <div style={{ background: `${accentColor}20`, color: accentColor, padding: 6, borderRadius: 8 }}>
          <Icon size={18} />
        </div>
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, marginTop: 10, color: "#fff" }}>{value}</div>
      {subtext && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{subtext}</div>}
      {badge && (
        <span style={{ position: "absolute", top: 18, right: 48, background: accentColor, color: "#fff", fontSize: 9, padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
          {badge}
        </span>
      )}
    </div>
  );
}
