import React, { useState, useEffect } from "react";
import { collection, onSnapshot, query, limit } from "firebase/firestore";
import { db } from "../firebase.js";
import { Factory, ShieldCheck, Boxes, UserCheck, History, ArrowRight, FileText } from "lucide-react";
import { COLORS, StatCard, CenteredMessage, exportToPdf } from "../shared.jsx";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function Dashboard({ goTo }) {
  const [stats, setStats] = useState({ prod: 0, quality: 0, mat: 0, pendingUsers: 0 });
  const [chartData, setChartData] = useState([]);
  const [qualityPie, setQualityPie] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u1 = onSnapshot(collection(db, "production_orders"), (s) => {
      setStats((p) => ({ ...p, prod: s.size }));
      const lineMap = {};
      s.docs.forEach((d) => {
        const data = d.data();
        lineMap[data.line] = (lineMap[data.line] || 0) + Number(data.producedQty || 0);
      });
      setChartData(Object.keys(lineMap).map((key) => ({ line: key, producido: lineMap[key] })));
    });

    const u2 = onSnapshot(collection(db, "quality_checks"), (s) => {
      setStats((p) => ({ ...p, quality: s.size }));
      let ok = 0, fail = 0;
      s.docs.forEach((d) => {
        if (d.data().result === "conforme") ok++;
        else fail++;
      });
      setQualityPie([
        { name: "Conforme", value: ok, color: COLORS.green },
        { name: "Rechazado", value: fail, color: COLORS.critical },
      ]);
    });

    const u3 = onSnapshot(collection(db, "materials"), (s) => setStats((p) => ({ ...p, mat: s.size })));
    const u4 = onSnapshot(collection(db, "team"), (s) => setStats((p) => ({ ...p, pendingUsers: s.docs.filter((d) => !d.data().aprobado).length })));
    const u5 = onSnapshot(query(collection(db, "activity_logs"), limit(5)), (s) => {
      setLogs(s.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, []);

  const handleExportPDF = () => {
    exportToPdf(
      "Resumen Ejecutivo de Planta",
      ["Métrica", "Valor"],
      [
        ["Órdenes de Producción", stats.prod.toString()],
        ["Inspecciones de Calidad", stats.quality.toString()],
        ["Ítems en Inventario", stats.mat.toString()],
        ["Solicitudes Pendientes", stats.pendingUsers.toString()],
      ],
      "resumen-ejecutivo"
    );
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 22, textTransform: "uppercase", margin: 0 }}>
          Panel General de Control
        </h1>
        <button onClick={handleExportPDF} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <FileText size={14} color={COLORS.steel} /> Descargar Reporte PDF
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 20 }}>
        <StatCard label="Órdenes Producción" value={stats.prod} color={COLORS.steel} Icon={Factory} />
        <StatCard label="Inspecciones Calidad" value={stats.quality} color={COLORS.green} Icon={ShieldCheck} />
        <StatCard label="Ítems Inventario" value={stats.mat} color={COLORS.safety} Icon={Boxes} />
        <StatCard label="Usuarios Pendientes" value={stats.pendingUsers} color={stats.pendingUsers > 0 ? COLORS.critical : COLORS.textMuted} Icon={UserCheck} />
      </div>

      {/* GRÁFICOS INTERACTIVOS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 20 }}>
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, padding: 16, borderRadius: 8 }}>
          <h3 style={{ fontSize: 13, textTransform: "uppercase", color: COLORS.textMuted, marginBottom: 14 }}>Producción Total por Línea</h3>
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <XAxis dataKey="line" stroke={COLORS.textMuted} fontSize={12} />
                <YAxis stroke={COLORS.textMuted} fontSize={12} />
                <Tooltip contentStyle={{ background: COLORS.panel, borderColor: COLORS.border, color: COLORS.text }} />
                <Bar dataKey="producido" fill={COLORS.steel} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, padding: 16, borderRadius: 8 }}>
          <h3 style={{ fontSize: 13, textTransform: "uppercase", color: COLORS.textMuted, marginBottom: 14 }}>Ratio Aprobación Calidad</h3>
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={qualityPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label>
                  {qualityPie.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: COLORS.panel, borderColor: COLORS.border }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ACTIVIDAD RECIENTE */}
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ fontSize: 14, textTransform: "uppercase", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
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
