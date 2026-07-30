import React, { useState, useMemo } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { Download, FileText, Sparkles } from "lucide-react";
import { COLORS, ghostButtonStyle, primaryButtonStyle, inputStyle, ModalShell, Field } from "./shared.jsx";

// Temas de Color para los Reportes PDF Generados
const PDF_THEMES = {
  corporate: {
    name: "Dark Navy & Slate (Corporativo)",
    primary: [15, 23, 42],
    accent: [59, 130, 246],
    secondary: [241, 245, 249],
    text: [30, 41, 59],
    muted: [100, 116, 139],
    border: [226, 232, 240],
  },
  emerald: {
    name: "Emerald Operations (Planta)",
    primary: [6, 78, 59],
    accent: [16, 185, 129],
    secondary: [236, 253, 245],
    text: [15, 23, 42],
    muted: [71, 85, 105],
    border: [209, 250, 229],
  },
  executive: {
    name: "Executive Charcoal",
    primary: [24, 24, 27],
    accent: [225, 29, 72],
    secondary: [244, 244, 245],
    text: [39, 39, 42],
    muted: [113, 113, 122],
    border: [228, 228, 231],
  },
};

// Cálculo de Métricas Clave (KPIs) para la cabecera del documento
function calculateKPIs(moduleName, data) {
  const total = data.length;
  if (total === 0) return [];

  switch (moduleName) {
    case "Mantenimiento": {
      const urgent = data.filter(d => ["alta", "critica", "crítica"].includes((d.priority || "").toLowerCase())).length;
      const completed = data.filter(d => ["completado", "resuelto"].includes((d.status || "").toLowerCase())).length;
      return [
        { label: "Total OTs", value: total.toString() },
        { label: "Completadas", value: `${completed} (${Math.round((completed / total) * 100)}%)` },
        { label: "Prioridad Crítica", value: urgent.toString() },
      ];
    }
    case "Materiales": {
      const lowStock = data.filter(d => Number(d.stock || 0) <= Number(d.minStock || 0)).length;
      return [
        { label: "Total Ítems", value: total.toString() },
        { label: "Stock Crítico", value: lowStock.toString() },
      ];
    }
    case "Producción": {
      const produced = data.reduce((acc, curr) => acc + Number(curr.producedQty || 0), 0);
      const scrap = data.reduce((acc, curr) => acc + Number(curr.scrapQty || 0), 0);
      return [
        { label: "Órdenes", value: total.toString() },
        { label: "Total Producido", value: produced.toLocaleString() },
        { label: "Total Scrap", value: scrap.toLocaleString() },
      ];
    }
    default:
      return [{ label: "Registros Totales", value: total.toString() }];
  }
}

export async function generatePDFReport(moduleName, data, options = {}) {
  const { userEmail = "Usuario", dateFrom, dateTo, search, themeKey = "corporate", titleCustom } = options;
  const theme = PDF_THEMES[themeKey] || PDF_THEMES.corporate;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // 1. Cabecera
  doc.setFillColor(...theme.primary);
  doc.rect(0, 0, 210, 28, "F");

  doc.setFillColor(...theme.accent);
  doc.rect(0, 28, 210, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text("MIXPAK SYSTEM", 14, 14);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(220, 225, 235);
  doc.text(titleCustom || `INFORME CONTROLADO — MÓDULO DE ${moduleName.toUpperCase()}`, 14, 21);

  const now = new Date();
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(`Generado: ${now.toLocaleDateString("es-ES")} ${now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`, 196, 13, { align: "right" });
  doc.text(`Usuario: ${userEmail}`, 196, 19, { align: "right" });

  let startY = 36;

  // 2. Tarjetas de KPIs
  const kpis = calculateKPIs(moduleName, data);
  if (kpis.length > 0) {
    const cardWidth = (182 - (kpis.length - 1) * 4) / kpis.length;
    kpis.forEach((kpi, idx) => {
      const x = 14 + idx * (cardWidth + 4);
      doc.setFillColor(...theme.secondary);
      doc.roundedRect(x, startY, cardWidth, 14, 2, 2, "F");
      doc.setDrawColor(...theme.border);
      doc.setLineWidth(0.2);
      doc.roundedRect(x, startY, cardWidth, 14, 2, 2, "D");

      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...theme.muted);
      doc.text(kpi.label.toUpperCase(), x + 4, startY + 5);

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...theme.primary);
      doc.text(kpi.value, x + 4, startY + 11);
    });
    startY += 18;
  }

  // 3. Tablas Dinámicas
  let head = [];
  let body = [];

  switch (moduleName) {
    case "Mantenimiento":
      head = [["OT #", "Máquina", "Tipo", "Tarea", "Prioridad", "Estado", "Vencimiento"]];
      body = data.map(t => [t.workOrder || "—", t.machine || "—", t.machineType || "—", t.title || "—", (t.priority || "—").toUpperCase(), (t.status || "—").replace("_", " ").toUpperCase(), t.dueDate || "—"]);
      break;
    case "Materiales":
      head = [["Código", "Material", "Categoría", "Stock", "Mínimo", "Ubicación", "Estado"]];
      body = data.map(m => [m.code || "—", m.name || "—", m.category || "—", `${m.stock || 0} ${m.unit || ""}`, `${m.minStock || 0} ${m.unit || ""}`, m.location || "—", Number(m.stock || 0) <= Number(m.minStock || 0) ? "ALERTA" : "OK"]);
      break;
    case "Producción":
      head = [["Producto", "Cliente / Lote", "Línea/Turno", "Objetivo", "Producido", "Scrap", "Estado"]];
      body = data.map(o => [o.product || "—", `${o.client || "—"}\n${o.lot || ""}`, `${o.line || "—"} (${o.shift || "—"})`, o.targetQty || 0, o.producedQty || 0, o.scrapQty || 0, (o.status || "—").replace("_", " ")]);
      break;
    case "Calidad":
      head = [["Incidencia", "Tipo", "Lote", "Ref", "Severidad", "Estado"]];
      body = data.map(q => [q.title || "—", q.type || "—", q.lot || "—", q.reference || "—", (q.severity || "—").toUpperCase(), (q.status || "—").replace("_", " ")]);
      break;
    default:
      head = [["Modulo", "Acción", "Detalle", "Usuario", "Fecha"]];
      body = data.map(h => [h.module || "—", h.action || "—", h.details || "—", h.userEmail || "—", h.createdAt?.toDate ? h.createdAt.toDate().toLocaleString("es-ES") : "—"]);
      break;
  }

  doc.autoTable({
    startY,
    head,
    body,
    theme: "grid",
    headStyles: { fillColor: theme.primary, textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold" },
    bodyStyles: { fontSize: 7.5, textColor: theme.text, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: theme.secondary },
    styles: { lineColor: theme.border, lineWidth: 0.1 },
    margin: { left: 14, right: 14, bottom: 16 },
    didDrawPage: () => {
      const totalPages = doc.internal.getNumberOfPages();
      doc.setFontSize(7.5);
      doc.setTextColor(...theme.muted);
      doc.text("Mixpak Platform — Documento de Control Operativo", 14, 287);
      doc.text(`Página ${doc.internal.getNumberOfPages()} de ${totalPages}`, 196, 287, { align: "right" });
    },
  });

  doc.save(`reporte_${moduleName.toLowerCase()}_${now.toISOString().slice(0, 10)}.pdf`);
}

