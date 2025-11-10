// static/js/app.js

// Конфигурация
const QUICK_START_EXAMPLES = [
    { expression: "a & b", variables: "a,b", description: "Логическое И" },
    { expression: "a | b", variables: "a,b", description: "Логическое ИЛИ" },
    { expression: "~a", variables: "a", description: "Логическое НЕ" },
    { expression: "a & ~b", variables: "a,b", description: "И с отрицанием" },
    { expression: "(a & b) | (~a & c)", variables: "a,b,c", description: "Мультиплексор" }
];

// Глобальные функции для HTML onclick
window.loadExample = function(expression, variables) {
    document.getElementById('expressionInput').value = expression;
    document.getElementById('variablesInput').value = variables;
};

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('BoolTrainer initialized');
    init();
});

function init() {
    loadQuickStartExamples();
    setupEventListeners();
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

    const modal = document.getElementById('actionModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) hideActionModal();
        });
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

    workspace.appendChild(block);
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