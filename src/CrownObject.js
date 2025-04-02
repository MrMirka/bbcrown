// CrownObject.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';

export class CrownObject {
  /**
   * @param {THREE.Scene} scene – сцена, в которую будет добавлена модель
   * @param {GUI} gui – экземпляр GUI для добавления контролов
   */
  constructor(scene, gui) {
    this.scene = scene;
    this.gui = gui;
    this.model = null;
    this.modelAnimationTarget = { rotationX: 0, rotationY: 0 };
    this.rotationSensitivity = 0.2;
    this.rotationSmoothness = 1.5;
    this.sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    this.guiFolder = this.gui.addFolder('Модель');
  }

  init() {
    return new Promise((resolve, reject) => {
      const gltfLoader = new GLTFLoader();
      gltfLoader.load(
        'models/crown.gltf',
        (gltf) => {
          console.log('Модель успешно загружена');
          this.model = gltf.scene;

          // Отладка: проверка размеров модели
          const boundingBox = new THREE.Box3().setFromObject(this.model);
          const modelSize = new THREE.Vector3();
          boundingBox.getSize(modelSize);
          console.log('Размеры модели:', modelSize.x, modelSize.y, modelSize.z);
          console.log('Центр модели:', boundingBox.getCenter(new THREE.Vector3()));

          // Включение теней для модели
          this.model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          // Центрирование и добавление модели в сцену
          this.model.position.set(0, 0, 0);
          this.scene.add(this.model);

          // Контролы для модели в GUI
          this.guiFolder.add(this.model.position, 'y')
            .min(-5).max(5).step(0.01)
            .name('Позиция Y');
          const scaleController = this.guiFolder.add(this.model.scale, 'x')
            .min(0.01).max(10).step(0.01)
            .name('Масштаб');
          scaleController.onChange((value) => {
            this.model.scale.set(value, value, value);
          });
          scaleController.setValue(1.0);
          this.guiFolder.close();

          // Установка обработчика перемещения мыши для анимации вращения
          window.addEventListener('mousemove', this.onMouseMove.bind(this));

          resolve();
        },
        undefined,
        (error) => {
          console.error('Ошибка загрузки модели:', error);
          reject(error);
        }
      );
    });
  }

  onMouseMove(event) {
    if (!this.model) return;
    const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    const targetRotX = mouseY * this.rotationSensitivity;
    const targetRotY = mouseX * this.rotationSensitivity;

    gsap.to(this.modelAnimationTarget, {
      rotationX: targetRotX,
      rotationY: targetRotY,
      duration: this.rotationSmoothness,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  }

  update() {
    if (this.model) {
      // Плавное приближение к целевым углам вращения
      const lerpFactor = 0.1;
      this.model.rotation.x += (this.modelAnimationTarget.rotationX - this.model.rotation.x) * lerpFactor;
      this.model.rotation.y += (this.modelAnimationTarget.rotationY - this.model.rotation.y) * lerpFactor;
    }
  }
}