export default function ExportButton({ moduleName, data = [], userEmail, search, dateFrom, dateTo }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(dateFrom || "");
  const [customTo, setCustomTo] = useState(dateTo || "");
  const [themeKey, setThemeKey] = useState("corporate");
  const [reportTitle, setReportTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const filteredData = useMemo(() => {
    if (!customFrom && !customTo) return data;
    return data.filter(item => {
      const d = new Date(item.date || item.createdAt || item.dueDate);
      if (isNaN(d.getTime())) return true;
      if (customFrom && d < new Date(customFrom)) return false;
      if (customTo && d > new Date(customTo + "T23:59:59")) return false;
      return true;
    });
  }, [data, customFrom, customTo]);

  async function handleExport() {
    setLoading(true);
    try {
      await generatePDFReport(moduleName, filteredData, {
        userEmail,
        search,
        dateFrom: customFrom,
        dateTo: customTo,
        themeKey,
        titleCustom: reportTitle,
      });
      setModalOpen(false);
    } catch (e) {
      console.error(e);
      alert("Error generando el archivo PDF.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button onClick={() => setModalOpen(true)} style={ghostButtonStyle}>
        <FileText size={16} style={{ color: COLORS.primary }} />
        <span>Reporte PDF</span>
      </button>

      {modalOpen && (
        <ModalShell onClose={() => setModalOpen(false)} title={`Exportar Reporte: ${moduleName}`}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ padding: "12px", borderRadius: "8px", backgroundColor: "#0f172a", border: `1px solid ${COLORS.cardBorder}`, display: "flex", alignItems: "center", gap: "10px" }}>
              <Sparkles size={20} style={{ color: COLORS.primary }} />
              <span style={{ fontSize: "13px", color: COLORS.textMain }}>
                Se exportarán <strong>{filteredData.length}</strong> registros procesados con formato de alta resolución.
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <Field label="Desde">
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Hasta">
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={inputStyle} />
              </Field>
            </div>

            <Field label="Estilo del PDF">
              <select value={themeKey} onChange={e => setThemeKey(e.target.value)} style={inputStyle}>
                {Object.entries(PDF_THEMES).map(([k, v]) => (
                  <option key={k} value={k}>{v.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Título del Reporte (Opcional)">
              <input type="text" placeholder={`REPORTE DE ${moduleName.toUpperCase()}`} value={reportTitle} onChange={e => setReportTitle(e.target.value)} style={inputStyle} />
            </Field>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
              <button onClick={() => setModalOpen(false)} style={ghostButtonStyle} disabled={loading}>Cancelar</button>
              <button onClick={handleExport} style={primaryButtonStyle} disabled={loading || filteredData.length === 0}>
                <Download size={16} />
                <span>{loading ? "Procesando..." : "Descargar PDF"}</span>
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </>
  );
}
