# Plan: Web Aplikasi Code Morse (Morse Trainer Web)

> Disusun untuk: web pembelajaran + latihan code Morse, input via keyboard panah kiri/kanan, kamus lengkap, mode latihan.
> Target: cepat, ringan, offline-capable (PWA), maintainable.

---

## 0. Ringkasan singkat

- **Rekomendasi utama**: **Vite + React 19 + TypeScript + Tailwind + Zustand**, deploy ke Cloudflare Pages/Vercel.
- **Input**: `←` = dit (.), `→` = dah (-), `Space` = pemisah huruf, `Enter` = pemisah kata / decode, `Backspace` = hapus.
- **Kamus**: tabel A–Z, 0–9, tanda baca, prosign; searchable + audio preview on click.
- **Latihan**: encode (teks→Morse), decode (Morse→teks), timed WPM test, progress di localStorage.
- **Audio**: Web Audio API oscillator (tanpa file eksternal) → efektif & ringan.

---

## 1. Tujuan & Scope

### In-scope (v1)
1. Decoder real-time: ketik Morse via panah → tampil teks.
2. Encoder: ketik teks → tampil Morse (dengan audio play).
3. Kamus lengkap (searchable, filter kategori, click-to-play audio).
4. Mode latihan: encode, decode, speed test (WPM), streak/score.
5. Settings: WPM, frekuensi nada (Hz), volume, dark/light, keybind info.
6. Penyimpanan progress & high score (localStorage).
7. PWA (offline, installable).

### Out-of-scope (v1, optional v2)
- Multiplayer / leaderboard online.
- Account & sync cloud.
- Speech-to-Morse / mic input.
- Native mobile app (web responsive cukup).

### Asumsi
- Target device: desktop keyboard utama, tapi responsive mobile (tombol on-screen sebagai fallback).
- Tidak butuh backend; fully static SPA. Kalau mau leaderboard, tambah serverless (Cloudflare Workers) di v2.

---

## 2. Pilihan Tech Stack

### Opsi perbandingan

| Opsi | Bundle | DX | Routing | SSR/SEO | Cocok untuk |
|---|---|---|---|---|---|
| **A. Vite + React + TS** ✅ | Kecil-sedang | Bagus | React Router | Client-only (SPA) | Tool interaktif, cepat dev |
| B. SvelteKit | Paling kecil | Bagus | Built-in | SSR/SPA | Bundle minimal, reactif |
| C. Next.js 15 | Besar | Bagus (familiar) | App Router | SSR/SSG | Fullstack, SEO, kalau mau backend |
| D. Astro (islands) | Paling kecil | Sedang | File-based | SSG | Konten statis + widget interaktif |
| E. Vanilla (no framework) | Micro | Rendah (scale) | Manual | SSG bisa | Ultra-minimal, no build |

### Rekomendasi: **Opsi A — Vite + React 19 + TypeScript** (primary)

**Alasan:**
- Kamu sudah familiar Next.js/React (proyek mms), jadi React = nol learning curve tambahan.
- Vite dev server instan, HMR cepat, build kecil.
- SPA murni → deploy paling simpel (static).
- Ecosystem lengkap (Tailwind, shadcn, Zustand, Framer Motion).
- Untuk app interaktif (audio, keyboard, state lokal) React komponen-based sangat pas.

**Cadangan jika bundle jadi prioritas**: **Opsi B — SvelteKit** (bundle ~30–40% lebih kecil, reactivity tanpa virtual DOM).
**Kalau mau SEO + halaman kamus dapat di-index Google**: **Opsi D — Astro** dengan React islands untuk bagian interaktif (kamus statis = HTML murni, input trainer = island).
**Kalau mau nol dependency & super cepat**: **Opsi E — Vanilla TS + Vite** (tanpa framework, state manual).

> **Keputusan yang kuberikan**: mulai dengan **Vite + React + TS**. Mudah migrate ke Astro/Svelte nanti karena logika Morse dipisah di `core/` (framework-agnostic).

