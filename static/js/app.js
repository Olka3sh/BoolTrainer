// static/js/app.js

class BoolTrainerApp {
    constructor() {
        this.schemeManager = new SchemeManager('schemeWorkspace');
        this.uiController = new UIController();
        this.isInitialized = false;
        this.isConnecting = false;           // Переменные для управления соединениями
        this.currentConnector = null;
        this.tempLine = null;
        this.selectedElements = new Set();
    }

    init() {
        if (this.isInitialized) return;
        this.setupGlobalFunctions();
        this.uiController.setupEventListeners();
        this.setupSchemeHandlers();
        this.setupConnectionHandlers();
        this.setupSelectionHandlers();
        this.setupDragAndDrop();
        this.setupVariableInputs();
        this.initializePalette();
        this.hideActionModal();
        this.isInitialized = true;
        console.log('BoolTrainer initialized');
    }

    setupGlobalFunctions() {
        window.loadExample = (expression, variables) => {
            document.getElementById('expressionInput').value = expression;
            document.getElementById('variablesInput').value = variables;
            this.showActionModal();
        };
    }

    setupSchemeHandlers() {
        document.getElementById('buildSchemeBtn').addEventListener('click', () => this.buildLogicScheme());
        document.getElementById('calculateSchemeBtn').addEventListener('click', () => this.calculateSchemeTruthTable());
        document.getElementById('clearSchemeBtn').addEventListener('click', () => this.clearSchemeWorkspace());
    }

