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
    renderer.toneMappingExposure = 1.08;
    container.replaceChildren(renderer.domElement);

    const environmentCanvas = document.createElement('canvas');
    environmentCanvas.width = 512;
    environmentCanvas.height = 256;
    const context = environmentCanvas.getContext('2d');
    const gradient = context.createLinearGradient(0, 0, 512, 256);

    gradient.addColorStop(0, '#111111');
    gradient.addColorStop(0.22, '#d7d0c2');
    gradient.addColorStop(0.42, '#243344');
    gradient.addColorStop(0.58, '#7a2530');
    gradient.addColorStop(0.74, '#e5dfd4');
    gradient.addColorStop(1, '#0a0a0a');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 512, 256);

    const environment = new THREE.CanvasTexture(environmentCanvas);
    environment.mapping = THREE.EquirectangularReflectionMapping;
    environment.colorSpace = THREE.SRGBColorSpace;
    scene.environment = environment;

    const ambient = new THREE.HemisphereLight(0xf5f0e7, 0x141414, 2.5);
    const keyLight = new THREE.DirectionalLight(0xffffff, 4.2);
    const fillLight = new THREE.DirectionalLight(0xaabbd0, 2.1);
    const rimLight = new THREE.DirectionalLight(0xd4b2a9, 2.4);

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

            model.traverse((object) => {
                if (!object.isMesh) return;

                object.castShadow = false;
                object.receiveShadow = false;

                const materials = Array.isArray(object.material)
                    ? object.material
                    : [object.material];

                materials.filter(Boolean).forEach((material) => {
                    material.envMapIntensity = 1.15;
                    material.needsUpdate = true;
                });
            });

            resizeRenderer();
            render();
            window.dispatchEvent(new CustomEvent('ouldesign:model-ready'));
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

    window.addEventListener('pagehide', () => {
        if (frameId) cancelAnimationFrame(frameId);
        visibilityObserver.disconnect();
        environment.dispose();
        renderer.dispose();
    }, { once: true });
}