### Full stack final (recommended)
- **Build tool**: Vite 6
- **UI**: React 19 + TypeScript (strict)
- **Styling**: Tailwind CSS v4 + shadcn/ui (komponen: Table, Dialog, Tabs, Slider, Button, Card)
- **State**: Zustand (settings, session, progress) + React local state
- **Routing**: React Router v7 (atau TanStack Router)
- **Audio**: Web Audio API (custom hook `useMorseAudio`)
- **Keyboard**: custom hook `useMorseInput` (keydown listener, preventDefault)
- **Storage**: localStorage via Zustand persist middleware (key: `morse-app:v1`)
- **PWA**: Vite PWA plugin (Workbox) — cache assets + offline
- **i18n**: opsional; v1 Bahasa Indonesia + English toggle (react-i18next) — boleh ditunda
- **Testing**: Vitest + React Testing Library (unit), Playwright (E2E)
- **Lint/Format**: ESLint + Prettier + TypeScript
- **Deploy**: Cloudflare Pages (gratis, global CDN, preview per PR) atau Vercel

---

## 3. Fitur Detail

### 3.1 Input Morse — Panah Kiri/Kanan

**Keybind spec (default):**
| Tombol | Aksi |
|---|---|
| `←` (ArrowLeft) | Tambah **dit** `.` |
| `→` (ArrowRight) | Tambah **dah** `-` |
| `Space` | Akhiri huruf (commit simbol aktif → decode ke char) |
| `Enter` | Akhiri kata (tambah spasi) |
| `Backspace` | Hapus simbol terakhir (undo satu dit/dah; jika kosong, hapus char terakhir) |
| `Escape` | Reset input aktif |
| `/` (slash) | Toggle mode: encode ↔ decode |

**Perilaku:**
- Buffer simbol per huruf (mis. `.-`).
- Saat Space/Enter/delay auto-commit: cari di `morseToChar` map → tampilkan huruf atau `?` jika tidak valid.
- **Auto-commit timer (opsional)**: kalau user tidak menekan apa-apa selama X ms (settings, default 700ms dari last key), auto-commit simbol aktif ke huruf. Ini meniru input Morse riil. Dapat dimatikan.
- **Visual feedback**: tampilan morse besar di tengah, animasi pulse pada setiap dit/dah, highlight huruf terdecode.
- **Mode timing (advanced)**: opsi "hold mode" — tahan panah kiri = dit, panah kanan ditahan lama = dah (threshold 200ms). Tapi default manual per-press (lebih eksplisit dan sesuai permintaan "panah kiri/kanan").

**Audio feedback**: tiap dit = beep pendek, dah = beep panjang (sinkron dengan simbol).

### 3.2 Kamus / Table

- Data sumber: file JSON `morse-data.json` (framework-agnostic) di `core/data/`.
- Kolom: Simbol Morse, Karakter, Kategori, Audio (play), (opsional) Mnemonic.
- Kategori filter: Letters A–Z, Numbers 0–9, Punctuation, Prosigns (SOS, AR, BT, SK, dsb.), Special.
- Search: by char atau by morse string (mis. ketik `.-.` → tampil R).
- Sort: A-Z, Morse length, kategori.
- Click row → play audio beep dari simbol.
- Export/Copy: tombol copy morse string.

**Daftar lengkap minimal (v1):**
- A–Z (26)
- 0–9 (10)
- Tanda baca umum: `.` `,` `?` `'` `!` `/` `(` `)` `&` `:` `;` `=` `+` `-` `_` `"` `$` `@`
- Prosigns: SOS (`...---...`), AR (`. - . - .`), BT (`-...-`), SK (`...-.-`), KN (`-.--.`), HH (`........`), dsb.
- Total ≈ 60+ entri.

### 3.3 Mode Latihan

1. **Encode Drill**
   - Tampil huruf/kata acak → user ketik Morse via panah → validasi.
   - Scoring: benar/salah, streak, accuracy %.
   - Feedback instan + audio.
