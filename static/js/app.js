// static/js/app.js

// Глобальная функция для загрузки примеров
window.loadExample = function(expression, variables) {
    document.getElementById('expressionInput').value = expression;
    document.getElementById('variablesInput').value = variables;
    showActionModal();
};

// Глобальные переменные для управления
let isConnecting = false;
let currentConnector = null;
let currentBlock = null;
let tempLine = null;
let isSelecting = false;
let selectionStart = { x: 0, y: 0 };
let selectionRect = null;
let selectedElements = new Set();
let connections = new Map(); // Хранит соединения между блоками

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('BoolTrainer initialized');
    init();
});

function init() {
    setupEventListeners();
    setupDragAndDrop();
    setupVariableInputs();
    setupConnectionHandlers();
    setupSelectionHandlers();
    setupAutoArrange();
    hideActionModal();
}

function setupAutoArrange() {
    const autoArrangeBtn = document.getElementById('autoArrangeBtn');
    if (autoArrangeBtn) {
        autoArrangeBtn.addEventListener('click', autoArrangeBlocks);
    }
}

function setupSelectionHandlers() {
    const workspace = document.getElementById('schemeWorkspace');
    if (!workspace) return;

    // Начало выделения
    workspace.addEventListener('mousedown', (e) => {
        if (e.target === workspace || e.target.classList.contains('workspace')) {
            if (!e.target.classList.contains('connector') && !e.target.classList.contains('block')) {
                isSelecting = true;
                selectionStart = { x: e.clientX, y: e.clientY };

                // Создаем прямоугольник выделения
                selectionRect = document.createElement('div');
                selectionRect.className = 'selection-rect';
                selectionRect.style.left = selectionStart.x + 'px';
                selectionRect.style.top = selectionStart.y + 'px';
                selectionRect.style.width = '0px';
                selectionRect.style.height = '0px';
                workspace.appendChild(selectionRect);

                e.preventDefault();
            }
        }
    });

    // Изменение выделения
    document.addEventListener('mousemove', (e) => {
        if (isSelecting && selectionRect) {
            const currentX = e.clientX;
            const currentY = e.clientY;

            const left = Math.min(selectionStart.x, currentX);
            const top = Math.min(selectionStart.y, currentY);
            const width = Math.abs(currentX - selectionStart.x);
            const height = Math.abs(currentY - selectionStart.y);

            selectionRect.style.left = left + 'px';
            selectionRect.style.top = top + 'px';
            selectionRect.style.width = width + 'px';
            selectionRect.style.height = height + 'px';
        }
    });

    // Завершение выделения
    document.addEventListener('mouseup', (e) => {
        if (isSelecting && selectionRect) {
            isSelecting = false;

            // Получаем границы выделения
            const rect = selectionRect.getBoundingClientRect();

            // Находим элементы в области выделения
            const blocks = workspace.querySelectorAll('.block');
            const lines = workspace.querySelectorAll('.connection-line');

            selectedElements.clear();

            blocks.forEach(block => {
                const blockRect = block.getBoundingClientRect();
                if (isRectOverlap(rect, blockRect)) {
                    selectElement(block);
                }
            });

            lines.forEach(line => {
                const lineRect = line.getBoundingClientRect();
                if (isRectOverlap(rect, lineRect)) {
                    selectElement(line);
                }
            });

            // Удаляем прямоугольник выделения
            selectionRect.remove();
            selectionRect = null;
        }
    });

    // Очистка выделения по клику на пустом месте
    workspace.addEventListener('click', (e) => {
        if (e.target === workspace || e.target.classList.contains('workspace')) {
            clearSelection();
        }
    });
}

function isRectOverlap(rect1, rect2) {
    return !(rect1.right < rect2.left ||
             rect1.left > rect2.right ||
             rect1.bottom < rect2.top ||
             rect1.top > rect2.bottom);
}

function selectElement(element) {
    element.classList.add('selected');
    selectedElements.add(element);
}

function clearSelection() {
    selectedElements.forEach(element => {
        element.classList.remove('selected');
    });
    selectedElements.clear();
}

function setupConnectionHandlers() {
    // Обработчик отмены соединения по Esc
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (isConnecting) {
                cancelConnection();
            } else {
                clearSelection();
            }
        }

        // Удаление выделенных элементов по Delete
        if (e.key === 'Delete' && selectedElements.size > 0) {
            deleteSelectedElements();
        }

        // Перемещение выделенных элементов стрелками
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
            moveSelectedElements(e.key);
        }
    });
}

