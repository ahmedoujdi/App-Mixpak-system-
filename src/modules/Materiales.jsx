import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase.js";
import { Layers, Search, Download, AlertCircle, Plus, Trash2, Edit3, ArrowUpRight, ArrowDownLeft, PackageCheck } from "lucide-react";
import { inputStyle, primaryButtonStyle, ghostButtonStyle, exportToCsv, logActivity, CenteredMessage, ModalShell, ConfirmDialog, EmptyState, Field } from "../shared.jsx";

const CATEGORIES = [
  { value: "materia_prima", label: "Materia Prima" },
  { value: "empaque", label: "Empaque y Embalaje" },
  { value: "repuesto", label: "Repuestos y Herramientas" },
  { value: "insumo", label: "Insumos Generales" },
];

const emptyForm = {
  code: "",
  name: "",
  category: "materia_prima",
  stock: 0,
  minStock: 10,
  unit: "unid",
  location: "",
  supplier: "",
  cost: 0,
};

export default function Materiales({ user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todas");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [movementModal, setMovementModal] = useState(null); // { item, type: 'in' | 'out' }
  const [movementQty, setMovementQty] = useState(1);
  const [movementReason, setMovementReason] = useState("");

  useEffect(() => {
    const q = query(collection(db, "inventory_materials"), orderBy("name", "asc"));
    return onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      code: item.code || "",
      name: item.name || "",
      category: item.category || "materia_prima",
      stock: item.stock || 0,
      minStock: item.minStock || 10,
      unit: item.unit || "unid",
      location: item.location || "",
      supplier: item.supplier || "",
      cost: item.cost || 0,
    });
    setModalOpen(true);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      ...formData,
      stock: Number(formData.stock),
      minStock: Number(formData.minStock),
      cost: Number(formData.cost),
      updatedAt: serverTimestamp(),
    };

    if (editingItem) {
      await updateDoc(doc(db, "inventory_materials", editingItem.id), payload);
      logActivity(user.email, "Materiales", "Actualizado", payload.name);
    } else {
      payload.createdAt = serverTimestamp();
      await addDoc(collection(db, "inventory_materials"), payload);
      logActivity(user.email, "Materiales", "Creado", payload.name);
    }
    setModalOpen(false);
  }

  async function handleMovementSubmit(e) {
    e.preventDefault();
    if (!movementModal) return;

    const { item, type } = movementModal;
    const qty = Number(movementQty);
    const newStock = type === "in" ? (item.stock || 0) + qty : Math.max(0, (item.stock || 0) - qty);

    await updateDoc(doc(db, "inventory_materials", item.id), { stock: newStock });

    // Registrar historial de movimiento opcional en Firestore
    await addDoc(collection(db, "material_movements"), {
      materialId: item.id,
      materialName: item.name,
      type,
      quantity: qty,
      reason: movementReason,
      user: user.email,
      createdAt: serverTimestamp(),
    });

    logActivity(user.email, "Materiales", `Ajuste (${type === "in" ? "Entrada" : "Salida"})`, `${item.name}: ${type === "in" ? "+" : "-"}${qty}`);
    setMovementModal(null);
    setMovementQty(1);
    setMovementReason("");
  }

  async function removeItem(item) {
    await deleteDoc(doc(db, "inventory_materials", item.id));
    logActivity(user.email, "Materiales", "Eliminado", item.name);
    setConfirmDelete(null);
  }

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (selectedCategory !== "todas" && i.category !== selectedCategory) return false;
      const searchLower = search.toLowerCase();
      return (
        `${i.name} ${i.code || ""} ${i.supplier || ""} ${i.location || ""}`
          .toLowerCase()
          .includes(searchLower)
      );
    });
  }, [items, search, selectedCategory]);

  const stats = useMemo(() => {
    const totalItems = items.length;
    const lowStockCount = items.filter((i) => (i.stock || 0) <= (i.minStock || 5)).length;
    const totalValuation = items.reduce((acc, i) => acc + (i.stock || 0) * (i.cost || 0), 0);
    return { totalItems, lowStockCount, totalValuation };
  }, [items]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <span style={{ background: "rgba(88, 86, 214, 0.15)", color: "#5856D6", padding: "4px 8px", borderRadius: 6, fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
            INVENTORY MANAGEMENT
          </span>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: "6px 0 0", letterSpacing: "-0.5px" }}>Control de Materiales e Insumos</h1>
        </div>
        <button onClick={openCreateModal} style={{ ...primaryButtonStyle, borderRadius: 10, padding: "10px 18px" }}>
          <Plus size={18} /> Nuevo Material
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 28 }}>
        <KpiCard label="Ítems en Catálogo" value={stats.totalItems} icon={Layers} accentColor="#007AFF" />
        <KpiCard label="Alertas de Stock Bajo" value={stats.lowStockCount} icon={AlertCircle} accentColor="#FF3B30" badge={stats.lowStockCount > 0 ? "Revisar" : null} />
        <KpiCard label="Valorización Total" value={`$${stats.totalValuation.toLocaleString()}`} icon={PackageCheck} accentColor="#34C759" />
      </div>

      {/* Filtros y Toolbar */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 12, marginBottom: 24, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 240px" }}>
          <Search size={16} color="rgba(255,255,255,0.4)" style={{ position: "absolute", left: 12, top: 12 }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar SKU, material, proveedor..." style={{ ...inputStyle, paddingLeft: 36, borderRadius: 8, background: "rgba(0,0,0,0.2)" }} />
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button onClick={() => setSelectedCategory("todas")} style={{ background: selectedCategory === "todas" ? "#007AFF" : "rgba(255,255,255,0.05)", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Todas
          </button>
          {CATEGORIES.map((c) => (
            <button key={c.value} onClick={() => setSelectedCategory(c.value)} style={{ background: selectedCategory === c.value ? "#007AFF" : "rgba(255,255,255,0.05)", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              {c.label}
            </button>
          ))}
        </div>

        <button onClick={() => exportToCsv("inventario-materiales", filtered)} style={{ ...ghostButtonStyle, marginLeft: "auto", borderRadius: 8 }}>
          <Download size={16} /> Exportar
        </button>
      </div>

      {/* Grid de Materiales */}
      {loading ? (
        <CenteredMessage text="Cargando catálogo de materiales..." />
      ) : filtered.length === 0 ? (
        <EmptyState Icon={Layers} title="Sin materiales registrados" message="No se encontraron ítems en esta categoría." onAdd={openCreateModal} addLabel="Agregar Material" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18 }}>
          {filtered.map((item) => {
            const isLow = (item.stock || 0) <= (item.minStock || 5);
            return (
              <div key={item.id} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${isLow ? "rgba(255, 59, 48, 0.4)" : "rgba(255,255,255,0.07)"}`, borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: 0.5 }}>{item.code || "SKU N/A"}</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => openEditModal(item)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}><Edit3 size={15} /></button>
                      <button onClick={() => setConfirmDelete(item)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer" }}><Trash2 size={15} /></button>
                    </div>
                  </div>

                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px", color: "#fff" }}>{item.name}</h3>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
                    {item.location && <span>📍 {item.location}</span>}
                    {item.supplier && <span>🏢 {item.supplier}</span>}
                  </div>
                </div>

                <div style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: isLow ? "#FF3B30" : "#fff" }}>
                        {item.stock || 0} <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 400 }}>{item.unit}</span>
                      </div>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Mínimo: {item.minStock} {item.unit}</span>
                    </div>

                    {/* Botones de ajuste de Entrada / Salida */}
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setMovementModal({ item, type: "out" })} title="Salida de Stock" style={{ background: "rgba(255, 59, 48, 0.15)", border: "1px solid rgba(255, 59, 48, 0.3)", color: "#FF3B30", padding: 6, borderRadius: 8, cursor: "pointer" }}>
                        <ArrowDownLeft size={16} />
                      </button>
                      <button onClick={() => setMovementModal({ item, type: "in" })} title="Entrada de Stock" style={{ background: "rgba(52, 199, 89, 0.15)", border: "1px solid rgba(52, 199, 89, 0.3)", color: "#34C759", padding: 6, borderRadius: 8, cursor: "pointer" }}>
                        <ArrowUpRight size={16} />
                      </button>
                    </div>
                  </div>

                  {isLow && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#FF3B30", fontSize: 11, fontWeight: 700, marginTop: 4 }}>
                      <AlertCircle size={12} /> Stock por debajo del mínimo recomendado
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Registro/Edición */}
      {modalOpen && (
        <ModalShell title={editingItem ? "Editar Material" : "Nuevo Material"} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
              <Field label="SKU / Código">
                <input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="MAT-001" style={inputStyle} required />
              </Field>
              <Field label="Nombre del Material">
                <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ej: Polietileno de Alta Densidad" style={inputStyle} required />
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Categoría">
                <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} style={inputStyle}>
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="Unidad de Medida">
                <input value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} placeholder="kg, unid, mts, litros..." style={inputStyle} required />
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <Field label="Stock Inicial">
                <input type="number" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} style={inputStyle} required />
              </Field>
              <Field label="Stock Mínimo">
                <input type="number" value={formData.minStock} onChange={(e) => setFormData({ ...formData, minStock: e.target.value })} style={inputStyle} required />
              </Field>
              <Field label="Costo U. ($)">
                <input type="number" step="0.01" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: e.target.value })} style={inputStyle} />
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Ubicación en Almacén">
                <input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="Pasillo A - Estante 3" style={inputStyle} />
              </Field>
              <Field label="Proveedor Principal">
                <input value={formData.supplier} onChange={(e) => setFormData({ ...formData, supplier: e.target.value })} placeholder="Nombre del Proveedor" style={inputStyle} />
              </Field>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
              <button type="button" onClick={() => setModalOpen(false)} style={ghostButtonStyle}>Cancelar</button>
              <button type="submit" style={primaryButtonStyle}>Guardar Registro</button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Modal Ajuste de Stock (Entrada/Salida) */}
      {movementModal && (
        <ModalShell title={`${movementModal.type === "in" ? "Entrada" : "Salida"} de Stock: ${movementModal.item.name}`} onClose={() => setMovementModal(null)}>
          <form onSubmit={handleMovementSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label={`Cantidad a ${movementModal.type === "in" ? "Ingresar" : "Retirar"} (${movementModal.item.unit})`}>
              <input type="number" min="1" value={movementQty} onChange={(e) => setMovementQty(e.target.value)} style={inputStyle} autoFocus required />
            </Field>
            <Field label="Motivo u Observación">
              <input value={movementReason} onChange={(e) => setMovementReason(e.target.value)} placeholder="Ej: Recepción OC-4512 / Consumo Línea 2" style={inputStyle} required />
            </Field>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <button type="button" onClick={() => setMovementModal(null)} style={ghostButtonStyle}>Cancelar</button>
              <button type="submit" style={{ ...primaryButtonStyle, background: movementModal.type === "in" ? "#34C759" : "#FF3B30" }}>
                Confirmar {movementModal.type === "in" ? "Entrada" : "Salida"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {confirmDelete && (
        <ConfirmDialog title="Eliminar ítem" message={`¿Confirmas eliminar ${confirmDelete.name} del inventario?`} onCancel={() => setConfirmDelete(null)} onConfirm={() => removeItem(confirmDelete)} />
      )}
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, accentColor, badge }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "18px 20px", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{label}</span>
        {badge && <span style={{ background: accentColor, color: "#fff", fontSize: 10, padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>{badge}</span>}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8, color: "#fff" }}>{value}</div>
    </div>
  );
}