2. **Decode Drill**
   - Tampil Morse (visual +/atau audio) → user ketik huruf pada keyboard normal → validasi.
   - Audio play mode: morse diputar, user ketik apa yang didengar (listening practice).
3. **Speed Test (WPM)**
   - Durasi terpilih (30s/60s/120s).
   - Random words → user encode via panah → hitung WPM = (chars/5)/menit, accuracy.
   - Hasil + simpan high score.
4. **Kuis Pilihan Ganda** (opsional, lebih santai)
   - Tampil morse, pilih huruf dari 4 opsi.
5. **Spaced repetition** (v2): kartu lemah muncul lebih sering (algoritma SM-2 sederhana), simpan di localStorage.

**Adaptive difficulty**: mulai easy (E, T, I, A, N, M) lalu tambah. Data frekuensi huruf bisa dipakai (ETAOIN...).

### 3.4 Audio Engine

- Web Audio API: `OscillatorNode` (sine/square) + `GainNode` envelope (attack/release) untuk beep bersih.
- Timing berbasis WPM: dit duration = 1200/WPM ms; dah = 3×dit; elemen gap = 1×dit; huruf gap = 3×dit; kata gap = 7×dit.
- Scheduler: gunakan `AudioContext.currentTime` + setTimeout/interval untuk antrian; untuk akurasi, schedule semua event ke depan dengan `osc.start(at)`.
- Frekuensi default 600 Hz (bisa diganti 400–1000 Hz).
- Volume + mute toggle.

### 3.5 Settings & Progress

- Settings persist di localStorage (Zustand persist): WPM, tone freq, volume, auto-commit delay, theme, sound on/off, keybind (fixed v1).
- Progress: high scores per mode, accuracy history, huruf yang lemah (untuk spaced repetition v2).
- Reset all data button.

---

## 4. Arsitektur & Struktur Folder

```
morse-web/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── routes/
│   │   ├── Home.tsx
│   │   ├── Trainer.tsx        # decode via arrow
│   │   ├── Encoder.tsx        # teks -> morse + audio
│   │   ├── Dictionary.tsx     # kamus table
│   │   ├── Practice.tsx       # drill modes
│   │   └── Settings.tsx
│   ├── core/                  # framework-agnostic (unit tested)
│   │   ├── morse-data.ts      # char<->morse maps + list
│   │   ├── encode.ts          # text -> morse
│   │   ├── decode.ts          # morse -> char
│   │   ├── timing.ts          # WPM calc
│   │   └── drills.ts          # scoring, adaptive
│   ├── audio/
│   │   └── morse-audio.ts     # Web Audio scheduler
│   ├── hooks/
│   │   ├── useMorseInput.ts   # arrow key handling
│   │   ├── useMorseAudio.ts
│   │   └── useSettings.ts
│   ├── store/
│   │   ├── settingsStore.ts   # zustand persist
│   │   └── progressStore.ts
│   ├── components/
│   │   ├── MorseDisplay.tsx
│   │   ├── DictTable.tsx
│   │   ├── AudioPlayer.tsx
│   │   └── ui/                # shadcn
│   └── styles/
├── public/
│   ├── manifest.webmanifest
│   └── icons/
└── tests/
    ├── unit/                  # vitest (core/*)
    └── e2e/                   # playwright
```

**Prinsip arsitektur:**
- **`core/` murni TS** (tanpa React) → mudah di-unit test & migrate framework.
- **Audio dipisah** agar bisa di-mock saat test.
- **State central**: Zustand store tunggal dengan slice; komponen read via selector (hindari re-render berlebih).
- **Lazy load**: route-based code splitting via React.lazy + Suspense.

---

## 5. Data Model (morse-data)

```ts
export type MorseEntry = {
  char: string;        // 'A', '1', '.', 'SOS'
  morse: string;       // '.-'
  category: 'letter'|'number'|'punctuation'|'prosign';
  keywords?: string[]; // untuk search
};

export const MORSE_MAP: Record<string,string> = { 'A':'.-', ... };
export const CHAR_MAP: Record<string,string>  = { '.-':'A', ... };
export const MORSE_LIST: MorseEntry[]         = [ ... ];
```

