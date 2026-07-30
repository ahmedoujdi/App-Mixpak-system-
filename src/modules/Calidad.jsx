import React, { useState, useEffect, useMemo } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";

// ⚠️ RUTAS CORREGIDAS CON ../
import { db } from "../firebase.js";
import {
  ShieldCheck,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Download,
  Search,
  AlertTriangle,
} from "lucide-react";
import {
  COLORS,
  inputStyle,
  selectStyle,
  primaryButtonStyle,
  ghostButtonStyle,
  exportToCsv,
  logActivity,
  CenteredMessage,
  Field,
  ModalShell,
  ConfirmDialog,
  StatCard,
  EmptyState,
} from "../shared.jsx";

const emptyForm = {
  batch: "",
  product: "",
  result: "conforme", // conforme, no_conforme, pendiente
  parameters: "",
  notes: "",
};

export default function Calidad({ user }) {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterResult, setFilterResult] = useState("todos");
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "quality_checks"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setInspections(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  async function removeInspection(item) {
    await deleteDoc(doc(db, "quality_checks", item.id));
    logActivity(user.email, "Calidad", "Eliminada", `Inspección lote ${item.batch}`);
    setConfirmDelete(null);
  }

  const filtered = useMemo(() => {
    return inspections.filter((i) => {
      if (filterResult !== "todos" && i.result !== filterResult) return false;
      if (search && !`${i.batch} ${i.product}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [inspections, filterResult, search]);

  const stats = useMemo(() => {
    let approved = 0;
    let rejected = 0;
    inspections.forEach((i) => {
      if (i.result === "conforme") approved++;
      if (i.result === "no_conforme") rejected++;
    });
    return { total: inspections.length, approved, rejected };
  }, [inspections]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <h1 style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 20, textTransform: "uppercase", margin: 0 }}>
          Control de Calidad e Inspecciones
        </h1>
        <button onClick={() => setModalOpen(true)} style={primaryButtonStyle}>
          <Plus size={16} /> Nueva Inspección
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 20 }}>
        <StatCard label="Total Inspecciones" value={stats.total} color={COLORS.steel} Icon={ShieldCheck} />
        <StatCard label="Conformes" value={stats.approved} color={COLORS.green} Icon={CheckCircle} />
        <StatCard label="No Conformes" value={stats.rejected} color={COLORS.critical} Icon={XCircle} />
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18, alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <Search size={14} color={COLORS.textMuted} style={{ position: "absolute", left: 9, top: 11 }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por lote o producto..." style={{ ...inputStyle, paddingLeft: 30 }} />
        </div>
        <select value={filterResult} onChange={(e) => setFilterResult(e.target.value)} style={{ ...selectStyle, width: "auto" }}>
          <option value="todos">Todos los resultados</option>
          <option value="conforme">Conforme</option>
          <option value="no_conforme">No Conforme</option>
          <option value="pendiente">Pendiente</option>
        </select>
        <button
          onClick={() => exportToCsv("inspecciones-calidad", filtered.map((i) => ({
            lote: i.batch, producto: i.product, resultado: i.result, inspector: i.inspector, parametros: i.parameters
          })))}
          style={ghostButtonStyle}
        >
          <Download size={16} /> Exportar
        </button>
      </div>

      {loading ? (
        <CenteredMessage text="Cargando registros de calidad…" />
      ) : inspections.length === 0 ? (
        <EmptyState Icon={ShieldCheck} title="Sin inspecciones registradas" message="Registra el primer control de calidad." onAdd={() => setModalOpen(true)} addLabel="Nueva Inspección" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
          {filtered.map((item) => {
            const isOk = item.result === "conforme";
            const isReject = item.result === "no_conforme";
            const badgeColor = isOk ? COLORS.green : isReject ? COLORS.critical : COLORS.safety;

            return (
              <div key={item.id} style={{ background: COLORS.panel, borderLeft: `5px solid ${badgeColor}`, padding: 16, borderRadius: "0 6px 6px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: COLORS.textMuted }}>Lote: {item.batch}</span>
                  <button onClick={() => setConfirmDelete(item)} style={{ background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer" }}>
                    <Trash2 size={14} />
                  </button>
                </div>
                <h3 style={{ fontSize: 16, margin: "0 0 8px", fontWeight: 600 }}>{item.product}</h3>
                
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#0f1722", padding: "4px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600, color: badgeColor, marginBottom: 10 }}>
                  {isOk && <CheckCircle size={14} />}
                  {isReject && <XCircle size={14} />}
                  {!isOk && !isReject && <AlertTriangle size={14} />}
                  {item.result.replace("_", " ").toUpperCase()}
                </div>

                {item.parameters && (
                  <p style={{ fontSize: 13, color: COLORS.textMuted, margin: "4px 0" }}>
                    <strong>Parámetros:</strong> {item.parameters}
                  </p>
                )}
                {item.notes && (
                  <p style={{ fontSize: 12, color: COLORS.textMuted, margin: "4px 0", fontStyle: "italic" }}>
                    "{item.notes}"
                  </p>
                )}
                <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 10, textAlign: "right" }}>
                  Inspector: {item.inspector || "N/A"}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && <InspectionModal user={user} onClose={() => setModalOpen(false)} />}
      {confirmDelete && (
        <ConfirmDialog
          title="Eliminar registro"
          message="¿Seguro que deseas borrar este registro de calidad?"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => removeInspection(confirmDelete)}
        />
      )}
    </div>
  );
}

function InspectionModal({ user, onClose }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!form.batch.trim() || !form.product.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "quality_checks"), {
        ...form,
        inspector: user.email,
        createdAt: serverTimestamp(),
      });
      logActivity(user.email, "Calidad", "Nueva Inspección", `Lote ${form.batch}`);
      onClose();
    } catch (err) {
      setSaving(false);
    }
  }

  return (
    <ModalShell onClose={onClose} title="Nueva Inspección de Calidad">
      <form onSubmit={submit}>
        <Field label="Número de Lote *">
          <input required value={form.batch} onChange={(e) => setForm({ ...form, batch: e.target.value })} style={inputStyle} placeholder="Ej. L-2026-089" />
        </Field>
        <Field label="Producto / Material *">
          <input required value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} style={inputStyle} placeholder="Ej. Mezcla Química X" />
        </Field>
        <Field label="Resultado de la Evaluación">
          <select value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} style={selectStyle}>
            <option value="conforme">Conforme (Aprobado)</option>
            <option value="no_conforme">No Conforme (Rechazado)</option>
            <option value="pendiente">Pendiente de Análisis</option>
          </select>
        </Field>
        <Field label="Parámetros evaluados">
          <input value={form.parameters} onChange={(e) => setForm({ ...form, parameters: e.target.value })} style={inputStyle} placeholder="Ej. pH: 7.2, Viscosidad: Normal" />
        </Field>
        <Field label="Observaciones">
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} placeholder="Notas adicionales..." />
        </Field>
        <button type="submit" disabled={saving} style={{ ...primaryButtonStyle, width: "100%", justifyContent: "center", marginTop: 8 }}>
          {saving ? "Guardando…" : "Registrar Inspección"}
        </button>
      </form>
    </ModalShell>
  );
}
