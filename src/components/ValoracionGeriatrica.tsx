import { useState, useMemo } from "react";
import {
  Activity, Brain, Heart, Utensils, AlertTriangle,
  Users, ShieldCheck, Briefcase, ChevronRight
} from "lucide-react";
import { TESTS_GERIATRICOS } from "@/data/tests-geriatricos";
import FormHeader from "./FormHeader";
import ActionButtons from "./ActionButtons";
import SignaturePad from "./SignaturePad";

const iconMap: Record<string, React.ReactNode> = {
  Activity: <Activity size={20} />,
  Brain: <Brain size={20} />,
  Heart: <Heart size={20} />,
  Utensils: <Utensils size={20} />,
  AlertTriangle: <AlertTriangle size={20} />,
  Users: <Users size={20} />,
  ShieldCheck: <ShieldCheck size={20} />,
  Briefcase: <Briefcase size={20} />,
};

const colorMap: Record<string, string> = {
  'cat-functional': 'text-cat-functional bg-cat-functional/10',
  'cat-cognitive': 'text-cat-cognitive bg-cat-cognitive/10',
  'cat-nutritional': 'text-cat-nutritional bg-cat-nutritional/10',
  'cat-mood': 'text-cat-mood bg-cat-mood/10',
  'cat-mobility': 'text-cat-mobility bg-cat-mobility/10',
  'cat-fragility': 'text-cat-fragility bg-cat-fragility/10',
  'cat-social': 'text-cat-social bg-cat-social/10',
  'cat-skin': 'text-cat-skin bg-cat-skin/10',
};

interface ValoracionGeriatricaProps {
  onBack: () => void;
}

