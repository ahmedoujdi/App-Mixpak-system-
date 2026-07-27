import React, { useState, useEffect, useMemo, useRef } from "react";
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
import { uploadToCloudinary } from "../cloudinary.js";
import FotoViewer from "../FotoViewer.jsx";
import {
  Factory,
  Plus,
  Trash2,
  PlayCircle,
  PauseCircle,
  CheckCircle2,
  TrendingUp,
  Search,
  Download,
  Share2,
  Camera,
  X,
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

const SHIFTS = [
  { value: "manana", label: "Mañana" },
  { value: "tarde", label: "Tarde" },
  { value: "noche", label: "Noche" },
];

const STATUSES = [
  { value: "pendiente", label: "Pendiente", icon: PauseCircle, color: COLORS.steel },
  { value: "en_curso", label: "En curso", icon: PlayCircle, color: COLORS.safety },
  { value: "terminada", label: "Terminada", icon: CheckCircle2, color: COLORS.green },
];

const emptyForm = {
  product: "",
  client: "",
  lot: "",
  line: "",
  shift: "manana",
  targetQty: 0,
  producedQty: 0,
  scrapQty: 0,
  status: "pendiente",
  date: new Date().toISOString().slice(0, 10),
  notes: "",
};

function statusMeta(v) {
  return STATUSES.find((s) => s.value === v) || STATUSES[0];
}

export default function Produccion({ user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editOrder, setEditOrder] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const q = query(collection(db, "production_orders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error("Error en suscripción de Firestore:", err);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  async function updateStatus(id, status) {
    try {
      await updateDoc(doc(db, "production_orders", id), { status });
    } catch (err) {
      console.error("Error al actualizar estado:", err);
    }
  }

  async function removeOrder(order) {
    try {
      await deleteDoc(doc(db, "production_orders", order.id));
      setConfirmDelete(null);
    } catch (err) {
      console.error("Error al eliminar la orden:", err);
    }
  }

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return orders;

    return orders.filter((o) => {
      const matchProduct = o.product?.toLowerCase().includes(term);
      const matchClient = o.client?.toLowerCase().includes(term);
      const matchLot = o.lot?.toLowerCase().includes(term);
      const matchLine = o.line?.toLowerCase().includes(term);
      return matchProduct || matchClient || matchLot || matchLine;
    });
  }, [orders, search]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todays = orders.filter((o) => o.date === today);
    const produced = todays.reduce((sum, o) => sum + (Number(o.producedQty) || 0), 0);
    const target = todays.reduce((sum, o) => sum + (Number(o.targetQty) || 0), 0);
    const scrap = todays.reduce((sum, o) => sum + (Number(o.scrapQty) || 0), 0);
    const efficiency = target > 0 ? Math.round((produced / target) * 100) : 0;
    return {
      produced,
      target,
      scrap,
      efficiency,
      enCurso: orders.filter((o) => o.status === "en_curso").length,
    };
  }, [orders]);

  const columns = STATUSES.map((s) => ({
    ...s,
    items: filtered.filter((o) => o.status === s.value),
  }));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <h1 style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 20, textTransform: "uppercase", margin: 0 }}>
          Órdenes de producción
        </h1>
        <button onClick={() => { setEditOrder(null); setModalOpen(true); }} style={primaryButtonStyle}>
          <Plus size={16} /> Nueva orden
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 20 }}>
        <StatCard label="Producido hoy" value={stats.produced} color={COLORS.green} Icon={TrendingUp} />
        <StatCard label="Objetivo hoy" value={stats.target} color={COLORS.steel} Icon={Factory} />
        <StatCard label="Rechazo/scrap hoy" value={stats.scrap} color={COLORS.critical} Icon={PauseCircle} />
        <StatCard label="Eficiencia hoy" value={`${stats.efficiency}%`} color={COLORS.safety} Icon={TrendingUp} />
        <StatCard label="Órdenes en curso" value={stats.enCurso} color={COLORS.safety} Icon={PlayCircle} />
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18, alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <Search size={14} color={COLORS.textMuted} style={{ position: "absolute", left: 9, top: 11 }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por producto, cliente, lote o línea"
            style={{ ...inputStyle, paddingLeft: 30 }}
          />
        </div>
        <button
          onClick={() =>
            exportToCsv(
              "ordenes-produccion",
              filtered.map((o) => ({
                producto: o.product,
                cliente: o.client || "",
                lote: o.lot || "",
                linea: o.line || "",
                turno: o.shift,
                objetivo: o.targetQty,
                producido: o.producedQty,
                rechazado: o.scrapQty,
                estado: o.status,
                fecha: o.date,
              }))
            )
          }
          style={ghostButtonStyle}
        >
          <Download size={16} /> Exportar
        </button>
      </div>

      {loading ? (
        <CenteredMessage text="Cargando órdenes de producción…" />
      ) : orders.length === 0 ? (
        <EmptyState
          Icon={Factory}
          title="Sin órdenes de producción"
          message="Crea la primera orden para una línea y turno."
          onAdd={() => setModalOpen(true)}
          addLabel="Crear primera orden"
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: 16 }}>
          {columns.map((col) => (
            <div key={col.value}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, paddingBottom: 8, borderBottom: `2px solid ${COLORS.dark}` }}>
                <col.icon size={15} />
                <h2 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 13, textTransform: "uppercase", margin: 0 }}>{col.label}</h2>
                <span style={{ marginLeft: "auto", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: COLORS.textMuted }}>
                  {col.items.length}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {col.items.map((o) => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    onStatusChange={(s) => updateStatus(o.id, s)}
                    onEdit={() => { setEditOrder(o); setModalOpen(true); }}
                    onDelete={() => setConfirmDelete(o)}
                  />
                ))}
                {col.items.length === 0 && (
                  <div style={{ fontSize: 12, color: COLORS.textMuted, fontStyle: "italic" }}>Sin órdenes aquí.</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && <OrderModal order={editOrder} user={user} onClose={() => setModalOpen(false)} />}
      {confirmDelete && (
        <ConfirmDialog
          title="Eliminar orden"
          message="Se eliminará esta orden de producción. No se puede deshacer."
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => removeOrder(confirmDelete)}
        />
      )}
    </div>
  );
}

