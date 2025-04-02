// main.js
import * as THREE from 'three';
import GUI from 'lil-gui';
import { SceneManager } from './SceneManager.js';
import { CrownObject } from './CrownObject.js';

// --- Инициализация ---
const canvas = document.querySelector('canvas.webgl');
const gui = new GUI();
gui.title("Настройки Сцены");
// gui.close(); // Раскомментируйте, если нужно закрыть по умолчанию

// Создаем менеджер сцены
const sceneManager = new SceneManager(canvas);

// Создаем объект короны, передаем сцену и размеры
const crown = new CrownObject(sceneManager.getScene(), sceneManager.getSizes());

// --- Настройка GUI ---
sceneManager.setupGUI(gui);
// GUI для короны будет настроен после ее загрузки (см. ниже)

// --- Загрузка модели и старт анимации ---
const clock = new THREE.Clock();

// Функция анимации
const tick = () => {
    // Обновляем состояние сцены (свет, экспозиция)
    sceneManager.update();

    // Обновляем состояние короны (вращение)
    crown.update();

    // Рендеринг
    sceneManager.getRenderer().render(sceneManager.getScene(), sceneManager.getCamera());

    // Запрос следующего кадра
    window.requestAnimationFrame(tick);
};

// Загружаем модель короны. Когда загрузка завершится,
// настраиваем ее GUI и запускаем цикл анимации tick()
crown.loadModel('models/crown.gltf', (loadedCrown) => {
    // Настраиваем GUI для короны ТЕПЕРЬ, когда модель загружена
    loadedCrown.setupGUI(gui);

    // Запускаем анимационный цикл ТОЛЬКО ПОСЛЕ загрузки модели
    console.log("Модель загружена, запускаем анимацию...");
    tick();
    // --- НОВОЕ: Добавляем слушатель клика на все окно ---
    let f = 0
    window.addEventListener('click', () => {
        console.log('Window clicked - triggering hide animation.');
        // Вызываем метод hide у ЗАГРУЖЕННОГО объекта короны
        // Устанавливаем продолжительность анимации, например, 1.5 секунды
        if (f == 0) {
            loadedCrown.hide(1.1);
            f = 1
        } else {
            loadedCrown.show(1.1);
            f = 0
        }
       
    });
    // --- Конец нового кода ---
});

// Опционально: можно добавить начальное сообщение в консоль
console.log("Инициализация завершена, ожидание загрузки модели...");