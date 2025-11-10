# main.py
from flask import Flask, render_template, request, jsonify
from sympy import symbols, sympify, to_cnf, to_dnf
from sympy.logic.boolalg import truth_table
import itertools

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

        variables = [v.strip() for v in variables_str.split(',') if v.strip()]
        sym_vars = symbols(' '.join(variables))

        expr_text = expression.replace('&&', '&').replace('||', '|').replace('!', '~')
        expr = sympify(expr_text)

        tt = list(truth_table(expr, sym_vars))

        result = {
            'success': True,
            'expression': str(expr),
            'table': []
        }

        for values, output in zip(itertools.product([False, True], repeat=len(sym_vars)), tt):
            row = {str(var): bool(val) for var, val in zip(sym_vars, values)}
            row['result'] = bool(output)
            result['table'].append(row)

        return jsonify(result)

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

if __name__ == '__main__':
    app.run(debug=True, port=5000)