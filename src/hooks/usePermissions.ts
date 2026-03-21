import { useAuth } from "./useAuth";

type Module = 'ingreso' | 'valoracion' | 'alimentacion' | 'bienestar' | 'salud' | 'sistema_salud' | 'higiene' | 'seguridad' | 'egreso' | 'personal' | 'calidad' | 'admin' | 'finanzas' | 'usuarios' | 'residentes' | 'blog' | 'redes' | 'gerencial';
type Action = 'read' | 'create' | 'update' | 'delete';

const ALL: Action[] = ['read', 'create', 'update', 'delete'];
const RO: Action[] = ['read'];
const CR: Action[] = ['read', 'create'];
const CRU: Action[] = ['read', 'create', 'update'];

const MATRIX: Record<string, Partial<Record<Module, Action[]>>> = {
  super_admin: {
    ingreso: ALL, valoracion: ALL, alimentacion: ALL, bienestar: ALL,
    salud: ALL, sistema_salud: ALL, higiene: ALL, seguridad: ALL,
    egreso: ALL, personal: ALL, calidad: ALL, admin: ALL,
    finanzas: ALL, usuarios: ALL, residentes: ALL, blog: ALL,
    redes: ALL, gerencial: ALL,
  },
  coordinador: {
    ingreso: ALL, valoracion: ALL, alimentacion: RO, bienestar: ALL,
    salud: ALL, sistema_salud: ALL, higiene: ALL, seguridad: ALL,
    egreso: ALL, personal: RO, calidad: ALL, admin: RO,
    residentes: ALL, gerencial: ALL,
  },
  enfermera: {
    valoracion: ALL, salud: ALL, bienestar: RO, seguridad: CR,
    sistema_salud: ALL, residentes: RO, higiene: RO,
  },
  cuidadora: {
    residentes: RO, salud: RO, bienestar: CR, seguridad: CR,
  },
  terapeuta: {
    valoracion: ALL, bienestar: ALL, residentes: RO,
  },
  psicologo: {
    valoracion: ALL, bienestar: ALL, residentes: RO,
  },
  administrativo: {
    finanzas: ALL, admin: ALL, blog: ALL, redes: ALL,
    alimentacion: CR, gerencial: ALL,
  },
  manipuladora: {
    alimentacion: ALL,
  },
};

// Module ID to permission module mapping
export const MODULE_PERMISSION_MAP: Record<string, Module> = {
  '1': 'ingreso', '2': 'valoracion', '3': 'alimentacion',
  '4': 'bienestar', '5': 'salud', '6': 'sistema_salud',
  '7': 'higiene', '8': 'seguridad', '9': 'egreso',
  '10': 'personal', '11': 'calidad', '12': 'admin',
  'finanzas': 'finanzas', 'usuarios': 'usuarios',
  'residentes': 'residentes', 'blog': 'blog',
  'redes': 'redes', 'gerencial': 'gerencial',
  'dashboard': 'ingreso', // dashboard always visible
};

export const usePermissions = () => {
  const { roles } = useAuth();

  const can = (module: Module, action: Action): boolean => {
    return roles.some(role => {
      const perms = MATRIX[role]?.[module];
      return perms?.includes(action) ?? false;
    });
  };

  const canAccess = (module: Module): boolean => can(module, 'read');
  const canEdit = (module: Module): boolean => can(module, 'create') || can(module, 'update');

  const canAccessModule = (moduleId: string): boolean => {
    if (moduleId === 'dashboard') return true;
    const mod = MODULE_PERMISSION_MAP[moduleId];
    if (!mod) return false;
    return canAccess(mod);
  };

  return { can, canAccess, canEdit, canAccessModule };
};
