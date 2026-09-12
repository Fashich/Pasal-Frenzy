# PASAL FRENZY — DEVELOPMENT PLANNING
## Branch Strategy · Git Commit Templates · Hosting · Tech Stack

---

## 1. STRUKTUR BRANCH (Git Flow)

```
main                          ← PRODUCTION (stable, hanya dari development)
└── development               ← STAGING (integrasi semua fitur)
    ├── feature/01-project-setup
    ├── feature/02-zustand-store
    ├── feature/03-threejs-scene
    ├── feature/04-glsl-shaders
    ├── feature/05-phaser-overlay
    ├── feature/06-frenzy-mode
    ├── feature/07-aframe-webxr
    ├── feature/08-audio-system
    ├── feature/09-ui-preload-animations
    ├── feature/10-prolog-puzzle
    ├── feature/11-case-ham-keamanan
    ├── feature/12-case-pasal33-oligarki
    ├── feature/13-case-perppu-singularitas
    ├── feature/14-indexeddb-persistence
    ├── feature/15-performance-lod
    └── feature/16-deployment-cloudflare
```

**Aturan merge:**
- Semua `feature/*` → merge ke `development`
- `development` → merge ke `main` hanya ketika semua fitur fase itu complete + tested
- Tidak ada commit langsung ke `main` atau `development`
- Setiap feature branch dibuat dari `development`, bukan dari `main`

---

## 2. TECH STACK FINAL

```
CORE GAME ENGINE
├── Three.js v0.170+          ← 3D rendering, non-Euclidean space, GLSL shaders
├── Phaser.js v3.80+          ← 2D physics overlay, typography frenzy
├── A-Frame.js v1.6+          ← WebXR abstraction layer
└── Vite 5+                   ← Build tool (ES Modules, code splitting agresif)

STATE MANAGEMENT
└── Zustand v5+               ← ConstitutionalStore (5 slices)

ANIMATION & UI (WEBFLOW-LIKE)
├── GSAP 3 + ScrollTrigger    ← Preload, transitions, cinematic reveals (free untuk open source)
├── Lenis                     ← Smooth scroll (free, open source)
└── Three.js EffectComposer   ← Post-processing pipeline

AUDIO
└── Web Audio API (native)    ← Spatial sound, synthesis, HRTF

REAL-TIME DATA
├── IndexedDB (native)        ← Save system, progress persistence
├── Supabase (free tier)      ← Leaderboard, analytics (TIDAK perlu CC)
└── UUD 1945 JSON             ← Constitutional text bundled lokal

FONTS (Google Fonts — free)
├── "Playfair Display"        ← Display/hero (authoritative, serif)
├── "Space Grotesk"           ← UI labels (modern, geometric)
└── "JetBrains Mono"          ← Legal text (code-like, monospace)

TOOLING
├── TypeScript 5+             ← Type safety
├── ESLint + Prettier         ← Code quality
└── GitHub Actions            ← CI/CD (free untuk public repo)
```

---

## 3. STRUKTUR FOLDER PROJECT

```
pasal-frenzy/
├── src/
│   ├── core/
│   │   ├── engine/
│   │   │   ├── ThreeEngine.ts          ← Three.js scene manager
│   │   │   ├── PhaserEngine.ts         ← Phaser.js overlay manager
│   │   │   ├── AFrameManager.ts        ← WebXR session handler
│   │   │   └── ConstitutionalEventBus.ts ← Custom EventEmitter (penghubung semua)
│   │   ├── store/
│   │   │   ├── ConstitutionalStore.ts  ← Root Zustand store
│   │   │   ├── slices/
│   │   │   │   ├── integritySlice.ts
│   │   │   │   ├── psychologicalSlice.ts
│   │   │   │   ├── pasalInventorySlice.ts
│   │   │   │   ├── audioSlice.ts
│   │   │   │   └── progressSlice.ts
│   │   ├── audio/
│   │   │   ├── AudioEngine.ts          ← AudioContext singleton
│   │   │   ├── SpatialAudio.ts         ← HRTF PannerNode manager
│   │   │   ├── SoundscapeLayer.ts      ← Responsive soundscape
│   │   │   └── synthesizers/
│   │   │       ├── GavelSynth.ts       ← Ketukan palu synthesizer
│   │   │       └── HeartbeatWorklet.ts ← AudioWorkletProcessor
│   │   └── shaders/
│   │       ├── ChromaticAberration.glsl
│   │       ├── SpatialDistortion.glsl
│   │       ├── HyperbolicSpace.glsl
│   │       ├── ConstitutionalAura.glsl
│   │       └── GlitchDOM.ts            ← Browser DOM glitch effect
│   │
│   ├── chapters/
│   │   ├── ChapterInterface.ts         ← Interface yang wajib diimplementasi semua chapter
│   │   ├── prolog/
│   │   │   ├── PrologChapter.ts
│   │   │   └── VoidPuzzleScene.ts
│   │   ├── case-1-ham/
│   │   │   ├── HamCase.ts
│   │   │   └── GlassLabyrinthScene.ts
│   │   ├── case-2-pasal33/
│   │   │   ├── Pasal33Case.ts
│   │   │   └── DigitalSmogScene.ts
│   │   └── case-3-perppu/
│   │       ├── PerpuCase.ts
│   │       └── BrowserCollapseScene.ts
│   │
│   ├── ui/
│   │   ├── preloader/
│   │   │   ├── Preloader.ts            ← Webflow-like loading screen
│   │   │   └── preloader.css
│   │   ├── transitions/
│   │   │   ├── SceneTransition.ts      ← GSAP scene transition
│   │   │   └── ConstitutionalBloom.ts  ← Post-process reveal
│   │   └── hud/
│   │       ├── ConstellationMap.ts     ← Pasal inventory visual
│   │       └── IntegrityIndicator.ts
│   │
│   ├── data/
│   │   ├── uud-1945.json              ← Full teks UUD 1945 + amandemen
│   │   ├── pasal-weights.json         ← Jurisprudential weight per pasal
│   │   └── soundscape-config.json
│   │
│   └── utils/
│       ├── indexeddb/
│       │   ├── GameDB.ts              ← IndexedDB schema & operations
│       │   └── schemas.ts
│       └── performance/
│           ├── LODManager.ts          ← Level of Detail (Web Worker)
│           └── InstancedMeshPool.ts
│
├── public/
│   ├── models/                        ← GLTF assets (buat di Blender, export free)
│   ├── textures/                      ← KTX2 compressed textures
│   ├── audio/                         ← Impulse response files (.wav)
│   └── fonts/
│
├── .github/
│   └── workflows/
│       ├── deploy.yml                 ← Auto-deploy ke Cloudflare Pages
│       └── lint-test.yml              ← Lint + build check on PR
│
├── vite.config.ts
├── tsconfig.json
├── package.json
├── .env.example
└── index.html
```