function deleteSelectedElements() {
    selectedElements.forEach(element => {
        if (element.classList.contains('block')) {
            // Удаляем соединения, связанные с блоком
            removeConnectionsForBlock(element);
        } else if (element.classList.contains('connection-line')) {
            // Удаляем линию соединения
            removeConnection(element);
        }
        element.remove();
    });
    selectedElements.clear();
}

function moveSelectedElements(direction) {
    const step = 5;
    let dx = 0, dy = 0;

    switch (direction) {
        case 'ArrowUp': dy = -step; break;
        case 'ArrowDown': dy = step; break;
        case 'ArrowLeft': dx = -step; break;
        case 'ArrowRight': dx = step; break;
    }

    selectedElements.forEach(element => {
        if (element.classList.contains('block')) {
            const currentLeft = parseInt(element.style.left) || 0;
            const currentTop = parseInt(element.style.top) || 0;

            const workspace = document.getElementById('schemeWorkspace');
            const maxX = workspace.offsetWidth - element.offsetWidth - 10;
            const maxY = workspace.offsetHeight - element.offsetHeight - 10;

            const newX = Math.max(10, Math.min(currentLeft + dx, maxX));
            const newY = Math.max(10, Math.min(currentTop + dy, maxY));

            element.style.left = newX + 'px';
            element.style.top = newY + 'px';

            // Обновляем соединения для этого блока
            updateConnectionsForBlock(element);
        }
    });
}

function setupVariableInputs() {
    const variablesInput = document.getElementById('variablesInput');
    if (variablesInput) {
        variablesInput.addEventListener('change', updateVariableBlocks);
        variablesInput.addEventListener('blur', updateVariableBlocks);
    }
}

function updateVariableBlocks() {
    const variablesInput = document.getElementById('variablesInput');
    const workspace = document.getElementById('schemeWorkspace');

    if (!variablesInput || !workspace) return;

    const variablesText = variablesInput.value.trim();
    if (!variablesText) return;

    const variables = variablesText.split(',').map(v => v.trim()).filter(v => v);

    // Удаляем старые блоки переменных
    const oldVarBlocks = workspace.querySelectorAll('.variable-block');
    oldVarBlocks.forEach(block => block.remove());

    // Создаем новые блоки переменных
    variables.forEach((variable, index) => {
        createVariableBlock(variable, index * 100 + 20, 20);
    });
}

function createVariableBlock(variableName, x, y) {
    const workspace = document.getElementById('schemeWorkspace');
    if (!workspace) return;

    const block = document.createElement('div');
    block.className = 'block variable-block';
    block.textContent = variableName;
    block.draggable = true;
    block.dataset.type = 'VARIABLE';
    block.dataset.variable = variableName;
    block.dataset.id = 'var_' + Date.now() + '_' + Math.random();

    // Позиционирование
    block.style.left = x + 'px';
    block.style.top = y + 'px';

    // Добавляем точку подключения (только выход)
    const connector = document.createElement('div');
    connector.className = 'connector output';
    connector.dataset.type = 'output';
    connector.dataset.parentId = block.dataset.id;

    connector.addEventListener('mousedown', startConnection);
    connector.addEventListener('click', (e) => e.stopPropagation());

    block.appendChild(connector);
    makeBlockDraggable(block, workspace);
    block.addEventListener('dragstart', handleDragStart);
    block.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!e.ctrlKey && !e.metaKey) {
            clearSelection();
        }
        selectElement(block);
    });

    workspace.appendChild(block);
    return block;
}

// Функция авто-расположения блоков
function autoArrangeBlocks() {
    const workspace = document.getElementById('schemeWorkspace');
    const blocks = workspace.querySelectorAll('.block:not(.variable-block)');
    const variableBlocks = workspace.querySelectorAll('.variable-block');

    // Располагаем переменные в верхней части
    variableBlocks.forEach((block, index) => {
        block.style.left = (index * 120 + 20) + 'px';
        block.style.top = '20px';
        updateConnectionsForBlock(block);
    });

    // Располагаем логические блоки ниже
    blocks.forEach((block, index) => {
        const row = Math.floor(index / 3);
        const col = index % 3;
        block.style.left = (col * 150 + 50) + 'px';
        block.style.top = (row * 100 + 120) + 'px';
        updateConnectionsForBlock(block);
    });
}

