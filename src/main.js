// src/main.js

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'; // <--- Импорт EXRLoader
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DirectionalLightHelper } from 'three';
import gsap from 'gsap';
import GUI from 'lil-gui';

// --- GUI ---
const gui = new GUI();
gui.title("Настройки Сцены");
// gui.close();

// --- Основные настройки ---
const canvas = document.querySelector('canvas.webgl');
const scene = new THREE.Scene();
// ОСТАВЛЯЕМ темный фон, EXR будет только для освещения/отражений
scene.background = new THREE.Color(0x111111);

// --- Параметры для отладки (если модель не видна) ---
const debugParams = {
    environmentMapIntensity: 1.0, // Интенсивность карты окружения
    ambientLightIntensity: 0.2, // Уменьшаем интенсивность по умолчанию
    directionalLightIntensity: 0.5, // Уменьшаем интенсивность по умолчанию
};

// --- Загрузчик EXR для карты окружения ---
const exrLoader = new EXRLoader();
exrLoader.load(
    'textures/GSG_ProStudiosMetal_Vol2_24_Env_sm.exr', // <-- УБЕДИТЕСЬ, что путь ВЕРНЫЙ
    ( environmentMap ) => {
        environmentMap.mapping = THREE.EquirectangularReflectionMapping; // <-- Важно для карт окружения

        // Устанавливаем ЗАГРУЖЕННУЮ карту как окружение сцены
        // Это повлияет на освещение и отражения PBR материалов (как в GLTF)
        scene.environment = environmentMap;

        // Обновляем интенсивность окружения через exposure рендерера
        // Мы управляем этим через debugParams.environmentMapIntensity в tick()
        // renderer.toneMappingExposure = debugParams.environmentMapIntensity; // Установим начальное значение в tick

        console.log('Карта окружения EXR загружена и применена.');

        // Добавляем контроль интенсивности окружения в GUI
        const renderingFolder = gui.folders.find(f => f._title === 'Рендеринг') || gui.addFolder('Рендеринг');
        renderingFolder.add(debugParams, 'environmentMapIntensity')
                       .min(0).max(5).step(0.01)
                       .name('Яркость окружения (exp)')
                       .onChange(() => {
                           renderer.toneMappingExposure = debugParams.environmentMapIntensity;
                       });

    },
    undefined, // Прогресс
    (error) => {
        console.error('Ошибка загрузки EXR карты окружения:', error);
        // Если есть ошибка, модель может остаться темной!
    }
);


// --- Размеры окна ---
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
};

window.addEventListener('resize', () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// --- Камера ---
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
camera.position.set(0, 1, 4); // <-- Слегка поднял камеру и отодвинул еще чуть дальше для лучшего обзора
scene.add(camera);

// --- Свет ---
// Интенсивность теперь контролируется через debugParams
const lightFolder = gui.addFolder('Источники света (Дополнительные)');

// 1. Ambient Light
const ambientLight = new THREE.AmbientLight(0xffffff, debugParams.ambientLightIntensity);
scene.add(ambientLight);
const ambientFolder = lightFolder.addFolder('Общий свет (Ambient)');
ambientFolder.add(debugParams, 'ambientLightIntensity') // Связываем с debugParams
             .min(0).max(2).step(0.01).name('Интенсивность')
             .onChange(() => ambientLight.intensity = debugParams.ambientLightIntensity); // Обновляем свет при изменении
ambientFolder.addColor(ambientLight, 'color').name('Цвет');
// ambientFolder.close();

// 2. Directional Light
const directionalLight = new THREE.DirectionalLight(0xffffff, debugParams.directionalLightIntensity);
directionalLight.position.set(3, 4, 5);
directionalLight.castShadow = true; // Включаем тени
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 20;
scene.add(directionalLight);

const directionalLightHelper = new DirectionalLightHelper(directionalLight, 0.5, 0xffff00);
scene.add(directionalLightHelper);

const directionalFolder = lightFolder.addFolder('Направленный свет (Directional)');
directionalFolder.add(debugParams, 'directionalLightIntensity') // Связываем с debugParams
                 .min(0).max(5).step(0.01).name('Интенсивность')
                 .onChange(() => directionalLight.intensity = debugParams.directionalLightIntensity); // Обновляем свет
directionalFolder.add(directionalLight, 'visible').name('Включен');
directionalFolder.addColor(directionalLight, 'color').name('Цвет');
directionalFolder.add(directionalLightHelper, 'visible').name('Показать хелпер');

const directionalPositionFolder = directionalFolder.addFolder('Положение источника');
directionalPositionFolder.add(directionalLight.position, 'x').min(-20).max(20).step(0.1).name('X');
directionalPositionFolder.add(directionalLight.position, 'y').min(-20).max(20).step(0.1).name('Y');
directionalPositionFolder.add(directionalLight.position, 'z').min(-20).max(20).step(0.1).name('Z');
// directionalPositionFolder.close();
// directionalFolder.close();
lightFolder.close(); // Свернем папку доп. света

// --- Загрузчик GLTF ---
const gltfLoader = new GLTFLoader();
let model = null;
const modelFolder = gui.addFolder('Модель');
let modelAnimationTarget = { rotationX: 0, rotationY: 0 };

gltfLoader.load(
    'models/crown.gltf', // <-- УБЕДИТЕСЬ, что путь к МОДЕЛИ верный
    (gltf) => {
        console.log('Модель успешно загружена');
        model = gltf.scene;

        // --- Отладка: Проверка размера модели ---
        const boundingBox = new THREE.Box3().setFromObject(model);
        const modelSize = new THREE.Vector3();
        boundingBox.getSize(modelSize);
        console.log('Размеры модели (ширина, высота, глубина):', modelSize.x, modelSize.y, modelSize.z);
        console.log('Центр модели:', boundingBox.getCenter(new THREE.Vector3()));
        // Если размеры очень большие или маленькие, нужен scale
        // Если центр не в (0,0,0), может понадобиться смещение или настройка камеры

        // --- Включение теней для модели ---
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                // --- Отладка: Проверка материала ---
                // console.log('Материал меша:', child.material);
                // Если модель черная, возможно проблема с материалом или UV
                // Можно временно заменить материал для теста:
                // child.material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.5 });
            }
        });

        // model.scale.set(0.1, 0.1, 0.1); // <-- Раскомментируйте и настройте, если модель СЛИШКОМ БОЛЬШАЯ
        model.position.set(0, 0, 0); // Центрируем модель (если ее центр не 0,0,0, настройте)
        scene.add(model);

        // Добавляем контролы для модели в GUI
        modelFolder.add(model.position, 'y').min(-5).max(5).step(0.01).name('Позиция Y'); // Увеличил диапазон
        const scaleController = modelFolder.add(model.scale, 'x').min(0.01).max(10).step(0.01).name('Масштаб'); // Увеличил диапазон
        scaleController.onChange((value) => {
            model.scale.set(value, value, value); // Устанавливаем одинаковый масштаб по всем осям
        });
        scaleController.setValue(1.0); // Устанавливаем начальное значение масштаба в GUI

        modelFolder.close();

        // Запускаем анимационный цикл ТОЛЬКО ПОСЛЕ загрузки модели
        tick();
    },
    undefined, // Прогресс
    (error) => {
        console.error('Ошибка загрузки модели:', error);
        // Если модель не загрузилась, вы ее не увидите! Проверьте путь и формат файла.
    }
);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// --- ВАЖНЫЕ НАСТРОЙКИ ДЛЯ HDR/PBR и EXR ---
renderer.outputEncoding = THREE.sRGBEncoding; // Правильное отображение на стандартных мониторах
renderer.toneMapping = THREE.ACESFilmicToneMapping; // Хороший алгоритм тональной компрессии для HDR
renderer.toneMappingExposure = debugParams.environmentMapIntensity; // Начальная экспозиция
renderer.physicallyCorrectLights = true; // Использовать физически корректное затухание света (важно для PBR)
renderer.shadowMap.enabled = true; // Включаем тени
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Тип теней

