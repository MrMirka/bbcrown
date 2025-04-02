// CrownObject.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';

export class CrownObject {
    constructor(scene, sizes) {
        this.scene = scene;
        this.sizes = sizes; // Получаем размеры для расчета координат мыши
        this.model = null;
        this.gltfLoader = new GLTFLoader();

        // Параметры анимации
        this.mouse = { x: 0, y: 0 };
        this.targetRotation = { x: 0, y: 0 }; // Куда должна повернуться модель (расчет из мыши)
        this.modelAnimationTarget = { rotationX: 0, rotationY: 0 }; // Цель для GSAP анимации
        this.rotationSensitivity = 0.2;
        this.rotationSmoothness = 1.5; // Длительность анимации GSAP
        this.initialPosition = { x: 0, y: 0, z: 0 };

        this._setupMouseListener();
    }

    loadModel(url, onLoadCallback) {
        this.gltfLoader.load(
            url,
            (gltf) => {
                console.log('Модель короны успешно загружена');
                this.model = gltf.scene;

                // Отладка размеров
                const boundingBox = new THREE.Box3().setFromObject(this.model);
                const modelSize = new THREE.Vector3();
                boundingBox.getSize(modelSize);
                console.log('Размеры модели (ширина, высота, глубина):', modelSize.x, modelSize.y, modelSize.z);
                console.log('Центр модели:', boundingBox.getCenter(new THREE.Vector3()));

                // Включение теней
                this.model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                this.model.position.set(0, 0, 0); // Центрируем
                this.scene.add(this.model);

                // Вызываем колбэк после успешной загрузки
                if (onLoadCallback) {
                    onLoadCallback(this); // Передаем сам объект, если нужно
                }
            },
            undefined,
            (error) => {
                console.error('Ошибка загрузки модели короны:', error);
            }
        );
    }

    _setupMouseListener() {
        window.addEventListener('mousemove', (event) => {
            if (!this.model) return; // Не реагируем, если модель еще не загружена

            this.mouse.x = (event.clientX / this.sizes.width) * 2 - 1;
            this.mouse.y = -(event.clientY / this.sizes.height) * 2 + 1;

            // Расчет целевого поворота напрямую из координат мыши
            this.targetRotation.y = this.mouse.x * this.rotationSensitivity;
            this.targetRotation.x = this.mouse.y * this.rotationSensitivity;

            // Запускаем GSAP анимацию для плавного перехода к целевому повороту
            gsap.to(this.modelAnimationTarget, {
                rotationX: this.targetRotation.x,
                rotationY: this.targetRotation.y,
                duration: this.rotationSmoothness,
                ease: 'power2.out',
                overwrite: 'auto' // Прерывает предыдущие анимации этого объекта
            });
        });
    }

    update() {
        if (this.model) {
            // Плавно интерполируем текущее вращение модели к анимированному значению
            // Коэффициент 0.1 определяет скорость "догоняния"
            this.model.rotation.x += (this.modelAnimationTarget.rotationX - this.model.rotation.x) * 0.1;
            this.model.rotation.y += (this.modelAnimationTarget.rotationY - this.model.rotation.y) * 0.1;
        }
    }

    setupGUI(gui) {
        if (!this.model) {
            console.warn("Попытка настроить GUI для короны до загрузки модели.");
            return; // Не добавляем GUI, если модели нет
        }

        const modelFolder = gui.addFolder('Модель Короны');
        modelFolder.close(); // Свернем по умолчанию

        modelFolder.add(this.model.position, 'y').min(-5).max(5).step(0.01).name('Позиция Y');
        const scaleController = modelFolder.add(this.model.scale, 'x')
                                         .min(0.01).max(10).step(0.01)
                                         .name('Масштаб')
                                         .setValue(1.0); // Устанавливаем начальное значение

        scaleController.onChange((value) => {
            // Применяем одинаковый масштаб ко всем осям
            this.model.scale.set(value, value, value);
        });
    }

    hide(durationSeconds) {
      if (!this.model) {
          console.warn("Модель короны не загружена, невозможно выполнить hide().");
          return;
      }

      console.log(`Запуск анимации hide() на ${durationSeconds} сек.`);
      

      // Рассчитываем целевую позицию Y.
      // Это значение должно быть достаточно большим, чтобы модель ушла за верхний край экрана.
      // Зависит от настроек камеры (FOV, position). Значение 5-10 обычно достаточно.
      // Можно сделать более точный расчет через THREE.Vector3.project(camera),
      // но для простого эффекта "скрытия" подойдет и константа.
      const targetY = 6; // Поднимаем достаточно высоко

      gsap.to(this.model.position, {
          y: targetY,
          duration: durationSeconds,
          ease: 'power2.inOut', // Плавный старт и конец
          overwrite: 'auto' // Прервать другие анимации позиции
      });
  }

  show(durationSeconds) {
    if (!this.model) {
        console.warn("Модель короны не загружена, невозможно выполнить show().");
        return;
    }

    console.log(`Запуск анимации show() на ${durationSeconds} сек.`);

    gsap.to(this.model.position, {
        y: this.initialPosition.y, // Возвращаем на сохраненную начальную позицию Y
        duration: durationSeconds,
        ease: 'power2.inOut',
        overwrite: 'auto'
    });
}

}