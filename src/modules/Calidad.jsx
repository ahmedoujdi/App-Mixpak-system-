import React, { useState, useEffect, useMemo, useRef } from "react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { db } from "../firebase.js";
import FotoViewer from "../FotoViewer.jsx";
import { uploadToCloudinary } from "../cloudinary.js";
import { ShieldCheck, Plus, Trash2, AlertOctagon, Camera, Image as ImageIcon, Search, Download, Share2, AlertCircle, Edit3, Eye, CheckCircle2 } from "lucide-react";
import { inputStyle, primaryButtonStyle, ghostButtonStyle, compressImage, withTimeout, exportToCsv, shareText, logActivity, DateRangeFilter, inDateRange, CenteredMessage, Field, ModalShell, ConfirmDialog, EmptyState } from "../shared.jsx";

const TYPES = [
  { value: "defecto_producto", label: "Defecto de producto" },
  { value: "no_conformidad_proceso", label: "No conformidad de proceso" },
  { value: "reclamo_cliente", label: "Reclamo de cliente" },
  { value: "control_estabilidad", label: "Control de estabilidad / envejecimiento" },
  { value: "compatibilidad_materiales", label: "Compatibilidad de materiales" },
  { value: "otro", label: "Otro" },
];

const SEVERITIES = [
  { value: "critica", label: "CRÍTICA", color: "#FF3B30", bg: "rgba(255, 59, 48, 0.15)" },
  { value: "mayor", label: "MAYOR", color: "#FF9500", bg: "rgba(255, 149, 0, 0.15)" },
  { value: "menor", label: "MENOR", color: "#30B0C7", bg: "rgba(48, 176, 199, 0.15)" },
];

const STATUSES = [
  { value: "abierta", label: "Abierta", color: "#FF9500" },
  { value: "en_analisis", label: "En Análisis", color: "#5856D6" },
  { value: "accion_correctiva", label: "Acción Correctiva", color: "#007AFF" },
  { value: "cerrada", label: "Cerrada", color: "#34C759" },
];

const emptyForm = {
  title: "",
  type: "defecto_producto",
  severity: "menor",
  client: "",
  lot: "",
  reference: "",
  description: "",
  status: "abierta",
  correctiveAction: "",
};