---

## 4. FASE DEVELOPMENT + GIT COMMIT TEMPLATES

> **Format GitHub Desktop:**
> - **Summary** = field pertama (judul commit, max 72 karakter)
> - **Description** = field kedua (detail, bisa multi-baris)

---

### BRANCH: `feature/01-project-setup`
**Dari branch:** `development`
**Tujuan:** Inisialisasi project Vite + TypeScript + semua dependencies

#### Commit 1
```
Summary:
chore: inisialisasi project Vite + TypeScript untuk Pasal Frenzy

Description:
Setup fondasi project dengan konfigurasi berikut:
- Vite 5 + TypeScript 5 sebagai build tool utama
- Struktur folder src/core, src/chapters, src/ui, src/data, src/utils
- ESLint + Prettier untuk code quality
- TypeScript strict mode enabled
- Path aliases dikonfigurasi (@core, @chapters, @ui, @data, @utils)
- .env.example untuk environment variables
- .gitignore setup (node_modules, dist, .env)
```

#### Commit 2
```
Summary:
chore: install Three.js, Phaser.js, A-Frame, Zustand, GSAP

Description:
Install semua core dependencies:
- three@0.170, @types/three (3D engine + WebGL)
- phaser@3.80 (2D physics overlay)
- aframe@1.6 (WebXR abstraction)
- zustand@5 (state management)
- gsap@3 + @gsap/scrolltrigger (Webflow-like animations)
- lenis (smooth scroll)

Dev dependencies:
- vite-plugin-glsl (load .glsl files langsung)
- vite-plugin-ktx2 (KTX2 texture support)
- vitest (unit testing)
```

#### Commit 3
```
Summary:
chore: konfigurasi Vite untuk code splitting dan GLSL support

Description:
Optimasi vite.config.ts:
- Dynamic import untuk setiap Chapter Module (lazy loading)
- Plugin vite-plugin-glsl untuk import shader .glsl files
- Rollup manual chunks: vendors (three, phaser) dipisah dari app code
- Build output target: dist/ folder
- Asset optimization: textures ke public/textures
- Base URL dikonfigurasi untuk Cloudflare Pages deployment
```

---

### BRANCH: `feature/02-zustand-store`
**Dari branch:** `development`
**Tujuan:** Implementasi ConstitutionalStore dengan 5 slices

#### Commit 1
```
Summary:
feat: buat ConstitutionalStore dengan Zustand (5 slices)

Description:
Implementasi root state management untuk seluruh game:

1. integritySlice — float 0.0-1.0 untuk kesehatan konstitusional
   - action: updateIntegrity(delta, reason) dengan smoothing function
   - selector: getIntegrityLevel, getIntegrityEvents

2. psychologicalSlice — 3 dimensi kesehatan mental karakter:
   - cognitiveLoad (0-1): beban kognitif dari kecepatan respons
   - argumentativeCoherence (0-1): kualitas argumen yang dibangun
   - constitutionalEmpathy (0-1): kedalaman pemahaman konteks humanis
   - computed: overallPsychologicalHealth (weighted average)

3. pasalInventorySlice — inventaris pasal dengan:
   - masteryLevel per pasal (float 0-1)
   - contextualNetwork (adjacency list antar pasal)
   - jurisprudentialWeight (meningkat dinamis)

4. audioSlice — volume, layers aktif, spatial positions

5. progressSlice — chapter progress, unlocked chapters, total play time
```

#### Commit 2
```
Summary:
feat: buat ConstitutionalEventBus sebagai sistem saraf pusat

Description:
Custom EventEmitter yang menghubungkan Three.js, Phaser.js, A-Frame:

Event types yang didefinisikan:
- CONSTITUTIONAL_INTEGRITY_CHANGED: trigger update geometri + audio + physics
- FRENZY_MODE_ACTIVATED: trigger DOM injection + Phaser mode switch
- FRENZY_MODE_DEACTIVATED: rollback DOM effects
- PASAL_COLLECTED: update PasalInventorySlice + visual feedback
- ARGUMENT_CHAINED: calculate argument strength, emit ke audio
- CHAPTER_COMPLETED: save progress ke IndexedDB + trigger transition
- BROWSER_CORRUPTION_START / STOP: untuk Case 3 DOM glitch

Setiap event memiliki typed payload, tidak ada magic strings.
```

---

### BRANCH: `feature/03-threejs-scene`
**Dari branch:** `development`
**Tujuan:** Three.js base scene, kamera, non-Euclidean geometry

#### Commit 1
```
Summary:
feat: setup Three.js scene manager dengan WebGL renderer

Description:
Implementasi ThreeEngine.ts sebagai singleton:
- WebGLRenderer dengan antialias + alpha + logarithmicDepthBuffer
- PerspectiveCamera dengan FOV 75, near 0.1, far 1000
- EffectComposer pipeline: RenderPass → ShaderPasses → OutputPass
- requestAnimationFrame loop dengan delta time
- Window resize handler yang responsive
- Pointer lock API untuk first-person navigation
- Raycaster untuk interaction detection
- Scene graph dengan Layer management (gameplay, UI, debug)
```

