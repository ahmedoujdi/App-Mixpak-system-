import React, { useState, useEffect } from "react";
import { collection, onSnapshot, query, limit } from "firebase/firestore";
// ⚠️ Rutas con ../
import { db } from "../firebase.js";
import { Factory, ShieldCheck, Boxes, UserCheck, History, ArrowRight } from "lucide-react";
import { COLORS, StatCard, CenteredMessage } from "../shared.jsx";

export default function Dashboard({ goTo }) {
  const [stats, setStats] = useState({ prod: 0, quality: 0, mat: 0, pendingUsers: 0 });
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u1 = onSnapshot(collection(db, "production_orders"), (s) => setStats((p) => ({ ...p, prod: s.size })));
    const u2 = onSnapshot(collection(db, "quality_checks"), (s) => setStats((p) => ({ ...p, quality: s.size })));
    const u3 = onSnapshot(collection(db, "materials"), (s) => setStats((p) => ({ ...p, mat: s.size })));
    const u4 = onSnapshot(collection(db, "team"), (s) => setStats((p) => ({ ...p, pendingUsers: s.docs.filter((d) => !d.data().aprobado).length })));
    const u5 = onSnapshot(query(collection(db, "activity_logs"), limit(5)), (s) => {
      setLogs(s.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, []);

  return (
    <div>
      <h1 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 22, textTransform: "uppercase", marginBottom: 16 }}>
        Panel General de Control
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 20 }}>
        <StatCard label="Órdenes Producción" value={stats.prod} color={COLORS.steel} Icon={Factory} />
        <StatCard label="Inspecciones Calidad" value={stats.quality} color={COLORS.green} Icon={ShieldCheck} />
        <StatCard label="Ítems Inventario" value={stats.mat} color={COLORS.safety} Icon={Boxes} />
        <StatCard label="Usuarios Pendientes" value={stats.pendingUsers} color={stats.pendingUsers > 0 ? COLORS.critical : COLORS.textMuted} Icon={UserCheck} />
      </div>

      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ fontSize: 14, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <History size={16} color={COLORS.steel} /> Actividad Reciente
          </h2>
          <button onClick={() => goTo("historial")} style={{ background: "none", border: "none", color: COLORS.steel, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            Ver todo <ArrowRight size={12} />
          </button>
        </div>

        {loading ? (
          <CenteredMessage text="Cargando resumen…" />
        ) : logs.length === 0 ? (
          <CenteredMessage text="Sin actividad reciente registrada." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {logs.map((l) => (
              <div key={l.id} style={{ background: "#0f1722", border: `1px solid ${COLORS.border}`, padding: "8px 12px", borderRadius: 4, display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <div>
                  <strong>{l.user}</strong> — <span style={{ color: COLORS.steel }}>{l.action}</span> ({l.module})
                  <div style={{ color: COLORS.textMuted, fontSize: 11 }}>{l.details}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
