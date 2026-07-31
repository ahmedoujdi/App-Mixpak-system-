import React, { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase.js";
import { useTheme, primaryButtonStyle, ghostButtonStyle, inputStyle, selectStyle, Field, ModalShell, CenteredMessage, StatCard, exportToCsv, exportToPdf, useToast } from "../shared.jsx";
import { Factory, Plus, Clock, CheckCircle, AlertTriangle, FileText, Download, Search } from "lucide-react";

export default function Produccion() {
  const { theme } = useTheme();
  const { addToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");

  const [name, setName] = useState("");
  const [line, setLine] = useState("Línea 1 - Envasado");
  const [quantity, setQuantity] = useState("");
  const [operator, setOperator] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "production_orders"), (snapshot) => {
      setOrders(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name || !quantity) return;
    try {
      await addDoc(collection(db, "production_orders"), {
        name,
        line,
        quantity: Number(quantity),
        operator: operator || "Sin Asignar",
        status: "En Proceso",
        timestamp: serverTimestamp(),
      });
      addToast("Orden de producción registrada", "success");
      setName("");
      setQuantity("");
      setOperator("");
      setShowModal(false);
    } catch (err) {
      addToast("Error al registrar orden", "error");
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, "production_orders", id), { status: newStatus });
      addToast(`Orden marcada como ${newStatus}`, "info");
    } catch (err) {
      addToast("Error actualizando estado", "error");
    }
  };

  const filteredOrders = orders.filter((o) =>
    (o.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (o.line || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <CenteredMessage text="Cargando líneas de producción..." />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, background: theme.panel, padding: "16px 20px", borderRadius: 12, border: `1px solid ${theme.panelBorder}` }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>PRODUCCIÓN Y ENVASADO</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: theme.textMuted }}>Control de lotes activos y rendimiento de planta</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => exportToCsv("produccion", orders)} style={ghostButtonStyle(theme)}><Download size={14} /> CSV</button>
          <button onClick={() => exportToPdf("Reporte Producción", ["Lote/Orden", "Línea", "Cantidad", "Estado"], orders.map(o => [o.name, o.line, o.quantity, o.status]), "produccion")} style={ghostButtonStyle(theme)}><FileText size={14} /> PDF</button>
          <button onClick={() => setShowModal(true)} style={primaryButtonStyle(theme)}><Plus size={16} /> Nueva Orden</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <StatCard label="Total Órdenes" value={orders.length} color={theme.primary} Icon={Factory} />
        <StatCard label="En Proceso" value={orders.filter((o) => o.status === "En Proceso").length} color={theme.safety} Icon={Clock} />
        <StatCard label="Completadas" value={orders.filter((o) => o.status === "Completado").length} color={theme.green} Icon={CheckCircle} />
      </div>

      <div style={{ background: theme.panel, borderRadius: 12, border: `1px solid ${theme.panelBorder}`, padding: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Search size={16} color={theme.textMuted} />
          <input
            type="text"
            placeholder="Buscar por lote o línea..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputStyle(theme), padding: "8px 12px" }}
          />
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
            <thead>
              <tr style={{ background: `${theme.primary}10`, borderBottom: `1px solid ${theme.panelBorder}` }}>
                <th style={{ padding: 12 }}>Orden / Lote</th>
                <th style={{ padding: 12 }}>Línea</th>
                <th style={{ padding: 12 }}>Cantidad Unidades</th>
                <th style={{ padding: 12 }}>Operador</th>
                <th style={{ padding: 12 }}>Estado</th>
                <th style={{ padding: 12 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((o) => (
                <tr key={o.id} style={{ borderBottom: `1px solid ${theme.panelBorder}` }}>
                  <td style={{ padding: 12, fontWeight: 700 }}>{o.name}</td>
                  <td style={{ padding: 12, color: theme.textMuted }}>{o.line}</td>
                  <td style={{ padding: 12, fontWeight: 600 }}>{o.quantity} u.</td>
                  <td style={{ padding: 12 }}>{o.operator}</td>
                  <td style={{ padding: 12 }}>
                    <span style={{ padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, backgroundColor: o.status === "Completado" ? `${theme.green}20` : `${theme.safety}20`, color: o.status === "Completado" ? theme.green : theme.safety }}>
                      {o.status}
                    </span>
                  </td>
                  <td style={{ padding: 12 }}>
                    {o.status !== "Completado" && (
                      <button onClick={() => handleStatusChange(o.id, "Completado")} style={{ ...ghostButtonStyle(theme), fontSize: 11, padding: "4px 8px" }}>
                        Finalizar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <ModalShell title="Registrar Orden de Producción" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreate}>
            <Field label="Identificador de Orden / Lote">
              <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle(theme)} placeholder="Ej. LOTE-2026-088" required />
            </Field>
            <Field label="Línea de Envasado">
              <select value={line} onChange={(e) => setLine(e.target.value)} style={selectStyle(theme)}>
                <option value="Línea 1 - Envasado">Línea 1 - Envasado</option>
                <option value="Línea 2 - Soplado">Línea 2 - Soplado</option>
                <option value="Línea 3 - Etiquetado">Línea 3 - Etiquetado</option>
                <option value="Línea 4 - Empaque Final">Línea 4 - Empaque Final</option>
              </select>
            </Field>
            <Field label="Cantidad Programada">
              <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={inputStyle(theme)} placeholder="10000" required />
            </Field>
            <Field label="Operador Encargado">
              <input value={operator} onChange={(e) => setOperator(e.target.value)} style={inputStyle(theme)} placeholder="Nombre del operador" />
            </Field>
            <button type="submit" style={{ ...primaryButtonStyle(theme), width: "100%", justifyContent: "center", marginTop: 10 }}>Crear Orden</button>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