#### Commit 2
```
Summary:
feat: implementasi ruang non-Euclidean dengan vertex shader GLSL

Description:
Konstruksi geometri hyperbolic untuk koridor UUD 1945:

HyperbolicSpace.glsl:
- Menerima uniform u_constitutionalIntegrity (0.0-1.0)
- Transformasi Poincaré disk model pada setiap vertex
- Ketika integrity = 1.0: ruang hampir Euclidean (koridor lurus)
- Ketika integrity turun: kurva hyperbolic semakin agresif
- Koridor mulai melengkung, langit-langit mendesak, pintu menjauh
- Parameter: u_hyperbolaCurvature, u_spaceWarpSpeed

ConstitutionalAnchor system:
- Titik-titik stabil di ruang yang mempertahankan geometri Euclidean
- Anchor = pasal-pasal paling fundamental (teks yang solid)
- Radius anchor dikontrol oleh masteryLevel pasal tersebut
```

#### Commit 3
```
Summary:
feat: sistem portal antar argumen dengan render-to-texture

Description:
Portal rendering untuk transisi antar ruang konstitusional:
- Secondary WebGLRenderTarget (bukan full-screen size, proporsional portal)
- Stencil buffer untuk masking area portal yang tepat
- Custom RenderPass yang merender scene "sisi lain" ke tekstur
- Portal material menggunakan tekstur tersebut sebagai albedo
- Portal merepresentasikan transisi antara:
  - Dua argumen hukum yang berlawanan
  - Dua era temporal (untuk Case 3)
  - Dua interpretasi pasal yang berbeda
- Frustum culling: portal hanya render ketika dalam viewport
```

---

### BRANCH: `feature/04-glsl-shaders`
**Dari branch:** `development`
**Tujuan:** Custom post-processing shaders + DOM glitch effect

#### Commit 1
```
Summary:
feat: ChromaticAberrationShader untuk ekspresi krisis demokrasi

Description:
Post-processing shader sebagai indikator utama tekanan konstitusional:

ChromaticAberration.glsl:
- Input: u_constitutionalIntegrity (inverse = semakin krisis, semakin aberrasi)
- Tiga sample RGB dengan offset yang semakin besar saat integrity turun:
  - R channel: offset +n pixel (kanan-bawah)
  - G channel: posisi asli (no offset)
  - B channel: offset -n pixel (kiri-atas)
- Max offset pada integrity 0.0: 15 pixel per channel
- Kurva easing: eksponensial (bukan linear) untuk feel yang lebih dramatis
- Diintegrasikan ke EffectComposer sebagai ShaderPass terakhir sebelum output
```

#### Commit 2
```
Summary:
feat: SpatialDistortionShader untuk distorsi permukaan koridor

Description:
Vertex shader untuk distorsi organik pada geometri koridor:

SpatialDistortion.glsl:
- Simplex noise dalam GLSL (tidak ada directional artifacts)
- u_democracyPressure: akumulasi tekanan narasi yang belum diredakan
- u_temporalFlux: aktif di Case 3 untuk efek manipulasi waktu
- Kombinasi dua parameter = pola distorsi yang unik setiap momen
- Tidak pernah sama di dua momen berbeda (seperti krisis nyata)
- Amplitude noise proporsional dengan pressure level
```

#### Commit 3
```
Summary:
feat: GlitchDOMEffect — browser itu sendiri ikut merasakan krisis

Description:
JavaScript animation system untuk memanipulasi DOM di luar canvas (Case 3):

GlitchDOM.ts — 3 tahap aktivasi progresif:

TAHAP 1 (integrity < 0.40):
- Title bar browser: karakter Unicode aneh disisipkan periodik
- Subtle, hampir tidak terdeteksi, menciptakan rasa "ada yang tidak beres"

TAHAP 2 (integrity < 0.30):
- Scrollbar muncul dan bergerak sendiri (CSS animation)
- Element header/footer mengalami micro-tremor (Web Animations API)
- Menggunakan IntersectionObserver: hanya elemen dalam viewport

TAHAP 3 (integrity < 0.20):
- CSS clip-path animation pada wrapper utama
- "VHS tracking error" — strip horizontal bergeser independen
- DOM Fracture effect: halaman tampak terpecah

AKSESIBILITAS: semua efek off-thread lewat Web Animations API
prefers-reduced-motion: opacity fade lambat menggantikan motion
Tidak ada flash lebih dari 3x/detik (WCAG 2.1 compliant)
```

---

### BRANCH: `feature/05-phaser-overlay`
**Dari branch:** `development`
**Tujuan:** Phaser.js canvas overlay di atas Three.js WebGL

#### Commit 1
```
Summary:
feat: setup Phaser.js sebagai transparent overlay di atas Three.js

Description:
Integrasi dua canvas (Three.js + Phaser.js) dalam satu halaman:
- Three.js canvas: z-index 0, position absolute, full viewport
- Phaser.js canvas: z-index 1, position absolute, pointer-events: none
  (kecuali saat active interaction zones)
- Phaser config: transparent background, Matter.js physics engine
- Physics gravity: dikontrol oleh integritySlice (bukan konstanta)
- Kedua canvas sync resize dengan ResizeObserver
- Event forwarding: Phaser events dikirim ke ConstitutionalEventBus
```

