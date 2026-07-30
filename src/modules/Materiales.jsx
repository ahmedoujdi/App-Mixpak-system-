import React, { useState, useMemo } from "react";
import { Plus, Boxes, AlertTriangle, Search, Edit3, Trash2, ArrowUpRight } from "lucide-react";
import { COLORS, primaryButtonStyle, ghostButtonStyle, inputStyle, ModalShell, Field, StatusBadge } from "./shared.jsx";
import ExportButton from "./ExportModule.jsx";

const MOCK_MATERIALS_DATA = [
  { id: "mat-1", code: "MAT-001", name: "Resina Polietileno HD-120", category: "Materia Prima", stock: 1200, minStock: 500, unit: "kg", location: "Almacén A-12", costPerUnit: 2.45 },
  { id: "mat-2", code: "MAT-002", name: "Pigmento Azul Industrial", category: "Aditivos", stock: 45, minStock: 100, unit: "kg", location: "Almacén B-04", costPerUnit: 18.50 },
  { id: "mat-3", code: "MAT-003", name: "Bobina Film Polipropileno 40um", category: "Empaque", stock: 15, minStock: 20, unit: "rollos", location: "Planta L3", costPerUnit: 120.00 },
  { id: "mat-4", code: "MAT-004", name: "Cajas Cartón Corrugado 40x30", category: "Empaque", stock: 3500, minStock: 1000, unit: "unidades", location: "Almacén C-01", costPerUnit: 0.85 },
];

