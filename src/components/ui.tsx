/**
 * Shared UI primitives on the design tokens (Signal Terminal).
 * One Button/Segmented glossary keeps all views consistent.
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
    'border border-edge-strong text-ink hover:bg-surface-2 active:bg-surface-2/70',
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
  danger: 'bg-danger text-danger-ink hover:brightness-110 active:brightness-95',
  dangerGhost:
    'border border-danger/40 text-danger-text hover:border-danger/60 hover:bg-danger/10',
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

/** Mode switch / theme picker — text tabs with a prompt on the active one. */
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
            <span aria-hidden="true" className="w-[1ch] shrink-0 select-none text-ink-3">
              {active ? '>' : ''}
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
    <h1 className="text-3xl font-medium tracking-tight text-balance sm:text-4xl">
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

/** Drill feedback — icon + text + color, never color alone. */
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
    <dl className={cx('flex items-center gap-5 font-mono text-sm text-ink-3', className)}>
      <div className="flex items-baseline gap-1.5">
        <dt>benar:</dt>
        <dd className="text-sm tabular-nums text-ink">{score}</dd>
      </div>
      <div className="flex items-baseline gap-1.5">
        <dt>soal:</dt>
        <dd className="text-sm tabular-nums text-ink">{total}</dd>
      </div>
      <div className="flex items-baseline gap-1.5">
        <dt>akurasi:</dt>
        <dd className="text-sm tabular-nums text-ink">{accuracy}</dd>
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
          className="h-16 flex-col gap-0.5"
        >
          <span className="font-mono text-3xl leading-none">·</span>
          <span className="text-sm normal-case tracking-normal text-ink-3">dit</span>
        </Button>
        <Button
          variant="secondary"
          size="none"
          onClick={onDah}
          aria-label="Tambah dah"
          className="h-16 flex-col gap-0.5"
        >
          <span className="font-mono text-3xl leading-none">−</span>
          <span className="text-sm normal-case tracking-normal text-ink-3">dah</span>
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        <Button variant="secondary" size="none" onClick={onCommit} disabled={commitDisabled} className="h-11 text-sm uppercase tracking-[0.08em]">
          Commit
        </Button>
        <Button variant="secondary" size="none" onClick={onSpace} className="h-11 text-sm uppercase tracking-[0.08em]">
          Spasi
        </Button>
        <Button variant="secondary" size="none" onClick={onBackspace} className="h-11 text-sm uppercase tracking-[0.08em]">
          Hapus
        </Button>
      </div>
    </div>
  )
}
