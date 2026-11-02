import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const container = document.querySelector('#logo-3d-container');
const hero = document.querySelector('#intro');
const loaderLabel = document.querySelector('#hero-loader span');

if (!container || !hero) {
    window.dispatchEvent(new CustomEvent('ouldesign:model-error'));
} else {
    try {
        startLogoExperience();
    } catch (error) {
        console.error('A experiência 3D não pôde ser iniciada.', error);
        window.dispatchEvent(new CustomEvent('ouldesign:model-error'));
    }
}

function startLogoExperience() {
    const glassStyle = {
        material: {
            color: 0x9fbfc5,
            metalness: 0.08,
            roughness: 0.12,
            transmission: 0.62,
            thickness: 0.45,
            ior: 1.45,
            clearcoat: 1,
            clearcoatRoughness: 0.05,
            envMapIntensity: 1.5,
            attenuationColor: 0xd8f0f3,
            attenuationDistance: 2.2,
            side: THREE.DoubleSide
        },
        exposure: 0.9,
        lighting: {
            ambientColor: 0xd4e2ec,
            groundColor: 0x080b10,
            ambientIntensity: 0.35,
            keyIntensity: 2.2,
            fillColor: 0x8acbd8,
            fillIntensity: 0.9,
            rimColor: 0xc0e7ef,
            rimIntensity: 1.4
        },
        studio: {
            background: 0x080d12,
            blur: 0.04,
            readyDelay: 1500,
            panels: [
                { color: 0xffffff, intensity: 3.5, size: [1.7, 7], position: [-4, 1, 2] },
                { color: 0x83cadd, intensity: 2, size: [1.25, 6], position: [4, 0.5, -1] },
                { color: 0xdce8ed, intensity: 0.8, size: [5, 2.5], position: [0, 5, 1] }
            ]
        }
    };
    const glassMaterials = new Set();
    let renderer;

    try {
        renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        });
    } catch (error) {
        console.error('WebGL não pôde ser iniciado.', error);
        window.dispatchEvent(new CustomEvent('ouldesign:model-error'));
        return;
    }

    const scene = new THREE.Scene();
    const rotationGroup = new THREE.Group();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100);

    scene.add(rotationGroup);

    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = glassStyle.exposure;
    container.replaceChildren(renderer.domElement);

    // Cena usada somente para reflexos; os painéis não entram na cena da logo.
    let environmentTarget = null;
    let environmentStarted = false;
    let environmentTimer = 0;
    let introObserver = null;

    function createStudioEnvironment() {
        let pmrem = null;
        const studio = new THREE.Scene();
        const panelGeometry = new THREE.PlaneGeometry(1, 1);
        const panelMaterials = [];
        const rendererState = {
            target: renderer.getRenderTarget(),
            cubeFace: renderer.getActiveCubeFace(),
            mipLevel: renderer.getActiveMipmapLevel(),
            toneMapping: renderer.toneMapping,
            autoClear: renderer.autoClear,
            xrEnabled: renderer.xr.enabled
        };

        try {
            studio.background = new THREE.Color(glassStyle.studio.background);

            glassStyle.studio.panels.forEach(({ color, intensity, size, position }) => {
                const material = new THREE.MeshBasicMaterial({
                    color: new THREE.Color(color).multiplyScalar(intensity),
                    side: THREE.DoubleSide,
                    toneMapped: false
                });
                panelMaterials.push(material);

                const panel = new THREE.Mesh(panelGeometry, material);
                panel.scale.set(size[0], size[1], 1);
                panel.position.fromArray(position);
                panel.lookAt(0, 0, 0);
                studio.add(panel);
            });

            pmrem = new THREE.PMREMGenerator(renderer);
            environmentTarget = pmrem.fromScene(studio, glassStyle.studio.blur);
            scene.environment = environmentTarget.texture;
        } catch (error) {
            // As luzes diretas abaixo mantêm a logo visível sem o ambiente.
            console.warn('Ambiente de reflexos indisponível; mantendo as luzes da logo.', error);
        } finally {
            renderer.setRenderTarget(rendererState.target, rendererState.cubeFace, rendererState.mipLevel);
            renderer.toneMapping = rendererState.toneMapping;
            renderer.autoClear = rendererState.autoClear;
            renderer.xr.enabled = rendererState.xrEnabled;
            pmrem?.dispose();
            panelGeometry.dispose();
            panelMaterials.forEach((material) => material.dispose());
            studio.clear();
        }
    }

    function scheduleStudioEnvironment() {
        if (!model || !document.body.classList.contains('intro-complete')) return;
        introObserver?.disconnect();
        if (environmentStarted || environmentTimer) return;

        // Espera a entrada visual da logo terminar; gera os reflexos uma só vez.
        environmentTimer = window.setTimeout(() => {
            environmentTimer = 0;
            environmentStarted = true;
            createStudioEnvironment();
            render();
        }, glassStyle.studio.readyDelay);
    }

    const ambient = new THREE.HemisphereLight(
        glassStyle.lighting.ambientColor,
        glassStyle.lighting.groundColor,
        glassStyle.lighting.ambientIntensity
    );
    const keyLight = new THREE.DirectionalLight(0xffffff, glassStyle.lighting.keyIntensity);
    const fillLight = new THREE.DirectionalLight(glassStyle.lighting.fillColor, glassStyle.lighting.fillIntensity);
    const rimLight = new THREE.DirectionalLight(glassStyle.lighting.rimColor, glassStyle.lighting.rimIntensity);

    keyLight.position.set(3.5, 4.5, 6);
    fillLight.position.set(-5, 1, 3);
    rimLight.position.set(4, -3, -2);
    scene.add(ambient, keyLight, fillLight, rimLight);

    let model = null;
    let modelSize = new THREE.Vector3(1, 1, 1);
    let targetRotationX = 0;
    let targetRotationY = 0;
    let frameId = 0;
    let heroVisible = true;

    function fitCamera() {
        const verticalFov = THREE.MathUtils.degToRad(camera.fov);
        const distanceForHeight = modelSize.y / (2 * Math.tan(verticalFov / 2));
        const distanceForWidth = modelSize.x / (2 * Math.tan(verticalFov / 2) * camera.aspect);
        const distance = Math.max(distanceForHeight, distanceForWidth) * 1.18 + modelSize.z * 0.5;

        camera.position.set(0, 0, distance);
        camera.near = Math.max(distance / 100, 0.01);
        camera.far = distance * 12;
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
    }

    function resizeRenderer() {
        const width = Math.max(container.clientWidth, 1);
        const height = Math.max(container.clientHeight, 1);
        const pixelRatio = Math.min(window.devicePixelRatio, 1.75);
        const drawingWidth = Math.floor(width * pixelRatio);
        const drawingHeight = Math.floor(height * pixelRatio);

        if (
            renderer.domElement.width !== drawingWidth ||
            renderer.domElement.height !== drawingHeight
        ) {
            renderer.setPixelRatio(pixelRatio);
            renderer.setSize(width, height, false);
        }

        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        if (model) fitCamera();
    }

    function render() {
        resizeRenderer();
        renderer.render(scene, camera);
    }

    function animateTowardCursor() {
        frameId = 0;
        if (!model || !heroVisible) return;

        const xDistance = targetRotationX - rotationGroup.rotation.x;
        const yDistance = targetRotationY - rotationGroup.rotation.y;

        rotationGroup.rotation.x += xDistance * 0.085;
        rotationGroup.rotation.y += yDistance * 0.085;
        render();

        if (Math.abs(xDistance) > 0.0005 || Math.abs(yDistance) > 0.0005) {
            frameId = requestAnimationFrame(animateTowardCursor);
        }
    }

    function requestModelFrame() {
        if (!frameId) frameId = requestAnimationFrame(animateTowardCursor);
    }

    hero.addEventListener('pointermove', (event) => {
        if (!model || event.pointerType === 'touch') return;

        const rect = hero.getBoundingClientRect();
        const normalizedX = THREE.MathUtils.clamp(
            (event.clientX - rect.left) / rect.width,
            0,
            1
        );
        const normalizedY = THREE.MathUtils.clamp(
            (event.clientY - rect.top) / rect.height,
            0,
            1
        );

        // Da borda esquerda à direita, o cursor controla exatamente 360 graus.
        targetRotationY = (normalizedX - 0.5) * Math.PI * 2;
        targetRotationX = (normalizedY - 0.5) * -0.34;
        requestModelFrame();
    });

    const visibilityObserver = new IntersectionObserver((entries) => {
        heroVisible = entries[0]?.isIntersecting ?? true;

        if (heroVisible && model) {
            render();
            requestModelFrame();
        } else if (frameId) {
            cancelAnimationFrame(frameId);
            frameId = 0;
        }
    }, { threshold: 0.02 });

    visibilityObserver.observe(hero);
    window.addEventListener('resize', () => {
        render();
        requestModelFrame();
    }, { passive: true });

    const loader = new GLTFLoader();
    const modelUrl = new URL(
        './assets/ouldesign-logo-3d.glb?v=20260807-modelo-confirmado',
        import.meta.url
    ).href;

    loader.load(
        modelUrl,
        (gltf) => {
            model = gltf.scene;
            model.rotation.x = Math.PI / 2;
            rotationGroup.add(model);
            model.updateMatrixWorld(true);

            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            modelSize = box.getSize(new THREE.Vector3());

            model.position.sub(center);
            model.updateMatrixWorld(true);

            const sourceMaterials = new Set();

            model.traverse((object) => {
                if (!object.isMesh) return;

                object.castShadow = false;
                object.receiveShadow = false;

                const materials = Array.isArray(object.material)
                    ? object.material
                    : [object.material];

                materials.filter(Boolean).forEach((material) => sourceMaterials.add(material));

                const replacements = materials.map(() => {
                    const material = new THREE.MeshPhysicalMaterial(glassStyle.material);
                    glassMaterials.add(material);
                    return material;
                });

                object.material = Array.isArray(object.material)
                    ? replacements
                    : replacements[0];
            });

            sourceMaterials.forEach((material) => material.dispose());

            resizeRenderer();
            render();
            window.dispatchEvent(new CustomEvent('ouldesign:model-ready'));
            scheduleStudioEnvironment();
        },
        (progress) => {
            if (!loaderLabel || !progress.total) return;

            const percentage = Math.round(
                (progress.loaded / progress.total) * 100
            );

            loaderLabel.textContent = `Preparando forma ${percentage}%`;
        },
        (error) => {
            console.error('Não foi possível carregar a logo 3D.', error);
            window.dispatchEvent(new CustomEvent('ouldesign:model-error'));
        }
    );

    introObserver = new MutationObserver(scheduleStudioEnvironment);
    introObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    scheduleStudioEnvironment();

    window.addEventListener('pagehide', () => {
        if (frameId) cancelAnimationFrame(frameId);
        visibilityObserver.disconnect();
        introObserver.disconnect();
        window.clearTimeout(environmentTimer);
        scene.environment = null;
        environmentTarget?.dispose();
        glassMaterials.forEach((material) => material.dispose());
        glassMaterials.clear();
        renderer.dispose();
    }, { once: true });
}
