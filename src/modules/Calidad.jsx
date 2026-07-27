import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
import { db } from "../firebase.js";
import FotoViewer from "../FotoViewer.jsx";
import { uploadToCloudinary } from "../cloudinary.js";
import {
  ShieldCheck,
  Plus,
  Trash2,
  AlertOctagon,
  Camera,
  Image as ImageIcon,
  Search,
  Download,
  Share2,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  COLORS,
  inputStyle,
  selectStyle,
  primaryButtonStyle,
  ghostButtonStyle,
  compressImage,
  withTimeout,
  exportToCsv,
  shareText,
  CenteredMessage,
  Field,
  ModalShell,
  ConfirmDialog,
  StatCard,
  EmptyState,
} from "../shared.jsx";

const TYPES = [
  { value: "defecto_producto", label: "Defecto de producto" },
  { value: "no_conformidad_proceso", label: "No conformidad de proceso" },
  { value: "reclamo_cliente", label: "Reclamo de cliente" },
  { value: "control_estabilidad", label: "Control de estabilidad / envejecimiento" },
  { value: "compatibilidad_materiales", label: "Compatibilidad de materiales" },
  { value: "otro", label: "Otro" },
];

const SEVERITIES = [
  { value: "critica", label: "Crítica", color: COLORS.critical },
  { value: "mayor", label: "Mayor", color: COLORS.safety },
  { value: "menor", label: "Menor", color: COLORS.steel },
];

