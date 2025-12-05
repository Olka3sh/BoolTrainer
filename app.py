from flask import Flask, render_template, request, jsonify
from logic.expression_processor import ExpressionProcessor
from logic.truth_table_generator import TruthTableGenerator
from logic.normal_form_converter import NormalFormConverter
from logic.scheme_calculator import SchemeCalculator

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/truth_table', methods=['POST'])
def calculate_truth_table():
    try:
        data = request.get_json()
        expression = data.get('expression', '').strip()
        variables_str = data.get('variables', '').strip()
        if not expression or not variables_str:
            return jsonify({'success': False, 'error': 'Expression and variables are required'})
        processor = ExpressionProcessor(expression, variables_str) # Обработка выражения
        processor.parse()
        generator = TruthTableGenerator(processor.sympy_expression, processor.sympy_variables) # Генерация таблицы истинности
        table = generator.generate()
        analysis = generator.analyze()
        return jsonify({
            'success': True,
            'expression': str(processor.sympy_expression),
            'table': table,
            'analysis': analysis
        })
    except ExpressionError as e:
        return jsonify({'success': False, 'error': str(e)})
    except Exception as e:
        return jsonify({'success': False, 'error': f'Server error: {str(e)}'})

@app.route('/api/normal_forms', methods=['POST'])
def calculate_normal_forms():
    try:
        data = request.get_json()
        expression = data.get('expression', '').strip()
        variables_str = data.get('variables', '').strip()
        if not expression or not variables_str:
            return jsonify({'success': False, 'error': 'Expression and variables are required'})
        processor = ExpressionProcessor(expression, variables_str)
        processor.parse()
        converter = NormalFormConverter(processor.sympy_expression)
        cnf = converter.to_cnf()
        dnf = converter.to_dnf()
        return jsonify({
            'success': True,
            'original': str(processor.sympy_expression),
            'cnf': cnf,
            'dnf': dnf
        })
    except ExpressionError as e:
        return jsonify({'success': False, 'error': str(e)})
    except Exception as e:
        return jsonify({'success': False, 'error': f'Server error: {str(e)}'})


@app.route('/api/calculate_scheme', methods=['POST'])
def calculate_scheme():
    try:
        data = request.get_json()
        scheme_data = data.get('scheme')
        variables_str = data.get('variables', '').strip()

        if not variables_str:
            return jsonify({'success': False, 'error': 'Variables are required'})

        if not scheme_data or not scheme_data.get('blocks'):
            return jsonify({'success': False, 'error': 'Схема не содержит элементов'})

        calculator = SchemeCalculator(scheme_data, variables_str)
        table = calculator.calculate_truth_table()

        return jsonify({
            'success': True,
            'expression': 'Логическая схема',
            'table': table
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/test', methods=['GET'])
def test_endpoint():
    """Тестовый endpoint для проверки работы"""
    from sympy import symbols

    # Тестируем простое выражение
    a, b = symbols('a b')
    test_expression = a & b
    test_variables = [a, b]

    generator = TruthTableGenerator(test_expression, test_variables)
    table = generator.generate()

    return jsonify({
        'test_expression': 'a & b',
        'table': table,
        'expected': 'False for (0,0), (0,1), (1,0); True for (1,1)'
    })


if __name__ == '__main__':
    app.run(debug=True, port=5000)