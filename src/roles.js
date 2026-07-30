// src/roles.js

export function roleLabel(role) {
  switch (role) {
    case "admin":
      return "Administrador";
    case "mantenimiento":
      return "Técnico Mantenimiento";
    case "calidad":
      return "Inspector Calidad";
    default:
      return "Operario";
  }
}

export function getRole(role) {
  return role || "operario";
}

export function canAccess(role, requiredRole) {
  if (role === "admin") return true;
  return role === requiredRole;
}
