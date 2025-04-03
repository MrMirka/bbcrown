// SceneManager.js
import * as THREE from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { DirectionalLightHelper } from 'three';

export class SceneManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = new THREE.Scene();
        this.scene.background = null;
        // Инициализируем вращение окружения
        this.scene.environmentRotation = new THREE.Euler(); // По умолчанию (0, 0, 0)

        this.sizes = {
            width: window.innerWidth,
            height: window.innerHeight
        };

        this.debugParams = {
            environmentMapIntensity: 5.0,
            // --- НОВОЕ: Параметры для вращения по X, Y, Z в радианах ---
            environmentRotationX: 0,
            environmentRotationY: 0,
            environmentRotationZ: 0,
            ambientLightIntensity: 0.2,
            directionalLightIntensity: 0.5,
        };

        this._setupCamera();
        this._setupRenderer();
        this._setupLights();
        this._loadEnvironmentMap();
        this._setupResizeListener();
    }

    _setupCamera() {
        this.camera = new THREE.PerspectiveCamera(35, this.sizes.width / this.sizes.height, 0.1, 100);
        this.camera.position.set(0, 0, 6);
        this.scene.add(this.camera);
    }

    _setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(this.sizes.width, this.sizes.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Настройки рендеринга
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = this.debugParams.environmentMapIntensity;
        this.renderer.useLegacyLights = false;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    _setupLights() {
        // Ambient Light
        this.ambientLight = new THREE.AmbientLight(0xffffff, this.debugParams.ambientLightIntensity);
        this.scene.add(this.ambientLight);

        // Directional Light
        this.directionalLight = new THREE.DirectionalLight(0xffffff, this.debugParams.directionalLightIntensity);
        this.directionalLight.position.set(3, 4, 5);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 1024;
        this.directionalLight.shadow.mapSize.height = 1024;
        this.directionalLight.shadow.camera.near = 0.5;
        this.directionalLight.shadow.camera.far = 20;
        this.scene.add(this.directionalLight);

        this.directionalLightHelper = new DirectionalLightHelper(this.directionalLight, 0.5, 0xffff00);
        this.scene.add(this.directionalLightHelper);
        this.directionalLightHelper.visible = false;
    }

    _loadEnvironmentMap() {
        const exrLoader = new EXRLoader();
        exrLoader.load(
            'textures/GSG_ProStudiosMetal_Vol2_24_Env_sm.exr',
            (environmentMap) => {
                environmentMap.mapping = THREE.EquirectangularReflectionMapping;
                this.scene.environment = environmentMap;
                // --- НОВОЕ: Устанавливаем начальное вращение по всем осям ---
                this.scene.environmentRotation.set(
                    this.debugParams.environmentRotationX,
                    this.debugParams.environmentRotationY,
                    this.debugParams.environmentRotationZ
                );
                console.log('Карта окружения EXR загружена и применена.');
                if (this.onEnvironmentLoaded) {
                    this.onEnvironmentLoaded();
                }
            },
            undefined,
            (error) => {
                console.error('Ошибка загрузки EXR карты окружения:', error);
            }
        );
    }

    _setupResizeListener() {
        window.addEventListener('resize', () => {
            this.sizes.width = window.innerWidth;
            this.sizes.height = window.innerHeight;

            this.camera.aspect = this.sizes.width / this.sizes.height;
            this.camera.updateProjectionMatrix();

            this.renderer.setSize(this.sizes.width, this.sizes.height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        });
    }

    // --- Публичные методы ---
    getScene() { return this.scene; }
    getCamera() { return this.camera; }
    getRenderer() { return this.renderer; }
    getSizes() { return this.sizes; }

    update() {
        // Обновление параметров на основе debugParams
        this.renderer.toneMappingExposure = this.debugParams.environmentMapIntensity;
        this.ambientLight.intensity = this.debugParams.ambientLightIntensity;
        this.directionalLight.intensity = this.debugParams.directionalLightIntensity;

        // --- НОВОЕ: Обновляем вращение окружения по всем осям в каждом кадре ---
        if (this.scene.environment) { // Проверяем, что карта загружена
            this.scene.environmentRotation.set(
                this.debugParams.environmentRotationX,
                this.debugParams.environmentRotationY,
                this.debugParams.environmentRotationZ
            );
            // Альтернативно, можно обновлять по одной оси, если нужно
            // this.scene.environmentRotation.x = this.debugParams.environmentRotationX;
            // this.scene.environmentRotation.y = this.debugParams.environmentRotationY;
            // this.scene.environmentRotation.z = this.debugParams.environmentRotationZ;
        }

        // Обновление хелпера
        if (this.directionalLightHelper.visible) {
            this.directionalLightHelper.update();
        }
    }

    setupGUI(gui) {
        const renderingFolder = gui.addFolder('Рендеринг и Окружение'); // Переименуем для ясности
        renderingFolder.add(this.debugParams, 'environmentMapIntensity')
                       .min(0).max(15).step(0.01)
                       .name('Яркость окружения (exp)');

        // --- НОВОЕ: Папка для вращения окружения ---
        const envRotationFolder = renderingFolder.addFolder('Вращение Окружения');
        envRotationFolder.add(this.debugParams, 'environmentRotationX')
                       .min(0).max(Math.PI * 2).step(0.01)
                       .name('Вращение X (радианы)')
                       .onChange(this._updateEnvironmentRotation.bind(this)); // Связываем onChange

        envRotationFolder.add(this.debugParams, 'environmentRotationY')
                       .min(0).max(Math.PI * 2).step(0.01)
                       .name('Вращение Y (радианы)')
                       .onChange(this._updateEnvironmentRotation.bind(this)); // Связываем onChange

        envRotationFolder.add(this.debugParams, 'environmentRotationZ')
                       .min(0).max(Math.PI * 2).step(0.01)
                       .name('Вращение Z (радианы)')
                       .onChange(this._updateEnvironmentRotation.bind(this)); // Связываем onChange

         if (!this.scene.environment) {
             this.onEnvironmentLoaded = () => {
                 console.log('GUI: Окружение загружено, контролы рендеринга активны.');
                 this._updateEnvironmentRotation(); // Применяем начальные значения вращения из GUI
             };
         } else {
            // Если карта уже была загружена до вызова setupGUI
            this._updateEnvironmentRotation();
         }


        const lightFolder = gui.addFolder('Источники света (Дополнительные)');
        lightFolder.close(); // Свернем по умолчанию

        // Ambient Light GUI
        const ambientFolder = lightFolder.addFolder('Общий свет (Ambient)');
        ambientFolder.add(this.debugParams, 'ambientLightIntensity')
                     .min(0).max(2).step(0.01).name('Интенсивность');
        ambientFolder.addColor(this.ambientLight, 'color').name('Цвет');

        // Directional Light GUI
        const directionalFolder = lightFolder.addFolder('Направленный свет (Directional)');
        directionalFolder.add(this.debugParams, 'directionalLightIntensity')
                         .min(0).max(5).step(0.01).name('Интенсивность');
        directionalFolder.add(this.directionalLight, 'visible').name('Включен');
        directionalFolder.addColor(this.directionalLight, 'color').name('Цвет');
        directionalFolder.add(this.directionalLightHelper, 'visible').name('Показать хелпер');

        const directionalPositionFolder = directionalFolder.addFolder('Положение источника');
        directionalPositionFolder.add(this.directionalLight.position, 'x').min(-20).max(20).step(0.1).name('X');
        directionalPositionFolder.add(this.directionalLight.position, 'y').min(-20).max(20).step(0.1).name('Y');
        directionalPositionFolder.add(this.directionalLight.position, 'z').min(-20).max(20).step(0.1).name('Z');
    }

    // --- НОВЫЙ вспомогательный метод для обновления вращения ---
    // (Используется в onChange и при загрузке)
    _updateEnvironmentRotation() {
        if (this.scene.environment) {
            this.scene.environmentRotation.set(
                this.debugParams.environmentRotationX,
                this.debugParams.environmentRotationY,
                this.debugParams.environmentRotationZ
            );
        }
    }
}