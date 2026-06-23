export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in-up">
      <div className="w-20 h-20 rounded-full bg-primary-fixed flex items-center justify-center mb-5">
        <span
          className="material-symbols-outlined text-primary"
          style={{ fontSize: 40, fontVariationSettings: "'FILL' 1" }}
        >
          description
        </span>
      </div>
      <h3
        className="text-xl font-bold text-on-surface mb-2"
        style={{ fontFamily: 'Literata, serif' }}
      >
        Ready when you are.
      </h3>
      <p className="text-sm text-on-surface-variant max-w-sm">
        Upload your resume, paste a job description, and set a target title — then hit <strong>Analyze Resume</strong> to begin.
      </p>
    </div>
  );
}