    setupConnectionHandlers() {
        const workspace = document.getElementById('schemeWorkspace');
        workspace.addEventListener('mousedown', (e) => {                         // Обработчик начала соединения
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                return;
            }
            if (e.target.classList.contains('connector')) {
                this.startConnection(e);
            }
        });
        document.addEventListener('mousemove', (e) => {              // Обработчик движения мыши
            if (this.isConnecting) {
                this.updateTempLine(e);
            }
        });
        document.addEventListener('mouseup', (e) => {               // Обработчик окончания соединения
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                return;
            }

            if (this.isConnecting) {
                this.finishConnection(e);
            }
        });
        document.addEventListener('keydown', (e) => {              // Отмена соединения по ESC
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            if (e.key === 'Escape' && this.isConnecting) {
                this.cancelConnection();
            }
        });
    }

    startConnection(e) {
        e.stopPropagation();
        e.preventDefault();
        console.log('🟢 Start connection from:', e.target);
        this.isConnecting = true;
        this.currentConnector = e.target;
        this.createTempLine(e.clientX, e.clientY);        // Создаем временную линию
    }

    createTempLine(x, y) {
        this.tempLine = document.createElement('div');
        this.tempLine.className = 'temp-line';
        document.getElementById('schemeWorkspace').appendChild(this.tempLine);
        this.updateTempLine({ clientX: x, clientY: y });
    }

    updateTempLine(e) {
        if (!this.tempLine || !this.currentConnector) return;
        const workspace = document.getElementById('schemeWorkspace');
        const connectorRect = this.currentConnector.getBoundingClientRect();
        const workspaceRect = workspace.getBoundingClientRect();
        const startX = connectorRect.left + connectorRect.width / 2 - workspaceRect.left;
        const startY = connectorRect.top + connectorRect.height / 2 - workspaceRect.top;
        const endX = e.clientX - workspaceRect.left;
        const endY = e.clientY - workspaceRect.top;
        const dx = endX - startX;
        const dy = endY - startY;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        this.tempLine.style.left = startX + 'px';
        this.tempLine.style.top = startY + 'px';
        this.tempLine.style.width = length + 'px';
        this.tempLine.style.transform = `rotate(${angle}deg)`;
    }

    finishConnection(e) {
        document.body.style.cursor = '';
        this.removeTempLine();
        const targetConnector = this.findTargetConnector(e.clientX, e.clientY);        // Ищем целевой коннектор
        if (targetConnector && this.isValidConnection(this.currentConnector, targetConnector)) {
            this.createConnection(this.currentConnector, targetConnector);
        }
        this.isConnecting = false;
        this.currentConnector = null;
        this.updateSchemeState();
    }

    findTargetConnector(x, y) {
        const elements = document.elementsFromPoint(x, y);
        for (let element of elements) {
            if (element.classList.contains('connector') && element !== this.currentConnector) {
                console.log('🎯 Found target connector:', element);
                return element;
            }
        }
        console.log('🎯 No target connector found');
        return null;
    }

    isValidConnection(source, target) {
        const isSourceOutput = source.classList.contains('output');
        const isTargetInput = target.classList.contains('input');
        if (!isSourceOutput || !isTargetInput) {
            return false;
        }
        if (source.parentElement === target.parentElement) {
            return false;
        }
        return true;
    }

    createConnection(sourceConnector, targetConnector) {
        const connection = this.schemeManager.createConnection(sourceConnector, targetConnector);     // Используем SchemeManager для создания соединения
        if (connection) {
            console.log('✅ Connection created successfully!');
        }
    }

    cancelConnection() {
        console.log('🚫 Connection cancelled');
        document.body.style.cursor = '';
        this.removeTempLine();
        this.isConnecting = false;
        this.currentConnector = null;
    }

    removeTempLine() {
        if (this.tempLine) {
            this.tempLine.remove();
            this.tempLine = null;
        }
    }

    setupSelectionHandlers() {
        const workspace = document.getElementById('schemeWorkspace');
        if (!workspace) return;
        workspace.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON' ||
                e.target.closest('button') ||
                e.target.classList.contains('connector') ||
                e.target.classList.contains('block')) {
                return;
            }
            if (e.target === workspace || e.target.classList.contains('workspace')) {
                this.startSelection(e);
            }
        });
        document.addEventListener('mousemove', (e) => {
            if (this.isSelecting && this.selectionRect) {
                const currentX = e.clientX;
                const currentY = e.clientY;
                const left = Math.min(this.selectionStart.x, currentX);
                const top = Math.min(this.selectionStart.y, currentY);
                const width = Math.abs(currentX - this.selectionStart.x);
                const height = Math.abs(currentY - this.selectionStart.y);
                this.selectionRect.style.left = left + 'px';
                this.selectionRect.style.top = top + 'px';
                this.selectionRect.style.width = width + 'px';
                this.selectionRect.style.height = height + 'px';
            }
        });
        document.addEventListener('mouseup', (e) => {
            if (this.isSelecting && this.selectionRect) {
                this.isSelecting = false;
                const rect = this.selectionRect.getBoundingClientRect();
                const blocks = workspace.querySelectorAll('.block');
                const lines = workspace.querySelectorAll('.connection-line');
                this.selectedElements.clear();
                blocks.forEach(block => {
                    const blockRect = block.getBoundingClientRect();
                    if (this.isRectOverlap(rect, blockRect)) {
                        this.selectElement(block);
                    }
                });
                lines.forEach(line => {
                    const lineRect = line.getBoundingClientRect();
                    if (this.isRectOverlap(rect, lineRect)) {
                        this.selectElement(line);
                    }
                });
                this.selectionRect.remove();
                this.selectionRect = null;
            }
        });
        workspace.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                return;
            }
            if (e.target === workspace || e.target.classList.contains('workspace')) {
                this.clearSelection();
            }
        });
        document.addEventListener('keydown', (e) => {               // Управление клавишами
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            if (e.key === 'Delete' && this.selectedElements.size > 0) {
                this.deleteSelectedElements();
            }
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                this.moveSelectedElements(e.key);
            }
        });
    }

    startSelection(e) {
        this.isSelecting = true;
        this.selectionStart = { x: e.clientX, y: e.clientY };
        this.selectionRect = document.createElement('div');
        this.selectionRect.className = 'selection-rect';
        const workspace = document.getElementById('schemeWorkspace');
        workspace.appendChild(this.selectionRect);
        e.preventDefault();
    }

    isRectOverlap(rect1, rect2) {
        return !(rect1.right < rect2.left ||
                 rect1.left > rect2.right ||
                 rect1.bottom < rect2.top ||
                 rect1.top > rect2.bottom);
    }

    selectElement(element) {
        element.classList.add('selected');
        this.selectedElements.add(element);
    }

    clearSelection() {
        this.selectedElements.forEach(element => {
            element.classList.remove('selected');
        });
        this.selectedElements.clear();
    }

    deleteSelectedElements() {
        this.selectedElements.forEach(element => {
            if (element.classList.contains('block')) {
                this.schemeManager.removeBlock(element.dataset.id);
            } else if (element.classList.contains('connection-line')) {
                this.schemeManager.removeConnection(element);
            }
            element.remove();
        });
        this.selectedElements.clear();
        this.updateSchemeState();
    }


    setupDragAndDrop() {
        const workspace = document.getElementById('schemeWorkspace');
        if (!workspace) return;
        workspace.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            workspace.classList.add('drag-over');
        });
        workspace.addEventListener('drop', (e) => {
            e.preventDefault();
            workspace.classList.remove('drag-over');
            const blockType = e.dataTransfer.getData('text/plain');
            if (!blockType || blockType === 'VARIABLE') return;
            const rect = workspace.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.schemeManager.createBlock(blockType, x, y);
        });
        workspace.addEventListener('dragleave', (e) => {
            if (!workspace.contains(e.relatedTarget)) {
                workspace.classList.remove('drag-over');
            }
        });
    }

    handleDragStart(e) {
        const blockType = e.target.dataset.type;
        const isFromPalette = e.target.parentElement.classList.contains('palette');
        if (!blockType) {
            console.error('Block type not found for:', e.target);
            return;
        }
        e.dataTransfer.setData('text/plain', blockType);
        e.dataTransfer.setData('from-palette', isFromPalette);
        e.dataTransfer.effectAllowed = 'move';
        if (isFromPalette) {
            e.target.style.opacity = '0.4';
            setTimeout(() => {
                if (e.target) e.target.style.opacity = '1';
            }, 0);
        } else {
            e.target.style.opacity = '0.7';
        }
    }

    initializePalette() {
        const paletteBlocks = document.querySelectorAll('.palette .block');
        paletteBlocks.forEach(block => {
            block.addEventListener('dragstart', (e) => this.handleDragStart(e));
        });
    }

    setupVariableInputs() {
        const variablesInput = document.getElementById('variablesInput');
        if (variablesInput) {
            variablesInput.addEventListener('change', () => this.updateVariableBlocks());
            variablesInput.addEventListener('blur', () => this.updateVariableBlocks());
        }
    }

    updateVariableBlocks() {
        const variablesInput = document.getElementById('variablesInput');
        const workspace = document.getElementById('schemeWorkspace');
        if (!variablesInput || !workspace) return;
        const variablesText = variablesInput.value.trim();
        if (!variablesText) return;
        const variables = variablesText.split(',').map(v => v.trim()).filter(v => v);
        this.schemeManager.createVariableBlocks(variables);
    }

    updateSchemeState() {
        // Пересчитываем состояние схемы при любых изменениях
        if (this.schemeManager) {
            this.schemeManager.updateAllConnections();
            console.log('Scheme state updated');
        }
    }
    // API МЕТОДЫ
    async calculateSchemeTruthTable() {
        const variables = document.getElementById('variablesInput').value;
        if (!variables) {
            alert('Пожалуйста, введите переменные');
            return;
        }
        try {
            const schemeData = this.schemeManager.serialize();
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
                this.displayTruthTable(result.table, 'Логическая схема');
            } else {
                throw new Error(result.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Ошибка расчета схемы: ' + error.message);
        }
    }
    async analyzeExpression(type) {
    const expression = document.getElementById('expressionInput').value;
    const variables = document.getElementById('variablesInput').value;
    console.log('Analyzing expression:', { expression, variables, type });
    this.hideActionModal();
    if (!expression || !variables) {
        alert('Пожалуйста, введите выражение и переменные');
        return;
    }
    try {
        const endpoint = type === 'truth_table' ? '/api/truth_table' : '/api/normal_forms';
        console.log('Sending request to:', endpoint);
        const response = await fetch(endpoint, {
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
        console.log('Server response:', result);
        if (result.success) {
            if (type === 'truth_table') {
                this.displayTruthTable(result.table, result.expression);
            } else {
                this.displayNormalForms(result.original, result.cnf, result.dnf);
            }
        } else {
            throw new Error(result.error || 'Unknown error');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}
    // МЕТОДЫ ОТОБРАЖЕНИЯ
displayTruthTable(table, expression) {
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

    displayNormalForms(original, cnf, dnf) {
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

    showActionModal() {
        const expression = document.getElementById('expressionInput').value;
        const variables = document.getElementById('variablesInput').value;
        if (!expression || !variables) {
            alert('Пожалуйста, введите выражение и переменные');
            return;
        }
        const currentExpression = document.getElementById('currentExpression');
        const currentVariables = document.getElementById('currentVariables');
        if (currentExpression) currentExpression.textContent = expression;
        if (currentVariables) currentVariables.textContent = variables;
        const modal = document.getElementById('actionModal');
        if (modal) modal.classList.remove('hidden');
    }

    hideActionModal() {
        const modal = document.getElementById('actionModal');
        if (modal) modal.classList.add('hidden');
    }

    buildLogicScheme() {
        const expression = document.getElementById('expressionInput').value;
        const variables = document.getElementById('variablesInput').value;
        if (!expression) {
            alert('Введите выражение для построения схемы');
            return;
        }
        this.schemeManager.buildScheme(expression, variables);
    }
    clearSchemeWorkspace() {
        this.schemeManager.clear();
    }
}

// Класс управления схемами
class SchemeManager {
    constructor(workspaceId) {
        this.workspace = document.getElementById(workspaceId);
        this.blocks = new Map();
        this.connections = new Map();
        console.log('📋 SchemeManager initialized');
    }

    createBlock(type, x, y, variableName = null) {
        const blockId = `${type.toLowerCase()}_${Date.now()}_${Math.random()}`;
        const block = new Block(blockId, type, x, y, variableName);
        this.blocks.set(blockId, block);
        this.workspace.appendChild(block.element);
        return block;
    }

    createConnection(sourceConnector, targetConnector) {
    const connectionId = this.getConnectionId(sourceConnector, targetConnector);
    const connection = new Connection(sourceConnector, targetConnector);
    this.connections.set(connectionId, connection);
    return connection;
}

    updateConnectionsForBlock(blockElement) {      // Обновление соединений конкретного блока
        const blockId = blockElement.dataset.id;
        console.log(`🔄 Updating connections for block: ${blockId}`);
        let updatedCount = 0;
        this.connections.forEach((connection, connectionId) => {
            if (connectionId.includes(blockId)) {
                connection.updatePosition();
                updatedCount++;
            }
        });
        console.log(`✅ Updated ${updatedCount} connections for block ${blockId}`);
    }

    updateAllConnections() {                        // Обновление всех соединений
        console.log('🔄 Updating all connections');
        this.connections.forEach((connection) => {
            connection.updatePosition();
        });
    }

    getConnectionId(connector1, connector2) {
        const id1 = connector1.dataset.parentId + '_' + connector1.dataset.type;
        const id2 = connector2.dataset.parentId + '_' + connector2.dataset.type;
        return [id1, id2].sort().join('|');
    }

    removeBlock(blockId) {
        const block = this.blocks.get(blockId);
        if (block) {
            this.removeConnectionsForBlock(blockId);
            block.element.remove();
            this.blocks.delete(blockId);
        }
    }

    removeConnectionsForBlock(blockId) {
        const connectionsToRemove = [];
        console.log(`🗑️ Removing connections for block: ${blockId}`);
        this.connections.forEach((connection, connectionId) => {
            if (connectionId.includes(blockId)) {
                connectionsToRemove.push(connectionId);
                connection.destroy();
            }
        });
        connectionsToRemove.forEach(id => this.connections.delete(id));
        console.log(`✅ Removed ${connectionsToRemove.length} connections`);
    }

    removeConnection(line) {
        const connectionId = line.dataset.connection;
        const connection = this.connections.get(connectionId);
        if (connection) {
            connection.destroy();
            this.connections.delete(connectionId);
        }
    }

    serialize() {
        const blocks = Array.from(document.querySelectorAll('#schemeWorkspace .block'));
        const connectionElements = Array.from(document.querySelectorAll('#schemeWorkspace .connection-line'));

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
                source: line.dataset.source,  // Добавьте если нужно
                target: line.dataset.target   // Добавьте если нужно
            }))
        };
    }

    buildScheme(expression, variables) {
        this.clear();
        const title = document.createElement('div');
        title.className = 'scheme-title';
        title.innerHTML = `<h3>Логическая схема для выражения: ${expression}</h3>`;
        this.workspace.appendChild(title);
        if (variables) {
            this.createVariableBlocks(variables);
        }
    }

    createVariableBlocks(variables) {
        const variableList = variables.split(',').map(v => v.trim()).filter(v => v);
        const oldVarBlocks = this.workspace.querySelectorAll('.variable-block'); // Удаляем старые блоки переменных
        oldVarBlocks.forEach(block => {
            const blockId = block.dataset.id;
            this.removeBlock(blockId);
        });
        variableList.forEach((variable, index) => {                             // Создаем новые блоки переменных
            this.createBlock('VARIABLE', index * 100 + 20, 20, variable);
        });
    }
    clear() {
        this.workspace.innerHTML = '<div class="scheme-title"><h3>Перетащите блоки для построения схемы</h3></div>';
        this.blocks.clear();
        this.connections.clear();
    }
}

// Класс блока
class Block {
    constructor(id, type, x, y, variableName = null) {
        this.id = id;
        this.type = type;
        this.position = { x, y };
        this.variableName = variableName;
        this.connectors = [];
        this.element = null;
        this.createDOMElement();
        this.createConnectors();
        this.setupEventListeners();
        this.makeDraggable();
    }

    createDOMElement() {
        this.element = document.createElement('div');
        this.element.className = `block ${this.type.toLowerCase()}-block`;
        this.element.textContent = this.variableName || this.type;
        this.element.dataset.id = this.id;
        this.element.dataset.type = this.type;
        this.element.style.left = `${this.position.x}px`;
        this.element.style.top = `${this.position.y}px`;
        if (this.variableName) {
            this.element.dataset.variable = this.variableName;
        }
    }

    createConnectors() {
        const config = {
            'AND': { inputs: ['top', 'bottom'], outputs: 1 },
            'OR': { inputs: ['top', 'bottom'], outputs: 1 },
            'NOT': { inputs: ['center'], outputs: 1 },
            'XOR': { inputs: ['top', 'bottom'], outputs: 1 },
            'VARIABLE': { inputs: [], outputs: 1 },
            'INPUT': { inputs: [], outputs: 1 },
            'OUTPUT': { inputs: ['center'], outputs: 0 }
        };
        const blockConfig = config[this.type] || { inputs: [], outputs: 0 };
        blockConfig.inputs.forEach(position => {         // Создаем входные коннекторы
            this.createConnector('input', position);
        });
        for (let i = 0; i < blockConfig.outputs; i++) {  // Создаем выходные коннекторы
            this.createConnector('output', 'center');
        }
    }

    createConnector(connectorType, position) {
        const connector = new Connector(this.id, connectorType, position);
        this.connectors.push(connector);
        this.element.appendChild(connector.element);
    }

    setupEventListeners() {
        this.element.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!e.ctrlKey && !e.metaKey) {
                window.boolTrainerApp.clearSelection();
            }
            window.boolTrainerApp.selectElement(this.element);
        });
        this.element.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', this.type);
            e.dataTransfer.setData('from-palette', 'false');
            e.dataTransfer.effectAllowed = 'move';
            this.element.style.opacity = '0.7';
        });
    }

    makeDraggable() {
        let isDragging = false;
        let startX, startY, initialX, initialY;
        const workspace = document.getElementById('schemeWorkspace');
        this.element.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('connector') ||
                e.target.tagName === 'BUTTON' ||
                e.target.closest('button')) {
                return;
            }
            if (e.button !== 0) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = this.element.getBoundingClientRect();
            const workspaceRect = workspace.getBoundingClientRect();
            initialX = rect.left - workspaceRect.left;
            initialY = rect.top - workspaceRect.top;
            this.element.style.zIndex = '100';
            this.element.style.cursor = 'grabbing';
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', stopDrag);
            e.preventDefault();
        });
        const drag = (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            let newX = initialX + dx;
            let newY = initialY + dy;
            const maxX = workspace.offsetWidth - this.element.offsetWidth - 10;
            const maxY = workspace.offsetHeight - this.element.offsetHeight - 10;
            newX = Math.max(10, Math.min(newX, maxX));
            newY = Math.max(10, Math.min(newY, maxY));
            this.element.style.left = newX + 'px';
            this.element.style.top = newY + 'px';
            if (window.boolTrainerApp && window.boolTrainerApp.schemeManager) {             // Обновляем соединения при перемещении
                window.boolTrainerApp.schemeManager.updateConnectionsForBlock(this.element);
            }
        };
        const stopDrag = () => {
            isDragging = false;
            this.element.style.zIndex = '10';
            this.element.style.cursor = 'move';
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('mouseup', stopDrag);
            setTimeout(() => {             // Финальное обновление после завершения перемещения
                if (window.boolTrainerApp && window.boolTrainerApp.schemeManager) {
                    window.boolTrainerApp.schemeManager.updateAllConnections();
                    window.boolTrainerApp.updateSchemeState();
                }
            }, 50);
        };
    }

    moveTo(x, y) {
        this.position = { x, y };
        this.element.style.left = `${x}px`;
        this.element.style.top = `${y}px`;
        if (this._updateTimeout) {
            clearTimeout(this._updateTimeout);
        }
        this._updateTimeout = setTimeout(() => {
            if (window.boolTrainerApp?.schemeManager) {
                window.boolTrainerApp.schemeManager.updateConnectionsForBlock(this.element);
            }
            this._updateTimeout = null;
        }, 100);
    }
}

