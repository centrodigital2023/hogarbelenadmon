import { usePermissions } from "@/hooks/usePermissions";
import { Shield } from "lucide-react";

import type { Module } from "@/hooks/usePermissions";

interface ProtectedModuleProps {
  module: Module;
  action?: 'read' | 'create' | 'update' | 'delete';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const DefaultFallback = () => (
  <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-8 text-center">
    <Shield size={32} className="text-destructive mx-auto mb-3" />
    <p className="text-sm font-bold text-destructive">Acceso restringido</p>
    <p className="text-xs text-muted-foreground mt-1">No tiene permisos para acceder a este módulo.</p>
  </div>
);

const ProtectedModule = ({ module, action = 'read', children, fallback }: ProtectedModuleProps) => {
  const { can } = usePermissions();

  if (!can(module, action)) {
    return <>{fallback || <DefaultFallback />}</>;
  }

  return <>{children}</>;
};

export default ProtectedModule;