**Catatan penting konflik:** morse `.-` = A, tapi `.-.-.-` = titik. Urutan decode harus **longest match** (prefix tree/Trie) saat auto-decode stream, bukan per-huruf naif. Implementasi `decode.ts` pakai Trie untuk streaming input tanpa separator eksplisit (opsional mode "smart decode").

---

## 6. UX / Accessibility

- Kontras tinggi, dark mode default (toggle).
- Fokus visible, semua kontrol dapat di-navigasi keyboard (Tab).
- ARIA: `role="status"` untuk output teks, `aria-live="polite"` untuk decode result.
- Tombol on-screen untuk mobile (dot/dash) karena tidak ada arrow keys.
- Reduced motion respect (`prefers-reduced-motion`): matikan animasi pulse.
- Font monospace untuk Morse + tabel agar alignment.
- Shortcut help modal (?) menampilkan semua keybind.

---

## 7. Optimasi & Performance (effective)

1. **Bundle**: tree-shake, `vite build` dengan manual chunks: `vendor-react`, `vendor-ui`, `core` (kecil). Target < 120 kB gzipped initial.
2. **Lazy loading**: routes lazy; `morse-audio.ts` lazy import saat user pertama play (audio engine ~8KB).
3. **Render**: Zustand selectors; `React.memo` pada baris tabel; virtualize tabel jika > 50 baris (TanStack Virtual) — untuk 60 baris belum perlu, tapi siap.
4. **Debounce**: input decode debounced 50ms untuk hindari per-frame recompute.
5. **Audio scheduling**: schedule event ke `AudioContext.currentTime` (akurasi ms), bukan setTimeout berantai.
6. **localStorage**: write debounced (500ms) agar tidak block main thread saat ketikan cepat; serialize hanya diff.
7. **PWA cache**: precache shell + core; runtime cache untuk assets; fallback offline page.
8. **No external runtime deps heavy**: hindari moment/lodash; pakai native.
9. **Profiling**: React Profiler di dev, Lighthouse CI di PR (budget JS < 150KB).

---

## 8. Testing

- **Unit (Vitest)**: `core/encode`, `core/decode`, `core/timing`, `core/drills` (≥ 90% coverage).
  - Edge: karakter tidak dikenal, case-insensitive, spasi, punctuation, SOS.
  - Trie longest-match.
- **Component (RTL)**: MorseDisplay render, DictTable filter/search.
- **E2E (Playwright)**: keyboard input flow, latihan submit, audio button (mock AudioContext), persistence setelah reload.
- **Accessibility**: axe-core di E2E untuk screen-reader basic.
- **Audio**: mock `AudioContext` di unit; E2E cek node creation count.

---

## 9. Deployment

- **Recommended**: Cloudflare Pages (gratis, preview deploy per branch, global edge).
  - Build: `npm run build` → output `dist/`.
  - Cache headers: immutable untuk hashed assets, short untuk index.html.
- Alternatif: Vercel, Netlify, GitHub Pages.
- **PWA**: service worker auto-update; prompt user "update tersedia".
- **Domain**: opsional custom domain (mis. morse.rogarchy.dev).
- **Analytics**: Plausible/Umami (privacy-friendly) opsional v2.

---

## 10. Roadmap / Milestones

| Mile. | Scope | Estimasi |
|---|---|---|
| M0 — Scaffold | Vite+React+TS+Tailwind+Router+Zustand, CI lint/test | 0.5 hari |
| M1 — Core | morse-data + encode/decode + unit tests | 1 hari |
| M2 — Audio | morse-audio scheduler + settings | 1 hari |
| M3 — Trainer | input panah + decode real-time + visual | 1.5 hari |
| M4 — Encoder | teks→morse + play audio | 0.5 hari |
| M5 — Dictionary | tabel + search/filter + click play | 1 hari |
| M6 — Practice | encode/decode drill + scoring + speed test | 2 hari |
| M7 — Settings & Progress | persist, high score, reset | 0.5 hari |
| M8 — PWA + a11y + polish | manifest, SW, a11y pass, responsive | 1 hari |
| M9 — Deploy + E2E | Cloudflare Pages, Playwright CI | 0.5 hari |
| **Total** | | **~9–10 hari** (paruh waktu) |

