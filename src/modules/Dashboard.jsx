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
  FileSpreadsheet
} from "lucide-react";
import { 
  KpiCard, 
  CenteredMessage, 
  formatTimestamp, 
  primaryButtonStyle,
  ghostButtonStyle
} from "./shared.jsx";

export default function Dashboard({ user, onNavigate }) {
  const [productionOrders, setProductionOrders] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [qualityIssues, setQualityIssues] = useState([]);
  const [maintenanceOrders, setMaintenanceOrders] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Escuchar colecciones en tiempo real desde Firestore
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

    const qLogs = query(collection(db, "activity_logs"), orderBy("timestamp", "desc"), limit(6));
    const unsubLogs = onSnapshot(qLogs, (snap) => {
      setRecentLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => {
      unsubProd();
      unsubInv();
      unsubQual();
      unsubMaint();
      unsubLogs();
    };
  }, []);

  // Cálculo de indicadores dinámicos
  const metrics = useMemo(() => {
    const activeProduction = productionOrders.filter((o) => o.status === "en_proceso").length;
    const lowStockItems = inventoryItems.filter((i) => (parseFloat(i.quantity) || 0) <= (parseFloat(i.minStock) || 0)).length;
    const openQualityIssues = qualityIssues.filter((q) => q.status !== "resuelto" && q.status !== "cerrado").length;
    const criticalMaintenance = maintenanceOrders.filter((m) => m.status !== "completado" && (m.priority === "alta" || m.priority === "critica")).length;

    return {
      activeProduction,
      lowStockItems,
      openQualityIssues,
      criticalMaintenance,
    };
  }, [productionOrders, inventoryItems, qualityIssues, maintenanceOrders]);

  if (loading) {
    return <CenteredMessage text="Cargando panel de control de planta..." />;
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 40 }}>
      {/* Banner Superior de Bienvenida */}
      <div 
        style={{ 
          background: "linear-gradient(135deg, rgba(0, 122, 255, 0.15) 0%, rgba(88, 86, 214, 0.05) 100%)", 
          border: "1px solid rgba(0, 122, 255, 0.2)", 
          borderRadius: 20, 
          padding: "24px 28px", 
          marginBottom: 28,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16
        }}
      >
        <div>
          <span style={{ color: "#007AFF", fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>
            MONITOREO DE PLANTA EN TIEMPO REAL
          </span>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: "4px 0 6px", color: "#fff", letterSpacing: "-0.5px" }}>
            Bienvenido, {user?.email?.split("@")[0]}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
            Supervisión unificada de líneas de ensamble, materias primas, calidad y mantenimiento.
          </p>
        </div>
        <button onClick={() => onNavigate("produccion")} style={{ ...primaryButtonStyle, borderRadius: 10, padding: "10px 18px" }}>
          Ir a Producción <ArrowRight size={16} />
        </button>
      </div>

      {/* Cuadrícula de KPIs Principales */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 28 }}>
        <KpiCard 
          label="Órdenes Activas" 
          value={metrics.activeProduction} 
          icon={Factory} 
          accentColor="#007AFF" 
          badge={metrics.activeProduction > 0 ? "En proceso" : null}
          subtext="Líneas de producción en marcha"
        />
        <KpiCard 
          label="Stock Crítico" 
          value={metrics.lowStockItems} 
          icon={Boxes} 
          accentColor={metrics.lowStockItems > 0 ? "#FF9500" : "#34C759"} 
          subtext="Insumos bajo mínimo requerido"
        />
        <KpiCard 
          label="No Conformidades" 
          value={metrics.openQualityIssues} 
          icon={ShieldCheck} 
          accentColor={metrics.openQualityIssues > 0 ? "#FF3B30" : "#34C759"} 
          subtext="Reportes CAPA pendientes"
        />
        <KpiCard 
          label="Mantenimiento Urgente" 
          value={metrics.criticalMaintenance} 
          icon={Wrench} 
          accentColor={metrics.criticalMaintenance > 0 ? "#FF2D55" : "#34C759"} 
          subtext="Órdenes de trabajo críticas"
        />
      </div>

      {/* Sección Inferior: Accesos Rápidos y Registro de Actividad */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
        
        {/* Accesos Directos */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 16px", color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
            <Activity size={18} color="#007AFF" /> Módulos Operativos
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <QuickLink title="Producción" desc="Órdenes OP" icon={Factory} onClick={() => onNavigate("produccion")} />
            <QuickLink title="Inventario" desc="Stock y lotes" icon={Boxes} onClick={() => onNavigate("inventario")} />
            <QuickLink title="Materiales" desc="Insumos" icon={Layers} onClick={() => onNavigate("materiales")} />
            <QuickLink title="Calidad" desc="Acciones CAPA" icon={ShieldCheck} onClick={() => onNavigate("calidad")} />
            <QuickLink title="Mantenimiento" desc="Paros y OTs" icon={Wrench} onClick={() => onNavigate("mantenimiento")} />
            <QuickLink title="Aprobaciones" desc="Firmas" icon={CheckCircle2} onClick={() => onNavigate("aprobaciones")} />
          </div>
        </div>

        {/* Registro Reciente de Auditoría */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
              <Clock size={18} color="#5856D6" /> Últimas Acciones
            </h3>
            <button onClick={() => onNavigate("historial")} style={{ ...ghostButtonStyle, padding: "4px 10px", fontSize: 11 }}>
              Historial Completo
            </button>
          </div>

          {recentLogs.length === 0 ? (
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center", padding: "30px 0" }}>
              Sin actividad reciente registrada.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {recentLogs.map((log) => (
                <div 
                  key={log.id} 
                  style={{ 
                    display: "flex", 
                    gap: 12, 
                    alignItems: "center", 
                    background: "rgba(255,255,255,0.02)", 
                    padding: "10px 12px", 
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.04)"
                  }}
                >
                  <div style={{ background: "rgba(0,122,255,0.15)", color: "#007AFF", padding: 6, borderRadius: 8 }}>
                    <Activity size={14} />
                  </div>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>
                      {log.action} <span style={{ color: "#007AFF", fontSize: 11 }}>({log.module})</span>
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