const ValoracionGeriatrica = ({ onBack }: ValoracionGeriatricaProps) => {
  const [step, setStep] = useState<'menu' | 'assessment' | 'summary'>('menu');
  const [testKey, setTestKey] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const activeTest = useMemo(() => testKey ? TESTS_GERIATRICOS[testKey] : null, [testKey]);

  const handleAnswer = (qId: string, value: number) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  const getScore = () => Object.values(answers).reduce((a, b) => a + b, 0);

  const getInterpretation = (score: number) => {
    if (testKey === 'barthel') {
      if (score === 100) return "Independiente";
      if (score >= 60) return "Dependencia Leve";
      if (score >= 40) return "Dependencia Moderada";
      if (score >= 20) return "Dependencia Severa";
      return "Dependencia Total";
    }
    if (testKey === 'lawton') {
      if (score === 8) return "Independencia total";
      if (score >= 6) return "Dependencia leve";
      if (score >= 4) return "Dependencia moderada";
      return "Dependencia severa";
    }
    if (testKey === 'pfeiffer') {
      if (score <= 2) return "Normal";
      if (score <= 4) return "Deterioro cognitivo leve";
      if (score <= 7) return "Deterioro cognitivo moderado";
      return "Deterioro cognitivo severo";
    }
    if (testKey === 'yesavage') {
      if (score <= 5) return "Normal – sin depresión";
      if (score <= 9) return "Depresión leve";
      return "Depresión severa";
    }
    if (testKey === 'tinetti') {
      if (score >= 25) return "Bajo riesgo de caídas";
      if (score >= 19) return "Riesgo moderado de caídas";
      return "Alto riesgo de caídas";
    }
    if (testKey === 'mna') {
      if (score >= 24) return "Estado nutricional normal";
      if (score >= 17) return "Riesgo de malnutrición";
      return "Malnutrición";
    }
    if (testKey === 'fried') {
      if (score === 0) return "Robusto – sin fragilidad";
      if (score <= 2) return "Pre-frágil";
      return "Frágil";
    }
    if (testKey === 'gijon') {
      if (score < 10) return "Buena situación social";
      if (score <= 14) return "Riesgo social";
      return "Problema social severo";
    }
    if (testKey === 'braden') {
      if (score >= 17) return "Sin riesgo de UPP";
      if (score >= 15) return "Riesgo bajo de UPP";
      if (score >= 13) return "Riesgo moderado de UPP";
      return "Alto riesgo de UPP";
    }
    if (testKey === 'mmse') {
      if (score >= 27) return "Normal";
      if (score >= 24) return "Sospecha patológica";
      if (score >= 12) return "Deterioro cognitivo";
      return "Demencia";
    }
    if (testKey === 'charlson') {
      if (score === 0) return "Sin comorbilidad";
      if (score <= 2) return "Comorbilidad baja";
      if (score <= 4) return "Comorbilidad alta";
      return "Comorbilidad muy alta";
    }
    if (testKey === 'zarit') {
      if (score < 21) return "No sobrecarga";
      if (score <= 40) return "Sobrecarga leve";
      if (score <= 60) return "Sobrecarga moderada";
      return "Sobrecarga severa";
    }
    return "Pendiente de interpretación clínica";
  };

  if (step === 'summary' && activeTest) {
    const score = getScore();
    return (
      <div className="animate-fade-in">
        <FormHeader title={`Resultado: ${activeTest.name}`} subtitle="Resumen de la evaluación" onBack={() => setStep('menu')} />
        <div className="bg-card rounded-4xl p-8 shadow-sm border border-border text-center max-w-md mx-auto">
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">Puntaje Final</p>
          <div className="text-6xl font-black text-primary mb-1">
            {score}
            <span className="text-2xl text-muted-foreground font-medium">/ {activeTest.max}</span>
          </div>
          <div className="mt-6 bg-muted rounded-2xl p-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Interpretación</p>
            <p className="text-lg font-black text-foreground">{getInterpretation(score)}</p>
          </div>
        </div>
        <div className="flex justify-center gap-8 mt-8">
          <SignaturePad label="Evaluador" />
          <SignaturePad label="Supervisor" />
        </div>
        <div className="flex justify-center mt-8">
          <button
            onClick={() => setStep('menu')}
            className="bg-secondary text-secondary-foreground px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors min-h-[48px]"
          >
            Volver a Escalas
          </button>
        </div>
      </div>
    );
  }

  if (step === 'assessment' && activeTest) {
    const isComplete = Object.keys(answers).length === activeTest.questions.length;
    return (
      <div className="animate-fade-in">
        <FormHeader title={activeTest.name} subtitle={`${activeTest.cat} — ${activeTest.desc}`} onBack={() => setStep('menu')} />
        {activeTest.instructions && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-6 text-xs text-foreground leading-relaxed">
            <p className="font-bold text-primary mb-1 uppercase tracking-widest text-[10px]">Instrucciones</p>
            {activeTest.instructions}
          </div>
        )}
        <div className="space-y-4 max-w-2xl">
          {activeTest.questions.map((q, idx) => (
            <div key={q.id} className="bg-card rounded-2xl p-5 shadow-sm border border-border">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-black flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span className="text-sm font-bold text-foreground">{q.text}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {q.opts.map(opt => {
                  const isSelected = answers[q.id] !== undefined && answers[q.id] === opt.v;
                  return (
                    <button
                      key={`${opt.l}-${opt.v}`}
                      onClick={() => handleAnswer(q.id, opt.v)}
                      className={`p-3 rounded-xl text-xs font-bold text-left transition-all min-h-[48px] ${
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-lg'
                          : 'bg-muted text-muted-foreground hover:bg-accent border border-transparent'
                      }`}
                    >
                      {opt.l}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <ActionButtons onFinish={() => setStep('summary')} disabled={!isComplete} />
      </div>
    );
  }

  // Menu
  return (
    <div className="animate-fade-in">
      <FormHeader title="2. Valoración Geriátrica" subtitle="Seleccione una escala para iniciar" onBack={onBack} />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Object.keys(TESTS_GERIATRICOS).map(key => {
          const test = TESTS_GERIATRICOS[key];
          const classes = colorMap[test.colorClass] || 'text-muted-foreground bg-muted';
          const [textClass, bgClass] = classes.split(' ');
          return (
            <button
              key={key}
              onClick={() => { setTestKey(key); setAnswers({}); setStep('assessment'); }}
              className="bg-card p-5 rounded-4xl border-2 border-border hover:border-primary transition-all text-left shadow-sm group active:scale-[0.97] min-h-[48px]"
            >
              <div className={`w-10 h-10 rounded-xl ${bgClass} flex items-center justify-center mb-3 ${textClass}`}>
                {iconMap[test.iconName] || <Activity size={20} />}
              </div>
              <p className="text-sm font-bold text-foreground">{test.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{test.cat}</p>
              <div className="flex items-center gap-1 mt-3 text-xs font-black text-primary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                INICIAR
                <ChevronRight size={14} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ValoracionGeriatrica;