// Система соединений
function startConnection(e) {
    e.stopPropagation();
    e.preventDefault();

    const connector = e.target;
    const block = connector.parentElement;

    console.log('Начинаем соединение от:', block.textContent);

    isConnecting = true;
    currentConnector = connector;
    currentBlock = block;

    // Визуальное выделение
    connector.style.transform = 'scale(1.4)';
    connector.style.boxShadow = '0 0 10px #F59E0B';

    // Меняем курсор
    document.body.style.cursor = 'crosshair';

    // Добавляем временную линию
    createTemporaryLine(e.clientX, e.clientY);

    document.addEventListener('mousemove', onConnectionMove);
    document.addEventListener('mouseup', onConnectionEnd);
}

function onConnectionMove(e) {
    if (!isConnecting) return;
    updateTemporaryLine(e.clientX, e.clientY);
}

function onConnectionEnd(e) {
    if (!isConnecting) return;

    // Восстанавливаем состояние
    document.body.style.cursor = '';
    removeTemporaryLine();

    if (currentConnector) {
        currentConnector.style.transform = '';
        currentConnector.style.boxShadow = '';
    }

    // Находим целевой коннектор
    const targetConnector = findConnectorAtPoint(e.clientX, e.clientY);

    if (targetConnector && isValidConnection(currentConnector, targetConnector)) {
        createPermanentConnection(currentConnector, targetConnector);
        calculateSchemeTruthTable();
    } else {
        console.log('Соединение не создано');
    }

    // Очищаем
    document.removeEventListener('mousemove', onConnectionMove);
    document.removeEventListener('mouseup', onConnectionEnd);
    currentConnector = null;
    currentBlock = null;
    isConnecting = false;
}

function findConnectorAtPoint(x, y) {
    const elements = document.elementsFromPoint(x, y);

    for (let element of elements) {
        if (element.classList.contains('connector') && element !== currentConnector) {
            console.log('Найден целевой коннектор:', element.className);
            return element;
        }
    }
    return null;
}

function isValidConnection(sourceConnector, targetConnector) {
    const isSourceOutput = sourceConnector.classList.contains('output');
    const isTargetInput = targetConnector.classList.contains('input');

    if (!isSourceOutput || !isTargetInput) {
        console.log('Ошибка: можно соединять только ВЫХОД с ВХОДОМ');
        return false;
    }

    if (sourceConnector.parentElement === targetConnector.parentElement) {
        console.log('Ошибка: нельзя соединять блок с самим собой');
        return false;
    }

    // Проверяем, не соединены ли уже эти коннекторы
    const connectionId = getConnectionId(sourceConnector, targetConnector);
    if (connections.has(connectionId)) {
        console.log('Ошибка: соединение уже существует');
        return false;
    }

    console.log('Валидное соединение!');
    return true;
}

function getConnectionId(connector1, connector2) {
    const id1 = connector1.dataset.parentId + '_' + connector1.dataset.type;
    const id2 = connector2.dataset.parentId + '_' + connector2.dataset.type;
    return [id1, id2].sort().join('|');
}

function createPermanentConnection(sourceConnector, targetConnector) {
    const sourceBlock = sourceConnector.parentElement;
    const targetBlock = targetConnector.parentElement;

    console.log(`Создано соединение: ${sourceBlock.textContent} → ${targetBlock.textContent}`);

    // Визуальное подтверждение
    sourceConnector.classList.add('connected');
    targetConnector.classList.add('connected');

    // Создаем линию соединения
    const line = createConnectionLine(sourceConnector, targetConnector);

    // Сохраняем соединение
    const connectionId = getConnectionId(sourceConnector, targetConnector);
    connections.set(connectionId, {
        source: sourceConnector,
        target: targetConnector,
        line: line
    });

    // Добавляем обработчик клика на линию
    line.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!e.ctrlKey && !e.metaKey) {
            clearSelection();
        }
        selectElement(line);
    });
}

function createTemporaryLine(startX, startY) {
    const workspace = document.getElementById('schemeWorkspace');
    if (!workspace) return;

    tempLine = document.createElement('div');
    tempLine.className = 'temp-line';
    workspace.appendChild(tempLine);
    updateTemporaryLine(startX, startY);
}