// Класс коннектора
class Connector {
    constructor(blockId, type, position) {
        this.blockId = blockId;
        this.type = type;
        this.position = position;
        this.connectedTo = null;
        this.element = null;
        this.createDOMElement();
        this.setupEventListeners();
    }

    createDOMElement() {
        this.element = document.createElement('div');
        this.element.className = `connector ${this.type} ${this.position}`;
        this.element.dataset.type = this.type;
        this.element.dataset.parentId = this.blockId;
        this.element.title = this.type === 'input' ? 'Вход' : 'Выход';
    }

    setupEventListeners() {
        this.element.addEventListener('mousedown', (e) => {
            window.boolTrainerApp.startConnection(e);
        });
        this.element.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    connectTo(connector) {
        this.connectedTo = connector;
        this.element.classList.add('connected');
    }

    disconnect() {
        this.connectedTo = null;
        this.element.classList.remove('connected');
    }
}

// Класс соединения
class Connection {
    constructor(sourceConnector, targetConnector) {
        console.log('🔗 NEW Connection created');
        this.source = sourceConnector; // DOM элемент коннектора
        this.target = targetConnector; // DOM элемент коннектора
        this.element = document.createElement('div');
        this.element.className = 'connection-line';
        this.element.dataset.connection = this.generateId(sourceConnector, targetConnector);
        const workspace = document.getElementById('schemeWorkspace');
        if (workspace) {
            workspace.appendChild(this.element);
            console.log('✅ Connection element added to DOM');
        }
        this.updatePosition(); // Первоначальная позиция
    }