export default function Calidad({ user }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  const [detailIssue, setDetailIssue] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [filterStatus, setFilterStatus] = useState("todas");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const q = query(collection(db, "quality_issues"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setIssues(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const openCreateModal = () => {
    setEditingIssue(null);
    setModalOpen(true);
  };

  const openEditModal = (issue) => {
    setEditingIssue(issue);
    setModalOpen(true);
  };

  async function updateStatus(issue, status) {
    await updateDoc(doc(db, "quality_issues", issue.id), { status, updatedAt: serverTimestamp() });
    logActivity(user.email, "Calidad", "Cambio de estado", `${issue.title}: ${issue.status} → ${status}`);
  }

  async function removeIssue(issue) {
    await deleteDoc(doc(db, "quality_issues", issue.id));
    logActivity(user.email, "Calidad", "Eliminada", issue.title);
    setConfirmDelete(null);
  }

  const filtered = useMemo(() => {
    return issues.filter((i) => {
      if (filterStatus !== "todas" && i.status !== filterStatus) return false;
      if (!inDateRange(i.createdAt, dateFrom, dateTo)) return false;
      if (search && !`${i.title} ${i.client || ""} ${i.lot || ""} ${i.reference || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [issues, filterStatus, search, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const abiertas = issues.filter((i) => i.status !== "cerrada").length;
    const criticas = issues.filter((i) => i.severity === "critica" && i.status !== "cerrada").length;
    return { total: issues.length, abiertas, criticas };
  }, [issues]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <span style={{ background: "rgba(255, 59, 48, 0.15)", color: "#FF3B30", padding: "4px 8px", borderRadius: 6, fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
            QUALITY ASSURANCE
          </span>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: "6px 0 0", letterSpacing: "-0.5px" }}>Control de Calidad & No Conformidades</h1>
        </div>
        <button onClick={openCreateModal} style={{ ...primaryButtonStyle, borderRadius: 10, padding: "10px 18px", boxShadow: "0 4px 14px rgba(0,0,0,0.2)" }}>
          <Plus size={18} /> Nueva Incidencia
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 28 }}>
        <KpiCard label="Registros Totales" value={stats.total} icon={ShieldCheck} accentColor="#007AFF" />
        <KpiCard label="Incidencias Abiertas" value={stats.abiertas} icon={AlertOctagon} accentColor="#FF9500" />
        <KpiCard label="Críticas Pendientes" value={stats.criticas} icon={AlertCircle} accentColor="#FF3B30" badge={stats.criticas > 0 ? "Atención" : null} />
      </div>

      {/* Filtros */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 12, marginBottom: 24, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 240px" }}>
          <Search size={16} color="rgba(255,255,255,0.4)" style={{ position: "absolute", left: 12, top: 12 }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por título, lote, cliente..." style={{ ...inputStyle, paddingLeft: 36, borderRadius: 8, background: "rgba(0,0,0,0.2)" }} />
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Chip active={filterStatus === "todas"} onClick={() => setFilterStatus("todas")}>Todas</Chip>
          {STATUSES.map((s) => (
            <Chip key={s.value} active={filterStatus === s.value} onClick={() => setFilterStatus(s.value)}>
              {s.label}
            </Chip>
          ))}
        </div>

        <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
        <button onClick={() => exportToCsv("incidencias-calidad", filtered)} style={{ ...ghostButtonStyle, marginLeft: "auto", borderRadius: 8 }}>
          <Download size={16} /> Exportar
        </button>
      </div>

      {/* Grid de Tarjetas */}
      {loading ? (
        <CenteredMessage text="Cargando panel de calidad..." />
      ) : issues.length === 0 ? (
        <EmptyState Icon={ShieldCheck} title="Sin incidencias registradas" message="Registra la primera no conformidad o reporte de calidad." onAdd={openCreateModal} addLabel="Crear Incidencia" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18 }}>
          {filtered.map((i) => (
            <QualityCard key={i.id} issue={i} onStatusChange={(s) => updateStatus(i, s)} onOpen={() => setDetailIssue(i)} onEdit={() => openEditModal(i)} onDelete={() => setConfirmDelete(i)} />
          ))}
        </div>
      )}

      {/* Modales */}
      {modalOpen && <IssueFormModal user={user} editingIssue={editingIssue} onClose={() => setModalOpen(false)} />}
      {detailIssue && <DetailModal issue={detailIssue} onClose={() => setDetailIssue(null)} onEdit={() => { setEditingIssue(detailIssue); setDetailIssue(null); setModalOpen(true); }} />}
      {confirmDelete && <ConfirmDialog title="Eliminar incidencia" message="Se eliminará este registro permanentemente." onCancel={() => setConfirmDelete(null)} onConfirm={() => removeIssue(confirmDelete)} />}
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

function QualityCard({ issue, onStatusChange, onOpen, onEdit, onDelete }) {
  const sev = SEVERITIES.find((s) => s.value === issue.severity) || SEVERITIES[2];
  const st = STATUSES.find((s) => s.value === issue.status) || STATUSES[0];

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ background: sev.bg, color: sev.color, fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 6, letterSpacing: 0.5 }}>
            {sev.label}
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={onEdit} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}><Edit3 size={15} /></button>
            <button onClick={onDelete} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer" }}><Trash2 size={15} /></button>
          </div>
        </div>

        <h3 onClick={onOpen} style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px", cursor: "pointer", color: "#fff" }}>{issue.title}</h3>

        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          {issue.client && <span><strong>Cliente:</strong> {issue.client}</span>}
          {issue.lot && <span><strong>Lote:</strong> {issue.lot}</span>}
          {issue.reference && <span><strong>Ref:</strong> {issue.reference}</span>}
        </div>
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onOpen} style={{ background: "none", border: "none", color: "#007AFF", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", padding: 0 }}>
          <Eye size={14} /> Detalle
        </button>
        <select value={issue.status} onChange={(e) => onStatusChange(e.target.value)} style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", padding: "4px 8px", borderRadius: 6, fontSize: 12 }}>
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
    </div>
  );
}

// Modal Formulario para Crear / Editar
function IssueFormModal({ user, editingIssue, onClose }) {
  const [form, setForm] = useState(editingIssue ? { ...editingIssue } : emptyForm);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(editingIssue?.photoUrl || null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const compressed = await compressImage(file);
    setPhoto(compressed);
    setPreview(URL.createObjectURL(compressed));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let photoUrl = form.photoUrl || "";
      if (photo) {
        photoUrl = await withTimeout(uploadToCloudinary(photo), 15000, "Error al subir la imagen.");
      }

      const payload = {
        ...form,
        photoUrl,
        updatedAt: serverTimestamp(),
      };

      if (editingIssue) {
        await updateDoc(doc(db, "quality_issues", editingIssue.id), payload);
        logActivity(user.email, "Calidad", "Actualizada", payload.title);
      } else {
        payload.createdAt = serverTimestamp();
        payload.createdBy = user.email;
        await addDoc(collection(db, "quality_issues"), payload);
        logActivity(user.email, "Calidad", "Creada", payload.title);
      }
      onClose();
    } catch (err) {
      alert(err.message || "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell title={editingIssue ? "Editar Incidencia" : "Nueva Incidencia de Calidad"} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Título de la Incidencia">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ej: Fuga en envase de 500ml" style={inputStyle} required />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Tipo de Evento">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={inputStyle}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Severidad">
            <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} style={inputStyle}>
              {SEVERITIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <Field label="Cliente / Destino">
            <input value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} placeholder="Cliente" style={inputStyle} />
          </Field>
          <Field label="Nº de Lote">
            <input value={form.lot} onChange={(e) => setForm({ ...form, lot: e.target.value })} placeholder="Lote" style={inputStyle} />
          </Field>
          <Field label="Ref. Producto">
            <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Código / SKU" style={inputStyle} />
          </Field>
        </div>

        <Field label="Descripción del Problema">
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalla el defecto u observación detectada..." style={{ ...inputStyle, minHeight: 80 }} required />
        </Field>

        <Field label="Acción Correctiva / Preventiva (CAPA)">
          <textarea value={form.correctiveAction} onChange={(e) => setForm({ ...form, correctiveAction: e.target.value })} placeholder="Medidas inmediatas o correcciones tomadas..." style={{ ...inputStyle, minHeight: 60 }} />
        </Field>

        {/* Carga de Imagen */}
        <Field label="Evidencia Fotográfica">
          <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button type="button" onClick={() => fileInputRef.current?.click()} style={{ ...ghostButtonStyle, borderRadius: 8 }}>
              <Camera size={16} /> Subir Imagen
            </button>
            {preview && <img src={preview} alt="Vista previa" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", border: "1px solid rgba(255,255,255,0.2)" }} />}
          </div>
        </Field>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
          <button type="button" onClick={onClose} style={ghostButtonStyle}>Cancelar</button>
          <button type="submit" disabled={submitting} style={primaryButtonStyle}>
            {submitting ? "Guardando..." : "Guardar Registro"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// Modal Ver Detalle
function DetailModal({ issue, onClose, onEdit }) {
  const sev = SEVERITIES.find((s) => s.value === issue.severity) || SEVERITIES[2];
  const st = STATUSES.find((s) => s.value === issue.status) || STATUSES[0];

  return (
    <ModalShell title="Detalle de la Incidencia" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ background: sev.bg, color: sev.color, fontSize: 12, fontWeight: 800, padding: "4px 10px", borderRadius: 6 }}>
            {sev.label}
          </span>
          <span style={{ color: st.color, fontWeight: 700, fontSize: 13 }}>● {st.label}</span>
        </div>

        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 6px", color: "#fff" }}>{issue.title}</h2>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", display: "flex", gap: 16, flexWrap: "wrap" }}>
            {issue.client && <span><strong>Cliente:</strong> {issue.client}</span>}
            {issue.lot && <span><strong>Lote:</strong> {issue.lot}</span>}
            {issue.reference && <span><strong>Ref:</strong> {issue.reference}</span>}
          </div>
        </div>

        <div style={{ background: "rgba(0,0,0,0.2)", padding: 14, borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 700, marginBottom: 4 }}>DESCRIPCIÓN</div>
          <p style={{ margin: 0, fontSize: 14, color: "#fff", lineHeight: 1.5 }}>{issue.description}</p>
        </div>

        {issue.correctiveAction && (
          <div style={{ background: "rgba(52, 199, 89, 0.08)", padding: 14, borderRadius: 10, border: "1px solid rgba(52, 199, 89, 0.2)" }}>
            <div style={{ fontSize: 12, color: "#34C759", fontWeight: 700, marginBottom: 4 }}>ACCIÓN CORRECTIVA</div>
            <p style={{ margin: 0, fontSize: 14, color: "#fff", lineHeight: 1.5 }}>{issue.correctiveAction}</p>
          </div>
        )}

        {issue.photoUrl && (
          <div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 700, marginBottom: 6 }}>EVIDENCIA FOTOGRÁFICA</div>
            <FotoViewer src={issue.photoUrl} alt="Evidencia de calidad" />
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 10 }}>
          <button onClick={() => shareText(`Incidencia: ${issue.title}\nEstado: ${st.label}\nDetalle: ${issue.description}`)} style={ghostButtonStyle}>
            <Share2 size={16} /> Compartir
          </button>
          <button onClick={onEdit} style={primaryButtonStyle}>
            <Edit3 size={16} /> Editar Registro
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
