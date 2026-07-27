import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase.js";
import {
  Wrench,
  Boxes,
  Factory,
  ShieldCheck,
  AlertTriangle,
  Clock,
  TrendingUp,
  AlertOctagon,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { COLORS, CenteredMessage, StatCard } from "../shared.jsx";
import { tabsForRole } from "../roles.js";

// Utilitario para obtener la fecha local en formato YYYY-MM-DD
function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function Dashboard({ user, goTo, role }) {
  const allowed = useMemo(() => tabsForRole(role) || [], [role]);

  const [tasks, setTasks] = useState(null);
  const [materials, setMaterials] = useState(null);
  const [orders, setOrders] = useState(null);
  const [issues, setIssues] = useState(null);
  const [hasError, setHasError] = useState(false);

  // Escuchar únicamente las colecciones a las que el rol del usuario tiene acceso
  useEffect(() => {
    const unsubs = [];

    if (allowed.includes("mantenimiento")) {
      unsubs.push(
        onSnapshot(
          collection(db, "tasks"),
          (snap) => setTasks(snap.docs.map((d) => d.data())),
          (err) => console.error("Error al suscribirse a tareas:", err)
        )
      );
    } else {
      setTasks([]);
    }

    if (allowed.includes("materiales")) {
      unsubs.push(
        onSnapshot(
          collection(db, "materiales"),
          (snap) => setMaterials(snap.docs.map((d) => d.data())),
          (err) => console.error("Error al suscribirse a materiales:", err)
        )
      );
    } else {
      setMaterials([]);
    }

    if (allowed.includes("produccion")) {
      unsubs.push(
        onSnapshot(
          collection(db, "production_orders"),
          (snap) => setOrders(snap.docs.map((d) => d.data())),
          (err) => console.error("Error al suscribirse a ordenes de produccion:", err)
        )
      );
    } else {
      setOrders([]);
    }

    if (allowed.includes("calidad")) {
      unsubs.push(
        onSnapshot(
          collection(db, "quality_issues"),
          (snap) => setIssues(snap.docs.map((d) => d.data())),
          (err) => console.error("Error al suscribirse a incidencias de calidad:", err)
        )
      );
    } else {
      setIssues([]);
    }

    return () => unsubs.forEach((u) => u());
  }, [allowed]);

  const loading =
    (allowed.includes("mantenimiento") && tasks === null) ||
    (allowed.includes("materiales") && materials === null) ||
    (allowed.includes("produccion") && orders === null) ||
    (allowed.includes("calidad") && issues === null);

  // Cálculo de indicadores principales
  const stats = useMemo(() => {
    if (loading) return null;

    const todayStr = getLocalDateString();
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Mantenimiento
    const pendientesMtto = (tasks || []).filter((t) => t.status !== "completada").length;
    const criticasMtto = (tasks || []).filter(
      (t) => t.priority === "critica" && t.status !== "completada"
    ).length;

    // Materiales
    const bajoMinimo = (materials || []).filter(
      (m) => Number(m.stock || 0) <= Number(m.minStock || 0)
    ).length;

    const caducando = (materials || []).filter((m) => {
      if (!m.expiryDate) return false;
      const exp = new Date(m.expiryDate);
      exp.setHours(0, 0, 0, 0);
      const diffTime = exp.getTime() - now.getTime();
      const days = Math.ceil(diffTime / (1000 * 3600 * 24));
      return days >= 0 && days <= 30;
    }).length;

    // Producción
    const todaysOrders = (orders || []).filter((o) => o.date === todayStr);
    const producedToday = todaysOrders.reduce((s, o) => s + (Number(o.producedQty) || 0), 0);
    const targetToday = todaysOrders.reduce((s, o) => s + (Number(o.targetQty) || 0), 0);
    const eficiencia = targetToday > 0 ? Math.round((producedToday / targetToday) * 100) : 0;

    // Calidad
    const abiertasCalidad = (issues || []).filter((i) => i.status !== "cerrada").length;
    const criticasCalidad = (issues || []).filter(
      (i) => i.severity === "critica" && i.status !== "cerrada"
    ).length;

    return {
      pendientesMtto,
      criticasMtto,
      bajoMinimo,
      caducando,
      producedToday,
      eficiencia,
      abiertasCalidad,
      criticasCalidad,
    };
  }, [tasks, materials, orders, issues, loading]);

  if (loading) return <CenteredMessage text="Cargando resumen ejecutivo…" />;

  return (
    <div style={styles.container}>
      {/* Encabezado */}
      <div style={styles.header}>
        <h1 style={styles.title}>Resumen General</h1>
        <p style={styles.subtitle}>
          Mixpak System · <span style={styles.userEmail}>{user?.email}</span>
        </p>
      </div>

      {/* Mantenimiento */}
      <Section
        title="Mantenimiento"
        icon={Wrench}
        onClick={() => goTo("mantenimiento")}
        visible={allowed.includes("mantenimiento")}
      >
        <StatCard
          label="Órdenes pendientes"
          value={stats.pendientesMtto}
          color={COLORS.steel}
          Icon={Clock}
        />
        <StatCard
          label="Críticas activas"
          value={stats.criticasMtto}
          color={COLORS.critical}
          Icon={AlertTriangle}
        />
      </Section>

      {/* Materiales */}
      <Section
        title="Materiales e Inventario"
        icon={Boxes}
        onClick={() => goTo("materiales")}
        visible={allowed.includes("materiales")}
      >
        <StatCard
          label="Bajo stock mínimo"
          value={stats.bajoMinimo}
          color={COLORS.critical}
          Icon={AlertTriangle}
        />
        <StatCard
          label="Por caducar (30 días)"
          value={stats.caducando}
          color={COLORS.safety}
          Icon={AlertTriangle}
        />
      </Section>

      {/* Producción */}
      <Section
        title="Producción"
        icon={Factory}
        onClick={() => goTo("produccion")}
        visible={allowed.includes("produccion")}
      >
        <StatCard
          label="Producido hoy"
          value={stats.producedToday}
          color={COLORS.green}
          Icon={TrendingUp}
        />
        <StatCard
          label="Eficiencia diaria"
          value={`${stats.eficiencia}%`}
          color={COLORS.safety}
          Icon={TrendingUp}
        />
      </Section>

      {/* Calidad */}
      <Section
        title="Control de Calidad"
        icon={ShieldCheck}
        onClick={() => goTo("calidad")}
        visible={allowed.includes("calidad")}
      >
        <StatCard
          label="Incidencias abiertas"
          value={stats.abiertasCalidad}
          color={COLORS.safety}
          Icon={AlertOctagon}
        />
        <StatCard
          label="Críticas activas"
          value={stats.criticasCalidad}
          color={COLORS.critical}
          Icon={AlertOctagon}
        />
      </Section>
    </div>
  );
}

// Componente reusable para cada módulo dentro del Dashboard
function Section({ title, icon: Icon, onClick, children, visible = true }) {
  if (!visible) return null;

  return (
    <div style={styles.sectionContainer}>
      <button type="button" onClick={onClick} style={styles.sectionHeaderButton}>
        <div style={styles.sectionTitleWrapper}>
          <Icon size={16} color={COLORS.dark} />
          <h2 style={styles.sectionTitle}>{title}</h2>
        </div>
        <ChevronRight size={16} color={COLORS.textMuted} />
      </button>

      <div style={styles.cardsGrid}>{children}</div>
    </div>
  );
}

// Estilos locales centralizados
const styles = {
  container: {
    width: "100%",
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontFamily: "'Oswald', sans-serif",
    fontWeight: 700,
    fontSize: 22,
    textTransform: "uppercase",
    margin: 0,
    color: COLORS.dark,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    margin: "4px 0 0",
  },
  userEmail: {
    fontWeight: 500,
    color: COLORS.dark,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeaderButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingBottom: 8,
    border: "none",
    borderBottom: `2px solid ${COLORS.dark}`,
    width: "100%",
    background: "transparent",
    cursor: "pointer",
    textAlign: "left",
    paddingLeft: 0,
    paddingRight: 0,
  },
  sectionTitleWrapper: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontFamily: "'Oswald', sans-serif",
    fontSize: 14,
    textTransform: "uppercase",
    margin: 0,
    color: COLORS.dark,
  },
  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 12,
  },
};