export default function MaterialesModule({ currentUser, globalSearch = "" }) {
  const [materials, setMaterials] = useState(MOCK_MATERIALS_DATA);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("todos");
  const [stockFilter, setStockFilter] = useState("todos");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [formData, setFormData] = useState({
    code: "", name: "", category: "Materia Prima", stock: 0, minStock: 0, unit: "kg", location: "", costPerUnit: 0
  });

  const effectiveSearch = globalSearch || searchTerm;

  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const matchesSearch =
        m.code.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        m.name.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        m.location.toLowerCase().includes(effectiveSearch.toLowerCase());

      const matchesCategory = categoryFilter === "todos" || m.category === categoryFilter;
      
      const isCritical = Number(m.stock) <= Number(m.minStock);
      const matchesStock = 
        stockFilter === "todos" || 
        (stockFilter === "critico" && isCritical) || 
        (stockFilter === "ok" && !isCritical);

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [materials, effectiveSearch, categoryFilter, stockFilter]);

  const kpis = useMemo(() => {
    const totalItems = materials.length;
    const criticalStock = materials.filter(m => Number(m.stock) <= Number(m.minStock)).length;
    const totalValuation = materials.reduce((acc, curr) => acc + (Number(curr.stock) * Number(curr.costPerUnit || 0)), 0);
    return { totalItems, criticalStock, totalValuation };
  }, [materials]);

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData(item);
    } else {
      setEditingItem(null);
      setFormData({
        code: `MAT-00${materials.length + 1}`,
        name: "", category: "Materia Prima", stock: 0, minStock: 0, unit: "kg", location: "", costPerUnit: 0
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (editingItem) {
      setMaterials(materials.map((m) => (m.id === editingItem.id ? { ...formData } : m)));
    } else {
      setMaterials([...materials, { ...formData, id: `mat-${Date.now()}` }]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este material?")) {
      setMaterials(materials.filter((m) => m.id !== id));
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "800", color: COLORS.textMain }}>Gestión de Materiales e Inventario</h1>
          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: COLORS.textMuted }}>Control de stock, niveles mínimos y ubicaciones en almacén</p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <ExportButton moduleName="Materiales" data={filteredMaterials} userEmail={currentUser?.email || "operaciones@mixpak.com"} search={effectiveSearch} />
          <button onClick={() => handleOpenModal()} style={primaryButtonStyle}>
            <Plus size={16} /> Nuevo Material
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
        <div style={kpiCardStyle}>
          <div style={{ fontSize: "12px", color: COLORS.textMuted, fontWeight: "600" }}>Total de Ítems</div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: COLORS.textMain, marginTop: "4px" }}>{kpis.totalItems}</div>
        </div>
        <div style={kpiCardStyle}>
          <div style={{ fontSize: "12px", color: COLORS.textMuted, fontWeight: "600" }}>Stock Crítico / Alertas</div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: kpis.criticalStock > 0 ? COLORS.danger : COLORS.success, marginTop: "4px" }}>{kpis.criticalStock}</div>
        </div>
        <div style={kpiCardStyle}>
          <div style={{ fontSize: "12px", color: COLORS.textMuted, fontWeight: "600" }}>Valoración de Inventario</div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: COLORS.primary, marginTop: "4px" }}>${kpis.totalValuation.toLocaleString("es-ES", { minimumFractionDigits: 2 })}</div>
        </div>
      </div>

      <div style={{ backgroundColor: COLORS.cardBg, border: `1px solid ${COLORS.cardBorder}`, borderRadius: "12px", padding: "16px", display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ position: "relative", minWidth: "260px", flex: 1 }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: COLORS.textMuted }} />
          <input type="text" placeholder="Buscar por código, material o ubicación..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ ...inputStyle, paddingLeft: "36px" }} />
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
            <option value="todos">Todas las categorías</option>
            <option value="Materia Prima">Materia Prima</option>
            <option value="Aditivos">Aditivos</option>
            <option value="Empaque">Empaque</option>
          </select>

          <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
            <option value="todos">Todos los estados de stock</option>
            <option value="critico">Stock Crítico</option>
            <option value="ok">Stock Normal</option>
          </select>
        </div>
      </div>

      <div style={{ backgroundColor: COLORS.cardBg, border: `1px solid ${COLORS.cardBorder}`, borderRadius: "12px", overflow: "hidden", boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
            <thead>
              <tr style={{ backgroundColor: "rgba(255, 255, 255, 0.02)", borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                <th style={thStyle}>Código</th>
                <th style={thStyle}>Material</th>
                <th style={thStyle}>Categoría</th>
                <th style={thStyle}>Stock Actual</th>
                <th style={thStyle}>Mínimo</th>
                <th style={thStyle}>Ubicación</th>
                <th style={thStyle}>Estado</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredMaterials.map((m) => {
                const isCritical = Number(m.stock) <= Number(m.minStock);
                return (
                  <tr key={m.id} style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                    <td style={{ ...tdStyle, fontWeight: "700", color: COLORS.primary }}>{m.code}</td>
                    <td style={{ ...tdStyle, fontWeight: "600" }}>{m.name}</td>
                    <td style={tdStyle}>{m.category}</td>
                    <td style={{ ...tdStyle, fontWeight: "700" }}>{m.stock} <span style={{ fontSize: "11px", color: COLORS.textMuted }}>{m.unit}</span></td>
                    <td style={tdStyle}>{m.minStock} {m.unit}</td>
                    <td style={tdStyle}>{m.location}</td>
                    <td style={tdStyle}>
                      {isCritical ? <StatusBadge status="STOCK CRÍTICO" type="danger" /> : <StatusBadge status="STOCK OK" type="success" />}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        <button onClick={() => handleOpenModal(m)} style={actionBtnStyle}><Edit3 size={14} /></button>
                        <button onClick={() => handleDelete(m.id)} style={{ ...actionBtnStyle, color: COLORS.danger }}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <ModalShell onClose={() => setIsModalOpen(false)} title={editingItem ? `Editar Material ${editingItem.code}` : "Agregar Nuevo Material"}>
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <Field label="Código del Ítem">
                <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} style={inputStyle} required />
              </Field>
              <Field label="Categoría">
                <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} style={inputStyle}>
                  <option value="Materia Prima">Materia Prima</option>
                  <option value="Aditivos">Aditivos</option>
                  <option value="Empaque">Empaque</option>
                </select>
              </Field>
            </div>

            <Field label="Nombre / Descripción">
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={inputStyle} required />
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
              <Field label="Stock Actual">
                <input type="number" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })} style={inputStyle} required />
              </Field>
              <Field label="Stock Mínimo">
                <input type="number" value={formData.minStock} onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })} style={inputStyle} required />
              </Field>
              <Field label="Unidad">
                <input type="text" placeholder="kg, rollos..." value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} style={inputStyle} required />
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <Field label="Ubicación en Almacén">
                <input type="text" placeholder="Ej: Almacén A-02" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} style={inputStyle} required />
              </Field>
              <Field label="Costo Unitario ($)">
                <input type="number" step="0.01" value={formData.costPerUnit} onChange={(e) => setFormData({ ...formData, costPerUnit: Number(e.target.value) })} style={inputStyle} required />
              </Field>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
              <button type="button" onClick={() => setIsModalOpen(false)} style={ghostButtonStyle}>Cancelar</button>
              <button type="submit" style={primaryButtonStyle}>Guardar Registros</button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}

const kpiCardStyle = { backgroundColor: COLORS.cardBg, border: `1px solid ${COLORS.cardBorder}`, borderRadius: "12px", padding: "16px" };
const thStyle = { padding: "12px 16px", fontWeight: "600", fontSize: "12px", color: COLORS.textMuted };
const tdStyle = { padding: "12px 16px", color: COLORS.textMain };
const actionBtnStyle = { backgroundColor: "transparent", border: `1px solid ${COLORS.cardBorder}`, borderRadius: "6px", color: COLORS.textMuted, cursor: "pointer", padding: "6px", display: "inline-flex" };
