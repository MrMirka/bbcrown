// src/CrownObject.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';

export class CrownObject {
    constructor(scene, gui, modelPath = 'models/crown.gltf') {
        this.scene = scene;
        this.gui = gui;
        this.modelPath = modelPath;
        this.model = null;
        this.gltfLoader = new GLTFLoader();

        this.targetRotation = { x: 0, y: 0 }; // Целевое вращение от мыши
        this.currentRotation = { x: 0, y: 0 }; // Текущее плавное вращение
        this.rotationSensitivity = 0.2;
        this.rotationSmoothness = 0.1; // Коэффициент для lerp (меньше = плавнее)

        this.initialPosition = new THREE.Vector3(0, 0, 0); // Начальная позиция
        this.hiddenPositionY = 10; // Y-координата, когда модель спрятана
        this.animationDuration = 1.0; // Длительность анимации hide/show

        this.modelFolder = this.gui.addFolder('Модель Короны');
        this.modelParams = { // Параметры для GUI
            scale: 1.0,
        };

    }

    async init() {
        try {
            const gltf = await this.gltfLoader.loadAsync(this.modelPath);
            console.log('Модель короны успешно загружена');
            this.model = gltf.scene;
            this.setupModel();
            this.scene.add(this.model);
            this.setupGUI();
        } catch (error) {
            console.error('Ошибка загрузки модели короны:', error);
            throw error; // Пробрасываем ошибку дальше, чтобы main.js знал о проблеме
        }
    }

    setupModel() {
        // --- Проверка размера и центра ---
        const boundingBox = new THREE.Box3().setFromObject(this.model);
        const modelSize = new THREE.Vector3();
        boundingBox.getSize(modelSize);
        const modelCenter = boundingBox.getCenter(new THREE.Vector3());
        console.log('Crown - Размеры:', modelSize.x, modelSize.y, modelSize.z);
        console.log('Crown - Центр:', modelCenter);

        // --- Смещение для центрирования, если нужно ---
        // this.model.position.sub(modelCenter); // Смещаем модель так, чтобы ее центр был в (0,0,0)

        // --- Установка начальной позиции и масштаба ---
        this.model.position.copy(this.initialPosition);
        this.model.scale.set(this.modelParams.scale, this.modelParams.scale, this.modelParams.scale);
        this.currentRotation.x = this.model.rotation.x;
        this.currentRotation.y = this.model.rotation.y;


        // --- Включение теней ---
        this.model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                // console.log('Crown - Материал меша:', child.material);
            }
        });
    }

    setupGUI() {
        this.modelFolder.add(this.model.position, 'y')
                       .min(-5).max(5).step(0.01).name('Позиция Y')
                       .listen(); // listen() обновляет GUI при изменении из кода (анимации)
        const scaleController = this.modelFolder.add(this.modelParams, 'scale')
                               .min(0.01).max(10).step(0.01).name('Масштаб');
        scaleController.onChange((value) => {
            if(this.model) {
                this.model.scale.set(value, value, value);
            }
        });
        // this.modelFolder.close();
    }

    // Вызывается из main.js при движении мыши
    updateTargetRotation(mouseX, mouseY) {
        // mouseX, mouseY должны быть нормализованы (-1 to 1)
        this.targetRotation.y = mouseX * this.rotationSensitivity;
        this.targetRotation.x = mouseY * this.rotationSensitivity;
    }

    // Вызывается в главном цикле анимации (tick)
    update() {
        if (!this.model) return;

        // Плавная интерполяция вращения (Lerp)
        this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * this.rotationSmoothness;
        this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * this.rotationSmoothness;

        // Применяем вращение к модели
        // Важно: Применяем относительно начального вращения,
        // чтобы не конфликтовать с OrbitControls или другими вращениями
        this.model.rotation.x = this.currentRotation.x;
        this.model.rotation.y = this.currentRotation.y;
    }

    // Анимация скрытия
    hide() {
        if (!this.model) return;
        console.log("Hiding crown...");
        gsap.to(this.model.position, {
            y: this.hiddenPositionY,
            duration: this.animationDuration,
            ease: 'power2.inOut',
            onComplete: () => console.log("Crown hidden")
        });
         // Опционально: можно остановить вращение от мыши во время анимации
         // this.targetRotation.x = 0;
         // this.targetRotation.y = 0;
    }

    // Анимация появления
    show() {
        if (!this.model) return;
        console.log("Showing crown...");
        gsap.to(this.model.position, {
            y: this.initialPosition.y,
            duration: this.animationDuration,
            ease: 'power2.inOut',
            onComplete: () => console.log("Crown shown")
        });
    }

     getModel() {
        return this.model;
     }
}