import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import { UserPlus, Trash2, Shield, Edit, Key, Search, X, Plus } from "lucide-react";

type AppRole = 'super_admin' | 'coordinador' | 'enfermera' | 'cuidadora' | 'terapeuta' | 'psicologo' | 'administrativo' | 'manipuladora';

const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: 'Super Admin',
  coordinador: 'Coordinador/a',
  enfermera: 'Enfermera',
  cuidadora: 'Cuidadora',
  terapeuta: 'Terapeuta',
  psicologo: 'Psicólogo/a',
  administrativo: 'Administrativo/a',
  manipuladora: 'Manipuladora Alimentos',
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-destructive/10 text-destructive',
  coordinador: 'bg-primary/10 text-primary',
  enfermera: 'bg-accent text-accent-foreground',
  cuidadora: 'bg-muted text-muted-foreground',
  terapeuta: 'bg-primary/20 text-primary',
  psicologo: 'bg-secondary text-secondary-foreground',
  administrativo: 'bg-primary/5 text-primary',
  manipuladora: 'bg-muted text-muted-foreground',
};

interface UserWithRole {
  user_id: string;
  email: string;
  full_name: string;
  phone: string;
  roles: AppRole[];
  created_at: string;
}

const UserManagement = ({ onBack }: { onBack: () => void }) => {
  const { hasRole, session } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<AppRole>('cuidadora');
  const [creating, setCreating] = useState(false);

  // Edit states
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  // Password reset
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  // Add role
  const [addRoleUserId, setAddRoleUserId] = useState<string | null>(null);
  const [addRoleValue, setAddRoleValue] = useState<AppRole>('cuidadora');

  const isSuperAdmin = hasRole('super_admin');

  const callAdmin = useCallback(async (body: any) => {
    const { data, error } = await supabase.functions.invoke('admin-users', { body });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    if (!data?.success && body.action !== 'list' && !data?.users) throw new Error('Operación administrativa no completada');
    return data;
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await callAdmin({ action: 'list' });
      if (data?.users) setUsers(data.users);
    } catch (e: any) {
      // Fallback to direct query
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, phone');
      const { data: allRoles } = await supabase.from('user_roles').select('user_id, role');
      if (profiles && allRoles) {
        const userMap: Record<string, UserWithRole> = {};
        profiles.forEach(p => {
          userMap[p.user_id] = { user_id: p.user_id, email: '', full_name: p.full_name, phone: p.phone || '', roles: [], created_at: '' };
        });
        allRoles.forEach(r => {
          if (userMap[r.user_id]) userMap[r.user_id].roles.push(r.role as AppRole);
        });
        setUsers(Object.values(userMap));
      }
    }
    setLoading(false);
  }, [callAdmin]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    setCreating(true);
    try {
      await callAdmin({ action: 'create', email: newEmail.trim(), password: newPassword, full_name: newName.trim(), role: newRole });
      toast({ title: "✅ Usuario creado", description: `${newName} registrado como ${ROLE_LABELS[newRole]}` });
      setNewEmail(""); setNewName(""); setNewPhone(""); setNewPassword(""); setShowCreate(false);
      fetchUsers();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setCreating(false);
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`¿Está seguro de eliminar al usuario "${name}"? Esta acción es irreversible.`)) return;
    try {
      await callAdmin({ action: 'delete', user_id: userId });
      toast({ title: "Usuario eliminado" });
      fetchUsers();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleUpdateProfile = async (userId: string) => {
    try {
      await callAdmin({ action: 'update_profile', user_id: userId, full_name: editName.trim(), phone: editPhone.trim() });
      toast({ title: "Perfil actualizado" });
      setEditingUser(null);
      fetchUsers();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleResetPassword = async () => {
    if (!resetUserId || resetPassword.length < 6) {
      toast({ title: "Error", description: "Mínimo 6 caracteres", variant: "destructive" });
      return;
    }
    try {
      await callAdmin({ action: 'reset_password', user_id: resetUserId, new_password: resetPassword });
      toast({ title: "Contraseña actualizada" });
      setResetUserId(null); setResetPassword("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleRemoveRole = async (userId: string, role: AppRole) => {
    if (!confirm(`¿Eliminar rol "${ROLE_LABELS[role]}"?`)) return;
    try {
      await callAdmin({ action: 'remove_role', user_id: userId, role });
      toast({ title: "Rol eliminado" });
      fetchUsers();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleAddRole = async () => {
    if (!addRoleUserId) return;
    try {
      await callAdmin({ action: 'add_role', user_id: addRoleUserId, role: addRoleValue });
      toast({ title: "Rol asignado" });
      setAddRoleUserId(null);
      fetchUsers();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="animate-fade-in">
        <FormHeader title="Gestión de Usuarios" subtitle="Sin permisos" onBack={onBack} />
        <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-8 text-center">
          <Shield size={40} className="text-destructive mx-auto mb-3" />
          <p className="text-sm font-bold text-destructive">Acceso restringido</p>
          <p className="text-xs text-muted-foreground mt-1">Solo el Super Administrador puede gestionar usuarios.</p>
        </div>
      </div>
    );
  }

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <FormHeader title="Gestión de Usuarios" subtitle="Crear, editar, eliminar y asignar roles" onBack={onBack} />

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Buscar por nombre o correo..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-background text-sm" />
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 min-h-[48px]">
          <UserPlus size={16} />
          Nuevo Usuario
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-foreground">{users.length}</p>
          <p className="text-[10px] text-muted-foreground font-bold uppercase">Total usuarios</p>
        </div>
        {(['coordinador', 'enfermera', 'cuidadora'] as AppRole[]).map(r => (
          <div key={r} className="bg-card border border-border rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-foreground">{users.filter(u => u.roles.includes(r)).length}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase">{ROLE_LABELS[r]}s</p>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreateUser} className="bg-card border-2 border-primary/20 rounded-2xl p-6 mb-6 space-y-4 max-w-2xl">
          <h3 className="text-sm font-black text-foreground flex items-center gap-2">
            <UserPlus size={16} className="text-primary" /> Crear nuevo usuario
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Nombre completo *</label>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" required maxLength={100} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Correo electrónico *</label>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" required maxLength={255} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Contraseña *</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" required minLength={6} maxLength={72} />
              <p className="text-[9px] text-muted-foreground mt-1">Mínimo 6 caracteres</p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Rol *</label>
              <select value={newRole} onChange={e => setNewRole(e.target.value as AppRole)}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
                {Object.entries(ROLE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={creating}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-xl text-xs font-black uppercase hover:opacity-90 disabled:opacity-50 min-h-[48px]">
              {creating ? "Creando..." : "Crear Usuario"}
            </button>
            <button type="button" onClick={() => setShowCreate(false)}
              className="bg-muted text-muted-foreground px-6 py-3 rounded-xl text-xs font-bold uppercase min-h-[48px]">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Users list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(u => (
            <div key={u.user_id} className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {editingUser === u.user_id ? (
                    <div className="space-y-2">
                      <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm font-bold" />
                      <input type="text" value={editPhone} onChange={e => setEditPhone(e.target.value)}
                        placeholder="Teléfono" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                      <div className="flex gap-2">
                        <button onClick={() => handleUpdateProfile(u.user_id)}
                          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-[10px] font-bold uppercase">Guardar</button>
                        <button onClick={() => setEditingUser(null)}
                          className="bg-muted text-muted-foreground px-4 py-2 rounded-lg text-[10px] font-bold uppercase">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-black text-foreground">{u.full_name}</p>
                      <p className="text-[10px] text-muted-foreground">{u.email}</p>
                      {u.phone && <p className="text-[10px] text-muted-foreground">📞 {u.phone}</p>}
                    </>
                  )}

                  {/* Roles */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {u.roles.map(r => (
                      <span key={r} className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${ROLE_COLORS[r] || 'bg-muted text-muted-foreground'}`}>
                        <Shield size={9} />
                        {ROLE_LABELS[r] || r}
                        <button onClick={() => handleRemoveRole(u.user_id, r)}
                          className="ml-0.5 hover:text-destructive" title="Quitar rol">
                          <X size={9} />
                        </button>
                      </span>
                    ))}
                    {u.roles.length === 0 && <span className="text-[10px] text-muted-foreground italic">Sin rol</span>}
                    <button onClick={() => { setAddRoleUserId(u.user_id); setAddRoleValue('cuidadora'); }}
                      className="inline-flex items-center gap-0.5 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md hover:bg-primary/20"
                      title="Agregar rol">
                      <Plus size={9} /> Rol
                    </button>
                  </div>

                  {/* Add role inline form */}
                  {addRoleUserId === u.user_id && (
                    <div className="flex items-center gap-2 mt-2">
                      <select value={addRoleValue} onChange={e => setAddRoleValue(e.target.value as AppRole)}
                        className="px-3 py-1.5 rounded-lg border border-input bg-background text-xs">
                        {Object.entries(ROLE_LABELS).filter(([k]) => !u.roles.includes(k as AppRole)).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                      <button onClick={handleAddRole} className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-[10px] font-bold">Asignar</button>
                      <button onClick={() => setAddRoleUserId(null)} className="text-muted-foreground text-xs">Cancelar</button>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {editingUser !== u.user_id && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => { setEditingUser(u.user_id); setEditName(u.full_name); setEditPhone(u.phone || ''); }}
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground" title="Editar">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => { setResetUserId(u.user_id); setResetPassword(''); }}
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground" title="Cambiar contraseña">
                      <Key size={14} />
                    </button>
                    <button onClick={() => handleDeleteUser(u.user_id, u.full_name)}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive" title="Eliminar">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Password reset inline */}
              {resetUserId === u.user_id && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                  <Key size={14} className="text-muted-foreground shrink-0" />
                  <input type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)}
                    placeholder="Nueva contraseña (mín. 6 caracteres)"
                    className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" minLength={6} />
                  <button onClick={handleResetPassword}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-[10px] font-bold uppercase">Cambiar</button>
                  <button onClick={() => setResetUserId(null)} className="text-muted-foreground text-xs">Cancelar</button>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-muted-foreground text-center py-8">No se encontraron usuarios.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default UserManagement;
