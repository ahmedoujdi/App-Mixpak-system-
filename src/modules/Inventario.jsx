import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase.js";
import { 
  Boxes, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  Plus, 
  Search, 
  Download, 
  MapPin, 
  Package, 
  Tag, 
  Clock 
} from "lucide-react";
import { 
  inputStyle, 
  primaryButtonStyle, 
  ghostButtonStyle, 
  exportToCsv, 
  logActivity, 
  DateRangeFilter, 
  inDateRange, 
  CenteredMessage, 
  Field, 
  ModalShell, 
  EmptyState 
} from "../shared.jsx";

const MOVEMENT_TYPES = [
  { value: "entrada", label: "Entrada (Recepción / Compra)", color: "#34C759", icon: ArrowDownLeft, bg: "rgba(52, 199, 89, 0.15)" },
  { value: "salida", label: "Salida (Consumo / Despacho)", color: "#FF3B30", icon: ArrowUpRight, bg: "rgba(255, 59, 48, 0.15)" },
  { value: "ajuste", label: "Ajuste de Inventario (Auditoría)", color: "#007AFF", icon: RefreshCw, bg: "rgba(0, 122, 255, 0.15)" },
];

const emptyForm = {
  materialId: "",
  type: "entrada",
  quantity: "",
  lot: "",
  location: "",
  notes: "",
};