#### Commit 2
```
Summary:
feat: sistem fisika tipografi — kata sebagai rigid body bermassa

Description:
Implementasi Matter.js physics untuk kata-kata UUD 1945:

PasalPhysicsBody.ts:
- Setiap kata = RigidBody dengan geometri collision dari pixel dimension teks
- Massa ditentukan oleh multi-faktor algorithm:
  - Frekuensi kata dalam korpus yurisprudensi MK (dari pasal-weights.json)
  - Bobot normatif pasal yang mengandungnya (hierarki norma)
  - Relevansi terhadap kasus aktif (diupdate per scene)
- Kata fundamental ("kedaulatan", "keadilan"): massa sangat besar
- Konjungsi/preposisi: massa ringan, sangat responsif
- Elastisitas: mencerminkan fleksibilitas interpretasi hukum

TypographyRenderer.ts:
- Canvas text dengan shadow + glow effect per kata
- Font: JetBrains Mono (monospace, feel dokumen legal)
- Ukuran font proporsional terhadap jurisprudentialWeight
- Warna: biru gelap (konstitusional solid) / merah (antagonis) / abu (netral)
```

---

### BRANCH: `feature/06-frenzy-mode`
**Dari branch:** `development`
**Tujuan:** Mode Frenzy mechanics + DOM Injection Protocol

#### Commit 1
```
Summary:
feat: Mode Frenzy — tipografi jatuh dengan gravitasi variabel

Description:
State gameplay paling intens, trigger ketika:
- integritySlice < 0.35 DAN
- psychologicalSlice.cognitiveLoad > 0.7

Mekanik saat aktif:
- Kata-kata UUD 1945 berjatuhan dari atas canvas
- Gravitasi divariasikan per kata: kata sangat relevan jatuh cepat
  (urgen untuk digunakan), kata kurang relevan mengambang lambat
- Pemain drag-and-drop kata ke area "rantai argumen"
- Batas waktu per gelombang serangan (timer visual di perimeter canvas)

DOMInjectionProtocol.ts:
- Aktivasi bersamaan dengan Frenzy Mode
- requestAnimationFrame-based: tidak pernah memblokir rendering
- CSS filter pada body: hue-rotate(15deg), saturate(1.4)
- Micro-tremor: CSS animation 0.3deg rotation pada html element
- Akan dinonaktifkan otomatis ketika Frenzy Mode berakhir
```

#### Commit 2
```
Summary:
feat: sistem rantai argumen dengan XPBD rope physics

Description:
ArgumentChain.ts — constraint-based rope physics:
- Kata yang dipilih pemain membentuk joint-joint dalam rantai
- XPBD (Extended Position-Based Dynamics) untuk stabilitas tinggi
- Kekakuan joint tergantung kekuatan koneksi gramatikal+hukum:
  - Koneksi kuat (subjek-predikat hukum jelas): joint rigid
  - Koneksi lemah (pasal tidak relevan dipaksakan): joint fleksibel
  - Joint lemah putus saat terkena tekanan serangan
- Proyeksi rantai ke arah serangan: kalkulasi trajectory + collision
- Hasil sukses: "Legal Resonance Field" — shield sementara (2-3 detik)
  Visualisasi: persegi panjang bercahaya di area serangan

CorruptiveParticle.ts — jenis partikel antagonis:
- Corporate interest: bentuk koin emas, pola spiral, sangat destruktif
- Populist manipulation: gelombang diffuse, hanya bisa dilawan frasa penuh
- Executive overreach: balok hitam berat, butuh multi-pasal untuk dilawan
- Setiap jenis: simplex noise path (tidak pernah sama dua kali)
```

---

### BRANCH: `feature/07-aframe-webxr`
**Dari branch:** `development`
**Tujuan:** A-Frame.js custom components + WebXR session management

#### Commit 1
```
Summary:
feat: integrasi A-Frame dengan Three.js renderer (shared scene)

Description:
AFrameManager.ts — A-Frame menggunakan Three.js renderer yang sama:
- Tidak membuat WebGLRenderer baru (overhead hilang)
- A-Frame mengelola: WebXR session, controller input, head tracking
- Custom A-Frame components yang memanfaatkan existing scene graph:
  - constitutional-aura: shell bercahaya (frekuensi = stabilitas pasal)
  - pasal-gravity-well: attracts nearby Phaser.js physics bodies
  - democratic-health-indicator: organic geometry berdetak di pusat arena

WebXR session lifecycle:
- Modus flat (default): mouse + keyboard + touch
- Toggle WebXR: click tombol atau trigger naratif otomatis
- Transisi 4 detik: kamera diving ke dalam scene
- Modus XR: controller input, gaze interaction, binaural audio
```

#### Commit 2
```
Summary:
feat: cinematic WebXR entry transition dengan GSAP

Description:
WebXRTransition.ts — transisi flat → immersive sebagai experience naratif:

Fase 1 (0-1.5 detik): kamera bergerak dari "luar" scene ke "dalam"
- GSAP tween: camera.position.z dari -5 ke 0 dengan cubic bezier
- Dinding-dinding mulai membungkus kamera dari tepi layar
- DOM overlay UI (HUD) pelan-pelan lepas dari screen-space ke world-space

Fase 2 (1.5-3 detik): elemen UI menjadi panel holografik 3D
- GSAP tween: posisi panel dari 2D screen corners ke 3D world positions
- Panel melayang di sekitar pemain dalam 360 derajat

Fase 3 (3-4 detik): WebXR session resmi diinisialisasi
- navigator.xr.requestSession('immersive-vr') atau 'immersive-ar'
- Graceful fallback: jika device tidak support XR, stay di flat mode
- Informasi device capabilities di-cache untuk decision making
```

---

### BRANCH: `feature/08-audio-system`
**Dari branch:** `development`
**Tujuan:** Web Audio API spatial sound + responsive soundscape

