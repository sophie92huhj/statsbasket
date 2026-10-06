export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-display text-3xl font-semibold tracking-wide">{title}</h1>
      <p className="max-w-lg text-sm text-muted">{description}</p>
    </div>
  );
}
