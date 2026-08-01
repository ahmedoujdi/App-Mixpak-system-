import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase.js";
import { 
  Layers, 
  Search, 
  Plus, 
  Download, 
  ShieldAlert, 
  ShieldCheck, 
  Cpu, 
  Boxes, 
  Tag, 
  FileCheck, 
  Building2, 
  Eye, 
  ListTree, 
  CheckCircle2, 
  AlertCircle 
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
} from "../shared.jsx";

export default function Materiales({ user }) {
  const [boms, setBoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("todos");
  const [filterStatus, setFilterStatus] = useState("todos"); // "todos" | "Aprobado" | "En Revisión" | "Obsoleto"
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Modales
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedBOM, setSelectedBOM] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Formulario de Nueva Estructura de Producto (BOM)
  const [newBOM, setNewBOM] = useState({
    code: "",
    productName: "",
    revision: "v1.0",
    category: "Ensamble Final",
    status: "Aprobado",
    components: "", // Entrada formateada (ej: Resina 10Kg, Pigmento 0.5Kg)
    notes: ""
  });

  // Carga en tiempo real de la colección de Listas de Materiales
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "bill_of_materials"), (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setBoms(docs);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Crear Nueva Receta / BOM
  const handleCreateBOM = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const bomCode = newBOM.code || `BOM-${Math.floor(1000 + Math.random() * 9000)}`;

      await addDoc(collection(db, "bill_of_materials"), {
        ...newBOM,
        code: bomCode,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await logActivity(
        user?.email,
        "Materiales",
        "Creación de Estructura BOM",
        `Nueva Lista de Materiales '${bomCode}' registrada para el producto '${newBOM.productName}' [Revisión: ${newBOM.revision}].`
      );

      setShowNewModal(false);
      setNewBOM({
        code: "",
        productName: "",
        revision: "v1.0",
        category: "Ensamble Final",
        status: "Aprobado",
        components: "",
        notes: ""
      });
    } catch (err) {
      console.error("Error al registrar BOM:", err);
    } finally {
      setProcessing(false);
    }
  };

  // Cambiar Estado de Homologación de BOM
  const handleUpdateStatus = async (bomId, newStatus) => {
    setProcessing(true);
    try {
      const docRef = doc(db, "bill_of_materials", bomId);
      await updateDoc(docRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      await logActivity(
        user?.email,
        "Materiales",
        "Aprobación de Receta/BOM",
        `Lista de Materiales ID '${bomId}' cambió de estado a: ${newStatus.toUpperCase()}`
      );

      setSelectedBOM((prev) => (prev ? { ...prev, status: newStatus } : null));
    } catch (err) {
      console.error("Error al actualizar estado de BOM:", err);
    } finally {
      setProcessing(false);
    }
  };

  // Filtrado de Recetas / BOMs
  const filteredBOMs = useMemo(() => {
    return boms.filter((item) => {
      const matchesCategory = filterCategory === "todos" || item.category === filterCategory;
      const matchesStatus = filterStatus === "todos" || item.status === filterStatus;

      const matchesSearch = 
        (item.code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.productName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.components || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDate = inDateRange(item.createdAt, fromDate, toDate);

      return matchesCategory && matchesStatus && matchesSearch && matchesDate;
    });
  }, [boms, filterCategory, filterStatus, searchTerm, fromDate, toDate]);

  // KPIs del Módulo de Materiales
  const metrics = useMemo(() => {
    const totalBOMs = boms.length;
    const approvedBOMs = boms.filter((b) => b.status === "Aprobado").length;
    const underReview = boms.filter((b) => b.status === "En Revisión").length;

    return { totalBOMs, approvedBOMs, underReview };
  }, [boms]);

  if (loading) {
    return <CenteredMessage text="Accediendo a Estructuras BOM y Trazabilidad de Materiales..." />;
  }

  return (
    <div style={{ maxWidth: 1350, margin: "0 auto", paddingBottom: 50 }}>
      
      {/* HEADER PRINCIPAL DE MÓDULO */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ background: "rgba(175,82,222,0.15)", color: "#AF52DE", fontSize: 10, fontWeight: 900, padding: "2px 8px", borderRadius: 4 }}>
              INGENIERÍA DE PRODUCTO & LISTAS DE MATERIALES (BOM)
            </span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, color: "#fff", letterSpacing: "-0.5px" }}>
            Estructuras BOM & Especificaciones
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
            Definición de fórmulas de fabricación, consumo por unidad de producción y homologación ISO.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => exportToCsv("especificaciones_bom_enterprise", filteredBOMs)} style={ghostButtonStyle}>
            <Download size={16} /> Exportar BOM CSV
          </button>
          <button onClick={() => setShowNewModal(true)} style={primaryButtonStyle}>
            <Plus size={16} /> Nueva Receta / BOM
          </button>
        </div>
      </div>

      {/* STRIP DE KPIS ENTERPRISE */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "rgba(175, 82, 222, 0.08)", border: "1px solid rgba(175, 82, 222, 0.2)", borderRadius: 16, padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#AF52DE" }}>ESTRUCTURAS BOM</span>
            <ListTree size={18} color="#AF52DE" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginTop: 6 }}>{metrics.totalBOMs}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>Recetas activas registradas</div>
        </div>

        <div style={{ background: "rgba(52, 199, 89, 0.08)", border: "1px solid rgba(52, 199, 89, 0.2)", borderRadius: 16, padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#34C759" }}>HOMOLOGADAS / APROBADAS</span>
            <ShieldCheck size={18} color="#34C759" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginTop: 6 }}>{metrics.approvedBOMs}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>Listas para liberación de OP</div>
        </div>

        <div style={{ background: "rgba(255, 149, 0, 0.08)", border: "1px solid rgba(255, 149, 0, 0.2)", borderRadius: 16, padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#FF9500" }}>EN REVISIÓN TÉCNICA</span>
            <AlertCircle size={18} color="#FF9500" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginTop: 6 }}>{metrics.underReview}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>Fórmulas pendientes de firma</div>
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
            placeholder="Buscar por código BOM, producto final o insumos..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            style={{ ...inputStyle, paddingLeft: 38 }} 
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
            <option value="todos" style={{ background: "#12141d" }}>Todas las Categorías</option>
            <option value="Ensamble Final" style={{ background: "#12141d" }}>Ensamble Final</option>
            <option value="Sub-Ensamble" style={{ background: "#12141d" }}>Sub-Ensamble</option>
            <option value="Mezcla / Formulación" style={{ background: "#12141d" }}>Mezcla / Formulación</option>
          </select>

          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
            <option value="todos" style={{ background: "#12141d" }}>Todos los Estados</option>
            <option value="Aprobado" style={{ background: "#12141d" }}>Aprobado</option>
            <option value="En Revisión" style={{ background: "#12141d" }}>En Revisión</option>
            <option value="Obsoleto" style={{ background: "#12141d" }}>Obsoleto</option>
          </select>

          <DateRangeFilter from={fromDate} to={toDate} onFromChange={setFromDate} onToChange={setToDate} />
        </div>
      </div>

      {/* TABLA ENTERPRISE DE ESTRUCTURAS BOM */}
      {filteredBOMs.length === 0 ? (
        <EmptyState 
          Icon={ListTree} 
          title="Sin Estructuras Registradas" 
          message="No se encontraron especificaciones BOM que coincidan con la búsqueda o filtros." 
        />
      ) : (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13, color: "#fff" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)", fontSize: 11, textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
                <th style={{ padding: "14px 16px" }}>Código BOM</th>
                <th style={{ padding: "14px 16px" }}>Producto Asociado</th>
                <th style={{ padding: "14px 16px" }}>Categoría</th>
                <th style={{ padding: "14px 16px" }}>Insumos Requeridos (BOM)</th>
                <th style={{ padding: "14px 16px" }}>Revisión</th>
                <th style={{ padding: "14px 16px" }}>Estado</th>
                <th style={{ padding: "14px 16px", textAlign: "right" }}>Inspeccionar</th>
              </tr>
            </thead>
            <tbody>
              {filteredBOMs.map((bom) => (
                <tr key={bom.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "14px 16px", fontWeight: 800, color: "#AF52DE" }}>
                    {bom.code}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontWeight: 800, color: "#fff" }}>{bom.productName}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{bom.notes || "Sin notas técnicas"}</div>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.8)" }}>
                      {bom.category}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", color: "rgba(255,255,255,0.7)", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {bom.components || "Insumos no definidos"}
                  </td>
                  <td style={{ padding: "14px 16px", fontWeight: 700, color: "#007AFF" }}>
                    {bom.revision}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <StatusBadge status={bom.status} />
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "right" }}>
                    <button 
                      onClick={() => setSelectedBOM(bom)} 
                      style={{ ...ghostButtonStyle, padding: "6px 10px", fontSize: 12 }}
                    >
                      Ver Detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL NUEVA RECETA BOM */}
      {showNewModal && (
        <ModalShell title="Registrar Nueva Especificación BOM" onClose={() => setShowNewModal(false)}>
          <form onSubmit={handleCreateBOM} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
              <Field label="Código BOM / Identificador">
                <input 
                  type="text" 
                  placeholder="Ej. BOM-9042" 
                  value={newBOM.code} 
                  onChange={(e) => setNewBOM({ ...newBOM, code: e.target.value })} 
                  style={inputStyle} 
                />
              </Field>

              <Field label="Producto Terminado Final">
                <input 
                  type="text" 
                  placeholder="Ej. Panel Inyectado Serie-X" 
                  value={newBOM.productName} 
                  onChange={(e) => setNewBOM({ ...newBOM, productName: e.target.value })} 
                  style={inputStyle} 
                  required 
                />
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Categoría de Ensamble">
                <select 
                  value={newBOM.category} 
                  onChange={(e) => setNewBOM({ ...newBOM, category: e.target.value })} 
                  style={inputStyle}
                >
                  <option value="Ensamble Final" style={{ background: "#12141d" }}>Ensamble Final</option>
                  <option value="Sub-Ensamble" style={{ background: "#12141d" }}>Sub-Ensamble</option>
                  <option value="Mezcla / Formulación" style={{ background: "#12141d" }}>Mezcla / Formulación</option>
                </select>
              </Field>

              <Field label="Versión de Revisión Ingenieril">
                <input 
                  type="text" 
                  placeholder="v1.0" 
                  value={newBOM.revision} 
                  onChange={(e) => setNewBOM({ ...newBOM, revision: e.target.value })} 
                  style={inputStyle} 
                  required 
                />
              </Field>
            </div>

            <Field label="Lista de Insumos & Cantidades por Unidad">
              <textarea 
                rows={3} 
                placeholder="Ej. Resina de Polipropileno (12.5 Kg), Pigmento Azul (0.2 Kg), Embalaje Térmico (1 Pza)..." 
                value={newBOM.components} 
                onChange={(e) => setNewBOM({ ...newBOM, components: e.target.value })} 
                style={{ ...inputStyle, resize: "vertical" }} 
                required 
              />
            </Field>

            <Field label="Notas de Control de Calidad u Operación">
              <input 
                type="text" 
                placeholder="Ej. Requiere premezcla a 180°C antes de inyección" 
                value={newBOM.notes} 
                onChange={(e) => setNewBOM({ ...newBOM, notes: e.target.value })} 
                style={inputStyle} 
              />
            </Field>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <button type="button" onClick={() => setShowNewModal(false)} style={secondaryButtonStyle}>
                Cancelar
              </button>
              <button type="submit" disabled={processing} style={primaryButtonStyle}>
                {processing ? "Guardando..." : "Liberar Especificación BOM"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* MODAL DETALLE DE ESTRUCTURA BOM */}
      {selectedBOM && (
        <ModalShell title={`Especificación BOM: ${selectedBOM.code}`} onClose={() => setSelectedBOM(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "rgba(175,82,222,0.08)", border: "1px solid rgba(175,82,222,0.2)", padding: 14, borderRadius: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#AF52DE" }}>PRODUCTO OBJETIVO</span>
                <StatusBadge status={selectedBOM.status} />
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", marginTop: 2 }}>{selectedBOM.productName}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>
                Categoría: {selectedBOM.category} | Revisión Ingenieril: {selectedBOM.revision}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>DESGLOSE DE MATERIALES & CONSUMO</div>
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", padding: 12, borderRadius: 8, fontSize: 13, color: "rgba(255,255,255,0.85)", whiteSpace: "pre-wrap" }}>
                {selectedBOM.components || "Sin especificaciones de insumos agregadas."}
              </div>
            </div>

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#fff", marginBottom: 10 }}>Firma y Liberación ISO:</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <button 
                  onClick={() => handleUpdateStatus(selectedBOM.id, "En Revisión")} 
                  disabled={processing || selectedBOM.status === "En Revisión"}
                  style={{ ...secondaryButtonStyle, fontSize: 12, justifyContent: "center" }}
                >
                  Poner En Revisión
                </button>
                <button 
                  onClick={() => handleUpdateStatus(selectedBOM.id, "Obsoleto")} 
                  disabled={processing || selectedBOM.status === "Obsoleto"}
                  style={{ ...secondaryButtonStyle, border: "1px solid #FF3B30", color: "#FF3B30", fontSize: 12, justifyContent: "center" }}
                >
                  Marcar Obsoleto
                </button>
                <button 
                  onClick={() => handleUpdateStatus(selectedBOM.id, "Aprobado")} 
                  disabled={processing || selectedBOM.status === "Aprobado"}
                  style={{ ...primaryButtonStyle, background: "#34C759", fontSize: 12, justifyContent: "center" }}
                >
                  Aprobar BOM
                </button>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <button onClick={() => setSelectedBOM(null)} style={secondaryButtonStyle}>
                Cerrar Visor
              </button>
            </div>
          </div>
        </ModalShell>
      )}

    </div>
  );
}
