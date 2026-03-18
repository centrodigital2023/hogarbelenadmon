interface SignaturePadProps {
  label: string;
}

const SignaturePad = ({ label }: SignaturePadProps) => (
  <div className="flex flex-col items-center gap-2">
    <div className="w-48 h-20 border-2 border-dashed border-border rounded-xl flex items-center justify-center">
      <span className="text-xs text-muted-foreground font-medium">Firma</span>
    </div>
    <p className="text-xs text-muted-foreground font-medium">{label}</p>
  </div>
);

export default SignaturePad;