#### Commit 1
```
Summary:
feat: AudioEngine — Web Audio API singleton dengan spatial HRTF

Description:
AudioEngine.ts:
- AudioContext singleton (diinisialisasi setelah user gesture pertama)
- Node graph: Sources → ChannelSplitter → Processing → MasterGain → Output
- ConvolverNode dengan impulse response:
  - Ruang pengadilan (Case 1 — HAM)
  - Koridor digital (Case 2 — Pasal 33)
  - Ruang krisis executive (Case 3 — Perppu)
- DynamicsCompressorNode: tidak ada clipping saat intensitas tinggi
- PannerNode dengan model HRTF: suara 3D dari posisi spesifik
  - Posisi PannerNode di-update setiap frame dari Three.js world position
  - Partikel koruptif memiliki PannerNode masing-masing
  - Pemain bisa "menutup mata" dan masih tahu posisi ancaman

ResponsiveSoundscape.ts:
- Layer audio yang dikontrol oleh state berbeda:
  - ConstitutionalFoundation: drone low 110Hz-82.5Hz (pitch turun = integritas turun)
  - CrisisLayer: aktif ketika integrity < 0.4
  - FrenzyLayer: aktif saat Mode Frenzy
```

#### Commit 2
```
Summary:
feat: GavelSynth + HeartbeatWorklet — audio synthesis prosedural

Description:
GavelSynth.ts — ketukan palu hakim (synthesized, bukan sampel):
- Dua OscillatorNode + BiquadFilterNode (bandpass) + GainNode (envelope)
- Envelope: attack hampir instantaneous, decay cepat (karakter perkusif)
- Konteks "menang": frekuensi dasar ~80Hz (berat, finalis)
- Konteks "kalah": frekuensi ~200Hz (harsh, tidak memuaskan)
- Dipaanggil dari ChapterInterface saat argumen selesai

HeartbeatWorklet.ts — AudioWorkletProcessor (dedicated audio thread):
- Tidak pernah dropout bahkan ketika main thread sedang berat
- Model synthesis: "lub" (kontraksi ventrikel) + "dub" (penutupan katup)
- Interval dikontrol real-time oleh overallPsychologicalHealth:
  - Health 1.0 → interval 900ms (tenang)
  - Health 0.0 → interval 450ms + jitter random (panik/aritmik)
- Whisper oligarki: formant synthesis (harmonik OscillatorNode + filter)
  Tidak pernah terdengar jelas — ambiguous dan mengancam sekaligus
```

---

### BRANCH: `feature/09-ui-preload-animations`
**Dari branch:** `development`
**Tujuan:** Webflow-like preloader + UI aesthetics + custom cursor

#### Commit 1
```
Summary:
feat: preloader cinematic bergaya Webflow dengan GSAP

Description:
Preloader.ts — loading experience yang merupakan bagian dari narasi:

Visual elements:
- Background: #080810 (near-black, deep space feel)
- Logo "PASAL FRENZY" dengan font Playfair Display 72px
- Teks Indonesia Merah: #DC2626 untuk "PASAL"
- Teks Putih: #F8F8F8 untuk "FRENZY"
- Animasi teks: SplitText manual (per character reveal, stagger 0.03s)
- Progress bar: lurus, tipis, berwarna gradient merah → putih
- Teks quote UUD 1945 yang berganti-ganti saat loading
- Subtle noise texture overlay: CSS SVG filter feTurbulence

Loading sequence (GSAP timeline):
0.0s: Logo masuk dari bawah (y: 40 → 0, opacity: 0 → 1, ease: power2.out)
0.5s: Quote text fade in (opacity: 0 → 0.6)
Async: asset loading (Three.js textures, GLTF models, audio buffers)
Done: logo zoom out + scene reveal dengan circular clip-path wipe
```

#### Commit 2
```
Summary:
feat: custom cursor + Webflow-like scene transitions

Description:
CustomCursor.ts — cursor khusus bergaya premium:
- Dua elemen: dot kecil (4px, instant follow) + ring besar (40px, lag follow)
- Ring menggunakan lerp: position = lerp(current, target, 0.1) per frame
- Hover state: ring expand + fill translucent merah
- Click state: ring collapse cepat lalu kembali
- Cursor tersembunyi dalam mode WebXR (diganti gaze indicator)

SceneTransition.ts — transisi antar chapter (GSAP):
- Tipe "Constitutional Dive": kamera bergerak ke dalam teks pasal
- Tipe "Void Collapse": black hole shrink + expand
- Tipe "Chromatic Shatter": aberrasi chromatic maksimum → cut
- Durasi standar: 800ms (tidak terlalu lama, tidak terlalu cepat)
- Setiap transisi memiliki audio signature yang berbeda

Typography system global:
- CSS custom properties untuk type scale
- Playfair Display: hero text, pasal quotes (authoritative)
- Space Grotesk: UI labels, metadata (modern)
- JetBrains Mono: legal text bodies (code-document feel)
- Semua dari Google Fonts CDN (free, cached by browser)
```

---

### BRANCH: `feature/10-prolog-puzzle`
**Dari branch:** `development`
**Tujuan:** Opening puzzle — merangkai 4 alinea Pembukaan UUD 1945

#### Commit 1
```
Summary:
feat: prolog puzzle — kata Pembukaan UUD 1945 tersebar di void

Description:
PrologChapter.ts implements ChapterInterface:

VoidScene:
- Ruang gelap total (#000005 background)
- Partikel cahaya putih kekuningan mengambang (simplex noise motion)
- Setiap partikel = satu kata dari Pembukaan UUD 1945
- Distribusi spasial dikalibrasi: kata satu alinea tidak terlalu jauh
- Tidak ada instruksi teks — hanya satu petunjuk: beberapa kata lebih terang

SemanticResonance system (Web Worker):
- Setiap kata = vektor embedding dari uud-1945.json
- Ketika dua kata dalam proximity 3D units: hitung dot product
- Dot product tinggi → resonansi visual kuat (cahaya arc antara keduanya)
- Dot product rendah → resonansi lemah atau tidak ada
- Threshold: dot product > 0.7 = terlihat oleh pemain
- Gravitasi narratif: kata satu alinea saling attract dengan force sangat kecil

Kristalisasi alinea:
- Semua kata satu alinea berhasil dirangkai = panel kristal muncul
- Material: MeshPhysicalMaterial, roughness 0, metalness 0.1, transmission 0.8
- Berputar perlahan di posisi yang tepat di ruang

Constitutional Ignition (semua 4 alinea selesai):
- 4 panel kristal bergerak ke formasi kubus
- Ledakan cahaya (PointLight + shader bloom) → dunia game muncul
- Audio: crescendo sintetis dari drone dasar ke orchestral swell
```

