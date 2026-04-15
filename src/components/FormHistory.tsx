import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import ExportButtons from "@/components/ExportButtons";
import { History, Loader2, Pencil, Trash2, Save, X, ChevronDown, ChevronUp } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";

export interface HistoryColumn {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface FormHistoryProps {
  tableName: string;
  columns: HistoryColumn[];
  title: string;
  fileName: string;
  /** Number of days to look back (default 180) */
  days?: number;
  /** Column name for the date field (default 'created_at') */
  dateColumn?: string;
  /** Select clause for the query */
  selectClause?: string;
  /** Additional filters as [column, operator, value] */
  filters?: [string, string, any][];
  /** Transform row for export table data */
  exportTransform?: (row: any) => Record<string, any>;
  /** Transform row for text content */
  textTransform?: (row: any) => string;
  /** Editable fields config for inline editing */
  editableFields?: { key: string; label: string; type: 'text' | 'number' | 'select'; options?: string[] }[];
}

const FormHistory = ({
  tableName, columns, title, fileName, days = 180, dateColumn = 'created_at',
  selectClause = '*', filters = [], exportTransform, textTransform, editableFields,
}: FormHistoryProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const historyRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  const canEdit = userRole === 'super_admin' || userRole === 'coordinador';

  const loadData = useCallback(async () => {
    setLoading(true);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    // Check user role
    if (user) {
      const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
      if (roles && roles.length > 0) {
        const r = roles.map(x => x.role);
        if (r.includes('super_admin')) setUserRole('super_admin');
        else if (r.includes('coordinador')) setUserRole('coordinador');
        else setUserRole(r[0]);
      }
    }

    let query = supabase.from(tableName as any).select(selectClause)
      .gte(dateColumn, cutoff.toISOString().split('T')[0])
      .order(dateColumn, { ascending: false })
      .limit(1000);

    filters.forEach(([col, op, val]) => {
      query = (query as any).filter(col, op, val);
    });

    const { data: result, error } = await query;
    if (error) {
      toast({ title: "Error cargando historial", description: error.message, variant: "destructive" });
    } else {
      setData(result || []);
    }
    setLoading(false);
    setOpen(true);
  }, [tableName, selectClause, dateColumn, days, filters, user, toast]);

  const handleEdit = (row: any) => {
    setEditingId(row.id);
    const ed: Record<string, any> = {};
    editableFields?.forEach(f => { ed[f.key] = row[f.key] ?? ''; });
    setEditData(ed);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase.from(tableName as any).update(editData as any).eq('id', editingId);
    if (error) {
      toast({ title: "Error al editar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Registro actualizado" });
      setData(prev => prev.map(r => r.id === editingId ? { ...r, ...editData } : r));
      setEditingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await supabase.from(tableName as any).delete().eq('id', deleteId);
    if (error) {
      toast({ title: "Error al eliminar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Registro eliminado" });
      setData(prev => prev.filter(r => r.id !== deleteId));
    }
    setDeleting(false);
    setDeleteId(null);
  };

  const getTextContent = () => {
    if (textTransform) return data.map(textTransform).join('\n');
    return data.map(row =>
      columns.map(c => `${c.label}: ${row[c.key] ?? '-'}`).join(' | ')
    ).join('\n');
  };

  const getTableData = () => {
    if (exportTransform) return data.map(exportTransform);
    return data.map(row => {
      const obj: Record<string, any> = {};
      columns.forEach(c => { obj[c.label] = row[c.key] ?? ''; });
      return obj;
    });
  };

  if (!open) {
    return (
      <button onClick={loadData} disabled={loading}
        className="flex items-center gap-2 bg-muted text-muted-foreground px-4 py-3 rounded-xl text-xs font-bold hover:bg-accent min-h-[48px]">
        {loading ? <Loader2 size={14} className="animate-spin" /> : <History size={14} />}
        Historial ({days} días)
      </button>
    );
  }

  return (
    <>
      <div className="bg-muted rounded-2xl p-6 mt-6" ref={historyRef}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-foreground flex items-center gap-2">
            <History size={16} />
            {title} — {data.length} registros (últimos {days} días)
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={() => setExpanded(!expanded)} className="text-xs text-muted-foreground hover:text-foreground">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground hover:text-foreground">Cerrar</button>
          </div>
        </div>

        {expanded && (
          <>
            {data.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin registros en este período.</p>
            ) : (
              <div className="overflow-x-auto max-h-96 overflow-y-auto mb-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border sticky top-0 bg-muted">
                      {columns.map(c => (
                        <th key={c.key} className="text-left p-2 font-bold text-muted-foreground whitespace-nowrap">{c.label}</th>
                      ))}
                      {canEdit && <th className="text-center p-2 font-bold text-muted-foreground">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map(row => (
                      <tr key={row.id} className="border-b border-border/50 hover:bg-background/50">
                        {columns.map(c => (
                          <td key={c.key} className="p-2">
                            {editingId === row.id && editableFields?.find(f => f.key === c.key) ? (
                              (() => {
                                const field = editableFields!.find(f => f.key === c.key)!;
                                if (field.type === 'select') {
                                  return (
                                    <select value={editData[c.key] || ''} onChange={e => setEditData(prev => ({ ...prev, [c.key]: e.target.value }))}
                                      className="px-1 py-1 rounded border border-input bg-background text-xs w-full">
                                      <option value="">--</option>
                                      {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                  );
                                }
                                return (
                                  <input type={field.type} value={editData[c.key] || ''}
                                    onChange={e => setEditData(prev => ({ ...prev, [c.key]: field.type === 'number' ? Number(e.target.value) : e.target.value }))}
                                    className="px-1 py-1 rounded border border-input bg-background text-xs w-full" />
                                );
                              })()
                            ) : (
                              c.render ? c.render(row[c.key], row) : (row[c.key] ?? '-')
                            )}
                          </td>
                        ))}
                        {canEdit && (
                          <td className="p-2 text-center whitespace-nowrap">
                            {editingId === row.id ? (
                              <div className="flex items-center gap-1 justify-center">
                                <button onClick={handleSaveEdit} className="text-primary hover:text-primary/80"><Save size={14} /></button>
                                <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 justify-center">
                                {editableFields && (
                                  <button onClick={() => handleEdit(row)} className="text-primary hover:text-primary/80"><Pencil size={14} /></button>
                                )}
                                <button onClick={() => setDeleteId(row.id)} className="text-destructive hover:text-destructive/80"><Trash2 size={14} /></button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <ExportButtons contentRef={historyRef} title={`${title} (${days}d)`}
                fileName={`${fileName}_${days}d`} textContent={getTextContent()}
                data={getTableData()} signatureDataUrl={null} showDrive={false} />
            </div>
          </>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar registro?</DialogTitle>
            <DialogDescription>Esta acción no se puede deshacer. El registro será eliminado permanentemente.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <button className="px-4 py-2 rounded-xl text-xs font-bold bg-muted text-muted-foreground">Cancelar</button>
            </DialogClose>
            <button onClick={handleDelete} disabled={deleting}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-destructive text-destructive-foreground disabled:opacity-50">
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FormHistory;
