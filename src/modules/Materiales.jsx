import React, { useState, useEffect, useMemo } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";

// ⚠️ RUTAS CORREGIDAS CON ../
import { db } from "../firebase.js";
import {
  Boxes,
  Plus,
  Trash2,
  AlertTriangle,
  Search,
  Download,
} from "lucide-react";
import {
  COLORS,
  inputStyle,
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
  code: "",
  name: "",
  stock: "",
  minStock: "",
  unit: "unidades",
};

export default function Materiales({ user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "materials"), orderBy("name", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  async function updateStock(item, delta) {
    const newStock = Math.max(0, Number(item.stock || 0) + delta);
    await updateDoc(doc(db, "materials", item.id), { stock: newStock });
    logActivity(user.email, "Materiales", "Ajuste de Stock", `${item.name}: ${item.stock} → ${newStock}`);
  }

  async function removeItem(item) {
    await deleteDoc(doc(db, "materials", item.id));
    logActivity(user.email, "Materiales", "Eliminado", item.name);
    setConfirmDelete(null);
  }

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (search && !`${i.code || ""} ${i.name}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [items, search]);

  const stats = useMemo(() => {
    let low = 0;
    items.forEach((i) => {
      if (Number(i.stock) <= Number(i.minStock)) low++;
    });
    return { total: items.length, low };
  }, [items]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <h1 style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 20, textTransform: "uppercase", margin: 0 }}>
          Inventario de Materiales / Repuestos
        </h1>
        <button onClick={() => setModalOpen(true)} style={primaryButtonStyle}>
          <Plus size={16} /> Nuevo ítem
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 20 }}>
        <StatCard label="Total Ítems" value={stats.total} color={COLORS.steel} Icon={Boxes} />
        <StatCard label="Stock Crítico / Bajo" value={stats.low} color={stats.low > 0 ? COLORS.critical : COLORS.green} Icon={AlertTriangle} />
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18, alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <Search size={14} color={COLORS.textMuted} style={{ position: "absolute", left: 9, top: 11 }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por código o nombre..." style={{ ...inputStyle, paddingLeft: 30 }} />
        </div>
        <button
          onClick={() => exportToCsv("inventario-materiales", filtered.map((i) => ({
            codigo: i.code, nombre: i.name, stock: i.stock, minStock: i.minStock, unidad: i.unit
          })))}
          style={ghostButtonStyle}
        >
          <Download size={16} /> Exportar
        </button>
      </div>

      {loading ? (
        <CenteredMessage text="Cargando inventario…" />
      ) : items.length === 0 ? (
        <EmptyState Icon={Boxes} title="Sin materiales registrados" message="Agrega tu primer repuesto o insumo al inventario." onAdd={() => setModalOpen(true)} addLabel="Agregar ítem" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
          {filtered.map((item) => {
            const isLow = Number(item.stock) <= Number(item.minStock);
            return (
              <div key={item.id} style={{ background: COLORS.panel, borderLeft: `5px solid ${isLow ? COLORS.critical : COLORS.steel}`, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.textMuted }}>{item.code || "S/C"}</span>
                  <button onClick={() => setConfirmDelete(item)} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textMuted }}>
                    <Trash2 size={14} />
                  </button>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: "6px 0 6px" }}>{item.name}</h3>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <span style={{ fontSize: 20, fontWeight: 700, color: isLow ? COLORS.critical : COLORS.text }}>{item.stock}</span>
                    <span style={{ fontSize: 12, color: COLORS.textMuted, marginLeft: 4 }}>{item.unit}</span>
                  </div>
                  <span style={{ fontSize: 11, color: COLORS.textMuted }}>Mínimo: {item.minStock}</span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => updateStock(item, -1)} style={{ ...ghostButtonStyle, flex: 1, justifyContent: "center" }}>-1</button>
                  <button onClick={() => updateStock(item, 1)} style={{ ...ghostButtonStyle, flex: 1, justifyContent: "center" }}>+1</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && <MaterialModal user={user} onClose={() => setModalOpen(false)} />}
      {confirmDelete && (
        <ConfirmDialog
          title="Eliminar repuesto"
          message="¿Seguro que deseas eliminar este material del inventario?"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => removeItem(confirmDelete)}
        />
      )}
    </div>
  );
}

function MaterialModal({ user, onClose }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "materials"), {
        ...form,
        stock: Number(form.stock) || 0,
        minStock: Number(form.minStock) || 0,
        createdAt: serverTimestamp(),
      });
      logActivity(user.email, "Materiales", "Nuevo ítem", form.name);
      onClose();
    } catch (err) {
      setSaving(false);
    }
  }

  return (
    <ModalShell onClose={onClose} title="Nuevo repuesto / material">
      <form onSubmit={submit}>
        <Field label="Código de referencia">
          <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} style={inputStyle} placeholder="Ej. REP-092" />
        </Field>
        <Field label="Nombre del elemento *">
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="Ej. Rodamiento SKF 6204" />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Stock Inicial">
            <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} style={inputStyle} placeholder="0" />
          </Field>
          <Field label="Stock Mínimo">
            <input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} style={inputStyle} placeholder="5" />
          </Field>
        </div>
        <Field label="Unidad de medida">
          <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} style={inputStyle} placeholder="unidades, metros, litros..." />
        </Field>
        <button type="submit" disabled={saving} style={{ ...primaryButtonStyle, width: "100%", justifyContent: "center", marginTop: 8 }}>
          {saving ? "Guardando…" : "Guardar material"}
        </button>
      </form>
    </ModalShell>
  );
}
