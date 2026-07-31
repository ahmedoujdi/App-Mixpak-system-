import React, { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase.js";
import { useTheme, primaryButtonStyle, ghostButtonStyle, inputStyle, selectStyle, Field, ModalShell, CenteredMessage, StatCard, useToast, exportToPdf } from "../shared.jsx";
import { ShieldCheck, Plus, CheckCircle, XCircle, AlertTriangle, FileText } from "lucide-react";

export default function Calidad() {
  const { theme } = useTheme();
  const { addToast } = useToast();
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [batch, setBatch] = useState("");
  const [inspector, setInspector] = useState("");
  const [result, setResult] = useState("Aprobado");
  const [defectsCount, setDefectsCount] = useState("0");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "quality_inspections"), (snapshot) => {
      setInspections(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!batch) return;
    try {
      await addDoc(collection(db, "quality_inspections"), {
        batch,
        inspector: inspector || "Inspector Calidad",
        result,
        defectsCount: Number(defectsCount) || 0,
        notes,
        timestamp: serverTimestamp(),
      });
      addToast("Inspección de calidad guardada", "success");
      setBatch("");
      setDefectsCount("0");
      setNotes("");
      setShowModal(false);
    } catch (err) {
      addToast("Error al guardar inspección", "error");
    }
  };

  if (loading) return <CenteredMessage text="Cargando módulo de calidad..." />;

  const approved = inspections.filter((i) => i.result === "Aprobado").length;
  const rejected = inspections.filter((i) => i.result === "Rechazado").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, background: theme.panel, padding: "16px 20px", borderRadius: 12, border: `1px solid ${theme.panelBorder}` }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>CONTROL DE CALIDAD</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: theme.textMuted }}>Verificación de estándares e inspección de empaque</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => exportToPdf("Reporte Calidad", ["Lote", "Inspector", "Resultado", "Defectos"], inspections.map(i => [i.batch, i.inspector, i.result, i.defectsCount]), "calidad")} style={ghostButtonStyle(theme)}><FileText size={14} /> PDF</button>
          <button onClick={() => setShowModal(true)} style={primaryButtonStyle(theme)}><Plus size={16} /> Nueva Inspección</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <StatCard label="Inspecciones Totales" value={inspections.length} color={theme.primary} Icon={ShieldCheck} />
        <StatCard label="Lotes Aprobados" value={approved} color={theme.green} Icon={CheckCircle} />
        <StatCard label="Lotes Rechazados" value={rejected} color={theme.critical} Icon={XCircle} />
      </div>

      <div style={{ background: theme.panel, borderRadius: 12, border: `1px solid ${theme.panelBorder}`, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
          <thead>
            <tr style={{ background: `${theme.primary}10`, borderBottom: `1px solid ${theme.panelBorder}` }}>
              <th style={{ padding: 12 }}>Lote / Muestra</th>
              <th style={{ padding: 12 }}>Inspector</th>
              <th style={{ padding: 12 }}>Defectos Encontrados</th>
              <th style={{ padding: 12 }}>Estado</th>
              <th style={{ padding: 12 }}>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {inspections.map((i) => (
              <tr key={i.id} style={{ borderBottom: `1px solid ${theme.panelBorder}` }}>
                <td style={{ padding: 12, fontWeight: 700 }}>{i.batch}</td>
                <td style={{ padding: 12, color: theme.textMuted }}>{i.inspector}</td>
                <td style={{ padding: 12, fontWeight: 600 }}>{i.defectsCount} u.</td>
                <td style={{ padding: 12 }}>
                  <span style={{ padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, backgroundColor: i.result === "Aprobado" ? `${theme.green}20` : `${theme.critical}20`, color: i.result === "Aprobado" ? theme.green : theme.critical }}>
                    {i.result}
                  </span>
                </td>
                <td style={{ padding: 12, color: theme.textMuted, fontSize: 12 }}>{i.notes || "Sin observaciones"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <ModalShell title="Registrar Inspección de Calidad" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreate}>
            <Field label="Código de Lote">
              <input value={batch} onChange={(e) => setBatch(e.target.value)} style={inputStyle(theme)} placeholder="Ej. LOT-8842" required />
            </Field>
            <Field label="Inspector Responsable">
              <input value={inspector} onChange={(e) => setInspector(e.target.value)} style={inputStyle(theme)} placeholder="Nombre del inspector" />
            </Field>
            <Field label="Resultado de la Prueba">
              <select value={result} onChange={(e) => setResult(e.target.value)} style={selectStyle(theme)}>
                <option value="Aprobado">Aprobado</option>
                <option value="Rechazado">Rechazado</option>
                <option value="En Cuarentena">En Cuarentena</option>
              </select>
            </Field>
            <Field label="Cantidad de Defectos Unidades">
              <input type="number" value={defectsCount} onChange={(e) => setDefectsCount(e.target.value)} style={inputStyle(theme)} />
            </Field>
            <Field label="Notas Técnicas">
              <input value={notes} onChange={(e) => setNotes(e.target.value)} style={inputStyle(theme)} placeholder="Pestaña mal sellada, torque fuera de rango..." />
            </Field>
            <button type="submit" style={{ ...primaryButtonStyle(theme), width: "100%", justifyContent: "center", marginTop: 10 }}>Guardar Auditoría</button>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