---

### BRANCH: `feature/11-case-ham-keamanan`
**Dari branch:** `development`
**Tujuan:** Kasus 1 — HAM vs Keamanan Negara, labirin kaca Pasal 28A-28J

#### Commit 1
```
Summary:
feat: Case 1 HAM — labirin kaca dari Pasal 28A-28J UUD 1945

Description:
HamCase.ts implements ChapterInterface:

GlassLabyrinthScene:
- Koridor dinding kaca dari Pasal 28A hingga 28J
- Material kaca: MeshPhysicalMaterial (transmission 0.9, roughness 0.0, ior 1.5)
- Setiap panel = satu sub-pasal, teks dirender sebagai canvas texture
- Ukuran font proporsional: lebih besar = lebih banyak dikutip yurisprudensi
- Refleksi cahaya: simplified raytracing untuk "argumen beam" biru

ShadowEntity.ts — entitas antagonis:
- SkinnedMesh dengan procedural animation (bukan GLTF animation)
- Material: MeshStandardMaterial, roughness 1.0, metalness 0.0, hitam pekat
- Gerakan: lambat tapi konstan, tidak bisa dihentikan total
- Ketika menyentuh panel kaca: kaca mulai retak (DisposableGeometry update)
- Merepresentasikan argumen otoriter pasal 28J ayat 2

Constitutional Stress Test (klimaks):
- Semua panel kaca mencapai threshold retak → Frenzy Mode trigger
- Teks dari kaca yang pecah jatuh sebagai fragmen tipografi fisika
- Pemain harus merangkai argumen dari Tembok Hak (win condition)
```

---

### BRANCH: `feature/12-case-pasal33-oligarki`
**Dari branch:** `development`
**Tujuan:** Kasus 2 — Pasal 33, GPGPU particle simulation, Monopoli Nodes

#### Commit 1
```
Summary:
feat: Case 2 Pasal33 — GPGPU particle system untuk polusi digital

Description:
Pasal33Case.ts implements ChapterInterface:

DigitalSmogScene — initialized dalam kondisi tercemar:
- GPUComputationRenderer (Three.js addon) untuk particle simulation
- Compute shader: posisi + velocity + color per partikel di GPU
- Hingga 1.000.000 partikel di hardware memadai
- Adaptive LOD: pada hardware lemah, jumlah partikel diturunkan otomatis
  WebGL capabilities check: MAX_TEXTURE_SIZE, available VRAM estimate
- Partikel merepresentasikan data stream: hijau kebiruan, semi-transparent

GravityAnchor system (Pasal 33 sebagai gravitasi):
- Pemain menempatkan anchor di titik strategis arena (max 3 anchor)
- Anchor dikonfigurasi dari teks Pasal 33 ayat 1, 2, atau 3
- Setiap anchor = custom gravity field: force ∝ 1/distance²
- Partikel yang masuk field: warna berubah hijau → merah-putih → meledak
- Ledakan membersihkan area radius 10 unit (visual + mekanik)

MonopoliNode.ts — antagonis fractal network:
- Fractal geometry: IcosahedronGeometry subdivided + noise displacement
- Tumbuh di corner arena dari partikel yang terkumpul
- Adjacency matrix: hub node menghubungkan multiple sub-nodes
- Scale-free network topology: hub dengan banyak koneksi
- Penghancuran hub dengan Pasal 33 ayat 2 projection (text physics)
```

---

### BRANCH: `feature/13-case-perppu-singularitas`
**Dari branch:** `development`
**Tujuan:** Kasus 3 — Perppu, time manipulation, browser collapse

#### Commit 1
```
Summary:
feat: Case 3 Perppu — sistem snapshot timeline dan Constitutional Rewind

Description:
PerpuCase.ts implements ChapterInterface:

TimelineEngine.ts — snapshot setiap 500ms:
- Snapshot mencakup: Three.js scene positions, Matter.js World.toJSON,
  semua shader uniforms, full ConstitutionalStore JSON
- Simpan di circular buffer (max 60 snapshot = 30 detik history)
- Constitutional Rewind (ability):
  - Hanya bisa diaktifkan setelah merangkai Pasal 22 ayat 3 lengkap
  - Interpolasi smooth antara snapshot N dan N-K
  - Semua elemen visual mundur simultan dan tersinkronisasi
  - Audio: pitch-shifted reverse playback dari current soundscape
  - Visual: chromatic aberration meningkat saat rewind, normal saat selesai
  - Resource cost tinggi: cooldown 10 detik setelah setiap rewind

BrowserCorruptionProtocol.ts (4 tahap, dikontrol integrity level):
- 0.40: title bar character injection (Unicode spoofing)
- 0.30: scrollbar behavior anomaly + micro-tremor header
- 0.20: clip-path animation (VHS tracking error effect)
- 0.10: DOM Fracture maximum — semua tahap aktif simultan
- Rollback otomatis: semua CSS properties di-reset saat chapter selesai
- WCAG 2.1 compliant: tidak ada flash > 3x/detik, reduced-motion honored
```

---

### BRANCH: `feature/14-indexeddb-persistence`
**Dari branch:** `development`
**Tujuan:** Save system dengan IndexedDB + Constellation Map

