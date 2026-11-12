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
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-line bg-white px-4 py-3 md:flex-nowrap md:px-5 md:py-4">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-blue-accent">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-[17px] font-bold leading-snug tracking-tight text-navy-900 md:text-[18px]">{title}</h1>
        {description ? (
          // 스마트폰에서는 긴 안내문을 숨겨 바로 본문이 보이게 한다.
          <p className="mt-1 hidden max-w-4xl text-[12.5px] leading-relaxed text-muted md:block">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="no-print shrink-0">{action}</div> : null}
    </div>
  )
}
