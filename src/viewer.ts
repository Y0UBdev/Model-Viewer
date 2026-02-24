import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface ModelInfo {
    meshes: number;
    materials: number;
    triangles: number;
    dimensions: { x: number; y: number; z: number };
}

export class Viewer {
    private scene = new THREE.Scene();
    private readonly camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;
    private loader: GLTFLoader;

    private current?: THREE.Object3D;
    private readonly grid: THREE.GridHelper;
    private wireframeEnabled = false;
    private lightBg = false;

    private readonly container: HTMLElement;

    constructor(container: HTMLElement) {
        this.container = container;

        // Camera
        const { clientWidth: w, clientHeight: h } = container;
        this.camera = new THREE.PerspectiveCamera(55, w / h, 0.01, 1000);
        this.camera.position.set(4, 3, 4);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(w, h);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        container.appendChild(this.renderer.domElement);

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.07;
        this.controls.minDistance = 0.5;
        this.controls.maxDistance = 200;

        // GLTFLoader avec LoadingManager pour gérer les chemins de base
        const manager = new THREE.LoadingManager();
        this.loader = new GLTFLoader(manager);

        // Lights
        this.setupLights();

        // Background
        this.scene.background = new THREE.Color(0x0a0a0a);

        // Grid
        this.grid = new THREE.GridHelper(20, 20, 0x1e1e1e, 0x161616);
        (this.grid.material as THREE.Material).transparent = true;
        (this.grid.material as THREE.Material).opacity = 0.6;
        this.scene.add(this.grid);

        // Resize
        window.addEventListener('resize', this.onResize);

        // Loop
        this.animate();
    }

    private setupLights() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambient);

        const key = new THREE.DirectionalLight(0xffffff, 1.5);
        key.position.set(5, 10, 5);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        this.scene.add(key);

        const fill = new THREE.DirectionalLight(0x8888ff, 0.4);
        fill.position.set(-5, 5, -5);
        this.scene.add(fill);

        const rim = new THREE.DirectionalLight(0x39ff14, 0.15);
        rim.position.set(0, -5, 0);
        this.scene.add(rim);
    }

    loadModel(url: string, onLoad?: (info: ModelInfo) => void, onError?: (err: unknown) => void) {
        if (this.current) {
            this.scene.remove(this.current);
            this.current = undefined;
        }

        this.loader.load(
            url,
            (gltf: GLTF) => {
                const model = gltf.scene;

                const box = new THREE.Box3().setFromObject(model);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 3 / maxDim;

                model.position.sub(center.multiplyScalar(scale));
                model.scale.setScalar(scale);

                // Shadow support
                model.traverse(obj => {
                    if ((obj as THREE.Mesh).isMesh) {
                        obj.castShadow = true;
                        obj.receiveShadow = true;
                    }
                });

                // Apply wireframe if active
                if (this.wireframeEnabled) this.applyWireframe(model, true);

                this.current = model;
                this.scene.add(model);
                this.fitCamera();

                // Recompute box after scale
                const scaledBox = new THREE.Box3().setFromObject(model);
                const scaledSize = scaledBox.getSize(new THREE.Vector3());

                const info = this.collectInfo(model, scaledSize);
                onLoad?.(info);
            },
            undefined,
            onError
        );
    }

    private collectInfo(model: THREE.Object3D, dims: THREE.Vector3): ModelInfo {
        let meshCount = 0;
        let triCount = 0;
        const matSet = new Set<THREE.Material>();

        model.traverse(obj => {
            const mesh = obj as THREE.Mesh;
            if (!mesh.isMesh) return;
            meshCount++;

            const geo = mesh.geometry;
            if (geo.index) triCount += geo.index.count / 3;
            else if (geo.attributes.position) triCount += geo.attributes.position.count / 3;

            const mat = mesh.material;
            if (Array.isArray(mat)) mat.forEach(m => matSet.add(m));
            else matSet.add(mat);
        });

        return {
            meshes: meshCount,
            materials: matSet.size,
            triangles: Math.round(triCount),
            dimensions: {
                x: parseFloat(dims.x.toFixed(2)),
                y: parseFloat(dims.y.toFixed(2)),
                z: parseFloat(dims.z.toFixed(2)),
            }
        };
    }

    private fitCamera() {
        if (!this.current) return;
        const box = new THREE.Box3().setFromObject(this.current);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const dist = Math.max(size.x, size.y, size.z) * 2;

        this.controls.target.copy(center);
        this.camera.position.copy(center).add(new THREE.Vector3(dist, dist * 0.7, dist));
        this.controls.update();
    }

    resetCamera() { this.fitCamera(); }

    toggleWireframe() {
        this.wireframeEnabled = !this.wireframeEnabled;
        if (this.current) this.applyWireframe(this.current, this.wireframeEnabled);
        return this.wireframeEnabled;
    }

    private applyWireframe(obj: THREE.Object3D, enabled: boolean) {
        obj.traverse(child => {
            const mesh = child as THREE.Mesh;
            if (!mesh.isMesh) return;
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach(m => { (m as THREE.MeshStandardMaterial).wireframe = enabled; });
        });
    }

    toggleGrid() {
        this.grid.visible = !this.grid.visible;
        return this.grid.visible;
    }

    toggleBackground() {
        this.lightBg = !this.lightBg;
        this.scene.background = new THREE.Color(this.lightBg ? 0x1e1e1e : 0x0a0a0a);
        return this.lightBg;
    }

    private onResize = () => {
        const { clientWidth: w, clientHeight: h } = this.container;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    };

    private animate = () => {
        requestAnimationFrame(this.animate);
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    };

    dispose() {
        window.removeEventListener('resize', this.onResize);
        this.renderer.dispose();
    }
}