function OrderCard({ order, onStatusChange, onEdit, onDelete }) {
  const pct = order.targetQty > 0 ? Math.min(100, Math.round((order.producedQty / order.targetQty) * 100)) : 0;
  const [viewerIndex, setViewerIndex] = useState(null);

  function share() {
    const lines = [
      `Producto: ${order.product}`,
      order.client ? `Cliente: ${order.client}` : null,
      order.lot ? `Lote: ${order.lot}` : null,
      `Línea: ${order.line || "—"} · Turno: ${SHIFTS.find((s) => s.value === order.shift)?.label || order.shift}`,
      `Producido: ${order.producedQty} / ${order.targetQty} (rechazado: ${order.scrapQty})`,
      `Estado: ${statusMeta(order.status).label} · Fecha: ${order.date}`,
    ]
      .filter(Boolean)
      .join("\n");
    shareText(order.product, lines);
  }

  const validPhotos = Array.isArray(order.photos) ? order.photos : [];

  return (
    <div style={{ background: COLORS.panel, borderLeft: `5px solid ${statusMeta(order.status).color}`, padding: "12px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.textMuted }}>
          {order.line || "Sin línea"} · {SHIFTS.find((s) => s.value === order.shift)?.label || order.shift}
        </span>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={share} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textMuted }}>
            <Share2 size={14} />
          </button>
          <button onClick={onDelete} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textMuted }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <h3 onClick={onEdit} style={{ fontSize: 15, fontWeight: 600, margin: "6px 0 8px", cursor: "pointer" }}>
        {order.product}
      </h3>

      {(order.client || order.lot) && (
        <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 6 }}>
          {order.client && <>Cliente: {order.client}</>}
          {order.client && order.lot && <> · </>}
          {order.lot && <>Lote: {order.lot}</>}
        </div>
      )}

      {validPhotos.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 8, overflowX: "auto" }}>
          {validPhotos.slice(0, 3).map((p, i) => (
            <img
              key={i}
              src={p.url || p}
              alt=""
              onClick={() => setViewerIndex(i)}
              style={{ width: 52, height: 52, objectFit: "cover", cursor: "pointer", borderRadius: 2 }}
            />
          ))}
        </div>
      )}

      <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 4 }}>
        {order.producedQty} / {order.targetQty} unidades {order.scrapQty > 0 && <>· {order.scrapQty} rechazadas</>}
      </div>

      <div style={{ height: 6, background: COLORS.bg, marginBottom: 10 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: COLORS.green }} />
      </div>

      <select
        value={order.status}
        onChange={(e) => onStatusChange(e.target.value)}
        style={{ ...selectStyle, width: "100%", fontSize: 12, padding: "6px 8px" }}
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      {viewerIndex !== null && (
        <FotoViewer photos={validPhotos} startIndex={viewerIndex} onClose={() => setViewerIndex(null)} />
      )}
    </div>
  );
}

