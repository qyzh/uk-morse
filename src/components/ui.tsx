/**
 * Shared UI primitives on the design tokens (Signal Terminal).
 * One Button/Panel/Toggle glossary keeps all views consistent.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from './cx'
import { CheckIcon, XIcon } from './icons'

export type FeedbackState = { kind: 'ok' | 'bad'; text: string } | null

/* ---------------- Button ---------------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerGhost'
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'iconSm' | 'none'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-signal text-signal-ink hover:brightness-110 active:brightness-95',
  secondary:
    'border border-edge bg-surface text-ink hover:border-edge-strong hover:bg-surface-2',
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
  danger: 'bg-danger text-danger-ink hover:brightness-110 active:brightness-95',
  dangerGhost:
    'border border-danger/40 text-danger-text hover:border-danger/60 hover:bg-danger/10',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 rounded-lg px-3 text-xs',
  md: 'h-10 rounded-lg px-4 text-sm',
  lg: 'h-12 rounded-lg px-5 text-sm',
  icon: 'size-10 rounded-lg',
  iconSm: 'size-8 rounded-lg',
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

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cx('rounded-xl border border-edge bg-surface', className)}>{children}</section>
}

/** Filter chip / pressed toggle. */
export function Toggle({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        'inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-sm font-medium transition-colors duration-150',
        active
          ? 'border-signal bg-signal text-signal-ink'
          : 'border-edge bg-surface text-ink-2 hover:border-edge-strong hover:text-ink',
        className,
      )}
    >
      {children}
    </button>
  )
}

/** Segmented control (mode switches, theme picker). */
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
    <div role="group" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-xl border border-edge bg-surface p-1">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cx(
              'inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-sm font-medium transition-colors duration-150',
              active ? 'bg-signal text-signal-ink' : 'text-ink-3 hover:bg-surface-2 hover:text-ink-2',
            )}
          >
            {option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/* ---------------- Small pieces ---------------- */

/** Physical keycap for shortcut hints. */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-edge-strong bg-surface-2 px-1.5 font-mono text-[11px] leading-none text-ink-2">
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
        'inline-block size-2 shrink-0 rounded-full transition-[background-color,box-shadow] duration-150',
        on ? 'bg-signal shadow-[0_0_10px_var(--signal)]' : 'bg-edge-strong',
        className,
      )}
    />
  )
}

/** Drill feedback — icon + text + color, never color alone. */
export function Feedback({ state, className }: { state: FeedbackState; className?: string }) {
  return (
    <p
      aria-live="polite"
      className={cx(
        'flex min-h-6 items-center justify-center gap-1.5 text-sm',
        state === null && 'text-ink-3',
        state?.kind === 'ok' && 'text-signal-text',
        state?.kind === 'bad' && 'text-danger-text',
        className,
      )}
    >
      {state?.kind === 'ok' && <CheckIcon className="size-4 shrink-0" />}
      {state?.kind === 'bad' && <XIcon className="size-4 shrink-0" />}
      {state?.text}
    </p>
  )
}

/** Benar / Soal / Akurasi readout. */
export function ScoreStrip({
  score,
  total,
  className,
}: {
  score: number
  total: number
  className?: string
}) {
  const accuracy = total > 0 ? `${Math.round((score / total) * 100)}%` : '—'
  return (
    <dl className={cx('flex items-center justify-center gap-5 text-xs text-ink-3', className)}>
      <div className="flex items-baseline gap-1.5">
        <dt>Benar</dt>
        <dd className="font-mono text-sm tabular-nums text-ink">{score}</dd>
      </div>
      <div className="flex items-baseline gap-1.5">
        <dt>Soal</dt>
        <dd className="font-mono text-sm tabular-nums text-ink">{total}</dd>
      </div>
      <div className="flex items-baseline gap-1.5">
        <dt>Akurasi</dt>
        <dd className="font-mono text-sm tabular-nums text-ink">{accuracy}</dd>
      </div>
    </dl>
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
    <div role="group" aria-label="Input morse via tombol" className={cx('grid gap-2.5', className)}>
      <div className="grid grid-cols-2 gap-2.5">
        <Button
          variant="secondary"
          size="none"
          onClick={onDit}
          aria-label="Tambah dit"
          className="h-16 flex-col gap-0.5 rounded-xl hover:border-signal/60 hover:text-signal-text"
        >
          <span className="font-mono text-3xl leading-none">·</span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-ink-3">dit</span>
        </Button>
        <Button
          variant="secondary"
          size="none"
          onClick={onDah}
          aria-label="Tambah dah"
          className="h-16 flex-col gap-0.5 rounded-xl hover:border-signal/60 hover:text-signal-text"
        >
          <span className="font-mono text-3xl leading-none">−</span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-ink-3">dah</span>
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        <Button variant="secondary" size="none" onClick={onCommit} disabled={commitDisabled} className="h-11 rounded-xl text-sm">
          Commit
        </Button>
        <Button variant="secondary" size="none" onClick={onSpace} className="h-11 rounded-xl text-sm">
          Spasi
        </Button>
        <Button variant="secondary" size="none" onClick={onBackspace} className="h-11 rounded-xl text-sm">
          Hapus
        </Button>
      </div>
    </div>
  )
}
