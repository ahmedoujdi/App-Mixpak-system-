import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase.js";
import { 
  Boxes, 
  Search, 
  Plus, 
  Download, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  DollarSign, 
  Layers, 
  Building2, 
  Eye, 
  History,
  CheckCircle2,
  PackageCheck,
  RefreshCw
} from "lucide-react";
import { 
  primaryButtonStyle, 
  secondaryButtonStyle, 
  ghostButtonStyle, 
  inputStyle, 
  CenteredMessage, 
  EmptyState, 
  ModalShell, 
  Field, 
  logActivity, 
  exportToCsv, 
  inDateRange, 
  DateRangeFilter, 
  StatusBadge, 
  formatTimestamp 
} from "./shared.jsx";

export default function Inventario({ user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("todos");
  const [filterStockStatus, setFilterStockStatus] = useState("todos"); // "todos" | "critico" | "ok" | "sobrestock"
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Modales
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null); // Para ver o ajustar stock
  const [movementType, setMovementType] = useState("entrada"); // "entrada" | "salida"
  const [movementQty, setMovementQty] = useState("");
  const [movementReason, setMovementReason] = useState("");
  const [processing, setProcessing] = useState(false);

  // Formulario nuevo ítem
  const [newItem, setNewItem] = useState({
    code: "",
    name: "",
    category: "Materia Prima",
    quantity: 0,
    minStock: 10,
    maxStock: 500,
    unitPrice: "",
    location: "Almacén A - Estante 1",
    unitMeasure: "Kg"
  });

  // Carga en tiempo real de Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "inventory"), (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setItems(docs);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Guardar nuevo artículo
  const handleCreateItem = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const qty = Number(newItem.quantity) || 0;
      const price = parseFloat(newItem.unitPrice) || 0;

      await addDoc(collection(db, "inventory"), {
        ...newItem,
        quantity: qty,
        minStock: Number(newItem.minStock) || 0,
        maxStock: Number(newItem.maxStock) || 0,
        unitPrice: price,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await logActivity(
        user?.email,
        "Inventario",
        "Alta de Insumo/Material",
        `Nuevo artículo '${newItem.name}' (${newItem.code}) registrado con stock inicial de ${qty} ${newItem.unitMeasure}.`
      );

      setShowNewModal(false);
      setNewItem({
        code: "",
        name: "",
        category: "Materia Prima",
        quantity: 0,
        minStock: 10,
        maxStock: 500,
        unitPrice: "",
        location: "Almacén A - Estante 1",
        unitMeasure: "Kg"
      });
    } catch (err) {
      console.error("Error al crear ítem de inventario:", err);
    } finally {
      setProcessing(false);
    }
  };

  // Ajuste de Kárdex (Entrada/Salida)
  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;

    const qtyNumber = Number(movementQty);
    if (qtyNumber <= 0) return;

    setProcessing(true);
    try {
      const currentQty = Number(selectedItem.quantity) || 0;
      const newQty = movementType === "entrada" ? currentQty + qtyNumber : currentQty - qtyNumber;

      if (newQty < 0) {
        alert("Error: El ajuste resulta en un inventario negativo.");
        setProcessing(false);
        return;
      }

      const docRef = doc(db, "inventory", selectedItem.id);
      await updateDoc(docRef, {
        quantity: newQty,
        updatedAt: serverTimestamp()
      });

      await logActivity(
        user?.email,
        "Inventario",
        `Ajuste de Stock (${movementType.toUpperCase()})`,
        `${movementType === "entrada" ? "+" : "-"}${qtyNumber} ${selectedItem.unitMeasure} en '${selectedItem.name}'. Motivo: ${movementReason || "Ajuste manual"}`
      );

      setSelectedItem(null);
      setMovementQty("");
      setMovementReason("");
    } catch (err) {
      console.error("Error al ajustar stock:", err);
    } finally {
      setProcessing(false);
    }
  };

  // Filtrado de Datos
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory = filterCategory === "todos" || item.category === filterCategory;
      
      const qty = Number(item.quantity) || 0;
      const min = Number(item.minStock) || 0;
      const max = Number(item.maxStock) || Infinity;
      
      let stockStatus = "ok";
      if (qty <= min) stockStatus = "critico";
      else if (qty >= max) stockStatus = "sobrestock";

      const matchesStockStatus = filterStockStatus === "todos" || stockStatus === filterStockStatus;

      const matchesSearch = 
        (item.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.location || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDate = inDateRange(item.createdAt, fromDate, toDate);

      return matchesCategory && matchesStockStatus && matchesSearch && matchesDate;
    });
  }, [items, filterCategory, filterStockStatus, searchTerm, fromDate, toDate]);

  // KPIs Financieros y de Almacén
  const metrics = useMemo(() => {
    const totalSKUs = items.length;
    let lowStockCount = 0;
    let totalValuation = 0;

    items.forEach((item) => {
      const qty = Number(item.quantity) || 0;
      const min = Number(item.minStock) || 0;
      const price = Number(item.unitPrice) || 0;

      if (qty <= min) lowStockCount++;
      totalValuation += qty * price;
    });

    return { totalSKUs, lowStockCount, totalValuation };
  }, [items]);

  if (loading) {
    return <CenteredMessage text="Accediendo al Kárdex de Materiales & Almacenes..." />;
  }

  return (
    <div style={{ maxWidth: 1350, margin: "0 auto", paddingBottom: 50 }}>
      
      {/* HEADER DE MÓDULO */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ background: "rgba(255,149,0,0.15)", color: "#FF9500", fontSize: 10, fontWeight: 900, padding: "2px 8px", borderRadius: 4 }}>
              GESTIÓN DE MATERIALES & KÁRDEX
            </span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, color: "#fff", letterSpacing: "-0.5px" }}>
            Control de Inventario & Almacén
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
            Monitoreo en tiempo real de niveles de stock, valuación del Kárdex y trazabilidad de insumos.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => exportToCsv("kardex_inventario_enterprise", filteredItems)} style={ghostButtonStyle}>
            <Download size={16} /> Exportar Kárdex
          </button>
          <button onClick={() => setShowNewModal(true)} style={primaryButtonStyle}>
            <Plus size={16} /> Alta de Artículo
          </button>
        </div>
      </div>

      {/* STRIP DE KPIS ENTERPRISE */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "rgba(0, 122, 255, 0.08)", border: "1px solid rgba(0, 122, 255, 0.2)", borderRadius: 16, padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#007AFF" }}>TOTAL DE SKUS</span>
            <Boxes size={18} color="#007AFF" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginTop: 6 }}>{metrics.totalSKUs}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>Insumos & Componentes activos</div>
        </div>

        <div style={{ background: "rgba(255, 149, 0, 0.08)", border: "1px solid rgba(255, 149, 0, 0.2)", borderRadius: 16, padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#FF9500" }}>DESVIACIÓN DE STOCK (BAJO)</span>
            <AlertTriangle size={18} color="#FF9500" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginTop: 6 }}>{metrics.lowStockCount}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>Requieren reorden de compra</div>
        </div>

        <div style={{ background: "rgba(52, 199, 89, 0.08)", border: "1px solid rgba(52, 199, 89, 0.2)", borderRadius: 16, padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#34C759" }}>VALORACIÓN DEL KÁRDEX</span>
            <DollarSign size={18} color="#34C759" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginTop: 6 }}>
            ${metrics.totalValuation.toLocaleString()} USD
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>Valor financiero en almacén</div>
        </div>
      </div>

      {/* FILTROS AVANZADOS */}
      <div 
        style={{ 
          background: "rgba(255,255,255,0.02)", 
          border: "1px solid rgba(255,255,255,0.06)", 
          borderRadius: 16, 
          padding: 16, 
          marginBottom: 20,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: 260 }}>
          <Search size={16} color="rgba(255,255,255,0.4)" style={{ position: "absolute", left: 12, top: 12 }} />
          <input 
            type="text" 
            placeholder="Buscar por código, nombre o ubicación..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            style={{ ...inputStyle, paddingLeft: 38 }} 
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
            <option value="todos" style={{ background: "#12141d" }}>Todas las Categorías</option>
            <option value="Materia Prima" style={{ background: "#12141d" }}>Materia Prima</option>
            <option value="Componente" style={{ background: "#12141d" }}>Componentes & Piezas</option>
            <option value="Empaque" style={{ background: "#12141d" }}>Empaque & Embudo</option>
            <option value="Herramental" style={{ background: "#12141d" }}>Herramientas & Refacciones</option>
          </select>

          <select value={filterStockStatus} onChange={(e) => setFilterStockStatus(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
            <option value="todos" style={{ background: "#12141d" }}>Todos los Estados de Stock</option>
            <option value="critico" style={{ background: "#12141d" }}>Stock Bajo / Crítico</option>
            <option value="ok" style={{ background: "#12141d" }}>Stock Óptimo</option>
            <option value="sobrestock" style={{ background: "#12141d" }}>Sobrestock</option>
          </select>

          <DateRangeFilter from={fromDate} to={toDate} onFromChange={setFromDate} onToChange={setToDate} />
        </div>
      </div>

      {/* TABLA ENTERPRISE DE INVENTARIO */}
      {filteredItems.length === 0 ? (
        <EmptyState 
          Icon={Boxes} 
          title="Sin Materiales Registrados" 
          message="No se encontraron artículos que coincidan con la búsqueda o filtros aplicados." 
        />
      ) : (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13, color: "#fff" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)", fontSize: 11, textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
                <th style={{ padding: "14px 16px" }}>Código & Artículo</th>
                <th style={{ padding: "14px 16px" }}>Categoría</th>
                <th style={{ padding: "14px 16px" }}>Ubicación</th>
                <th style={{ padding: "14px 16px" }}>Disponible</th>
                <th style={{ padding: "14px 16px" }}>Punto Crítico</th>
                <th style={{ padding: "14px 16px" }}>Precio Unit.</th>
                <th style={{ padding: "14px 16px" }}>Valor Total</th>
                <th style={{ padding: "14px 16px", textAlign: "right" }}>Ajuste</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const qty = Number(item.quantity) || 0;
                const min = Number(item.minStock) || 0;
                const price = Number(item.unitPrice) || 0;
                const isLow = qty <= min;

                return (
                  <tr key={item.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 800, color: "#fff" }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>SKU: {item.code || "S/C"}</div>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.8)" }}>
                        {item.category}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", color: "rgba(255,255,255,0.7)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Building2 size={13} color="rgba(255,255,255,0.4)" />
                        {item.location || "Almacén General"}
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 900, fontSize: 14, color: isLow ? "#FF9500" : "#34C759" }}>
                        {qty} {item.unitMeasure || "pzs"}
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
                      Min: {min} | Max: {item.maxStock || "N/A"}
                    </td>
                    <td style={{ padding: "14px 16px", fontWeight: 700 }}>
                      ${price.toFixed(2)}
                    </td>
                    <td style={{ padding: "14px 16px", fontWeight: 800, color: "#007AFF" }}>
                      ${(qty * price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <button 
                        onClick={() => setSelectedItem(item)} 
                        style={{ ...ghostButtonStyle, padding: "6px 10px", fontSize: 12 }}
                      >
                        Ajustar Stock
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL ALTA DE ARTÍCULO */}
      {showNewModal && (
        <ModalShell title="Registrar Nuevo Material en Inventario" onClose={() => setShowNewModal(false)}>
          <form onSubmit={handleCreateItem} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
              <Field label="Código SKU / Identificador">
                <input 
                  type="text" 
                  placeholder="Ej. MAT-0982" 
                  value={newItem.code} 
                  onChange={(e) => setNewItem({ ...newItem, code: e.target.value })} 
                  style={inputStyle} 
                  required 
                />
              </Field>

              <Field label="Nombre del Insumo / Material">
                <input 
                  type="text" 
                  placeholder="Ej. Resina de Polipropileno HD" 
                  value={newItem.name} 
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} 
                  style={inputStyle} 
                  required 
                />
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Categoría">
                <select 
                  value={newItem.category} 
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })} 
                  style={inputStyle}
                >
                  <option value="Materia Prima" style={{ background: "#12141d" }}>Materia Prima</option>
                  <option value="Componente" style={{ background: "#12141d" }}>Componentes & Piezas</option>
                  <option value="Empaque" style={{ background: "#12141d" }}>Empaque & Embudo</option>
                  <option value="Herramental" style={{ background: "#12141d" }}>Herramientas & Refacciones</option>
                </select>
              </Field>

              <Field label="Unidad de Medida">
                <input 
                  type="text" 
                  placeholder="Ej. Kg, Litros, Unidades..." 
                  value={newItem.unitMeasure} 
                  onChange={(e) => setNewItem({ ...newItem, unitMeasure: e.target.value })} 
                  style={inputStyle} 
                  required 
                />
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <Field label="Cantidad Inicial">
                <input 
                  type="number" 
                  value={newItem.quantity} 
                  onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })} 
                  style={inputStyle} 
                  required 
                />
              </Field>

              <Field label="Stock Mínimo (Alerta)">
                <input 
                  type="number" 
                  value={newItem.minStock} 
                  onChange={(e) => setNewItem({ ...newItem, minStock: e.target.value })} 
                  style={inputStyle} 
                  required 
                />
              </Field>

              <Field label="Stock Máximo">
                <input 
                  type="number" 
                  value={newItem.maxStock} 
                  onChange={(e) => setNewItem({ ...newItem, maxStock: e.target.value })} 
                  style={inputStyle} 
                />
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Precio Unitario (USD)">
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00" 
                  value={newItem.unitPrice} 
                  onChange={(e) => setNewItem({ ...newItem, unitPrice: e.target.value })} 
                  style={inputStyle} 
                  required 
                />
              </Field>

              <Field label="Ubicación Física">
                <input 
                  type="text" 
                  placeholder="Ej. Almacén A - Pasillo 3" 
                  value={newItem.location} 
                  onChange={(e) => setNewItem({ ...newItem, location: e.target.value })} 
                  style={inputStyle} 
                />
              </Field>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <button type="button" onClick={() => setShowNewModal(false)} style={secondaryButtonStyle}>
                Cancelar
              </button>
              <button type="submit" disabled={processing} style={primaryButtonStyle}>
                {processing ? "Guardando..." : "Dar de Alta Insumo"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* MODAL DE AJUSTE DE STOCK (KÁRDEX) */}
      {selectedItem && (
        <ModalShell title={`Ajuste de Kárdex: ${selectedItem.name}`} onClose={() => setSelectedItem(null)}>
          <form onSubmit={handleAdjustStock} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "rgba(0,122,255,0.08)", border: "1px solid rgba(0,122,255,0.2)", padding: 14, borderRadius: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#007AFF" }}>STOCK ACTUAL EN ALMACÉN</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", marginTop: 2 }}>
                {selectedItem.quantity} {selectedItem.unitMeasure || "pzs"}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>SKU: {selectedItem.code} | Ubicación: {selectedItem.location}</div>
            </div>

            <Field label="Tipo de Movimiento">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button 
                  type="button" 
                  onClick={() => setMovementType("entrada")} 
                  style={{ 
                    ...secondaryButtonStyle, 
                    border: movementType === "entrada" ? "2px solid #34C759" : undefined, 
                    color: movementType === "entrada" ? "#34C759" : undefined 
                  }}
                >
                  <ArrowDownLeft size={16} /> Entrada (+)
                </button>
                <button 
                  type="button" 
                  onClick={() => setMovementType("salida")} 
                  style={{ 
                    ...secondaryButtonStyle, 
                    border: movementType === "salida" ? "2px solid #FF3B30" : undefined, 
                    color: movementType === "salida" ? "#FF3B30" : undefined 
                  }}
                >
                  <ArrowUpRight size={16} /> Salida (-)
                </button>
              </div>
            </Field>

            <Field label={`Cantidad a ${movementType === "entrada" ? "Ingresar" : "Descontar"}`}>
              <input 
                type="number" 
                placeholder="0" 
                value={movementQty} 
                onChange={(e) => setMovementQty(e.target.value)} 
                style={inputStyle} 
                required 
              />
            </Field>

            <Field label="Motivo del Ajuste de Inventario">
              <textarea 
                rows={2} 
                placeholder="Ej. Surtido de orden OP, merma por merma, recepción de proveedor..." 
                value={movementReason} 
                onChange={(e) => setMovementReason(e.target.value)} 
                style={{ ...inputStyle, resize: "vertical" }} 
                required 
              />
            </Field>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <button type="button" onClick={() => setSelectedItem(null)} style={secondaryButtonStyle}>
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={processing} 
                style={{ 
                  ...primaryButtonStyle, 
                  background: movementType === "entrada" ? "#34C759" : "#FF3B30" 
                }}
              >
                {processing ? "Guardando..." : `Confirmar ${movementType.toUpperCase()}`}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

    </div>
  );
}
