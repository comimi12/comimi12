export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-line bg-white px-5 py-4">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-blue-accent">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-[18px] font-bold tracking-tight text-navy-900">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-4xl text-[12.5px] leading-relaxed text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="no-print shrink-0">{action}</div> : null}
    </div>
  )
}
