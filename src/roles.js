/**
 * Definición centralizada de roles del sistema y sus accesos.
 */
export const ROLES = [
  {
    value: "mecanico",
    label: "Mecánico / Mantenimiento",
    tabs: ["resumen", "mantenimiento"],
  },
  {
    value: "calidad",
    label: "Calidad",
    tabs: ["resumen", "calidad"],
  },
  {
    value: "produccion",
    label: "Producción",
    tabs: ["resumen", "produccion"],
  },
  {
    value: "almacen",
    label: "Almacén / Materiales",
    tabs: ["resumen", "materiales"],
  },
  {
    value: "supervisor",
    label: "Supervisor (acceso a todo)",
    tabs: ["resumen", "mantenimiento", "materiales", "produccion", "calidad"],
  },
  {
    value: "admin",
    label: "Administrador (aprueba usuarios, ve todo)",
    tabs: [
      "resumen",
      "mantenimiento",
      "materiales",
      "produccion",
      "calidad",
      "aprobaciones",
    ],
  },
];

// Mapa O(1) indexado por valor para búsquedas instantáneas
const ROLES_MAP = new Map(ROLES.map((role) => [role.value, role]));

/**
 * Devuelve la etiqueta descriptiva de un rol dado.
 * @param {string} value - El identificador del rol (ej: "mecanico").
 * @returns {string} Etiqueta legible del rol o un valor por defecto si no existe.
 */
export function roleLabel(value) {
  if (!value) return "Sin categoría";
  return ROLES_MAP.get(value)?.label || value;
}

/**
 * Devuelve las pestañas permitidas para un rol específico.
 * @param {string} value - El identificador del rol.
 * @returns {string[]} Lista de identificadores de pestañas autorizadas.
 */
export function tabsForRole(value) {
  if (!value) return ["resumen"];
  return ROLES_MAP.get(value)?.tabs || ["resumen"];
}

/**
 * Comprueba si un rol dado corresponde a un usuario administrador.
 * @param {string} value - El identificador del rol.
 * @returns {boolean}
 */
export function isAdminRole(value) {
  return value === "admin";
}

/**
 * Valida si un identificador de rol existe en la configuración.
 * @param {string} value - El identificador del rol.
 * @returns {boolean}
 */
export function isValidRole(value) {
  return ROLES_MAP.has(value);
}
