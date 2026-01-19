interface SectionProps {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function Section({ id, title, description, children }: SectionProps) {
  return (
    <section
      id={id}
      className="scroll-mt-32 py-8 border-b border-border last:border-b-0"
    >
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        {description && (
          <p className="text-sm text-text-secondary mt-1">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}
