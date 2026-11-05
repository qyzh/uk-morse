/**
 * Shared UI primitives on the design tokens (Signal Terminal).
 * One Button/Segmented glossary keeps all views consistent.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { accuracy } from '../core/drills'
import { cx } from './cx'

export type FeedbackState = { kind: 'ok' | 'bad'; text: string } | null

/* ---------------- Button ---------------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerGhost' | 'row' | 'cell'
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'iconSm' | 'none'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'double-rule bg-ink text-bg hover:bg-ink-2',
  secondary: 'double-rule border border-ink text-ink hover:bg-surface-2 active:bg-surface-2/70',
  ghost: 'text-ink-2 underline decoration-edge-strong underline-offset-4 hover:bg-surface-2 hover:text-ink',
  danger: 'double-rule bg-danger text-danger-ink [--rule:var(--danger)] hover:brightness-110 active:brightness-95',
  dangerGhost:
    'double-rule border border-danger text-danger-text [--rule:var(--danger)] hover:bg-danger/10',
  /** A filled row of a form, ruled by the form around it. */
  row: 'bg-ink text-bg hover:bg-ink-2',
  /** One box of a form row. */
  cell: 'text-ink hover:bg-surface-2 active:bg-surface-2/70',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-11 px-3 text-xs uppercase tracking-[0.08em]',
  md: 'h-11 px-4 text-sm uppercase tracking-[0.08em]',
  lg: 'h-12 px-5 text-sm uppercase tracking-[0.08em]',
  icon: 'size-11',
  iconSm: 'size-11',
  none: '',
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex select-none items-center justify-center gap-2 font-medium transition-[color,background-color,border-color,filter] duration-150 disabled:pointer-events-none disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    />
  )
}

/* ---------------- Surfaces ---------------- */

/** Mode switch / theme picker — a form's tick boxes. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: ReadonlyArray<{ value: T; label: string; icon?: ReactNode }>
  onChange: (value: T) => void
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-x-5 gap-y-2">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cx(
              'inline-flex min-h-11 items-center gap-1.5 text-sm transition-colors duration-150',
              active ? 'text-ink' : 'text-ink-3 hover:text-ink',
            )}
          >
            <span aria-hidden="true" className="shrink-0 select-none">
              [{active ? 'x' : '\u00a0'}]
            </span>
            {option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/* ---------------- Terminal type ---------------- */

/** Page headline with terminal prompt. */
export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
      <span aria-hidden="true" className="mr-2 select-none text-ink-3">
        &gt;
      </span>
      {children}
    </h1>
  )
}

/* ---------------- Small pieces ---------------- */

/** Physical keycap for shortcut hints. */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center border border-edge-strong bg-surface-2 px-1.5 font-mono text-[11px] leading-none text-ink-2">
      {children}
    </kbd>
  )
}

/** Signal LED — lights up on input. Decorative. */
export function Led({ on, className }: { on: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'inline-block size-2 shrink-0 transition-[background-color,box-shadow] duration-150',
        on ? 'bg-signal shadow-[0_0_10px_var(--signal)]' : 'bg-edge-strong',
        className,
      )}
    />
  )
}

/** Drill feedback — tick + text + color, never color alone. */
export function Feedback({ state, className }: { state: FeedbackState; className?: string }) {
  return (
    <p
      aria-live="polite"
      className={cx(
        'flex min-h-6 items-center gap-1.5 text-sm',
        state === null && 'text-ink-3',
        state?.kind === 'ok' && 'text-signal-text',
        state?.kind === 'bad' && 'text-danger-text',
        className,
      )}
    >
      {state && (
        <span aria-hidden="true" className="shrink-0 select-none">
          [{state.kind === 'ok' ? 'x' : '!'}]
        </span>
      )}
      {state?.text}
    </p>
  )
}

/** Terminal readouts, `label: value`. */
export function Readouts({
  items,
}: {
  items: ReadonlyArray<readonly [label: string, value: ReactNode]>
}) {
  return (
    <dl className="flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-sm text-ink-3">
      {items.map(([label, value]) => (
        <div key={label} className="flex items-baseline gap-1.5">
          <dt>{label}</dt>
          <dd className="text-sm tabular-nums text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Benar / Soal / Akurasi readout. */
export function ScoreStrip({ score, total }: { score: number; total: number }) {
  return (
    <Readouts
      items={[
        ['benar:', score],
        ['soal:', total],
        ['akurasi:', total > 0 ? `${accuracy(score, total)}%` : '—'],
      ]}
    />
  )
}

/** A form text field: one ruled box. */
export const FIELD =
  'border border-ink bg-transparent text-ink transition-colors duration-150 placeholder:text-ink-3 hover:bg-surface/50'

/** The dit and dah keys, on their own where nothing needs committing. Ruled by the form around them. */
export function ElementKeys({
  onDit,
  onDah,
  className,
}: {
  onDit: () => void
  onDah: () => void
  className?: string
}) {
  return (
    <div className={cx('grid grid-cols-2 divide-x divide-ink', className)}>
      <Button variant="cell" size="none" onClick={onDit} aria-label="Tambah dit" className="h-16 flex-col gap-0.5">
        <span className="font-mono text-3xl leading-none">·</span>
        <span className="text-sm normal-case tracking-normal text-ink-3">dit</span>
      </Button>
      <Button variant="cell" size="none" onClick={onDah} aria-label="Tambah dah" className="h-16 flex-col gap-0.5">
        <span className="font-mono text-3xl leading-none">−</span>
        <span className="text-sm normal-case tracking-normal text-ink-3">dah</span>
      </Button>
    </div>
  )
}

/** Touch input pad — the mobile replacement for arrow keys. */
export function InputPad({
  onDit,
  onDah,
  onCommit,
  onSpace,
  onBackspace,
  commitDisabled = false,
  className,
}: {
  onDit: () => void
  onDah: () => void
  onCommit: () => void
  onSpace: () => void
  onBackspace: () => void
  commitDisabled?: boolean
  className?: string
}) {
  return (
    <div
      role="group"
      aria-label="Input morse via tombol"
      className={cx('divide-y divide-ink border border-ink', className)}
    >
      <ElementKeys onDit={onDit} onDah={onDah} />
      <div className="grid grid-cols-3 divide-x divide-ink">
        <Button variant="cell" size="none" onClick={onCommit} disabled={commitDisabled} className="h-11 text-sm uppercase tracking-[0.08em]">
          Commit
        </Button>
        <Button variant="cell" size="none" onClick={onSpace} className="h-11 text-sm uppercase tracking-[0.08em]">
          Spasi
        </Button>
        <Button variant="cell" size="none" onClick={onBackspace} className="h-11 text-sm uppercase tracking-[0.08em]">
          Hapus
        </Button>
      </div>
    </div>
  )
}
