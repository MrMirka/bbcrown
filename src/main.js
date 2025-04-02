// src/main.js
import * as THREE from 'three';
import GUI from 'lil-gui';
import { SceneManager } from './SceneManager.js';
import { CrownObject } from './CrownObject.js';

// --- GUI ---
const gui = new GUI();
gui.title("Управление Сценой и Объектом");
// gui.close(); // Можно закрыть по умолчанию

// --- Основные настройки ---
const canvas = document.querySelector('canvas.webgl');
if (!canvas) {
    console.error("Canvas element not found!");
    // Можно добавить создание canvas здесь, если нужно
}

// --- Инициализация менеджеров ---
const sceneManager = new SceneManager(canvas, gui);
const crownObject = new CrownObject(null, gui); // Передаем null для scene пока, он установится в SceneManager

// --- Глобальные переменные для доступа (если нужны вне классов) ---
let globalScene, globalCamera, globalRenderer;

// --- Асинхронная инициализация ---
async function initialize() {
    try {
        await sceneManager.init(); // Инициализируем сцену, камеру, свет, HDR...
        globalScene = sceneManager.getScene();
        globalCamera = sceneManager.getCamera();
        globalRenderer = sceneManager.getRenderer();

        // Передаем созданную сцену в объект короны
        crownObject.scene = globalScene;
        await crownObject.init(); // Инициализируем (загружаем) модель короны

        // --- Настройка слушателей событий ПОСЛЕ инициализации ---
        setupEventListeners();

        // --- Запуск анимационного цикла ---
        tick();

        console.log("Initialization complete. Starting animation loop.");

    } catch (error) {
        console.error("Initialization failed:", error);
        // Можно показать сообщение об ошибке пользователю
    }
}

// --- Отслеживание мыши ---
const mouse = { x: 0, y: 0 }; // Нормализованные координаты

function setupEventListeners() {
    // Обновляем обработчик мыши
    window.addEventListener('mousemove', (event) => {
        if (!crownObject.getModel()) return; // Не обновляем, если модели еще нет

        // Нормализуем координаты мыши от -1 до 1
        mouse.x = (event.clientX / sceneManager.sizes.width) * 2 - 1;
        mouse.y = -(event.clientY / sceneManager.sizes.height) * 2 + 1;

        // Передаем нормализованные координаты в объект короны
        crownObject.updateTargetRotation(mouse.x, mouse.y);
    });

    // Добавляем примеры триггеров для hide/show (например, по клавишам H и S)
    window.addEventListener('keydown', (event) => {
        if (event.key === 'h' || event.key === 'H') {
            crownObject.hide();
        } else if (event.key === 's' || event.key === 'S') {
            crownObject.show();
        }
    });

    // Ресайз обрабатывается внутри SceneManager через его собственный листенер
}


// --- Анимационный цикл ---
const clock = new THREE.Clock();

const tick = () => {
    // Запрашиваем следующий кадр
    window.requestAnimationFrame(tick);

    const elapsedTime = clock.getElapsedTime();

    // Обновляем SceneManager (OrbitControls, хелперы, рендер)
    sceneManager.update(); // SceneManager теперь сам рендерит сцену

    // Обновляем CrownObject (применение вращения)
    crownObject.update();

    // Рендеринг теперь происходит внутри sceneManager.update()
    // renderer.render(scene, camera); <-- Больше не нужно здесь
};

// --- Запуск инициализации ---
initialize();