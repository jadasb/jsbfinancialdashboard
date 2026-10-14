export function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="eyebrow">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="block text-xs text-faint mt-1">{hint}</span>}
    </label>
  );
}
