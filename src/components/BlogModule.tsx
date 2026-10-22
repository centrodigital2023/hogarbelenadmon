import { useState, useEffect } from "react";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import { FileText, Plus, Trash2, Eye, Edit2 } from "lucide-react";
import type { Row } from "@/integrations/supabase/tables";

interface Props { onBack: () => void; }

const BlogModule = ({ onBack }: Props) => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Row<"blog_posts">[]>([]);
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editPost, setEditPost] = useState<Row<"blog_posts"> | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState("general");
  const [status, setStatus] = useState("borrador");
  const [saving, setSaving] = useState(false);

  const fetchPosts = async () => {
    const { data } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false });
    if (data) setPosts(data);
  };

  useEffect(() => { fetchPosts(); }, []);

  const handleNew = () => {
    setEditPost(null); setTitle(""); setContent(""); setExcerpt(""); setCategory("general"); setStatus("borrador");
    setView('edit');
  };

  const handleEdit = (post: Row<"blog_posts">) => {
    setEditPost(post); setTitle(post.title); setContent(post.content); setExcerpt(post.excerpt || '');
    setCategory(post.category || 'general'); setStatus(post.status || 'borrador');
    setView('edit');
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const payload: TablesUpdate<"blog_posts"> & { title: string } = { title, content, excerpt, category, status, updated_at: new Date().toISOString() };
    if (status === 'publicado' && !editPost?.published_at) payload.published_at = new Date().toISOString();

    const { error: dbError } = editPost
      ? await supabase.from('blog_posts').update(payload).eq('id', editPost.id)
      : await supabase.from('blog_posts').insert({ ...payload, created_by: user.id });
    if (dbError) { toast({ title: "No se pudo guardar", description: dbError.message, variant: "destructive" }); setSaving(false); return; }
    toast({ title: editPost ? "Entrada actualizada" : "Entrada creada" });
    setSaving(false);
    setView('list');
    fetchPosts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta entrada?')) return;
    const { error: dbError } = await supabase.from('blog_posts').delete().eq('id', id);
    if (dbError) { toast({ title: "No se pudo eliminar", description: dbError.message, variant: "destructive" }); return; }
    toast({ title: "Entrada eliminada" });
    fetchPosts();
  };

  const CATEGORIES = ['general', 'noticias', 'eventos', 'salud', 'actividades', 'comunicados'];

  if (view === 'edit') return (
    <div className="animate-fade-in space-y-6">
      <FormHeader title={editPost ? "Editar Entrada" : "Nueva Entrada de Blog"} subtitle="Contenido institucional" onBack={() => setView('list')} />
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div><label className="text-xs font-bold text-muted-foreground uppercase">Título</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm font-bold" placeholder="Título de la entrada" /></div>
        <div><label className="text-xs font-bold text-muted-foreground uppercase">Extracto</label>
          <input value={excerpt} onChange={e => setExcerpt(e.target.value)} className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" placeholder="Breve descripción" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-xs font-bold text-muted-foreground uppercase">Categoría</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm">
              {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select></div>
          <div><label className="text-xs font-bold text-muted-foreground uppercase">Estado</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm">
              <option value="borrador">Borrador</option><option value="publicado">Publicado</option>
            </select></div>
        </div>
        <div><label className="text-xs font-bold text-muted-foreground uppercase">Contenido</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} rows={12}
            className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none font-mono" placeholder="Escribe el contenido aquí..." /></div>
        <button onClick={handleSave} disabled={saving || !title}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-40 transition-opacity">
          {saving ? 'Guardando...' : editPost ? 'Actualizar' : 'Publicar'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in space-y-6">
      <FormHeader title="📝 Blog Institucional" subtitle="Noticias, eventos y comunicaciones" onBack={onBack} />
      
      {isAdmin && (
        <button onClick={handleNew} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity">
          <Plus size={14} /> Nueva Entrada
        </button>
      )}

      <div className="grid gap-4">
        {posts.map(post => (
          <div key={post.id} className="bg-card border border-border rounded-2xl p-5 flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${post.status === 'publicado' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {post.status}
                </span>
                <span className="text-[10px] text-muted-foreground capitalize">{post.category}</span>
              </div>
              <h3 className="text-sm font-black text-foreground">{post.title}</h3>
              {post.excerpt && <p className="text-xs text-muted-foreground mt-1">{post.excerpt}</p>}
              <p className="text-[10px] text-muted-foreground mt-2">{new Date(post.created_at).toLocaleDateString()}</p>
            </div>
            {isAdmin && (
              <div className="flex gap-2 ml-4">
                <button onClick={() => handleEdit(post)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground"><Edit2 size={14} /></button>
                <button onClick={() => handleDelete(post.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 size={14} /></button>
              </div>
            )}
          </div>
        ))}
        {posts.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No hay entradas aún</p>}
      </div>
    </div>
  );
};

export default BlogModule;
