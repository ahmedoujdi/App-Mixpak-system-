import React, { useState, useMemo } from "react";
import { Plus, ShieldCheck, Search, Edit3, Trash2 } from "lucide-react";
import { COLORS, primaryButtonStyle, ghostButtonStyle, inputStyle, ModalShell, Field, StatusBadge } from "./shared.jsx";
import ExportButton from "./ExportModule.jsx";

const MOCK_QUALITY_DATA = [
  { id: "qual-1", title: "Variación de Viscosidad fuera de tolerancia", type: "Proceso", lot: "L-2026-088", reference: "REF-QUAL-01", severity: "alta", status: "en_revision" },
  { id: "qual-2", title: "Filtro de empaque dañado en origen", type: "Materia Prima", lot: "L-2026-081", reference: "REF-QUAL-02", severity: "critica", status: "cerrado" },
];

export default function CalidadModule({ currentUser, globalSearch = "" }) {
  const [incidents, setIncidents] = useState(MOCK_QUALITY_DATA);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [formData, setFormData] = useState({ title: "", type: "Proceso", lot: "", reference: "", severity: "media", status: "abierto" });

  const effectiveSearch = globalSearch || searchTerm;

  const filtered = useMemo(() => {
    return incidents.filter(i => 
      i.title.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
      i.lot.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
      i.reference.toLowerCase().includes(effectiveSearch.toLowerCase())
    );
  }, [incidents, effectiveSearch]);

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData(item);
    } else {
      setEditingItem(null);
      setFormData({ title: "", type: "Proceso", lot: "", reference: `REF-QUAL-0${incidents.length + 1}`, severity: "media", status: "abierto" });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (editingItem) {
      setIncidents(incidents.map(i => i.id === editingItem.id ? { ...formData } : i));
    } else {
      setIncidents([...incidents, { ...formData, id: `qual-${Date.now()}` }]);
    }
    setIsModalOpen(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "800", color: COLORS.textMain }}>Aseguramiento de Calidad</h1>
          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: COLORS.textMuted }}>Gestión de hallazgos, desviaciones e inspecciones</p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <ExportButton moduleName="Calidad" data={filtered} userEmail={currentUser?.email || "operaciones@mixpak.com"} search={effectiveSearch} />
          <button onClick={() => handleOpenModal()} style={primaryButtonStyle}>
            <Plus size={16} /> Reportar Incidencia
          </button>
        </div>
      </div>

      <div style={{ backgroundColor: COLORS.cardBg, border: `1px solid ${COLORS.cardBorder}`, borderRadius: "12px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
          <thead>
            <tr style={{ backgroundColor: "rgba(255, 255, 255, 0.02)", borderBottom: `1px solid ${COLORS.cardBorder}` }}>
              <th style={thStyle}>Referencia</th>
              <th style={thStyle}>Descripción / Incidencia</th>
              <th style={thStyle}>Lote Afectado</th>
              <th style={thStyle}>Tipo</th>
              <th style={thStyle}>Severidad</th>
              <th style={thStyle}>Estado</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(i => (
              <tr key={i.id} style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                <td style={{ ...tdStyle, fontWeight: "700", color: COLORS.primary }}>{i.reference}</td>
                <td style={{ ...tdStyle, fontWeight: "600" }}>{i.title}</td>
                <td style={tdStyle}>{i.lot}</td>
                <td style={tdStyle}>{i.type}</td>
                <td style={tdStyle}>
                  {i.severity === "critica" ? <StatusBadge status="CRÍTICA" type="danger" /> : <StatusBadge status={i.severity.toUpperCase()} type="warning" />}
                </td>
                <td style={tdStyle}>
                  {i.status === "cerrado" ? <StatusBadge status="CERRADO" type="success" /> : <StatusBadge status="EN REVISIÓN" type="info" />}
                </td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  <button onClick={() => handleOpenModal(i)} style={actionBtnStyle}><Edit3 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <ModalShell onClose={() => setIsModalOpen(false)} title={editingItem ? `Editar Incidencia ${editingItem.reference}` : "Registrar Incidencia de Calidad"}>
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <Field label="Referencia">
              <input type="text" value={formData.reference} onChange={e => setFormData({ ...formData, reference: e.target.value })} style={inputStyle} required />
            </Field>
            <Field label="Incidencia">
              <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} style={inputStyle} required />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <Field label="Lote Afectado">
                <input type="text" value={formData.lot} onChange={e => setFormData({ ...formData, lot: e.target.value })} style={inputStyle} required />
              </Field>
              <Field label="Severidad">
                <select value={formData.severity} onChange={e => setFormData({ ...formData, severity: e.target.value })} style={inputStyle}>
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="critica">Crítica</option>
                </select>
              </Field>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
              <button type="button" onClick={() => setIsModalOpen(false)} style={ghostButtonStyle}>Cancelar</button>
              <button type="submit" style={primaryButtonStyle}>Guardar Registro</button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}

const thStyle = { padding: "12px 16px", fontWeight: "600", fontSize: "12px", color: COLORS.textMuted };
const tdStyle = { padding: "12px 16px", color: COLORS.textMain };
const actionBtnStyle = { backgroundColor: "transparent", border: `1px solid ${COLORS.cardBorder}`, borderRadius: "6px", color: COLORS.textMuted, cursor: "pointer", padding: "6px", display: "inline-flex" };
