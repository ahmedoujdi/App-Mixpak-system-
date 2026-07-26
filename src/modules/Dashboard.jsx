import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase/config'; // Ajusta la ruta a tu archivo de configuración de Firebase
import { collection, onSnapshot } from 'firebase/firestore';
import {
  Wrench,
  Package,
  Factory,
  ShieldAlert,
  AlertTriangle,
  Clock,
  TrendingUp,
  BarChart2
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from 'recharts';

// Paleta de colores para los gráficos
const COLORS_PIE = ['#EF4444', '#F59E0B', '#10B981', '#6B7280', '#8B5CF6'];

export default function Dashboard() {
  const [mantenimiento, setMantenimiento] = useState([]);
  const [materiales, setMateriales] = useState([]);
  const [produccion, setProduccion] = useState([]);
  const [calidad, setCalidad] = useState([]);
  const [loading, setLoading] = useState(true);

  // Escuchar colecciones de Firestore en tiempo real
  useEffect(() => {
    const unsubMaint = onSnapshot(collection(db, 'mantenimiento'), (snap) => {
      setMantenimiento(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    const unsubMat = onSnapshot(collection(db, 'materiales'), (snap) => {
      setMateriales(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    const unsubProd = onSnapshot(collection(db, 'produccion'), (snap) => {
      setProduccion(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    const unsubCal = onSnapshot(collection(db, 'calidad'), (snap) => {
      setCalidad(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => {
      unsubMaint();
      unsubMat();
      unsubProd();
      unsubCal();
    };
  }, []);

  // Métricas calculadas con useMemo para alto rendimiento
  const kpis = useMemo(() => {
    // 1. Mantenimiento
    const otPendientes = mantenimiento.filter((m) => m.estado !== 'Completada').length;
    const otCriticas = mantenimiento.filter((m) => m.prioridad === 'Crítica' && m.estado !== 'Completada').length;

    // 2. Materiales
    const bajoMinimo = materiales.filter((m) => Number(m.stock) <= Number(m.minimo)).length;
    const hoy = new Date();
    const proximosCaducar = materiales.filter((m) => {
      if (!m.caducidad) return false;
      const fechaCad = new Date(m.caducidad);
      const diffDias = (fechaCad - hoy) / (1000 * 60 * 60 * 24);
      return diffDias >= 0 && diffDias <= 30;
    }).length;

    // 3. Producción
    const totalMeta = produccion.reduce((acc, p) => acc + (Number(p.meta) || 0), 0);
    const totalProducido = produccion.reduce((acc, p) => acc + (Number(p.producido) || 0), 0);
    const eficienciaGlobal = totalMeta > 0 ? Math.round((totalProducido / totalMeta) * 100) : 0;

    // 4. Calidad
    const incidenciasAbiertas = calidad.filter((c) => c.estado !== 'Cerrada').length;
    const criticasCalidad = calidad.filter((c) => c.severidad === 'Crítica' && c.estado !== 'Cerrada').length;

    return {
      otPendientes,
      otCriticas,
      bajoMinimo,
      proximosCaducar,
      totalProducido,
      eficienciaGlobal,
      incidenciasAbiertas,
      criticasCalidad
    };
  }, [mantenimiento, materiales, produccion, calidad]);

  // Transformación de datos para gráfico de Producción (Top 6 Órdenes)
  const datosGraficoProduccion = useMemo(() => {
    return produccion.slice(0, 6).map((item) => ({
      nombre: item.orden || item.id.substring(0, 5),
      Meta: Number(item.meta) || 0,
      Producido: Number(item.producido) || 0,
      Scrap: Number(item.scrap) || 0,
    }));
  }, [produccion]);

  // Transformación de datos para gráfico de Mantenimiento (Por Estado)
  const datosGraficoMantenimiento = useMemo(() => {
    const conteo = mantenimiento.reduce((acc, ot) => {
      const estado = ot.estado || 'Pendiente';
      acc[estado] = (acc[estado] || 0) + 1;
      return acc;
    }, {});

    return Object.keys(conteo).map((estado) => ({
      name: estado,
      value: conteo[estado],
    }));
  }, [mantenimiento]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart2 className="w-7 h-7 text-blue-600" />
            Panel de Control General
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Resumen operativo y métricas clave en tiempo real
          </p>
        </div>
      </div>

      {/* Rejilla de Tarjetas KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI Mantenimiento */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Mantenimiento</span>
            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
              <Wrench className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {kpis.otPendientes} <span className="text-xs font-normal text-slate-500">OTs Activas</span>
            </div>
            {kpis.otCriticas > 0 && (
              <p className="text-xs font-semibold text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {kpis.otCriticas} OTs Críticas
              </p>
            )}
          </div>
        </div>

        {/* KPI Materiales */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Inventario</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {kpis.bajoMinimo} <span className="text-xs font-normal text-slate-500">Bajo Mínimo</span>
            </div>
            {kpis.proximosCaducar > 0 && (
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {kpis.proximosCaducar} por caducar (≤30d)
              </p>
            )}
          </div>
        </div>

        {/* KPI Producción */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Producción</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
              <Factory className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {kpis.totalProducido.toLocaleString()} <span className="text-xs font-normal text-slate-500">Unidades</span>
            </div>
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Eficiencia Global: {kpis.eficienciaGlobal}%
            </p>
          </div>
        </div>

        {/* KPI Calidad */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Calidad</span>
            <div className="p-2 bg-rose-50 dark:bg-rose-900/30 rounded-lg">
              <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {kpis.incidenciasAbiertas} <span className="text-xs font-normal text-slate-500">Incidencias</span>
            </div>
            {kpis.criticasCalidad > 0 && (
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {kpis.criticasCalidad} No Conformidades Críticas
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Sección de Gráficos Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Rendimiento de Producción */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
            Avance de Órdenes de Producción
          </h2>
          <div className="h-72 w-full">
            {datosGraficoProduccion.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosGraficoProduccion} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="nombre" stroke="#94A3B8" fontSize={12} />
                  <YAxis stroke="#94A3B8" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#F8FAFC'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Meta" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Producido" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Scrap" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400 text-sm">
                No hay registros de producción
              </div>
            )}
          </div>
        </div>

        {/* Gráfico 2: Distribución de Estado de Mantenimiento */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
            Estado de Órdenes de Mantenimiento
          </h2>
          <div className="h-72 w-full">
            {datosGraficoMantenimiento.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={datosGraficoMantenimiento}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {datosGraficoMantenimiento.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#F8FAFC'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400 text-sm">
                No hay órdenes de mantenimiento registradas
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
