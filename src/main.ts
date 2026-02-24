import { Viewer, type ModelInfo } from './viewer';


const modelModules = import.meta.glob('/assets/*.{glb,gltf}', { eager: false, query: '?url' });

interface ModelEntry {
    name: string;
    file: string;
}

function fileToName(file: string): string {
    return file
        .replace(/\.gl(b|tf)$/i, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

const MODELS: ModelEntry[] = Object.keys(modelModules).map(path => {
    const file = path.split('/').at(-1) ?? path;
    return { name: fileToName(file), file };
});

// ── DOM refs ──────────────────────────────────────────────────────────────────
const viewport    = document.getElementById('viewport')!;
const modelList   = document.getElementById('model-list')!;
const countNum    = document.getElementById('count-num')!;
const searchInput = document.getElementById('search') as HTMLInputElement;
const statusDot   = document.querySelector('#status') as HTMLElement;
const statusText  = document.getElementById('status-text')!;
const loadingOverlay = document.getElementById('loading-overlay')!;
const emptyState  = document.getElementById('empty-state')!;
const noModelMsg  = document.getElementById('no-model-msg')!;
const modelStats  = document.getElementById('model-stats')!;
const btnReset    = document.getElementById('btn-reset')!;
const btnWire     = document.getElementById('btn-wire')!;
const btnGrid     = document.getElementById('btn-grid')!;
const btnBg       = document.getElementById('btn-bg')!;

// ── Viewer ────────────────────────────────────────────────────────────────────
const viewer = new Viewer(viewport);

// ── State ─────────────────────────────────────────────────────────────────────
let activeItem: HTMLElement | null = null;
let currentFilter = '';

// ── Status helper ─────────────────────────────────────────────────────────────
function setStatus(state: 'idle' | 'loading' | 'ready', text: string) {
    statusDot.className = state === 'loading' ? 'loading' : state === 'ready' ? 'ready' : '';
    statusDot.id = 'status';
    statusText.textContent = text;
}

// ── Model info panel ──────────────────────────────────────────────────────────
function showModelInfo(name: string, info: ModelInfo) {
    noModelMsg.style.display = 'none';
    modelStats.style.display = 'block';
    modelStats.innerHTML = `
        <div class="info-row"><span class="key">Fichier</span><span class="val">${name}</span></div>
        <div class="info-row"><span class="key">Meshes</span><span class="val">${info.meshes}</span></div>
        <div class="info-row"><span class="key">Matériaux</span><span class="val">${info.materials}</span></div>
        <div class="info-row"><span class="key">Triangles</span><span class="val">${info.triangles.toLocaleString('fr')}</span></div>
        <div class="info-row"><span class="key">Dim. X</span><span class="val">${info.dimensions.x}</span></div>
        <div class="info-row"><span class="key">Dim. Y</span><span class="val">${info.dimensions.y}</span></div>
        <div class="info-row"><span class="key">Dim. Z</span><span class="val">${info.dimensions.z}</span></div>
    `;
}

// ── Load model ────────────────────────────────────────────────────────────────
function loadModel(entry: ModelEntry, itemEl: HTMLElement) {
    if (activeItem) activeItem.classList.remove('active');
    activeItem = itemEl;
    itemEl.classList.add('active');

    emptyState.style.display = 'none';
    loadingOverlay.classList.add('visible');
    setStatus('loading', `CHARGEMENT ${entry.file.toUpperCase()}`);

    viewer.loadModel(
        entry.file,
        (info) => {
            loadingOverlay.classList.remove('visible');
            setStatus('ready', `${entry.name.toUpperCase()} — PRÊT`);
            showModelInfo(entry.file, info);
        },
        (err) => {
            loadingOverlay.classList.remove('visible');
            setStatus('idle', `ERREUR — ${entry.file}`);
            console.error('Erreur de chargement :', err);
            noModelMsg.style.display = 'block';
            noModelMsg.textContent = `Erreur : impossible de charger ${entry.file}`;
            modelStats.style.display = 'none';
        }
    );
}

// ── Build list ────────────────────────────────────────────────────────────────
function buildList(filter = '') {
    modelList.innerHTML = '';
    const filtered = MODELS.filter(m =>
        m.name.toLowerCase().includes(filter.toLowerCase()) ||
        m.file.toLowerCase().includes(filter.toLowerCase())
    );

    countNum.textContent = String(filtered.length);

    if (filtered.length === 0) {
        modelList.innerHTML = `<div class="info-row" style="padding:16px 12px;color:var(--text-dim);font-size:10px;">Aucun modèle trouvé</div>`;
        return;
    }

    if (MODELS.length === 0) {
        modelList.innerHTML = `<div id="empty-folder">Aucun fichier .glb trouvé dans <br><code>/public/models/</code></div>`;
        return;
    }

    filtered.forEach(entry => {
        const item = document.createElement('div');
        item.className = 'model-item';

        item.innerHTML = `
            <div class="model-icon">⬡</div>
            <div class="model-info">
                <div class="model-name">${entry.name}</div>
                <div class="model-file">${entry.file}</div>
            </div>
        `;

        item.addEventListener('click', () => loadModel(entry, item));
        modelList.appendChild(item);
    });
}

// ── Search ────────────────────────────────────────────────────────────────────
searchInput.addEventListener('input', () => {
    currentFilter = searchInput.value;
    buildList(currentFilter);
});

// ── Toolbar ───────────────────────────────────────────────────────────────────
btnReset.addEventListener('click', () => viewer.resetCamera());

btnWire.addEventListener('click', () => {
    const on = viewer.toggleWireframe();
    btnWire.classList.toggle('active', on);
});

btnGrid.addEventListener('click', () => {
    const on = viewer.toggleGrid();
    btnGrid.classList.toggle('active', on);
});
btnGrid.classList.add('active'); // grille visible par défaut

btnBg.addEventListener('click', () => {
    const light = viewer.toggleBackground();
    btnBg.classList.toggle('active', light);
});

// ── Init ──────────────────────────────────────────────────────────────────────
buildList();
setStatus('idle', 'EN ATTENTE');