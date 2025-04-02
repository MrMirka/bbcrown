// SceneManager.js
import * as THREE from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { DirectionalLightHelper } from 'three';
import GUI from 'lil-gui';

export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    // Темный фон, поскольку EXR будет использоваться для освещения/отражений
    this.scene.background = new THREE.Color(0x111111);

    this.gui = new GUI();
    this.gui.title("Настройки Сцены");

    this.debugParams = {
      environmentMapIntensity: 1.0,
      ambientLightIntensity: 0.2,
      directionalLightIntensity: 0.5,
    };

    this.sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }

  initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.sizes.width / this.sizes.height,
      0.1,
      100
    );
    this.camera.position.set(0, 1, 4);
    this.scene.add(this.camera);
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
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

  initLights() {
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

    // Helper для направленного света
    this.directionalLightHelper = new DirectionalLightHelper(this.directionalLight, 0.5, 0xffff00);
    this.scene.add(this.directionalLightHelper);
  }

  initGUI() {
    // GUI для источников света
    const lightFolder = this.gui.addFolder('Источники света (Дополнительные)');

    const ambientFolder = lightFolder.addFolder('Общий свет (Ambient)');
    ambientFolder.add(this.debugParams, 'ambientLightIntensity')
      .min(0).max(2).step(0.01)
      .name('Интенсивность')
      .onChange(() => this.ambientLight.intensity = this.debugParams.ambientLightIntensity);
    ambientFolder.addColor(this.ambientLight, 'color').name('Цвет');

    const directionalFolder = lightFolder.addFolder('Направленный свет (Directional)');
    directionalFolder.add(this.debugParams, 'directionalLightIntensity')
      .min(0).max(5).step(0.01)
      .name('Интенсивность')
      .onChange(() => this.directionalLight.intensity = this.debugParams.directionalLightIntensity);
    directionalFolder.add(this.directionalLight, 'visible').name('Включен');
    directionalFolder.addColor(this.directionalLight, 'color').name('Цвет');
    directionalFolder.add(this.directionalLightHelper, 'visible').name('Показать хелпер');

    const directionalPositionFolder = directionalFolder.addFolder('Положение источника');
    directionalPositionFolder.add(this.directionalLight.position, 'x').min(-20).max(20).step(0.1).name('X');
    directionalPositionFolder.add(this.directionalLight.position, 'y').min(-20).max(20).step(0.1).name('Y');
    directionalPositionFolder.add(this.directionalLight.position, 'z').min(-20).max(20).step(0.1).name('Z');

    lightFolder.close();

    // GUI для рендеринга
    const renderingFolder = this.gui.addFolder('Рендеринг');
    renderingFolder.add(this.debugParams, 'environmentMapIntensity')
      .min(0).max(5).step(0.01)
      .name('Яркость окружения (exp)')
      .onChange(() => this.renderer.toneMappingExposure = this.debugParams.environmentMapIntensity);
  }

  initEnvironment() {
    const exrLoader = new EXRLoader();
    exrLoader.load(
      'textures/GSG_ProStudiosMetal_Vol2_24_Env_sm.exr',
      (environmentMap) => {
        environmentMap.mapping = THREE.EquirectangularReflectionMapping;
        this.scene.environment = environmentMap;
        console.log('Карта окружения EXR загружена и применена.');
      },
      undefined,
      (error) => {
        console.error('Ошибка загрузки EXR карты окружения:', error);
      }
    );
  }

  initResize() {
    window.addEventListener('resize', () => {
      this.sizes.width = window.innerWidth;
      this.sizes.height = window.innerHeight;
      this.camera.aspect = this.sizes.width / this.sizes.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.sizes.width, this.sizes.height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });
  }

  animate(tickCallback) {
    const clock = new THREE.Clock();

    const tick = () => {
      const elapsedTime = clock.getElapsedTime();

      // Обновляем параметры сцены
      this.renderer.toneMappingExposure = this.debugParams.environmentMapIntensity;
      this.ambientLight.intensity = this.debugParams.ambientLightIntensity;
      this.directionalLight.intensity = this.debugParams.directionalLightIntensity;

      if (typeof tickCallback === 'function') {
        tickCallback(elapsedTime);
      }

      if (this.directionalLightHelper.visible) {
        this.directionalLightHelper.update();
      }

      this.renderer.render(this.scene, this.camera);
      window.requestAnimationFrame(tick);
    };

    tick();
  }

  init() {
    this.initCamera();
    this.initRenderer();
    this.initLights();
    this.initGUI();
    this.initEnvironment();
    this.initResize();
  }
}