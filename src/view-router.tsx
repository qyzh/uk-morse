import type { ReactElement } from 'react'
import { BookIcon, GearIcon, RadioIcon, TargetIcon, TypeIcon } from './components/icons'
import type { IconProps } from './components/icons'
import { Home } from './components/Home'
import { Trainer } from './components/Trainer'
import { Dictionary } from './components/Dictionary'
import { Encoder } from './components/Encoder'
import { Practice } from './components/Practice'
import { SettingsPanel } from './components/SettingsPanel'

type ViewEntry = {
  id: string
  label: string
  /** Full document title. */
  title: string
  render: () => ReactElement
  /** Whether the view appears in the navs. */
  listed: boolean
  Icon?: (props: IconProps) => ReactElement
}

/** One row per view. Home is where the app opens, but isn't in the navs. */
export const VIEWS = [
  {
    id: 'home',
    label: 'Beranda',
    title: 'morse_trainer',
    render: () => <Home />,
    listed: false,
  },
  {
    id: 'trainer',
    label: 'Trainer',
    title: 'Trainer — morse_trainer',
    render: () => (
      <div className="space-y-12">
        <Trainer />
        <Dictionary />
      </div>
    ),
    listed: true,
    Icon: RadioIcon,
  },
  {
    id: 'dictionary',
    label: 'Kamus',
    title: 'Kamus Morse — morse_trainer',
    render: () => <Dictionary standalone />,
    listed: true,
    Icon: BookIcon,
  },
  {
    id: 'encoder',
    label: 'Encoder',
    title: 'Encoder — morse_trainer',
    render: () => <Encoder />,
    listed: true,
    Icon: TypeIcon,
  },
  {
    id: 'practice',
    label: 'Latihan',
    title: 'Latihan — morse_trainer',
    render: () => <Practice />,
    listed: true,
    Icon: TargetIcon,
  },
  {
    id: 'settings',
    label: 'Pengaturan',
    title: 'Pengaturan — morse_trainer',
    render: () => <SettingsPanel />,
    listed: true,
    Icon: GearIcon,
  },
] as const satisfies readonly ViewEntry[]

export type ViewId = (typeof VIEWS)[number]['id']

export const NAV_VIEWS = VIEWS.filter((v) => v.listed)

/** Hash → view, falling back to home for empty, unknown, or malformed hashes. */
export function viewOfHash(hash: string): ViewId {
  const id = hash.replace(/^#\/?/, '')
  return VIEWS.find((v) => v.id === id)?.id ?? 'home'
}

export function titleOf(view: ViewId): string {
  return VIEWS.find((v) => v.id === view)!.title
}

export function renderView(view: ViewId): ReactElement {
  return VIEWS.find((v) => v.id === view)!.render()
}