function updateTemporaryLine(x, y) {
    if (!tempLine || !currentConnector) return;

    const workspace = document.getElementById('schemeWorkspace');
    const connectorRect = currentConnector.getBoundingClientRect();
    const workspaceRect = workspace.getBoundingClientRect();

    const startX = connectorRect.left + connectorRect.width / 2 - workspaceRect.left;
    const startY = connectorRect.top + connectorRect.height / 2 - workspaceRect.top;
    const endX = x - workspaceRect.left;
    const endY = y - workspaceRect.top;

    const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
    const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;

    tempLine.style.left = startX + 'px';
    tempLine.style.top = startY + 'px';
    tempLine.style.width = length + 'px';
    tempLine.style.transform = `rotate(${angle}deg)`;
}

function removeTemporaryLine() {
    if (tempLine) {
        tempLine.remove();
        tempLine = null;
    }
}

function createConnectionLine(sourceConnector, targetConnector) {
    const workspace = document.getElementById('schemeWorkspace');
    if (!workspace) return;

    const sourceRect = sourceConnector.getBoundingClientRect();
    const targetRect = targetConnector.getBoundingClientRect();
    const workspaceRect = workspace.getBoundingClientRect();

    const startX = sourceRect.left + sourceRect.width / 2 - workspaceRect.left;
    const startY = sourceRect.top + sourceRect.height / 2 - workspaceRect.top;
    const endX = targetRect.left + targetRect.width / 2 - workspaceRect.left;
    const endY = targetRect.top + targetRect.height / 2 - workspaceRect.top;

    const line = document.createElement('div');
    line.className = 'connection-line';
    line.dataset.connection = getConnectionId(sourceConnector, targetConnector);

    const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
    const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;

    line.style.left = startX + 'px';
    line.style.top = startY + 'px';
    line.style.width = length + 'px';
    line.style.transform = `rotate(${angle}deg)`;

    workspace.appendChild(line);
    return line;
}

function updateConnectionsForBlock(block) {
    const blockId = block.dataset.id;

    connections.forEach((connection, connectionId) => {
        if (connectionId.includes(blockId)) {
            updateConnectionLine(connection.line, connection.source, connection.target);
        }
    });
}

function updateConnectionLine(line, sourceConnector, targetConnector) {
    const workspace = document.getElementById('schemeWorkspace');
    const sourceRect = sourceConnector.getBoundingClientRect();
    const targetRect = targetConnector.getBoundingClientRect();
    const workspaceRect = workspace.getBoundingClientRect();

    const startX = sourceRect.left + sourceRect.width / 2 - workspaceRect.left;
    const startY = sourceRect.top + sourceRect.height / 2 - workspaceRect.top;
    const endX = targetRect.left + targetRect.width / 2 - workspaceRect.left;
    const endY = targetRect.top + targetRect.height / 2 - workspaceRect.top;

    const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
    const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;

    line.style.left = startX + 'px';
    line.style.top = startY + 'px';
    line.style.width = length + 'px';
    line.style.transform = `rotate(${angle}deg)`;
}

function removeConnectionsForBlock(block) {
    const blockId = block.dataset.id;
    const connectionsToRemove = [];

    connections.forEach((connection, connectionId) => {
        if (connectionId.includes(blockId)) {
            connectionsToRemove.push(connectionId);
            connection.line.remove();
            connection.source.classList.remove('connected');
            connection.target.classList.remove('connected');
        }
    });

    connectionsToRemove.forEach(id => connections.delete(id));
}

function removeConnection(line) {
    const connectionId = line.dataset.connection;
    const connection = connections.get(connectionId);

    if (connection) {
        connection.source.classList.remove('connected');
        connection.target.classList.remove('connected');
        connections.delete(connectionId);
    }
}

function cancelConnection() {
    console.log('Отмена соединения');
    document.body.style.cursor = '';
    removeTemporaryLine();

    if (currentConnector) {
        currentConnector.style.transform = '';
        currentConnector.style.boxShadow = '';
    }

    document.removeEventListener('mousemove', onConnectionMove);
    document.removeEventListener('mouseup', onConnectionEnd);

    currentConnector = null;
    currentBlock = null;
    isConnecting = false;
}