function OrderModal({ order, user, onClose }) {
  const [form, setForm] = useState(order ? { ...emptyForm, ...order } : emptyForm);
  const [existingPhotos, setExistingPhotos] = useState(order?.photos || []);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  // Limpiar memoria revocando los objectURLs creados cuando el modal se desmonta
  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p));
    };
  }, [previews]);

  function handleFiles(e) {
    const list = Array.from(e.target.files || []);
    if (!list.length) return;

    const newPreviews = list.map((f) => URL.createObjectURL(f));
    setFiles((prevFiles) => [...prevFiles, ...list]);
    setPreviews((prevPreviews) => [...prevPreviews, ...newPreviews]);

    // Reseteamos el value para poder subir de nuevo el mismo archivo si fuese necesario
    e.target.value = "";
  }

  function removeNewFile(index) {
    URL.revokeObjectURL(previews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  function removeExistingPhoto(index) {
    setExistingPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.product.trim()) return;

    setSaving(true);
    setError("");

    const payload = {
      product: form.product,
      client: form.client,
      lot: form.lot,
      line: form.line,
      shift: form.shift,
      targetQty: Number(form.targetQty) || 0,
      producedQty: Number(form.producedQty) || 0,
      scrapQty: Number(form.scrapQty) || 0,
      status: form.status,
      date: form.date,
      notes: form.notes,
    };

    let docId = order?.id;

    try {
      if (order) {
        await updateDoc(doc(db, "production_orders", order.id), {
          ...payload,
          photos: existingPhotos, // Mantiene cambios si borró fotos existentes
        });
      } else {
        const docRef = await addDoc(collection(db, "production_orders"), {
          ...payload,
          photos: [],
          createdBy: user?.email || "sistema",
          createdAt: serverTimestamp(),
        });
        docId = docRef.id;
      }
    } catch (err) {
      console.error(err);
      setSaving(false);
      setError("No se pudo guardar la orden. Revisa tu conexión y las reglas de Firestore.");
      return;
    }

    if (files.length > 0) {
      try {
        const uploaded = [...existingPhotos];
        for (let i = 0; i < files.length; i++) {
          setUploadStatus(`Subiendo foto ${i + 1} de ${files.length}…`);
          const blob = await withTimeout(compressImage(files[i]), 15000, "La foto tardó demasiado en procesarse.");
          const result = await withTimeout(uploadToCloudinary(blob, `production/${docId}`), 20000, "La subida de la foto tardó demasiado.");
          uploaded.push(result);
        }
        setUploadStatus("Guardando enlaces de las fotos…");
        await updateDoc(doc(db, "production_orders", docId), { photos: uploaded });
      } catch (err) {
        console.error(err);
        setSaving(false);
        setUploadStatus("");
        setError("La orden se guardó, pero algunas fotos no se pudieron subir a Cloudinary.");
        return;
      }
    }

    setSaving(false);
    setUploadStatus("");
    onClose();
  }

  return (
    <ModalShell onClose={onClose} title={order ? "Editar orden de producción" : "Nueva orden de producción"}>
      <form onSubmit={submit}>
        <Field label="Producto / formato *">
          <input
            required
            value={form.product}
            onChange={(e) => setForm({ ...form, product: e.target.value })}
            style={inputStyle}
            placeholder="Ej. Sachet doble compartimento 20ml"
          />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Cliente">
            <input value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} style={inputStyle} placeholder="Ej. Marca S.L." />
          </Field>
          <Field label="Lote / nº de lote">
            <input value={form.lot} onChange={(e) => setForm({ ...form, lot: e.target.value })} style={inputStyle} placeholder="Ej. L-2026-0731" />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Línea">
            <input value={form.line} onChange={(e) => setForm({ ...form, line: e.target.value })} style={inputStyle} placeholder="Ej. Línea 2" />
          </Field>
          <Field label="Turno">
            <select value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })} style={inputStyle}>
              {SHIFTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Fecha">
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={inputStyle} />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="Objetivo">
            <input type="number" value={form.targetQty} onChange={(e) => setForm({ ...form, targetQty: e.target.value })} style={inputStyle} />
          </Field>
          <Field label="Producido">
            <input type="number" value={form.producedQty} onChange={(e) => setForm({ ...form, producedQty: e.target.value })} style={inputStyle} />
          </Field>
          <Field label="Rechazado">
            <input type="number" value={form.scrapQty} onChange={(e) => setForm({ ...form, scrapQty: e.target.value })} style={inputStyle} />
          </Field>
        </div>

        <Field label="Estado">
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={inputStyle}>
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </Field>

        <Field label="Notas">
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
        </Field>

        <Field label="Fotos">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            {/* Fotos guardadas previamente */}
            {existingPhotos.map((p, i) => (
              <div key={`ex-${i}`} style={{ position: "relative", width: 60, height: 60 }}>
                <img src={p.url || p} alt="" style={{ width: 60, height: 60, objectFit: "cover" }} />
                <button
                  type="button"
                  onClick={() => removeExistingPhoto(i)}
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    background: COLORS.critical,
                    color: "#fff",
                    border: "none",
                    borderRadius: "50%",
                    width: 18,
                    height: 18,
                    display: "flex",
                    alignItems: "center",
                    justify: "center",
                    cursor: "pointer",
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}

            {/* Fotos pendientes de subir */}
            {previews.map((src, i) => (
              <div key={`new-${i}`} style={{ position: "relative", width: 60, height: 60 }}>
                <img src={src} alt="" style={{ width: 60, height: 60, objectFit: "cover" }} />
                <button
                  type="button"
                  onClick={() => removeNewFile(i)}
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    background: COLORS.critical,
                    color: "#fff",
                    border: "none",
                    borderRadius: "50%",
                    width: 18,
                    height: 18,
                    display: "flex",
                    alignItems: "center",
                    justify: "center",
                    cursor: "pointer",
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: 60,
                height: 60,
                border: `1px dashed ${COLORS.line}`,
                background: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Camera size={20} color={COLORS.textMuted} />
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: "none" }} />
        </Field>

        <button type="submit" disabled={saving} style={{ ...primaryButtonStyle, width: "100%", justifyContent: "center", marginTop: 8 }}>
          {uploadStatus || (saving ? "Guardando…" : "Guardar orden")}
        </button>

        {error && <p style={{ color: COLORS.critical, fontSize: 13, marginTop: 10 }}>{error}</p>}
      </form>
    </ModalShell>
  );
}
