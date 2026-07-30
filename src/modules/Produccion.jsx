import React, { useState, useMemo } from "react";
import { Plus, Factory, Search, Edit3, Trash2 } from "lucide-react";
import { COLORS, primaryButtonStyle, ghostButtonStyle, inputStyle, ModalShell, Field, StatusBadge } from "./shared.jsx";
import ExportButton from "./ExportModule.jsx";

const MOCK_PRODUCTION_DATA = [
  { id: "prd-1", product: "Detergente Multiusos 1L", client: "Distribuidora Norte", lot: "L-2026-088", line: "Línea 1", shift: "Mañana", targetQty: 5000, producedQty: 4850, scrapQty: 30, status: "completado" },
  { id: "prd-2", product: "Limpiador de Vidrios 500ml", client: "Supermercados Global", lot: "L-2026-089", line: "Línea 2", shift: "Tarde", targetQty: 10000, producedQty: 6200, scrapQty: 85, status: "en_proceso" },
  { id: "prd-3", product: "Desengrasante Industrial 5L", client: "Industrias Alfa", lot: "L-2026-090", line: "Línea 1", shift: "Noche", targetQty: 2500, producedQty: 0, scrapQty: 0, status: "programado" },
];

export default function ProduccionModule({ currentUser, globalSearch = "" }) {
  const [orders, setOrders] = useState(MOCK_PRODUCTION_DATA);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [formData, setFormData] = useState({
    product: "", client: "", lot: "", line: "Línea 1", shift: "Mañana", targetQty: 0, producedQty: 0, scrapQty: 0, status: "programado"
  });

  const effectiveSearch = globalSearch || searchTerm;

  const filteredOrders = useMemo(() => {
    return orders.filter(o => 
      o.product.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
      o.lot.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
      o.client.toLowerCase().includes(effectiveSearch.toLowerCase())
    );
  }, [orders, effectiveSearch]);

  const kpis = useMemo(() => {
    const totalTarget = orders.reduce((acc, curr) => acc + Number(curr.targetQty), 0);
    const totalProduced = orders.reduce((acc, curr) => acc + Number(curr.producedQty), 0);
    const totalScrap = orders.reduce((acc, curr) => acc + Number(curr.scrapQty), 0);
    const efficiency = totalTarget > 0 ? Math.round((totalProduced / totalTarget) * 100) : 0;
    return { totalProduced, totalScrap, efficiency };
  }, [orders]);

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData(item);
    } else {
      setEditingItem(null);
      setFormData({
        product: "", client: "", lot: `L-2026-09${orders.length + 1}`, line: "Línea 1", shift: "Mañana", targetQty: 1000, producedQty: 0, scrapQty: 0, status: "programado"
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (editingItem) {
      setOrders(orders.map(o => o.id === editingItem.id ? { ...formData } : o));
    } else {
      setOrders([...orders, { ...formData, id: `prd-${Date.now()}` }]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id) => {
    if (window.confirm("¿Deseas eliminar esta orden de producción?")) {
      setOrders(orders.filter(o => o.id !== id));
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "800", color: COLORS.textMain }}>Órdenes de Producción</h1>
          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: COLORS.textMuted }}>Seguimiento de lotes, eficiencia de planta y registros de mermas</p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <ExportButton moduleName="Producción" data={filteredOrders} userEmail={currentUser?.email || "operaciones@mixpak.com"} search={effectiveSearch} />
          <button onClick={() => handleOpenModal()} style={primaryButtonStyle}>
            <Plus size={16} /> Nueva Orden
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
        <div style={kpiCardStyle}>
          <div style={{ fontSize: "12px", color: COLORS.textMuted, fontWeight: "600" }}>Total Producido</div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: COLORS.primary, marginTop: "4px" }}>{kpis.totalProduced.toLocaleString()} un.</div>
        </div>
        <div style={kpiCardStyle}>
          <div style={{ fontSize: "12px", color: COLORS.textMuted, fontWeight: "600" }}>Total Scrap / Mermas</div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: COLORS.danger, marginTop: "4px" }}>{kpis.totalScrap.toLocaleString()} un.</div>
        </div>
        <div style={kpiCardStyle}>
          <div style={{ fontSize: "12px", color: COLORS.textMuted, fontWeight: "600" }}>Eficiencia Global</div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: COLORS.success, marginTop: "4px" }}>{kpis.efficiency}%</div>
        </div>
      </div>

      <div style={{ backgroundColor: COLORS.cardBg, border: `1px solid ${COLORS.cardBorder}`, borderRadius: "12px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
          <thead>
            <tr style={{ backgroundColor: "rgba(255, 255, 255, 0.02)", borderBottom: `1px solid ${COLORS.cardBorder}` }}>
              <th style={thStyle}>Lote / Producto</th>
              <th style={thStyle}>Cliente</th>
              <th style={thStyle}>Línea & Turno</th>
              <th style={thStyle}>Objetivo</th>
              <th style={thStyle}>Producido</th>
              <th style={thStyle}>Scrap</th>
              <th style={thStyle}>Estado</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(o => (
              <tr key={o.id} style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                <td style={tdStyle}>
                  <div style={{ fontWeight: "700", color: COLORS.primary }}>{o.lot}</div>
                  <div style={{ fontWeight: "600" }}>{o.product}</div>
                </td>
                <td style={tdStyle}>{o.client}</td>
                <td style={tdStyle}>{o.line} ({o.shift})</td>
                <td style={tdStyle}>{o.targetQty}</td>
                <td style={{ ...tdStyle, fontWeight: "700" }}>{o.producedQty}</td>
                <td style={{ ...tdStyle, color: COLORS.danger }}>{o.scrapQty}</td>
                <td style={tdStyle}>
                  {o.status === "completado" && <StatusBadge status="COMPLETADO" type="success" />}
                  {o.status === "en_proceso" && <StatusBadge status="EN PROCESO" type="info" />}
                  {o.status === "programado" && <StatusBadge status="PROGRAMADO" type="warning" />}
                </td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  <div style={{ display: "inline-flex", gap: "6px" }}>
                    <button onClick={() => handleOpenModal(o)} style={actionBtnStyle}><Edit3 size={14} /></button>
                    <button onClick={() => handleDelete(o.id)} style={{ ...actionBtnStyle, color: COLORS.danger }}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <ModalShell onClose={() => setIsModalOpen(false)} title={editingItem ? `Editar Orden ${editingItem.lot}` : "Crear Orden de Producción"}>
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <Field label="Lote de Producción">
                <input type="text" value={formData.lot} onChange={e => setFormData({ ...formData, lot: e.target.value })} style={inputStyle} required />
              </Field>
              <Field label="Cliente">
                <input type="text" value={formData.client} onChange={e => setFormData({ ...formData, client: e.target.value })} style={inputStyle} required />
              </Field>
            </div>

            <Field label="Producto A Fabricar">
              <input type="text" value={formData.product} onChange={e => setFormData({ ...formData, product: e.target.value })} style={inputStyle} required />
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
              <Field label="Objetivo">
                <input type="number" value={formData.targetQty} onChange={e => setFormData({ ...formData, targetQty: Number(e.target.value) })} style={inputStyle} required />
              </Field>
              <Field label="Producido">
                <input type="number" value={formData.producedQty} onChange={e => setFormData({ ...formData, producedQty: Number(e.target.value) })} style={inputStyle} required />
              </Field>
              <Field label="Scrap / Mermas">
                <input type="number" value={formData.scrapQty} onChange={e => setFormData({ ...formData, scrapQty: Number(e.target.value) })} style={inputStyle} required />
              </Field>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
              <button type="button" onClick={() => setIsModalOpen(false)} style={ghostButtonStyle}>Cancelar</button>
              <button type="submit" style={primaryButtonStyle}>Guardar Orden</button>
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
