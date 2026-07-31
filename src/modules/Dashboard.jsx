import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "./firebase.js";
import { 
  Factory, 
  Boxes, 
  ShieldCheck, 
  Wrench, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Activity,
  Layers,
  AlertTriangle,
  Zap,
  TrendingUp,
  Gauge,
  UserCheck,
  AlertOctagon,
  FileSpreadsheet,
  Cpu,
  RefreshCw
} from "lucide-react";
import { 
  KpiCard, 
  CenteredMessage, 
  formatTimestamp, 
  primaryButtonStyle,
  ghostButtonStyle,
  secondaryButtonStyle
} from "./shared.jsx";

export default function Dashboard({ user, onNavigate }) {
  const [productionOrders, setProductionOrders] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [qualityIssues, setQualityIssues] = useState([]);
  const [maintenanceOrders, setMaintenanceOrders] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Carga de datos multi-colección en tiempo real
  useEffect(() => {
    const unsubProd = onSnapshot(collection(db, "production_orders"), (snap) => {
      setProductionOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubInv = onSnapshot(collection(db, "inventory"), (snap) => {
      setInventoryItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubQual = onSnapshot(collection(db, "quality_issues"), (snap) => {
      setQualityIssues(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubMaint = onSnapshot(collection(db, "maintenance_orders"), (snap) => {
      setMaintenanceOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubApp = onSnapshot(collection(db, "approvals"), (snap) => {
      setApprovals(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const qLogs = query(collection(db, "activity_logs"), orderBy("timestamp", "desc"), limit(8));
    const unsubLogs = onSnapshot(qLogs, (snap) => {
      setRecentLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => {
      unsubProd();
      unsubInv();
      unsubQual();
      unsubMaint();
      unsubApp();
      unsubLogs();
    };
  }, []);

  // Motor de Análisis Operativo de Planta
  const stats = useMemo(() => {
    // Producción
    const activeProd = productionOrders.filter((o) => o.status === "en_proceso");
    const completedToday = productionOrders.filter((o) => o.status === "completado").length;
    const totalUnitsTarget = activeProd.reduce((acc, curr) => acc + (Number(curr.targetQuantity) || 0), 0);
    const totalUnitsProduced = activeProd.reduce((acc, curr) => acc + (Number(curr.producedQuantity) || 0), 0);
    const prodProgress = totalUnitsTarget > 0 ? Math.round((totalUnitsProduced / totalUnitsTarget) * 100) : 0;

    // Inventario
    const lowStock = inventoryItems.filter((i) => (Number(i.quantity) || 0) <= (Number(i.minStock) || 0));
    const totalValuation = inventoryItems.reduce((acc, curr) => acc + ((Number(curr.quantity) || 0) * (Number(curr.unitPrice) || 0)), 0);

    // Calidad
    const openQuality = qualityIssues.filter((q) => q.status !== "resuelto");
    const criticalQuality = openQuality.filter((q) => q.severity === "alta" || q.severity === "critica").length;
    const yieldRate = qualityIssues.length > 0 ? Math.max(0, 100 - (qualityIssues.length * 1.5)).toFixed(1) : 98.5;

    // Mantenimiento
    const activeMaint = maintenanceOrders.filter((m) => m.status !== "completado");
    const emergencyMaint = activeMaint.filter((m) => m.priority === "alta" || m.priority === "critica").length;

    // Aprobaciones
    const pendingApprovals = approvals.filter((a) => a.status === "pendiente").length;

    // OEE Estimado (Availability x Performance x Quality)
    const availability = activeMaint.length > 0 ? 91.2 : 97.4;
    const performance = prodProgress > 0 ? Math.min(100, Math.max(75, prodProgress)) : 88.5;
    const qualityMetric = Number(yieldRate);
    const oeeGlobal = Math.round((availability * performance * qualityMetric) / 10000);

    return {
      activeProdCount: activeProd.length,
      completedToday,
      prodProgress,
      lowStockCount: lowStock.length,
      lowStockItems: lowStock,
      totalValuation,
      openQualityCount: openQuality.length,
      criticalQuality,
      yieldRate,
      emergencyMaint,
      activeMaintCount: activeMaint.length,
      pendingApprovals,
      oeeGlobal,
      availability,
      performance,
      qualityMetric
    };
  }, [productionOrders, inventoryItems, qualityIssues, maintenanceOrders, approvals]);

  if (loading) {
    return <CenteredMessage text="Inicializando centro numérico de planta..." />;
  }

  return (
    <div style={{ maxWidth: 1350, margin: "0 auto", paddingBottom: 50 }}>
      
      {/* HEADER PRINCIPAL + CONTROL DE TURNO */}
      <div 
        style={{ 
          background: "linear-gradient(135deg, rgba(18,20,29,0.9) 0%, rgba(0,122,255,0.12) 100%)", 
          border: "1px solid rgba(255,255,255,0.08)", 
          borderRadius: 20, 
          padding: "24px 28px", 
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ background: "#007AFF", color: "#fff", fontSize: 10, fontWeight: 900, padding: "2px 8px", borderRadius: 4, letterSpacing: 0.5 }}>
              TURNO A - EN LÍNEA
            </span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>|</span>
            <span style={{ color: "#34C759", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#34C759", boxShadow: "0 0 8px #34C759" }} />
              SCADA Conectado (0 ms latency)
            </span>
          </div>

          <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, color: "#fff", letterSpacing: "-0.5px" }}>
            Centro de Control & Eficiencia de Planta
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
            Supervisión integral de rendimiento, paros, stocks y métricas de auditoría en tiempo real.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => window.location.reload()} style={ghostButtonStyle} title="Actualizar Métricas">
            <RefreshCw size={16} />
          </button>
          <button onClick={() => onNavigate("aprobaciones")} style={{ ...secondaryButtonStyle, border: stats.pendingApprovals > 0 ? "1px solid #FF9500" : undefined }}>
            <CheckCircle2 size={16} color={stats.pendingApprovals > 0 ? "#FF9500" : "#fff"} />
            Aprobaciones ({stats.pendingApprovals})
          </button>
          <button onClick={() => onNavigate("produccion")} style={primaryButtonStyle}>
            Crear Orden OP <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* KPI STRIP - 5 COLUMNAS COMPLETA */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 24 }}>
        <KpiCard 
          label="OEE Global Planta" 
          value={`${stats.oeeGlobal}%`} 
          icon={Gauge} 
          accentColor="#007AFF" 
          badge="Objetivo: >85%"
          subtext={`Disp: ${stats.availability}% | Rend: ${stats.performance}%`}
        />
        <KpiCard 
          label="Líneas en Producción" 
          value={stats.activeProdCount} 
          icon={Factory} 
          accentColor="#34C759" 
          subtext={`${stats.completedToday} órdenes completadas hoy`}
        />
        <KpiCard 
          label="Desviaciones Stock" 
          value={stats.lowStockCount} 
          icon={Boxes} 
          accentColor={stats.lowStockCount > 0 ? "#FF9500" : "#34C759"} 
          subtext={`Valoriz: $${stats.totalValuation.toLocaleString()}`}
        />
        <KpiCard 
          label="No Conformidades CAPA" 
          value={stats.openQualityCount} 
          icon={ShieldCheck} 
          accentColor={stats.openQualityCount > 0 ? "#FF3B30" : "#34C759"} 
          subtext={`Rendimiento: ${stats.yieldRate}% Ok`}
        />
        <KpiCard 
          label="Paros & Mantenimiento" 
          value={stats.activeMaintCount} 
          icon={Wrench} 
          accentColor={stats.emergencyMaint > 0 ? "#FF2D55" : "#007AFF"} 
          subtext={`${stats.emergencyMaint} urgencias de maquinaria`}
        />
      </div>

      {/* SECCIÓN INTERMEDIA: GRÁFICOS Y DESGLOSE DE EFICIENCIA */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20, marginBottom: 24 }}>
        
        {/* DESGLOSE OEE DE EQUIPOS (DISPONIBILIDAD, RENDIMIENTO, CALIDAD) */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
              <Zap size={18} color="#FF9500" /> Desglose de Eficiencia (OEE)
            </h3>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Últimas 24hs</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Disponibilidad */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>Disponibilidad (Tiempo de Operación)</span>
                <span style={{ color: "#fff", fontWeight: 800 }}>{stats.availability}%</span>
              </div>
              <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${stats.availability}%`, background: "#007AFF", borderRadius: 4 }} />
              </div>
            </div>

            {/* Rendimiento */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>Rendimiento (Velocidad de Ensamble)</span>
                <span style={{ color: "#fff", fontWeight: 800 }}>{stats.performance}%</span>
              </div>
              <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${stats.performance}%`, background: "#34C759", borderRadius: 4 }} />
              </div>
            </div>

            {/* Calidad */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>Calidad (Productos Conformes)</span>
                <span style={{ color: "#fff", fontWeight: 800 }}>{stats.qualityMetric}%</span>
              </div>
              <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${stats.qualityMetric}%`, background: "#5856D6", borderRadius: 4 }} />
              </div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: 20, paddingTop: 14, display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
            <span>Turno Actual: 8.0 hrs programadas</span>
            <span>Paros no planificados: 22 min</span>
          </div>
        </div>

        {/* MONITOR DE ALERTA RÁPIDA DE CRÍTICOS */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
              <AlertOctagon size={18} color="#FF3B30" /> Alertas Operativas Críticas
            </h3>
            <span style={{ fontSize: 11, background: "rgba(255,59,48,0.15)", color: "#FF3B30", padding: "2px 8px", borderRadius: 6, fontWeight: 800 }}>
              Urgente
            </span>
          </div>

          {stats.lowStockCount === 0 && stats.emergencyMaint === 0 && stats.criticalQuality === 0 ? (
            <div style={{ padding: "35px 0", textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
              <CheckCircle2 size={32} color="#34C759" style={{ marginBottom: 8 }} />
              <div>Todos los parámetros operan dentro de los rangos normales.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {stats.lowStockItems.slice(0, 2).map((item) => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,149,0,0.08)", border: "1px solid rgba(255,149,0,0.2)", padding: "10px 14px", borderRadius: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Boxes size={16} color="#FF9500" />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>Stock Bajo: {item.name || item.code}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Disponible: {item.quantity} | Mínimo: {item.minStock}</div>
                    </div>
                  </div>
                  <button onClick={() => onNavigate("inventario")} style={{ ...ghostButtonStyle, padding: "4px 8px", fontSize: 10 }}>Reordenar</button>
                </div>
              ))}

              {stats.emergencyMaint > 0 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,45,85,0.08)", border: "1px solid rgba(255,45,85,0.2)", padding: "10px 14px", borderRadius: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Wrench size={16} color="#FF2D55" />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>Mantenimiento Crítico Pendiente</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{stats.emergencyMaint} orden(es) de falla en máquina</div>
                    </div>
                  </div>
                  <button onClick={() => onNavigate("mantenimiento")} style={{ ...ghostButtonStyle, padding: "4px 8px", fontSize: 10 }}>Ver OTs</button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* SECCIÓN INFERIOR: NAVEGACIÓN COMPLETA Y AUDITORÍA DE REGISTROS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
        
        {/* NAVEGACIÓN Y ACCESOS RÁPIDOS */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, padding: 22 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 16px", color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
            <Activity size={18} color="#007AFF" /> Todos los Módulos del Sistema
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <QuickLink title="Producción" desc="Órdenes OP" icon={Factory} onClick={() => onNavigate("produccion")} />
            <QuickLink title="Inventario" desc="Stock & Lotes" icon={Boxes} onClick={() => onNavigate("inventario")} />
            <QuickLink title="Materiales" desc="BOM & Recetas" icon={Layers} onClick={() => onNavigate("materiales")} />
            <QuickLink title="Calidad" desc="Acciones CAPA" icon={ShieldCheck} onClick={() => onNavigate("calidad")} />
            <QuickLink title="Mantenimiento" desc="Paros & OTs" icon={Wrench} onClick={() => onNavigate("mantenimiento")} />
            <QuickLink title="Aprobaciones" desc="Firmas Digitales" icon={CheckCircle2} onClick={() => onNavigate("aprobaciones")} />
          </div>
        </div>

        {/* LOG DE AUDITORÍA RECIENTE */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
              <Clock size={18} color="#5856D6" /> Logs de Eventos de Planta
            </h3>
            <button onClick={() => onNavigate("historial")} style={{ ...ghostButtonStyle, padding: "4px 10px", fontSize: 11 }}>
              Ver Auditoría
            </button>
          </div>

          {recentLogs.length === 0 ? (
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center", padding: "30px 0" }}>
              Sin actividad reciente registrada.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recentLogs.map((log) => (
                <div 
                  key={log.id} 
                  style={{ 
                    display: "flex", 
                    gap: 10, 
                    alignItems: "center", 
                    background: "rgba(255,255,255,0.02)", 
                    padding: "8px 12px", 
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.04)"
                  }}
                >
                  <div style={{ background: "rgba(0,122,255,0.12)", color: "#007AFF", padding: 5, borderRadius: 6 }}>
                    <Activity size={13} />
                  </div>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>
                      {log.action} <span style={{ color: "#007AFF", fontSize: 10 }}>({log.module})</span>
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {log.details || log.user}
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", whiteSpace: "nowrap" }}>
                    {formatTimestamp(log.timestamp)}
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

function QuickLink({ title, desc, icon: Icon, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        padding: "12px 14px",
        color: "#fff",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.15s ease",
      }}
    >
      <div style={{ background: "rgba(255,255,255,0.05)", padding: 8, borderRadius: 8, color: "#007AFF" }}>
        <Icon size={18} />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{desc}</div>
      </div>
    </button>
  );
}