function setupEventListeners() {
    const quickStartBtn = document.getElementById('quickStartBtn');
    const truthTableBtn = document.getElementById('truthTableBtn');
    const transformBtn = document.getElementById('transformBtn');
    const schemeBtn = document.getElementById('schemeBtn');
    const closeModal = document.getElementById('closeModal');
    const buildSchemeBtn = document.getElementById('buildSchemeBtn');
    const clearSchemeBtn = document.getElementById('clearSchemeBtn');
    const calculateSchemeBtn = document.getElementById('calculateSchemeBtn');

    if (quickStartBtn) quickStartBtn.addEventListener('click', showActionModal);
    if (truthTableBtn) truthTableBtn.addEventListener('click', () => analyzeExpression('truth_table'));
    if (transformBtn) transformBtn.addEventListener('click', () => analyzeExpression('transform'));

    if (schemeBtn) {
        schemeBtn.addEventListener('click', function() {
            hideActionModal();
            buildLogicScheme();
        });
    }

    if (closeModal) closeModal.addEventListener('click', hideActionModal);
    if (buildSchemeBtn) buildSchemeBtn.addEventListener('click', buildLogicScheme);
    if (clearSchemeBtn) clearSchemeBtn.addEventListener('click', clearSchemeWorkspace);

    // Новая кнопка для расчета таблицы истинности схемы
    if (calculateSchemeBtn) {
        calculateSchemeBtn.addEventListener('click', calculateSchemeTruthTable);
    }

    const modal = document.getElementById('actionModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) hideActionModal();
        });
    }
}

function setupDragAndDrop() {
    const blocks = document.querySelectorAll('.palette .block');
    const workspace = document.getElementById('schemeWorkspace');

    blocks.forEach(block => {
        block.addEventListener('dragstart', handleDragStart);
    });

    if (workspace) {
        workspace.addEventListener('dragover', handleDragOver);
        workspace.addEventListener('drop', handleDrop);

        workspace.addEventListener('dragover', (e) => {
            e.preventDefault();
            workspace.style.backgroundColor = '#f0f9ff';
            workspace.style.borderColor = '#2563EB';
        });

        workspace.addEventListener('dragleave', (e) => {
            if (!workspace.contains(e.relatedTarget)) {
                workspace.style.backgroundColor = '';
                workspace.style.borderColor = '';
            }
        });

        workspace.addEventListener('drop', (e) => {
            workspace.style.backgroundColor = '';
            workspace.style.borderColor = '';
        });
    }
}

function handleDragStart(e) {
    const blockType = e.target.dataset.type;
    const isFromPalette = e.target.parentElement.classList.contains('palette');

    e.dataTransfer.setData('text/plain', blockType);
    e.dataTransfer.setData('from-palette', isFromPalette);
    e.dataTransfer.effectAllowed = 'move';

    if (isFromPalette) {
        e.target.style.opacity = '0.4';
        setTimeout(() => {
            e.target.style.opacity = '1';
        }, 0);
    } else {
        e.target.style.opacity = '0.7';
    }
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDrop(e) {
    e.preventDefault();
    const blockType = e.dataTransfer.getData('text/plain');
    const fromPalette = e.dataTransfer.getData('from-palette') === 'true';

    const workspace = document.getElementById('schemeWorkspace');
    const rect = workspace.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (fromPalette) {
        addLogicBlockToWorkspace(blockType, x, y);
    }
}

function addLogicBlockToWorkspace(type, x, y) {
    const workspace = document.getElementById('schemeWorkspace');
    if (!workspace) return;

    if (type === 'VARIABLE') {
        console.log('Нельзя создавать переменные через перетаскивание');
        return;
    }

    const block = document.createElement('div');
    block.className = `block ${type.toLowerCase()}-block`;
    block.textContent = type;
    block.draggable = true;
    block.dataset.type = type;
    block.dataset.id = type.toLowerCase() + '_' + Date.now() + '_' + Math.random();

    block.style.position = 'absolute';
    block.style.left = Math.max(10, x - 30) + 'px';
    block.style.top = Math.max(10, y - 15) + 'px';
    block.style.cursor = 'move';
    block.style.zIndex = '10';

    addConnectorsToBlock(block, type);
    makeBlockDraggable(block, workspace);
    block.addEventListener('dragstart', handleDragStart);

    // Добавляем обработчик клика для выделения
    block.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!e.ctrlKey && !e.metaKey) {
            clearSelection();
        }
        selectElement(block);
    });

    workspace.appendChild(block);

    console.log(`Добавлен новый блок: ${type}`);
}

