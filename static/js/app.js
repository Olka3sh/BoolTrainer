// static/js/app.js

// Конфигурация
const QUICK_START_EXAMPLES = [
    { expression: "a & b", variables: "a,b", description: "Логическое И" },
    { expression: "a | b", variables: "a,b", description: "Логическое ИЛИ" },
    { expression: "~a", variables: "a", description: "Логическое НЕ" },
    { expression: "a & ~b", variables: "a,b", description: "И с отрицанием" },
    { expression: "(a & b) | (~a & c)", variables: "a,b,c", description: "Мультиплексор" },
    { expression: "a & (b | c)", variables: "a,b,c", description: "Дистрибутивный закон" }
];

// Глобальные переменные для управления соединениями
let isConnecting = false;
let currentConnector = null;
let currentBlock = null;
let tempLine = null;

// Глобальные функции для HTML onclick
window.loadExample = function(expression, variables) {
    document.getElementById('expressionInput').value = expression;
    document.getElementById('variablesInput').value = variables;
    showActionModal();
};

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('BoolTrainer initialized');
    init();
});

function init() {
    loadQuickStartExamples();
    setupEventListeners();
    setupDragAndDrop();
    setupVariableInputs();
    setupConnectionHandlers();
}

function setupConnectionHandlers() {
    // Обработчик отмены соединения по Esc
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && isConnecting) {
            cancelConnection();
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
        createVariableBlock(variable, index * 80 + 20, 20);
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

    // Стиль для блоков переменных
    block.style.position = 'absolute';
    block.style.left = x + 'px';
    block.style.top = y + 'px';
    block.style.cursor = 'move';
    block.style.zIndex = '10';
    block.style.background = '#2563EB';
    block.style.color = 'white';
    block.style.padding = '10px 15px';
    block.style.borderRadius = '6px';
    block.style.textAlign = 'center';
    block.style.minWidth = '50px';

    // Добавляем точку подключения (только выход)
    const connector = document.createElement('div');
    connector.className = 'connector output';
    connector.style.position = 'absolute';
    connector.style.right = '-10px';
    connector.style.top = '50%';
    connector.style.transform = 'translateY(-50%)';
    connector.style.width = '16px';
    connector.style.height = '16px';
    connector.style.background = '#10B981';
    connector.style.borderRadius = '50%';
    connector.style.cursor = 'crosshair';
    connector.style.border = '2px solid white';
    connector.title = 'Выход';

    connector.addEventListener('mousedown', startConnection);

    block.appendChild(connector);
    makeBlockDraggable(block, workspace);
    block.addEventListener('dragstart', handleDragStart);
    workspace.appendChild(block);
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
    connector.style.zIndex = '100';

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
        currentConnector.style.zIndex = '';
    }

    // Находим целевой коннектор
    const targetConnector = findConnectorAtPoint(e.clientX, e.clientY);

    if (targetConnector && isValidConnection(currentConnector, targetConnector)) {
        createPermanentConnection(currentConnector, targetConnector);
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

    console.log('Валидное соединение!');
    return true;
}

function createPermanentConnection(sourceConnector, targetConnector) {
    const sourceBlock = sourceConnector.parentElement;
    const targetBlock = targetConnector.parentElement;

    console.log(`Создано соединение: ${sourceBlock.textContent} → ${targetBlock.textContent}`);

    // Визуальное подтверждение
    sourceConnector.style.background = '#059669';
    targetConnector.style.background = '#DC2626';

    // Создаем линию соединения
    createConnectionLine(sourceConnector, targetConnector);

    updateSchemeCalculation();
}

function createTemporaryLine(startX, startY) {
    const workspace = document.getElementById('schemeWorkspace');
    if (!workspace) return;

    tempLine = document.createElement('div');
    tempLine.style.cssText = `
        position: absolute;
        pointer-events: none;
        z-index: 50;
        background: #F59E0B;
        height: 3px;
        transform-origin: 0 0;
    `;

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
    line.style.cssText = `
        position: absolute;
        pointer-events: none;
        z-index: 5;
        background: #6B7280;
        height: 2px;
        transform-origin: 0 0;
    `;

    const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
    const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;

    line.style.left = startX + 'px';
    line.style.top = startY + 'px';
    line.style.width = length + 'px';
    line.style.transform = `rotate(${angle}deg)`;

    workspace.appendChild(line);
}

function cancelConnection() {
    console.log('Отмена соединения');
    document.body.style.cursor = '';
    removeTemporaryLine();

    if (currentConnector) {
        currentConnector.style.transform = '';
        currentConnector.style.boxShadow = '';
        currentConnector.style.zIndex = '';
    }

    document.removeEventListener('mousemove', onConnectionMove);
    document.removeEventListener('mouseup', onConnectionEnd);

    currentConnector = null;
    currentBlock = null;
    isConnecting = false;
}

