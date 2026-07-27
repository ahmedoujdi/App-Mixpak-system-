import React, { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
// Cambiamos "./" por "../" para subir a la carpeta src/
import { db } from "../firebase.js";
import { CenteredMessage } from "../shared.jsx";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    tasks: 0,
    materials: 0,
    production: 0,
    quality: 0,
  });

  useEffect(() => {
    let unsubs = [];
    let isMounted = true;

    try {
      const unsubTasks = onSnapshot(
        collection(db, "tasks"),
        (snap) => {
          if (isMounted) setStats((prev) => ({ ...prev, tasks: snap.size }));
        },
        (err) => console.error("Error cargando tareas:", err)
      );

      const unsubProd = onSnapshot(
        collection(db, "production_orders"),
        (snap) => {
          if (isMounted) setStats((prev) => ({ ...prev, production: snap.size }));
        },
        (err) => console.error("Error cargando producción:", err)
      );

      const unsubMat = onSnapshot(
        collection(db, "materials"),
        (snap) => {
          if (isMounted) setStats((prev) => ({ ...prev, materials: snap.size }));
        },
        (err) => console.error("Error cargando materiales:", err)
      );

      const unsubQual = onSnapshot(
        collection(db, "quality_issues"),
        (snap) => {
          if (isMounted) setStats((prev) => ({ ...prev, quality: snap.size }));
        },
        (err) => console.error("Error cargando calidad:", err)
      );

      unsubs = [unsubTasks, unsubProd, unsubMat, unsubQual];
      setLoading(false);
    } catch (error) {
      console.error("Error al inicializar dashboard:", error);
      if (isMounted) setLoading(false);
    }

    return () => {
      isMounted = false;
      unsubs.forEach((unsub) => unsub && unsub());
    };
  }, []);

  if (loading) {
    return <CenteredMessage text="Cargando resumen ejecutivo..." />;
  }

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 20, marginBottom: 16 }}>
        RESUMEN EJECUTIVO
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        <div style={{ background: "#22262A", padding: 16, borderRadius: 4, color: "#fff" }}>
          <div style={{ fontSize: 12, color: "#888" }}>TAREAS MANTENIMIENTO</div>
          <div style={{ fontSize: 24, fontWeight: "bold" }}>{stats.tasks}</div>
        </div>

        <div style={{ background: "#22262A", padding: 16, borderRadius: 4, color: "#fff" }}>
          <div style={{ fontSize: 12, color: "#888" }}>ÓRDENES PRODUCCIÓN</div>
          <div style={{ fontSize: 24, fontWeight: "bold" }}>{stats.production}</div>
        </div>

        <div style={{ background: "#22262A", padding: 16, borderRadius: 4, color: "#fff" }}>
          <div style={{ fontSize: 12, color: "#888" }}>MATERIALES</div>
          <div style={{ fontSize: 24, fontWeight: "bold" }}>{stats.materials}</div>
        </div>

        <div style={{ background: "#22262A", padding: 16, borderRadius: 4, color: "#fff" }}>
          <div style={{ fontSize: 12, color: "#888" }}>INCIDENCIAS CALIDAD</div>
          <div style={{ fontSize: 24, fontWeight: "bold" }}>{stats.quality}</div>
        </div>
      </div>
    </div>
  );
}