// Добавляем папку рендеринга в GUI, если она еще не создана загрузчиком EXR
if (!gui.folders.find(f => f._title === 'Рендеринг')) {
     const renderingFolder = gui.addFolder('Рендеринг');
     renderingFolder.add(debugParams, 'environmentMapIntensity')
           .min(0).max(5).step(0.01)
           .name('Яркость окружения (exp)')
           .onChange(() => {
               renderer.toneMappingExposure = debugParams.environmentMapIntensity;
           });
}

// --- Orbit Controls ---
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.enabled = true;
// controls.target.set(0, 0, 0); // Убедитесь, что камера смотрит на центр, где модель

// --- Отслеживание мыши ---
const mouse = { x: 0, y: 0 };
const targetRotation = { x: 0, y: 0 };
const rotationSensitivity = 0.2;
const rotationSmoothness = 1.5;
window.addEventListener('mousemove', (event) => {
    if (!model) return;
    mouse.x = (event.clientX / sizes.width) * 2 - 1;
    mouse.y = -(event.clientY / sizes.height) * 2 + 1;
    targetRotation.y = mouse.x * rotationSensitivity;
    targetRotation.x = mouse.y * rotationSensitivity;
     gsap.to(modelAnimationTarget, {
         rotationX: targetRotation.x,
         rotationY: targetRotation.y,
         duration: rotationSmoothness,
         ease: 'power2.out',
         overwrite: 'auto'
     });
});

// --- Анимационный цикл ---
const clock = new THREE.Clock();

const tick = () => {
    const elapsedTime = clock.getElapsedTime();

    // Обновление экспозиции (на случай, если GUI инициализируется до загрузки EXR)
    // И интенсивности доп. света
    // Это немного избыточно, но гарантирует применение значений из debugParams
    renderer.toneMappingExposure = debugParams.environmentMapIntensity;
    ambientLight.intensity = debugParams.ambientLightIntensity;
    directionalLight.intensity = debugParams.directionalLightIntensity;


    if (controls.enabled) {
        controls.update(); // Обновляем OrbitControls
    }

    // Применение вращения от мыши
    if (model && controls.enabled) {
         // Плавная интерполяция к целевому вращению от мыши
         // Этот способ лучше работает с OrbitControls, чем прямое сложение
         const lerpFactor = 0.1;
         model.rotation.x += (modelAnimationTarget.rotationX - model.rotation.x) * lerpFactor;
         model.rotation.y += (modelAnimationTarget.rotationY - model.rotation.y) * lerpFactor;
    } else if (model && !controls.enabled) {
         // Если OrbitControls выключены, можно было бы напрямую применять targetRotation
         // но текущая логика с GSAP и modelAnimationTarget тоже будет работать.
          model.rotation.x += (modelAnimationTarget.rotationX - model.rotation.x) * 0.1;
          model.rotation.y += (modelAnimationTarget.rotationY - model.rotation.y) * 0.1;
    }

    // Обновление хелпера
    if (directionalLightHelper.visible) {
        directionalLightHelper.update();
    }

    // --- Отладка: Проверка позиций ---
    // console.log("Camera pos:", camera.position);
    // if(model) console.log("Model pos:", model.position);

    renderer.render(scene, camera);
    window.requestAnimationFrame(tick);
};

// Важно: tick() вызывается только внутри колбэка загрузчика GLTF
// после УСПЕШНОЙ загрузки модели.