    generateId(source, target) {
        const id1 = source.dataset.parentId + '_' + source.dataset.type;
        const id2 = target.dataset.parentId + '_' + target.dataset.type;
        return [id1, id2].sort().join('|');
    }

    updatePosition() {
        if (!this.source || !this.target || !this.element) return;
        try {
            const workspace = document.getElementById('schemeWorkspace');
            const workspaceRect = workspace.getBoundingClientRect();
            const sourceRect = this.source.getBoundingClientRect();
            const targetRect = this.target.getBoundingClientRect();
            const startX = sourceRect.left + sourceRect.width / 2 - workspaceRect.left;
            const startY = sourceRect.top + sourceRect.height / 2 - workspaceRect.top;
            const endX = targetRect.left + targetRect.width / 2 - workspaceRect.left;
            const endY = targetRect.top + targetRect.height / 2 - workspaceRect.top;
            const dx = endX - startX;
            const dy = endY - startY;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            this.element.style.left = startX + 'px';
            this.element.style.top = startY + 'px';
            this.element.style.width = length + 'px';
            this.element.style.transform = `rotate(${angle}deg)`;
        } catch (error) {
            console.error('❌ Connection update error:', error);
        }
    }
        destroy() {
            if (this.element) {
                this.element.remove();
            }
        }
    }

// Класс управления интерфейсом
class UIController {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const quickStartBtn = document.getElementById('quickStartBtn');
        const truthTableBtn = document.getElementById('truthTableBtn');
        const transformBtn = document.getElementById('transformBtn');
        const schemeBtn = document.getElementById('schemeBtn');
        const closeModal = document.getElementById('closeModal');
        const buildSchemeBtn = document.getElementById('buildSchemeBtn');
        const clearSchemeBtn = document.getElementById('clearSchemeBtn');
        const calculateSchemeBtn = document.getElementById('calculateSchemeBtn');
        if (quickStartBtn) quickStartBtn.addEventListener('click', () => window.boolTrainerApp.showActionModal());
        if (truthTableBtn) truthTableBtn.addEventListener('click', () => window.boolTrainerApp.analyzeExpression('truth_table'));
        if (transformBtn) transformBtn.addEventListener('click', () => window.boolTrainerApp.analyzeExpression('transform'));
        if (schemeBtn) {
            schemeBtn.addEventListener('click', () => {
                window.boolTrainerApp.hideActionModal();
                window.boolTrainerApp.buildLogicScheme();
            });
        }
        if (closeModal) closeModal.addEventListener('click', () => window.boolTrainerApp.hideActionModal());
        if (buildSchemeBtn) buildSchemeBtn.addEventListener('click', () => window.boolTrainerApp.buildLogicScheme());
        if (clearSchemeBtn) clearSchemeBtn.addEventListener('click', () => window.boolTrainerApp.clearSchemeWorkspace());
        if (calculateSchemeBtn) calculateSchemeBtn.addEventListener('click', () => window.boolTrainerApp.calculateSchemeTruthTable());
        const modal = document.getElementById('actionModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) window.boolTrainerApp.hideActionModal();
            });
        }
    }
}
// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    window.boolTrainerApp = new BoolTrainerApp();
    window.boolTrainerApp.init();
});