function updateSchemeCalculation() {
    console.log('Схема обновлена');
}

function loadQuickStartExamples() {
    const examplesContainer = document.getElementById('quickStartExamples');
    if (!examplesContainer) {
        console.error('Quick start examples container not found');
        return;
    }

    examplesContainer.innerHTML = QUICK_START_EXAMPLES.map(example => `
        <div class="example-item" onclick="loadExample('${example.expression}', '${example.variables}')">
            <div class="example-expression">${example.expression}</div>
            <div class="example-desc">${example.description}</div>
        </div>
    `).join('');
}

function setupEventListeners() {
    const quickStartBtn = document.getElementById('quickStartBtn');
    const truthTableBtn = document.getElementById('truthTableBtn');
    const transformBtn = document.getElementById('transformBtn');
    const schemeBtn = document.getElementById('schemeBtn');
    const closeModal = document.getElementById('closeModal');
    const buildSchemeBtn = document.getElementById('buildSchemeBtn');
    const clearSchemeBtn = document.getElementById('clearSchemeBtn');

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

    block.style.position = 'absolute';
    block.style.left = Math.max(10, x - 30) + 'px';
    block.style.top = Math.max(10, y - 15) + 'px';
    block.style.cursor = 'move';
    block.style.zIndex = '10';

    addConnectorsToBlock(block, type);
    makeBlockDraggable(block, workspace);
    block.addEventListener('dragstart', handleDragStart);
    workspace.appendChild(block);

    console.log(`Добавлен новый блок: ${type}`);
}

function addConnectorsToBlock(block, type) {
    const outputConnector = document.createElement('div');
    outputConnector.className = 'connector output';
    outputConnector.style.position = 'absolute';
    outputConnector.style.right = '-10px';
    outputConnector.style.top = '50%';
    outputConnector.style.transform = 'translateY(-50%)';
    outputConnector.style.width = '16px';
    outputConnector.style.height = '16px';
    outputConnector.style.background = '#10B981';
    outputConnector.style.borderRadius = '50%';
    outputConnector.style.cursor = 'crosshair';
    outputConnector.style.border = '2px solid white';
    outputConnector.title = 'Выход';

    outputConnector.addEventListener('mousedown', startConnection);
    block.appendChild(outputConnector);

    if (type === 'NOT') {
        addInputConnector(block, 'top');
    } else if (type === 'AND' || type === 'OR' || type === 'XOR') {
        addInputConnector(block, 'top-10');
        addInputConnector(block, 'bottom+10');
    } else if (type === 'OUTPUT') {
        addInputConnector(block, 'top');
    }
}

function addInputConnector(block, position) {
    const inputConnector = document.createElement('div');
    inputConnector.className = 'connector input';
    inputConnector.style.position = 'absolute';
    inputConnector.style.left = '-10px';
    inputConnector.style.width = '16px';
    inputConnector.style.height = '16px';
    inputConnector.style.background = '#EF4444';
    inputConnector.style.borderRadius = '50%';
    inputConnector.style.cursor = 'crosshair';
    inputConnector.style.border = '2px solid white';
    inputConnector.title = 'Вход';

    if (position === 'top') {
        inputConnector.style.top = '50%';
        inputConnector.style.transform = 'translateY(-50%)';
    } else if (position === 'top-10') {
        inputConnector.style.top = 'calc(50% - 10px)';
        inputConnector.style.transform = 'translateY(-50%)';
    } else if (position === 'bottom+10') {
        inputConnector.style.top = 'calc(50% + 10px)';
        inputConnector.style.transform = 'translateY(-50%)';
    }

    inputConnector.addEventListener('mousedown', startConnection);
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
    if (currentExpression) {
        currentExpression.textContent = `${expression} [${variables}]`;
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
        title.style.textAlign = 'center';
        title.style.marginBottom = '20px';
        title.style.padding = '10px';
        title.innerHTML = `
            <h3>Логическая схема для выражения: ${expression}</h3>
            <p>Перетащите блоки из палитры и соедините их</p>
            <p><small>Используйте точки подключения для соединения блоков</small></p>
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
        workspace.innerHTML = '<p>Перетащите блоки сюда для построения схемы...</p>';
    }
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
            <strong>КНФ:</strong> ${cnf}
        </div>
        <div class="expression-preview">
            <strong>ДНФ:</strong> ${dnf}
        </div>
    `;

    transformContent.innerHTML = html;

    if (transformSection) transformSection.classList.remove('hidden');
    if (truthTableSection) truthTableSection.classList.add('hidden');
}