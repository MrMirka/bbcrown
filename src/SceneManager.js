// src/SceneManager.js
import * as THREE from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
// --- УДАЛЕНО: import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DirectionalLightHelper } from 'three';
import GUI from 'lil-gui';

export class SceneManager {
    constructor(canvas, gui) {
        this.canvas = canvas;
        this.gui = gui;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        // --- УДАЛЕНО: this.controls = null;
        this.ambientLight = null;
        this.directionalLight = null;
        this.directionalLightHelper = null;

        this.sizes = {
            width: window.innerWidth,
            height: window.innerHeight
        };

        this.debugParams = {
            environmentMapIntensity: 1.5,
            ambientLightIntensity: 0.2,
            directionalLightIntensity: 0.8,
            bgColor: 0x111111,
        };

        // Папки GUI остаются для других настроек
        this.sceneFolder = this.gui.addFolder('Настройки Сцены');
        this.renderingFolder = this.gui.addFolder('Рендеринг');
        this.lightFolder = this.gui.addFolder('Источники света');
    }

    async init() {
        this.setupScene();
        this.setupCamera();
        this.setupRenderer();
        this.setupLights();
        // Важно дождаться загрузки карты окружения
        await this.loadEnvironmentMap('textures/GSG_ProStudiosMetal_Vol2_24_Env_sm.exr');
        // --- УДАЛЕНО: Вызов this.setupControls();
        this.setupGUI(); // Настройка GUI для сцены, рендеринга, света
        this.setupResizeListener();

        console.log("SceneManager initialized (without OrbitControls)"); // Обновили лог
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.debugParams.bgColor);
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(75, this.sizes.width / this.sizes.height, 0.1, 100);
        // Камера теперь статична, позиционируем её для хорошего обзора
        this.camera.position.set(0, 1, 4); // Оставляем как было, можно подстроить
        // camera.lookAt(new THREE.Vector3(0, 0, 0)); // Можно явно указать точку взгляда
        this.scene.add(this.camera);
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        });
        this.renderer.setSize(this.sizes.width, this.sizes.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = this.debugParams.environmentMapIntensity;
        this.renderer.physicallyCorrectLights = true;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    setupLights() {
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
        this.directionalLightHelper.visible = false;
        this.scene.add(this.directionalLightHelper);
    }

    async loadEnvironmentMap(path) {
        const exrLoader = new EXRLoader();
        try {
            const environmentMap = await exrLoader.loadAsync(path);
            environmentMap.mapping = THREE.EquirectangularReflectionMapping;
            this.scene.environment = environmentMap;
            // Убедимся, что renderer уже создан перед установкой exposure
            if (this.renderer) {
                 this.renderer.toneMappingExposure = this.debugParams.environmentMapIntensity;
            }
            console.log('Карта окружения EXR загружена и применена.');

            // Добавляем контроль GUI только если он еще не существует
            // (Полезно при HMR - Hot Module Replacement во время разработки)
             if (this.renderingFolder && !this.renderingFolder.controllers.find(c => c.property === 'environmentMapIntensity')) {
                this.renderingFolder.add(this.debugParams, 'environmentMapIntensity')
                   .min(0).max(5).step(0.01)
                   .name('Яркость окружения (exp)')
                   .onChange(() => {
                       if(this.renderer) { // Доп. проверка
                          this.renderer.toneMappingExposure = this.debugParams.environmentMapIntensity;
                       }
                   });
            }

        } catch (error) {
            console.error('Ошибка загрузки EXR карты окружения:', error);
        }
    }

    // --- УДАЛЕНО: Метод setupControls() ---
    // setupControls() { ... }

    setupGUI() {
        // Добавляем проверки, чтобы не дублировать контролы при HMR
        if (!this.sceneFolder.controllers.find(c => c.property === 'bgColor')) {
            this.sceneFolder.addColor(this.debugParams, 'bgColor').name('Цвет фона')
                 .onChange(value => {
                     if(this.scene) this.scene.background.set(value);
                 });
        }

        // Проверяем существование папок перед добавлением
        let ambientFolder = this.lightFolder.folders.find(f => f._title === 'Общий свет (Ambient)');
        if (!ambientFolder) {
            ambientFolder = this.lightFolder.addFolder('Общий свет (Ambient)');
            ambientFolder.add(this.debugParams, 'ambientLightIntensity')
                         .min(0).max(2).step(0.01).name('Интенсивность')
                         .onChange(() => { if(this.ambientLight) this.ambientLight.intensity = this.debugParams.ambientLightIntensity; });
            ambientFolder.addColor(this.ambientLight, 'color').name('Цвет');
        }

        let directionalFolder = this.lightFolder.folders.find(f => f._title === 'Направленный свет (Directional)');
        if (!directionalFolder) {
             directionalFolder = this.lightFolder.addFolder('Направленный свет (Directional)');
             directionalFolder.add(this.debugParams, 'directionalLightIntensity')
                             .min(0).max(5).step(0.01).name('Интенсивность')
                             .onChange(() => { if(this.directionalLight) this.directionalLight.intensity = this.debugParams.directionalLightIntensity });
             directionalFolder.add(this.directionalLight, 'visible').name('Включен');
             directionalFolder.addColor(this.directionalLight, 'color').name('Цвет');
             directionalFolder.add(this.directionalLightHelper, 'visible').name('Показать хелпер');
             const dirPosFolder = directionalFolder.addFolder('Положение источника');
             dirPosFolder.add(this.directionalLight.position, 'x').min(-20).max(20).step(0.1);
             dirPosFolder.add(this.directionalLight.position, 'y').min(-20).max(20).step(0.1);
             dirPosFolder.add(this.directionalLight.position, 'z').min(-20).max(20).step(0.1);
        }
    }

    setupResizeListener() {
        // Удаляем предыдущий листенер, чтобы избежать дублирования при HMR
        window.removeEventListener('resize', this.onResizeBound);
        this.onResizeBound = this.onResize.bind(this); // Сохраняем привязанную функцию
        window.addEventListener('resize', this.onResizeBound);
    }

    onResize() {
        this.sizes.width = window.innerWidth;
        this.sizes.height = window.innerHeight;

        if(this.camera) {
            this.camera.aspect = this.sizes.width / this.sizes.height;
            this.camera.updateProjectionMatrix();
        }

        if(this.renderer) {
            this.renderer.setSize(this.sizes.width, this.sizes.height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        }
    }

    update() {
        // --- УДАЛЕНО: Обновление controls.update() ---
        // if (this.controls && this.controls.enabled) {
        //     this.controls.update();
        // }

        // Обновляем хелпер, если он видим
        if (this.directionalLightHelper && this.directionalLightHelper.visible) {
            this.directionalLightHelper.update();
        }

        // Обновление параметров из GUI (можно убрать, если обновлять только по onChange)
        // Но оставим для надежности, если значение изменится не через GUI
        if(this.ambientLight) this.ambientLight.intensity = this.debugParams.ambientLightIntensity;
        if(this.directionalLight) this.directionalLight.intensity = this.debugParams.directionalLightIntensity;
        if(this.renderer) this.renderer.toneMappingExposure = this.debugParams.environmentMapIntensity;

        // Рендерим сцену
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    // Геттеры
    getScene() { return this.scene; }
    getCamera() { return this.camera; }
    getRenderer() { return this.renderer; }
    // --- УДАЛЕНО: getControls() ---
}