function addConnectorsToBlock(block, type) {
    // Всегда добавляем выходной коннектор
    const outputConnector = document.createElement('div');
    outputConnector.className = 'connector output';
    outputConnector.dataset.type = 'output';
    outputConnector.dataset.parentId = block.dataset.id;
    outputConnector.title = 'Выход';

    outputConnector.addEventListener('mousedown', startConnection);
    outputConnector.addEventListener('click', (e) => e.stopPropagation());
    block.appendChild(outputConnector);

    // Добавляем входные коннекторы в зависимости от типа блока
    if (type === 'NOT') {
        addInputConnector(block, 'center');
    } else if (type === 'AND' || type === 'OR' || type === 'XOR') {
        addInputConnector(block, 'top');
        addInputConnector(block, 'bottom');
    } else if (type === 'INPUT') {
        // Блок INPUT имеет только выход
    } else if (type === 'OUTPUT') {
        addInputConnector(block, 'center');
    }
}

function addInputConnector(block, position) {
    const inputConnector = document.createElement('div');
    inputConnector.className = `connector input ${position}`;
    inputConnector.dataset.type = 'input';
    inputConnector.dataset.parentId = block.dataset.id;
    inputConnector.title = 'Вход';

    inputConnector.addEventListener('mousedown', startConnection);
    inputConnector.addEventListener('click', (e) => e.stopPropagation());
    block.appendChild(inputConnector);
}

function makeBlockDraggable(block, workspace) {
    let isDragging = false;
    let startX, startY, initialX, initialY;

    block.addEventListener('mousedown', startDrag);

    function startDrag(e) {
        if (e.target.classList.contains('connector')) {
            return;
        }

        if (e.button !== 0) return;

        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;

        const rect = block.getBoundingClientRect();
        const workspaceRect = workspace.getBoundingClientRect();

        initialX = rect.left - workspaceRect.left;
        initialY = rect.top - workspaceRect.top;

        block.style.zIndex = '100';
        block.style.cursor = 'grabbing';
        block.style.opacity = '0.8';

        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);

        e.preventDefault();
    }

    function drag(e) {
        if (!isDragging) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        let newX = initialX + dx;
        let newY = initialY + dy;

        const maxX = workspace.offsetWidth - block.offsetWidth - 10;
        const maxY = workspace.offsetHeight - block.offsetHeight - 10;

        newX = Math.max(10, Math.min(newX, maxX));
        newY = Math.max(10, Math.min(newY, maxY));

        block.style.left = newX + 'px';
        block.style.top = newY + 'px';

        // Обновляем соединения при перемещении
        updateConnectionsForBlock(block);
    }

    function stopDrag() {
        isDragging = false;
        block.style.zIndex = '10';
        block.style.cursor = 'move';
        block.style.opacity = '1';

        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', stopDrag);
    }
}

function showActionModal() {
    const expression = document.getElementById('expressionInput').value;
    const variables = document.getElementById('variablesInput').value;

    if (!expression || !variables) {
        alert('Пожалуйста, введите выражение и переменные');
        return;
    }

    const currentExpression = document.getElementById('currentExpression');
    const currentVariables = document.getElementById('currentVariables');

    if (currentExpression) {
        currentExpression.textContent = expression;
    }
    if (currentVariables) {
        currentVariables.textContent = variables;
    }

    const modal = document.getElementById('actionModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function hideActionModal() {
    const modal = document.getElementById('actionModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function buildLogicScheme() {
    const expression = document.getElementById('expressionInput').value;
    const variables = document.getElementById('variablesInput').value;
    const workspace = document.getElementById('schemeWorkspace');

    if (!expression) {
        alert('Введите выражение для построения схемы');
        return;
    }

    if (workspace) {
        workspace.innerHTML = '';

        const title = document.createElement('div');
        title.className = 'scheme-title';
        title.innerHTML = `
            <h3>Логическая схема для выражения: ${expression}</h3>
        `;
        workspace.appendChild(title);

        if (variables) {
            updateVariableBlocks();
        }
    }
}

function clearSchemeWorkspace() {
    const workspace = document.getElementById('schemeWorkspace');
    if (workspace) {
        workspace.innerHTML = '<div class="scheme-title"><h3>Перетащите блоки для построения схемы</h3></div>';
        connections.clear();
        selectedElements.clear();
    }
}

// Функция для расчета таблицы истинности схемы
async function calculateSchemeTruthTable() {
    const variables = document.getElementById('variablesInput').value;

    if (!variables) {
        alert('Пожалуйста, введите переменные');
        return;
    }

    try {
        // Собираем данные о схеме
        const schemeData = collectSchemeData();

        const response = await fetch('/api/calculate_scheme', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                scheme: schemeData,
                variables: variables
            })
        });

        const result = await response.json();

        if (result.success) {
            displayTruthTable(result.table, 'Логическая схема');
        } else {
            throw new Error(result.error || 'Unknown error');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Ошибка расчета схемы: ' + error.message);
    }
}

