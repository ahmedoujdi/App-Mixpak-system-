import React, { useState, useEffect } from 'react';
import { 
  Wrench, Package, Factory, ShieldAlert, 
  LayoutDashboard, UserCheck, Share2, Download, Search, LogOut 
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('summary');
  const [userRole, setUserRole] = useState('Supervisor'); // Roles: Mecánico, Calidad, Producción, Almacén, Supervisor, Admin
  const [isApproved, setIsApproved] = useState(true); // Estado de aprobación por Admin

  // Menú de navegación según el rol
  const navItems = [
    { id: 'summary', label: 'Resumen', icon: LayoutDashboard, roles: ['Mecánico', 'Calidad', 'Producción', 'Almacén', 'Supervisor', 'admin'] },
    { id: 'maintenance', label: 'Mantenimiento', icon: Wrench, roles: ['Mecánico', 'Supervisor', 'admin'] },
    { id: 'materials', label: 'Materiales', icon: Package, roles: ['Almacén', 'Supervisor', 'admin'] },
    { id: 'production', label: 'Producción', icon: Factory, roles: ['Producción', 'Supervisor', 'admin'] },
    { id: 'quality', label: 'Calidad', icon: ShieldAlert, roles: ['Calidad', 'Supervisor', 'admin'] },
    { id: 'approvals', label: 'Aprobaciones', icon: UserCheck, roles: ['admin'] },
  ];

  if (!isApproved) {
    return (
      <div class="min-h-screen flex items-center justify-center p-4 bg-slate-900 text-center">
        <div class="max-w-md bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl">
          <div class="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserCheck class="w-8 h-8" />
          </div>
          <h2 class="text-2xl font-bold text-white mb-2">Cuenta Pendiente de Aprobación</h2>
          <p class="text-slate-400 text-sm mb-6">
            Tu solicitud como <span class="text-amber-400 font-semibold">{userRole}</span> ha sido registrada. Un administrador validará tu acceso en breve.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div class="min-h-screen pb-20 md:pb-0 md:pl-64 bg-slate-900">
      {/* Sidebar Desktop */}
      <aside class="hidden md:flex flex-col fixed inset-y-0 left-0 w-64 bg-slate-950 border-r border-slate-800 p-4">
        <div class="flex items-center gap-3 px-2 py-4 border-b border-slate-800 mb-6">
          <div class="w-10 h-10 bg-mixpak-500 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-mixpak-500/30">
            M
          </div>
          <div>
            <h1 class="font-bold text-lg text-white leading-tight">Mixpak System</h1>
            <span class="text-xs text-slate-500 font-mono">v1.0.0</span>
          </div>
        </div>

        <nav class="space-y-1 flex-1">
          {navItems.filter(item => item.roles.includes(userRole)).map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                class={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-mixpak-500 text-white shadow-lg shadow-mixpak-500/20' 
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <Icon class="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div class="pt-4 border-t border-slate-800">
          <div class="flex items-center justify-between text-xs text-slate-400 px-2 mb-3">
            <span>Rol: <strong class="text-white">{userRole}</strong></span>
          </div>
          <button class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-red-500/10 hover:text-red-400 text-slate-400 rounded-xl text-sm transition">
            <LogOut class="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Header Mobile */}
      <header class="md:hidden flex items-center justify-between p-4 bg-slate-950 border-b border-slate-800 sticky top-0 z-50">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-mixpak-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            M
          </div>
          <span class="font-bold text-white">Mixpak System</span>
        </div>
        <span class="text-xs bg-slate-800 text-mixpak-500 px-2.5 py-1 rounded-full font-mono border border-slate-700">
          {userRole}
        </span>
      </header>

      {/* Main Content Area */}
      <main class="p-4 md:p-8 max-w-7xl mx-auto">
        {activeTab === 'summary' && <SummaryView onNavigate={setActiveTab} />}
        {activeTab === 'maintenance' && <ModulePlaceholder title="Mantenimiento Industrial" icon={Wrench} />}
        {activeTab === 'materials' && <ModulePlaceholder title="Gestión de Materiales y Lotes" icon={Package} />}
        {activeTab === 'production' && <ModulePlaceholder title="Órdenes de Producción" icon={Factory} />}
        {activeTab === 'quality' && <ModulePlaceholder title="Control de Calidad e Incidencias" icon={ShieldAlert} />}
      </main>

      {/* Bottom Navigation Mobile */}
      <nav class="md:hidden fixed bottom-0 inset-x-0 bg-slate-950 border-t border-slate-800 flex justify-around p-2 z-50">
        {navItems.filter(item => item.roles.includes(userRole)).slice(0, 5).map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              class={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs ${
                isActive ? 'text-mixpak-500 font-semibold' : 'text-slate-500'
              }`}
            >
              <Icon class="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// Vista Resumen Ejecutiva
function SummaryView({ onNavigate }) {
  return (
    <div class="space-y-6">
      <div>
        <h2 class="text-2xl font-bold text-white">Panel General</h2>
        <p class="text-slate-400 text-sm">Vista unificada del estado operativo de planta.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card Mantenimiento */}
        <div onClick={() => onNavigate('maintenance')} class="bg-slate-800/60 border border-slate-700 hover:border-mixpak-500 p-5 rounded-2xl cursor-pointer transition group">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-semibold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">3 Pendientes</span>
            <Wrench class="w-5 h-5 text-slate-400 group-hover:text-mixpak-500 transition" />
          </div>
          <h3 class="text-lg font-bold text-white mb-1">Mantenimiento</h3>
          <p class="text-xs text-slate-400">1 Tarea crítica reportada en Línea 2.</p>
        </div>

        {/* Card Materiales */}
        <div onClick={() => onNavigate('materials')} class="bg-slate-800/60 border border-slate-700 hover:border-mixpak-500 p-5 rounded-2xl cursor-pointer transition group">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-semibold text-rose-400 bg-rose-400/10 px-2.5 py-1 rounded-full border border-rose-400/20">Stock Bajo</span>
            <Package class="w-5 h-5 text-slate-400 group-hover:text-mixpak-500 transition" />
          </div>
          <h3 class="text-lg font-bold text-white mb-1">Materiales</h3>
          <p class="text-xs text-slate-400">2 Insumos bajo el límite mínimo.</p>
        </div>

        {/* Card Producción */}
        <div onClick={() => onNavigate('production')} class="bg-slate-800/60 border border-slate-700 hover:border-mixpak-500 p-5 rounded-2xl cursor-pointer transition group">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20">88% OEE</span>
            <Factory class="w-5 h-5 text-slate-400 group-hover:text-mixpak-500 transition" />
          </div>
          <h3 class="text-lg font-bold text-white mb-1">Producción</h3>
          <p class="text-xs text-slate-400">4 Órdenes activas en Turno 1.</p>
        </div>

        {/* Card Calidad */}
        <div onClick={() => onNavigate('quality')} class="bg-slate-800/60 border border-slate-700 hover:border-mixpak-500 p-5 rounded-2xl cursor-pointer transition group">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-semibold text-sky-400 bg-sky-400/10 px-2.5 py-1 rounded-full border border-sky-400/20">OK</span>
            <ShieldAlert class="w-5 h-5 text-slate-400 group-hover:text-mixpak-500 transition" />
          </div>
          <h3 class="text-lg font-bold text-white mb-1">Calidad</h3>
          <p class="text-xs text-slate-400">0 Incidencias graves registradas hoy.</p>
        </div>
      </div>
    </div>
  );
}

function ModulePlaceholder({ title, icon: Icon }) {
  return (
    <div class="bg-slate-800/40 border border-slate-800 p-8 rounded-2xl text-center space-y-4">
      <div class="w-12 h-12 bg-slate-700/50 text-mixpak-500 rounded-xl flex items-center justify-center mx-auto">
        <Icon class="w-6 h-6" />
      </div>
      <h2 class="text-xl font-bold text-white">{title}</h2>
      <div class="flex items-center justify-center gap-2 max-w-md mx-auto">
        <div class="relative w-full">
          <Search class="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input 
            type="text" 
            placeholder="Buscar por lote, cliente, máquina..." 
            class="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-mixpak-500"
          />
        </div>
        <button class="p-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl transition" title="Exportar CSV">
          <Download class="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
