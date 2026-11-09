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
    const modelUrl = new URL(
        './assets/ouldesign-logo-3d.glb?v=20261109-optical-glass-3',
        import.meta.url
    ).href;
    const debug = new URLSearchParams(location.search).has('logo-debug');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const events = new AbortController();
    const materials = new Set();
    const geometries = new Set();
    const textures = new Set();
    let disposed = false;
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
    renderer.toneMappingExposure = 1;
    container.replaceChildren(renderer.domElement);

    let environmentTarget = null;
    let model = null;
    let modelSize = new THREE.Vector3(1, 1, 1);
    let targetRotationX = 0;
    let targetRotationY = 0;
    let frameId = 0;
    let heroVisible = true;
    let loadedBytes = 0;

    // r172 clears an alpha canvas's transmission buffer to white at alpha 0.5.
    // With no opaque objects behind the logo, that produces a grey glass fill.
    // Keep its physical RGB/IOR integration, but sample the optical environment
    // instead of that empty screen buffer. Fresnel and volume absorption remain native.
    function addEnvironmentRefraction(material) {
        const chunk = THREE.ShaderChunk.transmission_pars_fragment;
        const dispersedSample = 'vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );';
        const singleSample = 'transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );';
        const functionStart = 'vec4 getIBLVolumeRefraction(';
        if (THREE.REVISION !== '172' || ![dispersedSample, singleSample, functionStart].every((part) => chunk.includes(part))) {
            throw new Error('O complemento óptico requer os shaders locais do Three.js r172.');
        }
        const opticalSample = `
            vec4 samplePrismStudio( vec2 screenCoords, float roughness, float ior,
                vec3 n, vec3 v, vec3 rayOrigin, float opticalIor ) {
                #if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
                    vec3 opticalRay = refract( -v, normalize( n ), 1.0 / opticalIor );
                    // Local parallax in a spherical optical studio. Normals, view
                    // angle and the native volume exit point all affect refraction.
                    float b = dot( rayOrigin, opticalRay );
                    float rayDistance = -b + sqrt( max( b * b - dot( rayOrigin, rayOrigin ) + prismOpticalRadius * prismOpticalRadius, 0.0 ) );
                    vec3 studioDirection = normalize( rayOrigin + opticalRay * rayDistance );
                    vec3 studioLight = textureCubeUV( envMap, envMapRotation * studioDirection, roughness ).rgb;
                    return vec4( studioLight, 1.0 );
                #else
                    return getTransmissionSample( screenCoords, roughness, ior );
                #endif
            }
        `;
        const opticalChunk = chunk
            .replace('vec4 transmittedLight;', 'vec4 transmittedLight = vec4( 0.0 );')
            .replace(functionStart, `${opticalSample}\n${functionStart}`)
            .replace(dispersedSample, `
                float opticalIor = ior + ( iors[ i ] - ior ) * prismDispersionScale;
                vec4 transmissionSample = samplePrismStudio( refractionCoords, roughness, iors[ i ], n, v, refractedRayExit, opticalIor );
            `)
            .replace(singleSample, 'transmittedLight = samplePrismStudio( refractionCoords, roughness, ior, n, v, refractedRayExit, ior );');

        material.onBeforeCompile = (shader) => {
            // The exported dispersion stays 0.6. A modest angular magnification
            // makes its small bevels legible at desktop and mobile hero scale.
            shader.uniforms.prismDispersionScale = { value: 4 };
            shader.uniforms.prismOpticalRadius = { value: 3.5 };
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <transmission_pars_fragment>',
                `uniform float prismDispersionScale;
                uniform float prismOpticalRadius;
                ${opticalChunk}`
            );
        };
        material.customProgramCacheKey = () => 'ouldesign-optical-refraction-r172-v2';
        material.needsUpdate = true;
    }

    function createStudioEnvironment() {
        const studio = new THREE.Scene();
        const panelGeometry = new THREE.PlaneGeometry(1, 1);
        const panelMaterials = [];
        const pmrem = new THREE.PMREMGenerator(renderer);
        const previousTarget = renderer.getRenderTarget();
        const previousFace = renderer.getActiveCubeFace();
        const previousMip = renderer.getActiveMipmapLevel();

        try {
            studio.background = new THREE.Color(0x000000);
            // White softboxes provide contrast for actual RGB separation. They
            // exist only in the PMREM capture, never in the visible hero scene.
            const panels = [
                { intensity: 7, size: [1.1, 6], position: [-3.8, 1, 3] },
                { intensity: 5, size: [0.65, 5], position: [3.5, -0.4, 2] },
                { intensity: 8, size: [5, 0.65], position: [0, 3.8, 1] },
                { intensity: 4, size: [4, 0.35], position: [-0.5, -3.5, 1] },
                { intensity: 2.6, size: [0.55, 5], position: [-0.75, 0.3, -4] },
                { intensity: 1.8, size: [0.25, 4], position: [0.85, -0.5, -4] },
                { intensity: 2.4, size: [4, 0.22], position: [0.2, 0.9, -4] },
                { intensity: 1.2, size: [0.035, 5], position: [-1.65, -0.1, -4] },
                { intensity: 3, size: [0.8, 4], position: [1.2, 0.5, 4] }
            ];
            panels.forEach(({ intensity, size, position }) => {
                const material = new THREE.MeshBasicMaterial({
                    color: new THREE.Color(1, 1, 1).multiplyScalar(intensity),
                    side: THREE.DoubleSide
                });
                panelMaterials.push(material);

                const panel = new THREE.Mesh(panelGeometry, material);
                panel.scale.set(size[0], size[1], 1);
                panel.position.fromArray(position);
                panel.lookAt(0, 0, 0);
                studio.add(panel);
            });
            environmentTarget = pmrem.fromScene(studio, 0.004, 0.1, 20);
            scene.environment = environmentTarget.texture;
            scene.environmentIntensity = 1.3;
        } finally {
            renderer.setRenderTarget(previousTarget, previousFace, previousMip);
            pmrem.dispose();
            panelGeometry.dispose();
            panelMaterials.forEach((material) => material.dispose());
            studio.clear();
        }
    }

    const keyLight = new THREE.DirectionalLight(0xffffff, 2);
    const rimLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(3.5, 4.5, 6);
    rimLight.position.set(-4, -2, -3);
    scene.add(keyLight, rimLight);

    function fitCamera() {
        const verticalFov = THREE.MathUtils.degToRad(camera.fov);
        // The mobile canvas is 118vw; frame against the part the hero can show.
        const visibleAspect = Math.min(container.clientWidth, hero.clientWidth) /
            Math.max(container.clientHeight, 1);
        const distanceForHeight = modelSize.y / (2 * Math.tan(verticalFov / 2));
        const distanceForWidth = modelSize.x / (2 * Math.tan(verticalFov / 2) * visibleAspect);
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

        if (
            renderer.domElement.width !== Math.floor(width * pixelRatio) ||
            renderer.domElement.height !== Math.floor(height * pixelRatio)
        ) {
            renderer.setPixelRatio(pixelRatio);
            renderer.setSize(width, height, false);
        }

        camera.aspect = width / height;
        if (model) fitCamera();
        else camera.updateProjectionMatrix();
    }

    function render() {
        if (disposed || !heroVisible || document.hidden) return;
        resizeRenderer();
        renderer.render(scene, camera);
    }

    function animateTowardCursor() {
        frameId = 0;
        if (disposed || !model || !heroVisible || document.hidden) return;

        const xDistance = targetRotationX - rotationGroup.rotation.x;
        const yDistance = targetRotationY - rotationGroup.rotation.y;

        if (motionQuery.matches) {
            rotationGroup.rotation.set(targetRotationX, targetRotationY, 0);
        } else {
            rotationGroup.rotation.x += xDistance * 0.085;
            rotationGroup.rotation.y += yDistance * 0.085;
        }
        render();

        if (!motionQuery.matches && (Math.abs(xDistance) > 0.0005 || Math.abs(yDistance) > 0.0005)) {
            frameId = requestAnimationFrame(animateTowardCursor);
        }
    }

    function requestModelFrame() {
        if (!disposed && model && heroVisible && !document.hidden && !frameId) {
            frameId = requestAnimationFrame(animateTowardCursor);
        }
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
    }, { signal: events.signal });

    const visibilityObserver = new IntersectionObserver(([entry]) => {
        heroVisible = entry?.isIntersecting ?? true;

        if (heroVisible) requestModelFrame();
        else {
            cancelAnimationFrame(frameId);
            frameId = 0;
        }
    }, { threshold: 0.02 });

    visibilityObserver.observe(hero);
    window.addEventListener('resize', requestModelFrame, { passive: true, signal: events.signal });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            cancelAnimationFrame(frameId);
            frameId = 0;
        } else requestModelFrame();
    }, { signal: events.signal });
    motionQuery.addEventListener('change', requestModelFrame, { signal: events.signal });

    function trackResources(root) {
        root.traverse((object) => {
            if (!object.isMesh) return;
            geometries.add(object.geometry);
            const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
            meshMaterials.forEach((material) => {
                materials.add(material);
                Object.values(material).forEach((value) => {
                    if (value?.isTexture) textures.add(value);
                });
            });
        });
    }

    function disposeResources() {
        materials.forEach((material) => material.dispose());
        geometries.forEach((geometry) => geometry.dispose());
        textures.forEach((texture) => texture.dispose());
        materials.clear();
        geometries.clear();
        textures.clear();
    }

    function materialSnapshot(material) {
        return {
            name: material.name, type: material.type, uuid: material.uuid,
            transmission: material.transmission, thickness: material.thickness,
            dispersion: material.dispersion, ior: material.ior, roughness: material.roughness,
            color: material.color.toArray(), attenuationColor: material.attenuationColor?.toArray(),
            attenuationDistance: material.attenuationDistance, envMapIntensity: material.envMapIntensity
        };
    }

    function fail(error) {
        if (disposed) return;
        console.error('Não foi possível preparar a logo 3D.', error);
        window.dispatchEvent(new CustomEvent('ouldesign:model-error'));
    }

    const loader = new GLTFLoader();
    loader.load(modelUrl, (gltf) => {
        trackResources(gltf.scene);
        if (disposed) {
            disposeResources();
            return;
        }
        try {
            model = gltf.scene;
            model.rotation.x = Math.PI / 2;
            rotationGroup.add(model);
            model.updateMatrixWorld(true);

            const box = new THREE.Box3().setFromObject(model);
            modelSize = box.getSize(new THREE.Vector3());

            model.position.sub(box.getCenter(new THREE.Vector3()));
            model.updateMatrixWorld(true);

            const importedMaterials = [...materials].map(materialSnapshot);
            const prepared = new Map();
            model.traverse((object) => {
                if (!object.isMesh) return;

                object.castShadow = false;
                object.receiveShadow = false;

                const prepare = (source) => {
                    if (prepared.has(source)) return prepared.get(source);
                    let material = source;
                    if (!source.isMeshPhysicalMaterial) {
                        material = new THREE.MeshPhysicalMaterial();
                        THREE.MeshStandardMaterial.prototype.copy.call(material, source);
                        material.defines.PHYSICAL = '';
                        Object.assign(material, { transmission: 1, thickness: 0.35, dispersion: 0.6, ior: 1.45, roughness: 0.05 });
                        materials.add(material);
                    }
                    // The GLB exports a cyan base color AND blue volume absorption.
                    // Clear optical glass needs neutral transmission in this studio.
                    material.color.set(0xffffff);
                    material.attenuationColor.set(0xffffff);
                    material.envMapIntensity = 1.3;
                    addEnvironmentRefraction(material);
                    prepared.set(source, material);
                    return material;
                };

                object.material = Array.isArray(object.material)
                    ? object.material.map(prepare) : prepare(object.material);
            });
            createStudioEnvironment();
            render();
            const request = performance.getEntriesByName(modelUrl).at(-1);
            const detail = {
                url: modelUrl, bytes: loadedBytes || request?.decodedBodySize,
                threeRevision: THREE.REVISION, meshes: [], runtimeMeshNames: [], importedMaterials,
                effectiveMaterials: [...new Set(prepared.values())].map(materialSnapshot)
            };
            model.traverse((object) => {
                if (!object.isMesh) return;
                detail.meshes.push(object.userData.name || object.name);
                detail.runtimeMeshNames.push(object.name);
            });
            if (debug) {
                console.info('OulDesign: diagnóstico da logo', detail);
                console.table(detail.importedMaterials);
                console.table(detail.effectiveMaterials);
            }
            window.dispatchEvent(new CustomEvent('ouldesign:model-ready', { detail }));
        } catch (error) {
            fail(error);
        }
    }, (progress) => {
        loadedBytes = progress.loaded;
        if (loaderLabel && progress.total) {
            loaderLabel.textContent = `Preparando forma ${Math.round(progress.loaded / progress.total * 100)}%`;
        }
    }, fail);

    window.addEventListener('pagehide', () => {
        disposed = true;
        cancelAnimationFrame(frameId);
        frameId = 0;
        events.abort();
        visibilityObserver.disconnect();
        scene.environment = null;
        environmentTarget?.dispose();
        environmentTarget = null;
        disposeResources();
        scene.clear();
        renderer.dispose();
        // Also release the renderer's private transmission framebuffer on exit.
        renderer.forceContextLoss();
    }, { once: true });
}