#### Commit 1
```
Summary:
feat: IndexedDB save system — progres persistent lintas sesi

Description:
GameDB.ts — IndexedDB schema dengan 4 Object Stores:

1. player_profile: { id, name, createdAt, preferences, totalPlayTime }
2. chapter_progress: { chapterId PK, lastState JSON, completedAt, attempts }
3. pasal_mastery: { pasalId PK, masteryLevel, contextualNetwork, jurWeight,
                    lastUsed, usageHistory[] }
4. constitutional_history: { id autoIncrement, chapterId, argumentChain[],
                              outcome, timestamp } — append-only log

IndexedDB wrapper:
- Promise-based API (bukan callback)
- Versioning dengan onupgradeneeded handler
- Batch write menggunakan single transaction (performa)
- Offline support: save tetap berjalan tanpa koneksi internet
- TIDAK mengirim data ke server tanpa consent eksplisit pemain

ConstellationMap.ts — visualisasi PasalInventory:
- Three.js scene terpisah (PiP — picture in picture, pojok kanan atas)
- Setiap pasal = bintang (SphereGeometry kecil + PointLight)
- Brightness bintang = masteryLevel
- Koneksi antar pasal = Line3 (ContextualNetwork adjacency)
- Hover: tooltip menampilkan pasal text + mastery percentage
- Click: zoom ke pasal tersebut, tampilkan usage history
```

---

### BRANCH: `feature/15-performance-lod`
**Dari branch:** `development`
**Tujuan:** LOD, geometry instancing, Web Workers, 60fps target

#### Commit 1
```
Summary:
perf: LODManager via Web Worker + dithered LOD transitions

Description:
LODManager.ts (berjalan di Web Worker terpisah):
- Kalkulasi LOD tidak pernah memakan frame budget main thread
- Untuk setiap mesh dalam scene, 4 level:
  - LOD 0 (< 20 units): mesh penuh, semua detail geometri
  - LOD 1 (20-60 units): 40% polygon count dari LOD 0
  - LOD 2 (60-150 units): 10% polygon count
  - LOD 3 (> 150 units): billboard impostor (quad + pre-rendered texture)
- Dithered transition: perubahan level tidak abrupt
  Dithering pattern: gradual mix dua LOD level di border zone
  Mencegah "popping" yang merusak immersivitas

InstancedMeshPool.ts:
- InstancedMesh untuk semua geometri yang muncul berulang
- Partikel koruptif: satu draw call untuk ribuan instansi
- InstancedBufferAttribute untuk transform + color per-instansi
- Dirty flagging: hanya update GPU data untuk instansi yang berubah
- Transfer data ke GPU via Transferable ArrayBuffer (zero-copy)

Physics optimization (Matter.js):
- Uniform grid spatial partitioning: broad-phase O(n) bukan O(n²)
- Physics sleeping: rigid body diam = otomatis sleep mode
- Active zone: physics penuh hanya untuk kata dekat kursor
  Kata jauh: kinematic sederhana (lerp ke target position)
```

---

### BRANCH: `feature/16-deployment-cloudflare`
**Dari branch:** `development`
**Tujuan:** CI/CD + Cloudflare Pages + domain gratis + production config

#### Commit 1
```
Summary:
chore: setup GitHub Actions CI/CD untuk auto-deploy ke Cloudflare Pages

Description:
.github/workflows/deploy.yml:
- Trigger: push ke branch 'main'
- Steps:
  1. Checkout repository
  2. Setup Node.js 20 (LTS)
  3. npm ci (clean install, lebih cepat dari npm install)
  4. npm run build (Vite production build ke /dist)
  5. Deploy ke Cloudflare Pages via wrangler action
     (CLOUDFLARE_ACCOUNT_ID dan CLOUDFLARE_API_TOKEN dari GitHub Secrets)
- Production URL: https://pasal-frenzy.pages.dev
  Atau custom domain jika sudah setup

.github/workflows/lint-check.yml:
- Trigger: push ke semua branch + pull request ke development
- Steps: npm ci → npm run lint → npm run build (cek tidak ada build error)
- Tidak boleh merge ke development jika check ini gagal

Cara setup Cloudflare Pages (gratis, tanpa CC):
1. Buat akun di cloudflare.com (email saja, tidak perlu CC)
2. Dashboard → Pages → Create application → Connect to Git
3. Pilih repository GitHub ini
4. Build settings: Framework = Vite, Build command = npm run build, Output = dist
5. Environment variables: tambahkan VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
6. Save & Deploy → dapat domain otomatis: pasal-frenzy.pages.dev
```

#### Commit 2
```
Summary:
chore: konfigurasi domain gratis via is-a.dev (pasalfrenzy.is-a.dev)

Description:
CARA MENDAPATKAN DOMAIN GRATIS TANPA CC:

Opsi A — is-a.dev (RECOMMENDED, 24-48 jam approval):
1. Fork repo: https://github.com/is-a-dev/register
2. Buat file: domains/pasalfrenzy.json dengan isi:
   {
     "description": "Indonesian Constitutional Law Web Game",
     "repo": "https://github.com/[username]/pasal-frenzy",
     "owner": { "username": "[github-username]", "email": "[email]" },
     "record": {
       "CNAME": "pasal-frenzy.pages.dev"
     }
   }
3. Buat Pull Request ke repo is-a-dev/register
4. Setelah approved: domain pasalfrenzy.is-a.dev aktif otomatis
5. Di Cloudflare Pages: Settings → Custom domains → Add domain
   → Masukkan pasalfrenzy.is-a.dev → Save

Opsi B — Langsung pakai pages.dev (INSTANT, tidak perlu setup):
- Domain: https://pasal-frenzy.pages.dev
- Sudah HTTPS otomatis, global CDN
- Tidak perlu konfigurasi apapun, siap pakai setelah deploy

Opsi C — GitHub Pages dengan custom action:
- Domain: https://[username].github.io/pasal-frenzy
- Setup: Vite base URL = /pasal-frenzy/ di vite.config.ts
- GitHub → Settings → Pages → Source: GitHub Actions
```

