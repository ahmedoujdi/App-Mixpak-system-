import React, { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase.js";
import { Boxes, Plus, Edit, Trash2, Download, Search, AlertTriangle, FileText } from "lucide-react";
import {
  COLORS,
  inputStyle,
  selectStyle,
  primaryButtonStyle,
  ghostButtonStyle,
  Field,
  ModalShell,
  ConfirmDialog,
  CenteredMessage,
  EmptyState,
  logActivity,
  exportToCsv,
  exportToPdf,
  useToast
} from "../shared.jsx";

export default function Inventario({ user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const { addToast } = useToast();

  const [form, setForm] = useState({
    name: "",
    sku: "",
    category: "Materia Prima",
    stock: "",
    minStock: "",
    unit: "Kg",
  });

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "materials"),
      (snap) => {
        const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setItems(list);
        setLoading(false);
      },
      (err) => console.error("Error al cargar inventario:", err)
    );
    return unsub;
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    setForm({ name: "", sku: "", category: "Materia Prima", stock: "", minStock: "", unit: "Kg" });
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setForm({
      name: item.name || "",
      sku: item.sku || "",
      category: item.category || "Materia Prima",
      stock: item.stock || "",
      minStock: item.minStock || "",
      unit: item.unit || "Kg",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.sku) return;

    try {
      const payload = {
        name: form.name,
        sku: form.sku,
        category: form.category,
        stock: Number(form.stock) || 0,
        minStock: Number(form.minStock) || 0,
        unit: form.unit,
        updatedAt: serverTimestamp(),
      };

      if (editingItem) {
        await updateDoc(doc(db, "materials", editingItem.id), payload);
        await logActivity(user?.email, "Inventario", "Editar Ítem", `Actualizado: ${form.name}`);
        addToast("Ítem de inventario actualizado", "success");
      } else {
        payload.createdAt = serverTimestamp();
        await addDoc(collection(db, "materials"), payload);
        await logActivity(user?.email, "Inventario", "Crear Ítem", `Nuevo ítem: ${form.name}`);
        addToast("Nuevo ítem registrado en inventario", "success");
      }

      setModalOpen(false);
    } catch (err) {
      console.error(err);
      addToast("Error al guardar en inventario", "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, "materials", deleteId));
      await logActivity(user?.email, "Inventario", "Eliminar Ítem", `Eliminado ID: ${deleteId}`);
      addToast("Ítem eliminado del inventario", "info");
      setDeleteId(null);
    } catch (err) {
      console.error(err);
      addToast("Error al eliminar el ítem", "error");
    }
  };

  const filteredItems = items.filter(
    (item) =>
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportPDF = () => {
    const headers = ["Nombre", "SKU", "Categoría", "Stock", "Mínimo", "Unidad"];
    const rows = filteredItems.map((i) => [i.name, i.sku, i.category, i.stock, i.minStock, i.unit]);
    exportToPdf("Reporte General de Inventario", headers, rows, "inventario-planta");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <h1 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 22, textTransform: "uppercase", margin: 0 }}>
          Control de Inventario y Materiales
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => exportToCsv("inventario", filteredItems)} style={ghostButtonStyle}>
            <Download size={14} /> CSV
          </button>
          <button onClick={handleExportPDF} style={ghostButtonStyle}>
            <FileText size={14} color={COLORS.steel} /> PDF
          </button>
          <button onClick={openCreateModal} style={primaryButtonStyle}>
            <Plus size={16} /> Nuevo Ítem
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 16, position: "relative" }}>
        <Search size={16} color={COLORS.textMuted} style={{ position: "absolute", left: 12, top: 12 }} />
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por código SKU o nombre de material..."
          style={{ ...inputStyle, paddingLeft: 36 }}
        />
      </div>

      {loading ? (
        <CenteredMessage text="Cargando inventario..." />
      ) : filteredItems.length === 0 ? (
        <EmptyState Icon={Boxes} title="Sin ítems registrados" message="Agrega materias primas o insumos para controlar stock." onAdd={openCreateModal} addLabel="Agregar Ítem" />
      ) : (
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#0e141c", borderBottom: `1px solid ${COLORS.border}`, color: COLORS.textMuted }}>
                <th style={{ padding: 12 }}>MATERIAL</th>
                <th style={{ padding: 12 }}>SKU</th>
                <th style={{ padding: 12 }}>CATEGORÍA</th>
                <th style={{ padding: 12 }}>STOCK</th>
                <th style={{ padding: 12, textAlign: "right" }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const isLowStock = Number(item.stock) <= Number(item.minStock);
                return (
                  <tr key={item.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                    <td style={{ padding: 12, fontWeight: 600 }}>{item.name}</td>
                    <td style={{ padding: 12, color: COLORS.textMuted, fontFamily: "monospace" }}>{item.sku}</td>
                    <td style={{ padding: 12 }}>{item.category}</td>
                    <td style={{ padding: 12 }}>
                      <span style={{ fontWeight: 700, color: isLowStock ? COLORS.critical : COLORS.green }}>
                        {item.stock} {item.unit}
                      </span>
                      {isLowStock && (
                        <span style={{ marginLeft: 6, fontSize: 10, color: COLORS.critical, display: "inline-flex", alignItems: "center", gap: 2 }}>
                          <AlertTriangle size={12} /> Stock Bajo
                        </span>
                      )}
                    </td>
                    <td style={{ padding: 12, textAlign: "right" }}>
                      <button onClick={() => openEditModal(item)} style={{ background: "none", border: "none", color: COLORS.steel, cursor: "pointer", marginRight: 8 }}>
                        <Edit size={16} />
                      </button>
                      <button onClick={() => setDeleteId(item.id)} style={{ background: "none", border: "none", color: COLORS.critical, cursor: "pointer" }}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL CREAR / EDITAR */}
      {modalOpen && (
        <ModalShell title={editingItem ? "Editar Material" : "Agregar Nuevo Material"} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit}>
            <Field label="NOMBRE DEL MATERIAL">
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="Ej. Resina Polietileno" />
            </Field>
            <Field label="CÓDIGO SKU">
              <input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} style={inputStyle} placeholder="Ej. MP-001" />
            </Field>
            <Field label="CATEGORÍA">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={selectStyle}>
                <option value="Materia Prima">Materia Prima</option>
                <option value="Empaque">Empaque</option>
                <option value="Repuesto">Repuesto Mantenimiento</option>
                <option value="Insumo General">Insumo General</option>
              </select>
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <Field label="STOCK ACTUAL">
                <input type="number" required value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} style={inputStyle} />
              </Field>
              <Field label="STOCK MÍNIMO">
                <input type="number" required value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} style={inputStyle} />
              </Field>
              <Field label="UNIDAD">
                <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} style={selectStyle}>
                  <option value="Kg">Kg</option>
                  <option value="Lts">Lts</option>
                  <option value="Unid">Unid</option>
                  <option value="Mts">Mts</option>
                </select>
              </Field>
            </div>
            <button type="submit" style={{ ...primaryButtonStyle, width: "100%", justifyContent: "center", marginTop: 10 }}>
              Guardar Ítem
            </button>
          </form>
        </ModalShell>
      )}

      {/* CONFIRMAR ELIMINAR */}
      {deleteId && (
        <ConfirmDialog
          title="Eliminar Material"
          message="¿Seguro que deseas eliminar este material del inventario? Esta acción no se puede deshacer."
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}