export default function Inventario({ user }) {
  const [materials, setMaterials] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterType, setFilterType] = useState("todos");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    // 1. Escuchar Materiales para el selector
    const unsubMaterials = onSnapshot(collection(db, "inventory_materials"), (snap) => {
      setMaterials(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    // 2. Escuchar Movimientos de Inventario
    const qMovements = query(collection(db, "inventory_movements"), orderBy("timestamp", "desc"), limit(150));
    const unsubMovements = onSnapshot(qMovements, (snap) => {
      setMovements(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => {
      unsubMaterials();
      unsubMovements();
    };
  }, []);

  const filtered = useMemo(() => {
    return movements.filter((m) => {
      if (filterType !== "todos" && m.type !== filterType) return false;
      if (!inDateRange(m.timestamp, dateFrom, dateTo)) return false;
      
      const term = search.toLowerCase();
      return `${m.materialName || ""} ${m.lot || ""} ${m.location || ""} ${m.notes || ""}`.toLowerCase().includes(term);
    });
  }, [movements, filterType, search, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const entradas = movements.filter((m) => m.type === "entrada").length;
    const salidas = movements.filter((m) => m.type === "salida").length;
    const ajustes = movements.filter((m) => m.type === "ajuste").length;
    return { total: movements.length, entradas, salidas, ajustes };
  }, [movements]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <span style={{ background: "rgba(0, 122, 255, 0.15)", color: "#007AFF", padding: "4px 8px", borderRadius: 6, fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
            WAREHOUSE OPERATIONS
          </span>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: "6px 0 0", letterSpacing: "-0.5px" }}>Gestión de Inventario & Movimientos</h1>
        </div>
        <button onClick={() => setModalOpen(true)} style={{ ...primaryButtonStyle, borderRadius: 10, padding: "10px 18px", boxShadow: "0 4px 14px rgba(0,0,0,0.2)" }}>
          <Plus size={18} /> Registrar Movimiento
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 28 }}>
        <KpiCard label="Movimientos Registrados" value={stats.total} icon={Boxes} accentColor="#007AFF" />
        <KpiCard label="Entradas de Stock" value={stats.entradas} icon={ArrowDownLeft} accentColor="#34C759" />
        <KpiCard label="Salidas / Despachos" value={stats.salidas} icon={ArrowUpRight} accentColor="#FF3B30" />
        <KpiCard label="Ajustes de Auditoría" value={stats.ajustes} icon={RefreshCw} accentColor="#FF9500" />
      </div>

      {/* Toolbar y Filtros */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 12, marginBottom: 24, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 240px" }}>
          <Search size={16} color="rgba(255,255,255,0.4)" style={{ position: "absolute", left: 12, top: 12 }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por material, lote, ubicación..." style={{ ...inputStyle, paddingLeft: 36, borderRadius: 8, background: "rgba(0,0,0,0.2)" }} />
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Chip active={filterType === "todos"} onClick={() => setFilterType("todos")}>Todos</Chip>
          <Chip active={filterType === "entrada"} onClick={() => setFilterType("entrada")}>Entradas</Chip>
          <Chip active={filterType === "salida"} onClick={() => setFilterType("salida")}>Salidas</Chip>
          <Chip active={filterType === "ajuste"} onClick={() => setFilterType("ajuste")}>Ajustes</Chip>
        </div>

        <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
        <button onClick={() => exportToCsv("movimientos-inventario", filtered)} style={{ ...ghostButtonStyle, marginLeft: "auto", borderRadius: 8 }}>
          <Download size={16} /> Exportar
        </button>
      </div>

      {/* Tabla / Lista de Movimientos */}
      {loading ? (
        <CenteredMessage text="Cargando kardex de inventario..." />
      ) : filtered.length === 0 ? (
        <EmptyState Icon={Boxes} title="Sin movimientos de stock" message="Registra la primera entrada, salida o ajuste de material." onAdd={() => setModalOpen(true)} addLabel="Registrar Movimiento" />
      ) : (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "150px 140px 1fr 120px 120px 180px", padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: 0.5 }}>
            <span>FECHA / HORA</span>
            <span>TIPO</span>
            <span>MATERIAL</span>
            <span style={{ textAlign: "right" }}>CANTIDAD</span>
            <span>LOTE / UBICACIÓN</span>
            <span>RESPONSABLE</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {filtered.map((m, index) => {
              const typeConfig = MOVEMENT_TYPES.find((t) => t.value === m.type) || MOVEMENT_TYPES[0];
              const IconComp = typeConfig.icon;
              const dateStr = m.timestamp?.toDate ? m.timestamp.toDate().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : "Reciente";

              return (
                <div key={m.id || index} style={{ display: "grid", gridTemplateColumns: "150px 140px 1fr 120px 120px 180px", padding: "12px 18px", alignItems: "center", borderBottom: index !== filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", background: index % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent", fontSize: 13 }}>
                  <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>{dateStr}</span>

                  <span>
                    <span style={{ background: typeConfig.bg, color: typeConfig.color, padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <IconComp size={12} /> {m.type.toUpperCase()}
                    </span>
                  </span>

                  <div>
                    <strong style={{ color: "#fff", display: "block" }}>{m.materialName}</strong>
                    {m.notes && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{m.notes}</span>}
                  </div>

                  <span style={{ textAlign: "right", fontWeight: 800, fontSize: 14, color: m.type === "salida" ? "#FF3B30" : m.type === "entrada" ? "#34C759" : "#007AFF" }}>
                    {m.type === "salida" ? "-" : m.type === "entrada" ? "+" : ""}{m.quantity} {m.unit || ""}
                  </span>

                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>
                    {m.lot && <div><Tag size={10} style={{ marginRight: 3 }} /> Lote: {m.lot}</div>}
                    {m.location && <div><MapPin size={10} style={{ marginRight: 3 }} /> Ubic: {m.location}</div>}
                  </div>

                  <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.createdBy}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Formulario Movimiento */}
      {modalOpen && <MovementFormModal user={user} materials={materials} onClose={() => setModalOpen(false)} />}
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, accentColor }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{label}</span>
        <div style={{ background: `${accentColor}20`, color: accentColor, padding: 6, borderRadius: 8 }}>
          <Icon size={18} />
        </div>
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8, color: "#fff" }}>{value}</div>
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{ background: active ? "#007AFF" : "rgba(255,255,255,0.05)", color: active ? "#fff" : "rgba(255,255,255,0.7)", border: "none", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
      {children}
    </button>
  );
}

function MovementFormModal({ user, materials, onClose }) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const selectedMaterial = useMemo(() => {
    return materials.find((m) => m.id === form.materialId);
  }, [materials, form.materialId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.materialId) return alert("Por favor selecciona un material.");
    const qty = parseFloat(form.quantity);
    if (isNaN(qty) || qty <= 0) return alert("Ingresa una cantidad válida mayor a 0.");

    setSubmitting(true);
    try {
      const currentStock = selectedMaterial.stock || 0;
      let newStock = currentStock;

      if (form.type === "entrada") newStock += qty;
      else if (form.type === "salida") {
        if (qty > currentStock) {
          if (!window.confirm("La cantidad a retirar supera el stock actual. ¿Deseas continuar de todos modos?")) {
            setSubmitting(false);
            return;
          }
        }
        newStock -= qty;
      } else if (form.type === "ajuste") {
        newStock = qty; // Ajuste fija el stock exacto
      }

      // 1. Actualizar Stock en el catálogo de materiales
      await updateDoc(doc(db, "inventory_materials", form.materialId), {
        stock: newStock,
        updatedAt: serverTimestamp(),
      });

      // 2. Registrar la transacción en el kardex de movimientos
      const movementPayload = {
        materialId: form.materialId,
        materialName: selectedMaterial.name,
        unit: selectedMaterial.unit || "",
        type: form.type,
        quantity: qty,
        previousStock: currentStock,
        newStock,
        lot: form.lot || "",
        location: form.location || "",
        notes: form.notes || "",
        createdBy: user.email,
        timestamp: serverTimestamp(),
      };

      await addDoc(collection(db, "inventory_movements"), movementPayload);

      // 3. Auditoría global
      logActivity(user.email, "Inventario", `Movimiento de ${form.type.toUpperCase()}`, `${selectedMaterial.name}: ${form.type === 'salida' ? '-' : '+'}${qty} ${selectedMaterial.unit || ''}`);

      onClose();
    } catch (err) {
      alert(err.message || "Error al registrar el movimiento.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell title="Registrar Movimiento de Inventario" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Seleccionar Material">
          <select value={form.materialId} onChange={(e) => setForm({ ...form, materialId: e.target.value })} style={inputStyle} required>
            <option value="">-- Selecciona un ítem --</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} (Stock Actual: {m.stock || 0} {m.unit || ""})
              </option>
            ))}
          </select>
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Tipo de Movimiento">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={inputStyle}>
              {MOVEMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>
          <Field label={form.type === "ajuste" ? "Stock Final Ajustado" : "Cantidad"}>
            <input type="number" step="any" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="0.00" style={inputStyle} required />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Nº Lote (Opcional)">
            <input value={form.lot} onChange={(e) => setForm({ ...form, lot: e.target.value })} placeholder="Ej: L-2026-004" style={inputStyle} />
          </Field>
          <Field label="Ubicación Física (Pasillo/Rack)">
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Ej: Estante B2-4" style={inputStyle} />
          </Field>
        </div>

        <Field label="Notas / Motivo">
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Ingresa detalles sobre la recepción, orden de compra o consumo..." style={{ ...inputStyle, minHeight: 60 }} />
        </Field>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
          <button type="button" onClick={onClose} style={ghostButtonStyle}>Cancelar</button>
          <button type="submit" disabled={submitting} style={primaryButtonStyle}>
            {submitting ? "Guardando..." : "Confirmar Movimiento"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