#### Commit 3
```
Summary:
chore: vite.config.ts produksi — build optimization untuk gratis hosting

Description:
Konfigurasi build khusus untuk Cloudflare Pages free tier:
- Code splitting: setiap Chapter Module = chunk terpisah (lazy loaded)
- Vendor chunk: three.js + phaser.js + aframe dipisah dari app code
- Asset hashing: cache busting otomatis
- Terser minification: mangling + compression agresif
- Tree shaking: hapus code tidak terpakai dari bundle
- Target: es2020 (kompatibel semua modern browser)
- Source maps: hanya untuk development (disable di production build)
- KTX2 textures: vite-plugin-ktx2 otomatis compress saat build

Service Worker (PWA untuk offline play):
- Workbox strategy: NetworkFirst untuk API, CacheFirst untuk assets
- Pre-cache: shell + prolog chapter (minimal agar bisa offline)
- Runtime cache: chapter modules dimuat online, cached setelah download
- Update strategy: background sync, prompt user untuk refresh

Environment variables yang diperlukan di Cloudflare Dashboard:
- VITE_SUPABASE_URL (untuk leaderboard, opsional)
- VITE_SUPABASE_ANON_KEY (untuk leaderboard, opsional)
- VITE_APP_VERSION (untuk cache invalidation)
```

---

## 5. URUTAN MERGE KE DEVELOPMENT

```
Phase 1 — Foundation (bisa parallel):
  feature/01-project-setup → development
  feature/02-zustand-store → development

Phase 2 — Engine (setelah Phase 1):
  feature/03-threejs-scene → development
  feature/04-glsl-shaders → development (setelah 03 merge)
  feature/05-phaser-overlay → development (setelah 03 merge)
  feature/08-audio-system → development (bisa parallel dengan 03-05)

Phase 3 — Mechanics (setelah Phase 2):
  feature/06-frenzy-mode → development (butuh 05 sudah merge)
  feature/07-aframe-webxr → development (butuh 03 sudah merge)

Phase 4 — UI (setelah Phase 2, bisa parallel dengan Phase 3):
  feature/09-ui-preload-animations → development

Phase 5 — Content/Levels (setelah semua Phase 1-3):
  feature/10-prolog-puzzle → development
  feature/11-case-ham-keamanan → development
  feature/12-case-pasal33-oligarki → development
  feature/13-case-perppu-singularitas → development

Phase 6 — Polish (setelah semua levels done):
  feature/14-indexeddb-persistence → development
  feature/15-performance-lod → development

Phase 7 — Deploy (terakhir):
  feature/16-deployment-cloudflare → development

SETELAH SEMUA MERGE KE DEVELOPMENT DAN TESTED:
  development → main (Production Release v1.0.0 MVP)
```

---

## 6. COMMIT UNTUK MERGE KE DEVELOPMENT

Setiap kali merge feature branch ke development, buat merge commit dengan format ini:

```
Summary:
Merge feature/[nama-branch] into development

Description:
Branch: feature/[nama]
Status: Complete ✓

Fitur yang ditambahkan:
- [ringkasan poin utama dari branch ini]
- [poin 2]
- [poin 3]

Testing:
- [apa yang sudah dicoba / dicek]

Notes untuk branch berikutnya:
- [hal yang perlu diperhatikan]
```

---

## 7. COMMIT FINAL: DEVELOPMENT → MAIN

```
Summary:
release: Pasal Frenzy v1.0.0 MVP — Indonesian Constitutional Law Web Game

Description:
PASAL FRENZY v1.0.0 — Minimum Viable Product Release

Konten yang tersedia:
- Prolog: Puzzle spasial Pembukaan UUD 1945 (4 alinea)
- Case 1: Labirinto Hakiki — HAM vs Keamanan Negara (Pasal 28A-28J)
- Case 2: Oligarki Digital — Pasal 33 sebagai gravitasi konstitusional
- Case 3: Singularitas Perppu — browser itu sendiri runtuh (Pasal 22)

Tech stack:
- Three.js 0.170 + Phaser.js 3.80 + A-Frame 1.6
- Zustand 5 (state management)
- GSAP 3 + Lenis (Webflow-like animations)
- Web Audio API (spatial soundscape)
- Custom GLSL shaders (chromatic aberration, spatial distortion)
- IndexedDB (save system)

Hosting:
- Cloudflare Pages (free, no CC required)
- Domain: pasalfrenzy.is-a.dev / pasal-frenzy.pages.dev
- Global CDN, HTTPS otomatis, ~50ms response time APAC

Performance target:
- 60fps pada laptop mid-range (Intel Iris Xe / AMD Radeon Vega)
- Time to Interactive: < 2 detik pada koneksi broadband
- Offline play: prolog + case 1 tersedia setelah pertama dibuka
```

---

## 8. RINGKASAN TOTAL BRANCH

| # | Branch Name | Phase | Depends On |
|---|---|---|---|
| — | `main` | — | development |
| — | `development` | — | feature branches |
| 1 | `feature/01-project-setup` | Foundation | — |
| 2 | `feature/02-zustand-store` | Foundation | — |
| 3 | `feature/03-threejs-scene` | Engine | 01, 02 |
| 4 | `feature/04-glsl-shaders` | Engine | 03 |
| 5 | `feature/05-phaser-overlay` | Engine | 03 |
| 6 | `feature/06-frenzy-mode` | Mechanics | 05 |
| 7 | `feature/07-aframe-webxr` | Mechanics | 03 |
| 8 | `feature/08-audio-system` | Engine | 02 |
| 9 | `feature/09-ui-preload-animations` | UI | 03, 04 |
| 10 | `feature/10-prolog-puzzle` | Content | 01-09 |
| 11 | `feature/11-case-ham-keamanan` | Content | 01-09 |
| 12 | `feature/12-case-pasal33-oligarki` | Content | 01-09 |
| 13 | `feature/13-case-perppu-singularitas` | Content | 01-09 |
| 14 | `feature/14-indexeddb-persistence` | Polish | 01-13 |
| 15 | `feature/15-performance-lod` | Polish | 01-13 |
| 16 | `feature/16-deployment-cloudflare` | Deploy | 01-15 |

**Total: 16 feature branches + development + main = 18 branches**
