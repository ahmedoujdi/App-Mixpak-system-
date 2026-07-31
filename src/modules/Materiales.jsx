import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, query, orderBy, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import { Layers, Search, Download, AlertCircle, Plus, Trash2 } from "lucide-react";
import { inputStyle, primaryButtonStyle, ghostButtonStyle, exportToCsv, logActivity, CenteredMessage, ConfirmDialog, EmptyState } from "../shared.jsx";

export default function Materiales({ user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "inventory_materials"), orderBy("name", "asc"));
    return onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  async function updateStock(item, delta) {
    const newStock = Math.max(0, (item.stock || 0) + delta);
    await updateDoc(doc(db, "inventory_materials", item.id), { stock: newStock });
  }

  async function removeItem(item) {
    await deleteDoc(doc(db, "inventory_materials", item.id));
    logActivity(user.email, "Materiales", "Eliminado", item.name);
    setConfirmDelete(null);
  }

  const filtered = useMemo(() => {
    return items.filter((i) => `${i.name} ${i.code || ""}`.toLowerCase().includes(search.toLowerCase()));
  }, [items, search]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <span style={{ background: "rgba(88, 86, 214, 0.15)", color: "#5856D6", padding: "4px 8px", borderRadius: 6, fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
            INVENTORY
          </span>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: "6px 0 0", letterSpacing: "-0.5px" }}>Stock de Materiales</h1>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 12, marginBottom: 24, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 240px" }}>
          <Search size={16} color="rgba(255,255,255,0.4)" style={{ position: "absolute", left: 12, top: 12 }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por código o descripción..." style={{ ...inputStyle, paddingLeft: 36, borderRadius: 8, background: "rgba(0,0,0,0.2)" }} />
        </div>
        <button onClick={() => exportToCsv("materiales", filtered)} style={{ ...ghostButtonStyle, marginLeft: "auto", borderRadius: 8 }}>
          <Download size={16} /> Exportar
        </button>
      </div>

      {/* Inventory Grid */}
      {loading ? (
        <CenteredMessage text="Cargando inventario de materiales..." />
      ) : filtered.length === 0 ? (
        <EmptyState Icon={Layers} title="Sin materiales" message="No hay ningún ítem coincidente." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {filtered.map((item) => {
            const isLow = (item.stock || 0) <= (item.minStock || 5);
            return (
              <div key={item.id} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${isLow ? "rgba(255, 59, 48, 0.3)" : "rgba(255,255,255,0.07)"}`, borderRadius: 16, padding: 18, position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>{item.code || "SKU-N/A"}</span>
                  <button onClick={() => setConfirmDelete(item)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer" }}><Trash2 size={15} /></button>
                </div>

                <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px", color: "#fff" }}>{item.name}</h3>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.2)", padding: 10, borderRadius: 10 }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: isLow ? "#FF3B30" : "#fff" }}>
                      {item.stock || 0} <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 400 }}>{item.unit || "unid."}</span>
                    </div>
                    {isLow && <span style={{ fontSize: 10, color: "#FF3B30", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><AlertCircle size={10} /> Stock Bajo</span>}
                  </div>

                  {/* Stock Quick Controls */}
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => updateStock(item, -1)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", width: 28, height: 28, borderRadius: 6, cursor: "pointer", fontWeight: 700 }}>-</button>
                    <button onClick={() => updateStock(item, 1)} style={{ background: "#007AFF", border: "none", color: "#fff", width: 28, height: 28, borderRadius: 6, cursor: "pointer", fontWeight: 700 }}>+</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {confirmDelete && <ConfirmDialog title="Eliminar ítem" message={`¿Confirmas eliminar ${confirmDelete.name} del inventario?`} onCancel={() => setConfirmDelete(null)} onConfirm={() => removeItem(confirmDelete)} />}
    </div>
  );
}