---

## 11. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Auto-commit timing membingungkan user | Default mati; tooltip + setting; visual countdown |
| Browser autoplay policy (audio butuh user gesture) | Inisialisasi AudioContext pada first keypress/click; tampilkan "klik untuk aktifkan audio" |
| Mobile tanpa keyboard | On-screen buttons dot/dash + besar tap target |
| Morse ambigu (streaming decode) | Longest-match Trie; separator manual default; smart decode opsional |
| Scope creep (multiplayer dll.) | Hold v2; v1 strictly client-only |
| localStorage quota / corrupt | try/catch, fallback, versioned key, migration function |

---

## 12. Keputusan yang Perlu Kamu Konfirmasi

1. **Framework final**: React (A) vs Svelte (B) vs Astro (D)?
2. **Input timing**: manual per-press (default) + opsional auto-commit, atau hold-to-dah?
3. **Bahasa UI**: ID only atau ID/EN toggle?
4. **Scope v1**: apakah fitur **Speed Test WPM** masuk v1 atau v2?
5. **Deploy target**: Cloudflare Pages / Vercel / GitHub Pages?
6. **Nama & domain** proyek?

> Kalau kamu konfirmasi poin 1 & 5, aku bisa langsung scaffold repo (M0) lalu build core (M1–M2).

---

## Appendix A — Morse Table (ringkas)

```
A .-    B -...  C -.-.  D -..   E .     F ..-.  G --.   H ....
I ..    J .---  K -.-   L .-..  M --    N -.    O ---   P .--.
Q --.-  R .-.   S ...   T -     U ..-   V ...-  W .--   X -..-
Y -.--  Z --..
0 ----- 1 .---- 2 ..--- 3 ...-- 4 ....- 5 ..... 6 -.... 7 --...
8 ---.. 9 ----.
. .-.-.-  , --..--  ? ..--..  ' .----.  ! -.-.--  / -..-.  ( -.--.
) -.--.-  & .-...  : ---...  ; -.-.-.  = -...-  + .-.-.  - -....-
_ ..--.-  " .-..-.  $ ...-..-  @ .--.-.  (space) /
SOS ...---...   AR .-.-. (end msg)   BT -...- (break)   SK ...-.- (end)
KN -.--. (invite specific)   HH ........ (error)
```

## Appendix B — Keybind Spec (final default)

```
← ArrowLeft   → dit   (.)
→ ArrowRight  → dah   (-)
Space         → commit huruf (decode simbol aktif)
Enter         → commit kata (spasi)
Backspace     → undo satu simbol / hapus char
Esc           → reset buffer aktif
/             → toggle Encode ↔ Decode
? (Shift+/)   → buka shortcut help
0–9,A–Z (di mode decode drill) → input jawaban huruf
```

## Catatan implementasi audio (snippet referensi)

```ts
// morse-audio.ts
export function beep(ctx: AudioContext, freq: number, durationMs: number, when: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(0.6, when + 0.005);
  gain.gain.setValueAtTime(0.6, when + durationMs/1000 - 0.005);
  gain.gain.linearRampToValueAtTime(0, when + durationMs/1000);
  osc.connect(gain).connect(ctx.destination);
  osc.start(when);
  osc.stop(when + durationMs/1000 + 0.01);
}
// schedule sequence: parse morse string -> events with timing based on WPM
```

---

**Next step**: konfirmasi keputusan (bagian 12), lalu aku scaffold repo + mulai M1. Jika mau, aku juga bisa langsung generate `core/morse-data.ts` + `encode.ts` + `decode.ts` dengan unit tests sekarang (tanpa framework) sebagai fondasi yang bisa dipakai di stack mana pun.
</content>