const STATUSES = [
  { value: "abierta", label: "Abierta" },
  { value: "en_analisis", label: "En análisis" },
  { value: "accion_correctiva", label: "Acción correctiva" },
  { value: "cerrada", label: "Cerrada" },
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

function severityMeta(v) {
  return SEVERITIES.find((s) => s.value === v) || SEVERITIES[2];
}

function typeLabel(v) {
  return TYPES.find((t) => t.value === v)?.label || v;
}

function statusLabel(v) {
  return STATUSES.find((s) => s.value === v)?.label || v;
}

export default function Calidad({ user }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailIssue, setDetailIssue] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [filterStatus, setFilterStatus] = useState("todas");
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Escucha en tiempo real de Firestore
  useEffect(() => {
    const q = query(collection(db, "quality_issues"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setIssues(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
        setErrorMessage(null);
      },
      (err) => {
        console.error("Error al obtener incidencias:", err);
        setErrorMessage("Error de conexión al cargar las incidencias de calidad.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Actualización de estado
  const updateStatus = useCallback(async (id, status) => {
    try {
      await updateDoc(doc(db, "quality_issues", id), { status });
    } catch (err) {
      console.error("Error al actualizar estado:", err);
      alert("No se pudo cambiar el estado de la incidencia.");
    }
  }, []);

  // Eliminación de incidencia
  const removeIssue = useCallback(async (issue) => {
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "quality_issues", issue.id));
      setConfirmDelete(null);
    } catch (err) {
      console.error("Error al eliminar incidencia:", err);
      alert("No se pudo eliminar la incidencia. Revisa tus permisos.");
    } finally {
      setDeleting(false);
    }
  }, []);

  // Filtrado optimizado de incidencias
  const filtered = useMemo(() => {
    const queryStr = search.trim().toLowerCase();
    return issues.filter((i) => {
      if (filterStatus !== "todas" && i.status !== filterStatus) return false;
      if (queryStr) {
        const matchContent = `${i.title || ""} ${i.client || ""} ${i.lot || ""} ${i.reference || ""}`.toLowerCase();
        if (!matchContent.includes(queryStr)) return false;
      }
      return true;
    });
  }, [issues, filterStatus, search]);

  // Métricas de incidencias
  const stats = useMemo(() => {
    const abiertas = issues.filter((i) => i.status !== "cerrada").length;
    const criticas = issues.filter((i) => i.severity === "critica" && i.status !== "cerrada").length;
    return { total: issues.length, abiertas, criticas };
  }, [issues]);

  // Exportar a CSV mapeando etiquetas legibles
  const handleExportCsv = useCallback(() => {
    const rows = filtered.map((i) => ({
      Título: i.title,
      Tipo: typeLabel(i.type),
      Severidad: severityMeta(i.severity).label,
      Cliente: i.client || "-",
      Lote: i.lot || "-",
      Referencia: i.reference || "-",
      Estado: statusLabel(i.status),
      "Reportado por": i.reportedBy || "-",
      Descripción: i.description || "-",
      "Acción Correctiva": i.correctiveAction || "-",
    }));
    exportToCsv("incidencias-calidad", rows);
  }, [filtered]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Calidad</h1>
        <button type="button" onClick={() => setModalOpen(true)} style={primaryButtonStyle}>
          <Plus size={16} /> Nueva incidencia
        </button>
      </div>

      {/* Mensaje de error de red */}
      {errorMessage && (
        <div style={styles.errorBanner}>
          <AlertCircle size={18} color={COLORS.critical} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Métricas */}
      <div style={styles.statsGrid}>
        <StatCard label="Total incidencias" value={stats.total} color={COLORS.steel} Icon={ShieldCheck} />
        <StatCard label="Abiertas" value={stats.abiertas} color={COLORS.safety} Icon={AlertOctagon} />
        <StatCard label="Críticas activas" value={stats.criticas} color={COLORS.critical} Icon={AlertOctagon} />
      </div>

      {/* Barra de Filtros */}
      <div style={styles.filterBar}>
        <div style={styles.searchWrapper}>
          <Search size={14} color={COLORS.textMuted} style={styles.searchIcon} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, cliente, lote o referencia..."
            style={{ ...inputStyle, paddingLeft: 30 }}
          />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={selectStyle}>
          <option value="todas">Todos los estados</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button type="button" onClick={handleExportCsv} style={ghostButtonStyle}>
          <Download size={16} /> Exportar
        </button>
      </div>

      {/* Contenido Principal */}
      {loading ? (
        <CenteredMessage text="Cargando incidencias de calidad…" />
      ) : issues.length === 0 ? (
        <EmptyState
          Icon={ShieldCheck}
          title="Sin incidencias registradas"
          message="Registra la primera no conformidad o defecto de calidad detectado."
          onAdd={() => setModalOpen(true)}
          addLabel="Crear primera incidencia"
        />
      ) : (
        <div style={styles.issuesGrid}>
          {filtered.map((i) => (
            <IssueCard
              key={i.id}
              issue={i}
              onStatusChange={(s) => updateStatus(i.id, s)}
              onOpen={() => setDetailIssue(i)}
              onDelete={() => setConfirmDelete(i)}
            />
          ))}
          {filtered.length === 0 && (
            <div style={styles.noResultsText}>No hay incidencias que coincidan con los filtros aplicados.</div>
          )}
        </div>
      )}

      {/* Modales */}
      {modalOpen && <IssueModal user={user} onClose={() => setModalOpen(false)} />}
      {detailIssue && <DetailModal issue={detailIssue} onClose={() => setDetailIssue(null)} />}
      {confirmDelete && (
        <ConfirmDialog
          title="Eliminar incidencia"
          message={`¿Estás seguro de eliminar "${confirmDelete.title}"? Esta acción no se puede deshacer.`}
          confirmLabel={deleting ? "Eliminando..." : "Eliminar"}
          onCancel={() => !deleting && setConfirmDelete(null)}
          onConfirm={() => removeIssue(confirmDelete)}
        />
      )}
    </div>
  );
}

// Tarjeta Individual de Incidencia
function IssueCard({ issue, onStatusChange, onOpen, onDelete }) {
  const sev = severityMeta(issue.severity);

  return (
    <div style={{ ...styles.card, borderLeft: `5px solid ${sev.color}` }}>
      <div style={styles.cardHeader}>
        <span style={styles.typeBadge}>{typeLabel(issue.type)}</span>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Eliminar incidencia"
          style={styles.iconButton}
        >
          <Trash2 size={14} />
        </button>
      </div>

      <h3 onClick={onOpen} style={styles.cardTitle}>
        {issue.title}
      </h3>

      {(issue.client || issue.lot) && (
        <div style={styles.cardMeta}>
          {issue.client && <>Cliente: {issue.client}</>}
          {issue.client && issue.lot && <> · </>}
          {issue.lot && <>Lote: {issue.lot}</>}
        </div>
      )}

      {issue.reference && <div style={styles.cardMeta}>Ref: {issue.reference}</div>}

      <div style={{ marginTop: 8 }}>
        <span style={{ ...styles.severityTag, background: sev.color }}>{sev.label}</span>
      </div>

      <select
        value={issue.status}
        onChange={(e) => onStatusChange(e.target.value)}
        style={{ ...selectStyle, width: "100%", fontSize: 12, padding: "6px 8px", marginTop: 10 }}
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Modal para Crear Incidencia
function IssueModal({ user, onClose }) {
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  // Limpieza de URLs temporales para evitar fugas de memoria
  useEffect(() => {
    return () => {
      previews.forEach((src) => URL.revokeObjectURL(src));
    };
  }, [previews]);

  const handleFiles = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

    const newPreviews = selectedFiles.map((f) => URL.createObjectURL(f));
    setFiles((prev) => [...prev, ...selectedFiles]);
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeSelectedFile = (index) => {
    URL.revokeObjectURL(previews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    setSaving(true);
    setError("");

    let docRef;
    try {
      docRef = await addDoc(collection(db, "quality_issues"), {
        ...form,
        title: form.title.trim(),
        client: form.client.trim(),
        lot: form.lot.trim(),
        reference: form.reference.trim(),
        description: form.description.trim(),
        correctiveAction: form.correctiveAction.trim(),
        reportedBy: user?.email || "Anónimo",
        createdAt: serverTimestamp(),
        photos: [],
      });
    } catch (err) {
      console.error("Error al crear incidencia:", err);
      setSaving(false);
      setError("No se pudo guardar la incidencia. Revisa tu conexión y permisos.");
      return;
    }

    // Procesa y sube fotos si existen
    if (files.length) {
      try {
        const uploaded = [];
        for (let i = 0; i < files.length; i++) {
          setUploadStatus(`Subiendo foto ${i + 1} de ${files.length}…`);
          const blob = await withTimeout(
            compressImage(files[i]),
            15000,
            "La foto tardó demasiado en comprimirse."
          );
          const result = await withTimeout(
            uploadToCloudinary(blob, `quality/${docRef.id}`),
            20000,
            "La subida de la foto a Cloudinary tardó demasiado."
          );
          uploaded.push(result);
        }

        setUploadStatus("Guardando enlaces de las fotos…");
        await updateDoc(doc(db, "quality_issues", docRef.id), { photos: uploaded });
      } catch (err) {
        console.error("Error al subir fotos:", err);
        setSaving(false);
        setUploadStatus("");
        setError("La incidencia se guardó, pero hubo un problema al subir las imágenes.");
        return;
      }
    }

    setSaving(false);
    setUploadStatus("");
    onClose();
  };

  return (
    <ModalShell onClose={onClose} title="Nueva incidencia de calidad">
      <form onSubmit={submit}>
        <Field label="Título *">
          <input
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            style={inputStyle}
            placeholder="Ej. Sellado defectuoso lote 4521"
          />
        </Field>

        <div style={styles.formGrid}>
          <Field label="Tipo">
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              style={inputStyle}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Severidad">
            <select
              value={form.severity}
              onChange={(e) => setForm({ ...form, severity: e.target.value })}
              style={inputStyle}
            >
              {SEVERITIES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div style={styles.formGrid}>
          <Field label="Cliente">
            <input
              value={form.client}
              onChange={(e) => setForm({ ...form, client: e.target.value })}
              style={inputStyle}
              placeholder="Ej. Marca S.L."
            />
          </Field>
          <Field label="Lote / Nº de lote">
            <input
              value={form.lot}
              onChange={(e) => setForm({ ...form, lot: e.target.value })}
              style={inputStyle}
              placeholder="Ej. L-2026-0731"
            />
          </Field>
        </div>

        <Field label="Referencia (Línea, Máquina, Orden...)">
          <input
            value={form.reference}
            onChange={(e) => setForm({ ...form, reference: e.target.value })}
            style={inputStyle}
            placeholder="Ej. Línea 2"
          />
        </Field>

        <Field label="Descripción">
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </Field>

        <Field label="Acción Correctiva (si se conoce)">
          <textarea
            value={form.correctiveAction}
            onChange={(e) => setForm({ ...form, correctiveAction: e.target.value })}
            rows={2}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </Field>

        <Field label="Fotos Adjuntas">
          <div style={styles.previewsContainer}>
            {previews.map((src, i) => (
              <div key={i} style={styles.previewBox}>
                <img src={src} alt="Previsualización" style={styles.previewImg} />
                <button
                  type="button"
                  onClick={() => removeSelectedFile(i)}
                  style={styles.removePreviewBtn}
                  aria-label="Quitar foto"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={styles.addPhotoBtn}
              aria-label="Añadir foto"
            >
              <Camera size={20} color={COLORS.textMuted} />
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFiles}
            style={{ display: "none" }}
          />
        </Field>

        <button
          type="submit"
          disabled={saving}
          style={{ ...primaryButtonStyle, width: "100%", justifyContent: "center", marginTop: 12 }}
        >
          {saving ? (
            <>
              <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
              {uploadStatus || "Guardando..."}
            </>
          ) : (
            "Guardar incidencia"
          )}
        </button>

        {error && <p style={styles.errorMessage}>{error}</p>}
      </form>
    </ModalShell>
  );
}

// Modal de Detalle
function DetailModal({ issue, onClose }) {
  const sev = severityMeta(issue.severity);
  const [viewerIndex, setViewerIndex] = useState(null);

  const handleShare = () => {
    const lines = [
      `${typeLabel(issue.type)}: ${issue.title}`,
      issue.client ? `Cliente: ${issue.client}` : null,
      issue.lot ? `Lote: ${issue.lot}` : null,
      issue.reference ? `Ref: ${issue.reference}` : null,
      `Severidad: ${sev.label} · Estado: ${statusLabel(issue.status)}`,
      issue.description ? `Descripción: ${issue.description}` : null,
      issue.correctiveAction ? `Acción correctiva: ${issue.correctiveAction}` : null,
      issue.photos?.length ? `Fotos: ${issue.photos.map((p) => p.url).join(" ")}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    shareText(issue.title, lines);
  };

  return (
    <ModalShell onClose={onClose} title={typeLabel(issue.type)}>
      <div style={styles.detailHeader}>
        <h2 style={styles.detailTitle}>{issue.title}</h2>
        <button type="button" onClick={handleShare} style={ghostButtonStyle}>
          <Share2 size={14} /> Compartir
        </button>
      </div>

      {(issue.client || issue.lot) && (
        <p style={styles.detailMetaText}>
          {issue.client && <>Cliente: {issue.client}</>}
          {issue.client && issue.lot && <> · </>}
          {issue.lot && <>Lote: {issue.lot}</>}
        </p>
      )}

      {issue.reference && <p style={styles.detailMetaText}>Ref: {issue.reference}</p>}

      <div style={{ marginTop: 6, marginBottom: 12 }}>
        <span style={{ ...styles.severityTag, background: sev.color }}>{sev.label}</span>
      </div>

      {issue.description && <p style={styles.detailBodyText}>{issue.description}</p>}

      {issue.correctiveAction && (
        <div style={styles.correctiveSection}>
          <div style={styles.correctiveTitle}>Acción correctiva</div>
          <p style={styles.detailBodyText}>{issue.correctiveAction}</p>
        </div>
      )}

      {issue.photos?.length > 0 ? (
        <div style={styles.photoGrid}>
          {issue.photos.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setViewerIndex(i)}
              style={styles.photoThumbButton}
            >
              <img src={p.url} alt={`Foto ${i + 1}`} style={styles.photoThumbImg} />
            </button>
          ))}
        </div>
      ) : (
        <div style={styles.noPhotosContainer}>
          <ImageIcon size={16} /> Sin fotos adjuntas
        </div>
      )}

      {viewerIndex !== null && (
        <FotoViewer
          photos={issue.photos}
          startIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </ModalShell>
  );
}

// Estilos locales centralizados
const styles = {
  container: {
    width: "100%",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 18,
  },
  title: {
    fontFamily: "'Oswald', sans-serif",
    fontWeight: 700,
    fontSize: 20,
    textTransform: "uppercase",
    margin: 0,
    color: COLORS.dark,
  },
  errorBanner: {
    background: "#FCE8E6",
    border: `1px solid ${COLORS.critical}`,
    color: COLORS.critical,
    padding: "10px 14px",
    borderRadius: 2,
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 10,
    marginBottom: 20,
  },
  filterBar: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 18,
    alignItems: "center",
  },
  searchWrapper: {
    position: "relative",
    flex: "1 1 200px",
  },
  searchIcon: {
    position: "absolute",
    left: 9,
    top: 11,
  },
  issuesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
    gap: 14,
  },
  noResultsText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: "italic",
    padding: 12,
  },
  card: {
    background: COLORS.panel,
    padding: "12px 14px",
    borderRadius: 2,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  typeBadge: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    color: COLORS.textMuted,
  },
  iconButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: COLORS.textMuted,
    padding: 2,
    display: "flex",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 600,
    margin: "6px 0 4px",
    cursor: "pointer",
    color: COLORS.dark,
  },
  cardMeta: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  severityTag: {
    fontSize: 11,
    textTransform: "uppercase",
    fontWeight: 600,
    color: "#FFFFFF",
    padding: "2px 8px",
    display: "inline-block",
    borderRadius: 2,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  previewsContainer: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 8,
  },
  previewBox: {
    position: "relative",
    width: 60,
    height: 60,
  },
  previewImg: {
    width: 60,
    height: 60,
    objectFit: "cover",
    borderRadius: 2,
  },
  removePreviewBtn: {
    position: "absolute",
    top: -4,
    right: -4,
    background: COLORS.critical,
    color: "#FFFFFF",
    border: "none",
    borderRadius: "50%",
    width: 18,
    height: 18,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoBtn: {
    width: 60,
    height: 60,
    border: `1px dashed ${COLORS.line}`,
    background: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 2,
  },
  errorMessage: {
    color: COLORS.critical,
    fontSize: 13,
    marginTop: 10,
  },
  detailHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  detailTitle: {
    fontSize: 18,
    margin: "0 0 6px",
    color: COLORS.dark,
  },
  detailMetaText: {
    color: COLORS.textMuted,
    fontSize: 13,
    margin: "0 0 4px",
  },
  detailBodyText: {
    fontSize: 14,
    marginTop: 8,
    margin: 0,
    color: COLORS.dark,
    lineHeight: 1.4,
  },
  correctiveSection: {
    marginTop: 12,
    background: "#F8F7F4",
    padding: 10,
    borderRadius: 2,
  },
  correctiveTitle: {
    fontSize: 11,
    textTransform: "uppercase",
    color: COLORS.textMuted,
    fontWeight: 600,
    marginBottom: 4,
  },
  photoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
    gap: 8,
    marginTop: 14,
  },
  photoThumbButton: {
    padding: 0,
    border: "none",
    background: "none",
    cursor: "pointer",
  },
  photoThumbImg: {
    width: "100%",
    aspectRatio: "1",
    objectFit: "cover",
    borderRadius: 2,
  },
  noPhotosContainer: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 14,
  },
};
