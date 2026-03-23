import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import { BookOpen, Plus, Play, CheckCircle2, Trophy, Loader2, ChevronRight } from "lucide-react";

interface Props { onBack: () => void; }

interface CourseListItem { id: string; title: string; description: string | null; content: string | null; video_url: string | null; quiz_count: number; is_published: boolean; created_at: string; }
interface QuizQuestion { question: string; options: string[]; }
interface ExamResult { id: string; course_id: string; score: number; total_questions: number; passed: boolean; created_at: string; }

const TrainingModule = ({ onBack }: Props) => {
  const { user, isAdmin, roles } = useAuth();
  const { toast } = useToast();
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [view, setView] = useState<'list' | 'create' | 'detail' | 'exam'>('list');
  const [selectedCourse, setSelectedCourse] = useState<CourseListItem | null>(null);
  const [examQuiz, setExamQuiz] = useState<QuizQuestion[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newVideo, setNewVideo] = useState("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [examAnswers, setExamAnswers] = useState<Record<number, number>>({});
  const [examResult, setExamResult] = useState<{ score: number; total: number; passed: boolean } | null>(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);

  const canManage = isAdmin || roles.includes('coordinador' as any);

  const loadData = async () => {
    // Use view that strips quiz answers
    const { data: c } = await supabase.from('training_courses_public' as any).select('*').order('created_at', { ascending: false });
    if (c) setCourses(c as unknown as CourseListItem[]);
    if (user) {
      const { data: r } = await supabase.from('exam_results').select('*').eq('user_id', user.id);
      if (r) setResults(r as ExamResult[]);
    }
  };

  useEffect(() => { loadData(); }, [user]);

  const handleCreate = async () => {
    if (!user || !newTitle.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from('training_courses').insert({
      title: newTitle, description: newDesc, content: newContent, video_url: newVideo || null,
      created_by: user.id, is_published: false,
    }).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else {
      toast({ title: "Curso creado" });
      setNewTitle(""); setNewDesc(""); setNewContent(""); setNewVideo("");
      if (data) { await generateQuiz(data.id, newContent); }
      setView('list');
      loadData();
    }
    setSaving(false);
  };

  const generateQuiz = async (courseId: string, content: string) => {
    if (!content.trim()) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-quiz-generator', {
        body: { content, courseId },
      });
      if (!error && data?.quiz) {
        await supabase.from('training_courses').update({ quiz: data.quiz, is_published: true }).eq('id', courseId);
        toast({ title: "Quiz generado con IA", description: `${data.quiz.length} preguntas creadas` });
        loadData();
      }
    } catch (e) { console.error(e); }
    setGenerating(false);
  };

  const startExam = async (course: CourseListItem) => {
    setLoadingQuiz(true);
    setSelectedCourse(course);
    setExamAnswers({});
    setExamResult(null);
    // Fetch quiz questions without correct answers via RPC
    const { data, error } = await supabase.rpc('get_safe_quiz', { p_course_id: course.id });
    if (error || !data) {
      toast({ title: "Error", description: "No se pudo cargar el examen", variant: "destructive" });
      setLoadingQuiz(false);
      return;
    }
    setExamQuiz(data as unknown as QuizQuestion[]);
    setView('exam');
    setLoadingQuiz(false);
  };

  const submitExam = async () => {
    if (!selectedCourse || !user) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('score-exam', {
        body: { courseId: selectedCourse.id, answers: examAnswers },
      });
      if (error || !data) {
        toast({ title: "Error", description: "No se pudo enviar el examen", variant: "destructive" });
      } else {
        setExamResult({ score: data.score, total: data.total, passed: data.passed });
        loadData();
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Error al enviar examen", variant: "destructive" });
    }
    setSaving(false);
  };

  const getResultForCourse = (courseId: string) => results.find(r => r.course_id === courseId);

  if (view === 'create') {
    return (
      <div className="animate-fade-in">
        <FormHeader title="Crear Capacitación" subtitle="El contenido se enviará a IA para generar el examen" onBack={() => setView('list')} />
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4 max-w-2xl">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Título</label>
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" placeholder="Ej: Protocolo de caídas" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Descripción</label>
            <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Contenido educativo</label>
            <textarea value={newContent} onChange={e => setNewContent(e.target.value)} rows={10} className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none" placeholder="Pegue aquí el contenido del módulo..." />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">URL Video (opcional)</label>
            <input value={newVideo} onChange={e => setNewVideo(e.target.value)} className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" placeholder="https://youtube.com/..." />
          </div>
          <button onClick={handleCreate} disabled={saving || !newTitle.trim() || !newContent.trim()}
            className="bg-primary text-primary-foreground px-8 py-3 rounded-xl text-xs font-bold disabled:opacity-40 min-h-[48px]">
            {saving ? 'Guardando...' : 'Crear y generar examen con IA'}
          </button>
        </div>
      </div>
    );
  }

  if (view === 'exam' && selectedCourse) {
    if (examResult) {
      const pct = Math.round((examResult.score / examResult.total) * 100);
      return (
        <div className="animate-fade-in">
          <FormHeader title="Resultado" subtitle={selectedCourse.title} onBack={() => { setView('list'); setExamResult(null); setExamAnswers({}); }} />
          <div className="bg-card border border-border rounded-2xl p-8 text-center max-w-md mx-auto">
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${examResult.passed ? 'bg-cat-nutritional/20 text-cat-nutritional' : 'bg-destructive/20 text-destructive'}`}>
              <Trophy size={36} />
            </div>
            <p className="text-4xl font-black">{pct}%</p>
            <p className="text-sm text-muted-foreground mt-1">{examResult.score}/{examResult.total} correctas</p>
            <p className={`text-sm font-bold mt-3 ${examResult.passed ? 'text-cat-nutritional' : 'text-destructive'}`}>
              {examResult.passed ? '¡APROBADO! 🎉' : 'No aprobado. Intente de nuevo.'}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="animate-fade-in">
        <FormHeader title="Examen" subtitle={selectedCourse.title} onBack={() => { setView('list'); setExamAnswers({}); }} />
        <div className="space-y-6 max-w-2xl">
          {examQuiz.map((q, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-6">
              <p className="text-sm font-bold mb-3">{i + 1}. {q.question}</p>
              <div className="space-y-2">
                {q.options?.map((opt: string, j: number) => (
                  <label key={j} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all ${examAnswers[i] === j ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    <input type="radio" name={`q${i}`} checked={examAnswers[i] === j} onChange={() => setExamAnswers(prev => ({ ...prev, [i]: j }))}
                      className="w-4 h-4 accent-primary" />
                    <span className="text-sm">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <button onClick={submitExam} disabled={saving || Object.keys(examAnswers).length < examQuiz.length}
            className="bg-primary text-primary-foreground px-8 py-3 rounded-xl text-xs font-bold disabled:opacity-40 min-h-[48px]">
            {saving ? 'Enviando...' : 'Enviar respuestas'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <FormHeader title="Capacitaciones" subtitle="Plataforma de aprendizaje con evaluación IA" onBack={onBack} />

      {canManage && (
        <button onClick={() => setView('create')}
          className="mb-6 bg-primary text-primary-foreground px-6 py-3 rounded-xl text-xs font-bold min-h-[48px] flex items-center gap-2">
          <Plus size={14} /> Nueva capacitación
        </button>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map(course => {
          const result = getResultForCourse(course.id);
          const hasQuiz = course.quiz_count > 0;
          return (
            <div key={course.id} className="bg-card border-2 border-border rounded-2xl p-6 hover:border-primary/30 transition-all">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black truncate">{course.title}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{course.description}</p>
                </div>
              </div>

              {result && (
                <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-xl text-xs font-bold ${result.passed ? 'bg-cat-nutritional/10 text-cat-nutritional' : 'bg-destructive/10 text-destructive'}`}>
                  <CheckCircle2 size={12} />
                  {result.passed ? `Aprobado (${Math.round((result.score / result.total_questions) * 100)}%)` : `No aprobado (${Math.round((result.score / result.total_questions) * 100)}%)`}
                </div>
              )}

              <div className="flex gap-2">
                {course.content && (
                  <button onClick={() => { setSelectedCourse(course); setView('detail'); }}
                    className="flex-1 flex items-center justify-center gap-1 bg-muted text-foreground px-3 py-2 rounded-xl text-xs font-bold min-h-[36px]">
                    <BookOpen size={12} /> Leer
                  </button>
                )}
                {hasQuiz && (
                  <button onClick={() => startExam(course)} disabled={loadingQuiz}
                    className="flex-1 flex items-center justify-center gap-1 bg-primary text-primary-foreground px-3 py-2 rounded-xl text-xs font-bold min-h-[36px]">
                    {loadingQuiz ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />} Examen
                  </button>
                )}
              </div>

              {canManage && !hasQuiz && course.content && (
                <button onClick={() => generateQuiz(course.id, course.content || '')} disabled={generating}
                  className="mt-2 w-full flex items-center justify-center gap-1 bg-accent text-accent-foreground px-3 py-2 rounded-xl text-xs font-bold min-h-[36px]">
                  {generating ? <Loader2 size={12} className="animate-spin" /> : <ChevronRight size={12} />}
                  Generar quiz con IA
                </button>
              )}
            </div>
          );
        })}
      </div>

      {courses.length === 0 && (
        <div className="text-center py-16">
          <BookOpen size={48} className="mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No hay capacitaciones aún</p>
        </div>
      )}
    </div>
  );
};

export default TrainingModule;
