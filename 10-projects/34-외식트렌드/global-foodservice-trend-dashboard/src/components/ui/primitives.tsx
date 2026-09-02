'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */

export function Card({ className, ...props }: React.ComponentProps<'section'>) {
  return (
    <section
      className={cn('rounded-md border border-line bg-white', className)}
      {...props}
    />
  )
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <header
      className={cn(
        'flex items-start justify-between gap-3 border-b border-line px-4 py-3',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-[14px] font-semibold tracking-tight text-navy-900">{title}</h2>
        {subtitle ? <p className="mt-1 text-[11.5px] leading-snug text-muted">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  )
}

export function CardBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('px-4 py-3', className)} {...props} />
}

/* ------------------------------------------------------------------ */
/* Label badge — §6 "색상 배지 대신 명확한 Label"                        */
/* ------------------------------------------------------------------ */

export function Label({
  className,
  children,
  ...props
}: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-sm border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide',
        'border-line bg-white text-muted',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Button                                                              */
/* ------------------------------------------------------------------ */

type ButtonVariant = 'primary' | 'ghost' | 'outline'

export function Button({
  className,
  variant = 'outline',
  ...props
}: React.ComponentProps<'button'> & { variant?: ButtonVariant }) {
  const styles: Record<ButtonVariant, string> = {
    primary: 'bg-navy-800 text-white border-navy-800 hover:bg-navy-700',
    outline: 'bg-white text-navy-800 border-line hover:border-navy-700 hover:text-navy-900',
    ghost: 'bg-transparent text-muted border-transparent hover:text-navy-800',
  }
  return (
    <button
      className={cn(
        'inline-flex h-7 items-center gap-1 rounded-sm border px-2.5 text-[11px] font-medium transition-colors disabled:opacity-40',
        styles[variant],
        className,
      )}
      {...props}
    />
  )
}

/* ------------------------------------------------------------------ */
/* Table                                                               */
/* ------------------------------------------------------------------ */

export function TableWrap({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('w-full overflow-x-auto', className)} {...props} />
}

export function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <table
      className={cn(
        'w-full border-collapse text-[12.5px] tabular',
        // 행을 눈으로 따라가기 쉽도록 짝수행 음영 + hover 강조
        '[&_tbody_tr:nth-child(even)]:bg-canvas/60',
        '[&_tbody_tr:hover]:bg-blue-soft/50',
        className,
      )}
      {...props}
    />
  )
}

export function Th({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      className={cn(
        'border-b-2 border-line bg-white px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-navy-700',
        className,
      )}
      {...props}
    />
  )
}

export function Td({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      className={cn(
        'border-b border-line px-3 py-2.5 align-top leading-relaxed text-ink',
        className,
      )}
      {...props}
    />
  )
}

/* ------------------------------------------------------------------ */
/* Form controls                                                       */
/* ------------------------------------------------------------------ */

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-7 rounded-sm border border-line bg-white px-2 text-[12px] text-ink outline-none',
        'placeholder:text-muted/60 focus:border-blue-accent',
        className,
      )}
      {...props}
    />
  )
}

export function Select({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-7 max-w-[190px] rounded-sm border border-line bg-white px-1.5 text-[11.5px] text-ink outline-none focus:border-blue-accent',
        className,
      )}
      {...props}
    />
  )
}

/* ------------------------------------------------------------------ */
/* Section title — 대시보드 읽는 순서 안내                              */
/* ------------------------------------------------------------------ */

export function SectionTitle({
  step,
  title,
  ko,
  action,
}: {
  step: string
  title: string
  ko: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-end justify-between gap-3 pb-1 pt-1">
      <div className="flex items-baseline gap-2">
        <span className="text-[11px] font-bold tracking-widest text-blue-accent tabular">
          {step}
        </span>
        <h2 className="text-[15px] font-bold tracking-tight text-navy-900">{title}</h2>
        <span className="text-[12px] text-muted">{ko}</span>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Misc                                                                */
/* ------------------------------------------------------------------ */

export function Metric({
  value,
  unit,
  className,
}: {
  value: React.ReactNode
  unit?: string
  className?: string
}) {
  return (
    <div className={cn('flex items-baseline gap-1', className)}>
      <span className="text-[30px] font-bold leading-none tracking-tight text-navy-900 tabular">
        {value}
      </span>
      {unit ? <span className="text-[12px] text-muted">{unit}</span> : null}
    </div>
  )
}

export function Empty({ children = '표시할 데이터가 없습니다.' }: { children?: React.ReactNode }) {
  return <p className="px-4 py-8 text-center text-[12.5px] text-muted">{children}</p>
}