function collectSchemeData() {
    const blocks = Array.from(document.querySelectorAll('.workspace .block'));
    const connectionElements = Array.from(document.querySelectorAll('.connection-line'));

    return {
        blocks: blocks.map(block => ({
            id: block.dataset.id,
            type: block.dataset.type,
            variable: block.dataset.variable,
            position: {
                x: parseInt(block.style.left) || 0,
                y: parseInt(block.style.top) || 0
            }
        })),
        connections: connectionElements.map(line => ({
            id: line.dataset.connection,
            points: getLinePoints(line)
        }))
    };
}

function getLinePoints(line) {
    const style = line.style;
    const angle = parseFloat(style.transform.replace('rotate(', '').replace('deg)', '')) || 0;
    const length = parseInt(style.width) || 0;

    const startX = parseInt(style.left) || 0;
    const startY = parseInt(style.top) || 0;

    // Вычисляем конечную точку на основе угла и длины
    const rad = angle * Math.PI / 180;
    const endX = startX + length * Math.cos(rad);
    const endY = startY + length * Math.sin(rad);

    return {
        startX: startX,
        startY: startY,
        endX: endX,
        endY: endY
    };
}

async function analyzeExpression(type) {
    const expression = document.getElementById('expressionInput').value;
    const variables = document.getElementById('variablesInput').value;

    hideActionModal();

    if (!expression || !variables) {
        alert('Пожалуйста, введите выражение и переменные');
        return;
    }

    try {
        if (type === 'truth_table') {
            const response = await fetch('/api/truth_table', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    expression: expression,
                    variables: variables
                })
            });

            const result = await response.json();

            if (result.success) {
                displayTruthTable(result.table, result.expression);
            } else {
                throw new Error(result.error || 'Unknown error');
            }
        } else if (type === 'transform') {
            const response = await fetch('/api/normal_forms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    expression: expression,
                    variables: variables
                })
            });

            const result = await response.json();

            if (result.success) {
                displayNormalForms(result.original, result.cnf, result.dnf);
            } else {
                throw new Error(result.error || 'Unknown error');
            }
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Ошибка: ' + error.message);
    }
}

function displayTruthTable(table, expression) {
    const truthTableSection = document.getElementById('truthTableSection');
    const truthTableContent = document.getElementById('truthTableContent');
    const transformSection = document.getElementById('transformSection');

    if (!truthTableContent || table.length === 0) return;

    const headers = Object.keys(table[0]);
    const html = `
        <h3>Таблица истинности для выражения: ${expression}</h3>
        <div class="table-container">
            <table class="truth-table">
                <thead>
                    <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${table.map(row => `
                        <tr>${headers.map(h => `<td>${row[h] ? '1' : '0'}</td>`).join('')}</tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    truthTableContent.innerHTML = html;

    if (truthTableSection) truthTableSection.classList.remove('hidden');
    if (transformSection) transformSection.classList.add('hidden');
}

function displayNormalForms(original, cnf, dnf) {
    const transformSection = document.getElementById('transformSection');
    const transformContent = document.getElementById('transformContent');
    const truthTableSection = document.getElementById('truthTableSection');

    if (!transformContent) return;

    const html = `
        <h3>Преобразование выражения</h3>
        <div class="expression-preview">
            <strong>Исходное:</strong> ${original}
        </div>
        <div class="expression-preview">
            <strong>КНФ (Конъюнктивная нормальная форма):</strong> ${cnf}
        </div>
        <div class="expression-preview">
            <strong>ДНФ (Дизъюнктивная нормальная форма):</strong> ${dnf}
        </div>
    `;

    transformContent.innerHTML = html;

    if (transformSection) transformSection.classList.remove('hidden');
    if (truthTableSection) truthTableSection.classList.add('hidden');
}