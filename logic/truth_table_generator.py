import itertools
from sympy import symbols, simplify_logic, SympifyError


class TruthTableGenerator:
    """Генератор таблиц истинности"""

    def __init__(self, expression, variables):
        self.expression = expression
        self.variables = variables if isinstance(variables, (list, tuple)) else [variables]
        self.table_data = []

    def generate(self):
        """Генерация таблицы истинности"""
        self.table_data = []

        # Получаем имена переменных
        var_names = [str(var) for var in self.variables]

        # Генерируем все комбинации значений
        for values in itertools.product([False, True], repeat=len(self.variables)):
            row = {}
            substitution = {}

            # Заполняем значения переменных
            for var, val, name in zip(self.variables, values, var_names):
                row[name] = val
                substitution[var] = val

            # Вычисляем результат
            try:
                # Подставляем значения в выражение
                result = self.expression.subs(substitution)
                # Упрощаем результат
                simplified = simplify_logic(result)

                # Преобразуем к булевому значению
                if simplified == True:
                    row['result'] = True
                elif simplified == False:
                    row['result'] = False
                else:
                    # Если не удалось упростить, используем прямое вычисление
                    row['result'] = self._direct_evaluation(result)

            except Exception as e:
                print(f"Evaluation error: {e}")
                row['result'] = False

            self.table_data.append(row)

        return self.table_data

    def _direct_evaluation(self, expr):
        """Прямое вычисление выражения"""
        try:
            # Пробуем вычислить как булево значение
            if hasattr(expr, 'evalf'):
                val = expr.evalf()
                if val == 1:
                    return True
                elif val == 0:
                    return False

            # Пробуем преобразовать к строке и проанализировать
            expr_str = str(expr).lower()
            if expr_str in ['true', '1']:
                return True
            elif expr_str in ['false', '0']:
                return False

            return False
        except:
            return False

    def analyze(self):
        """Анализ таблицы истинности"""
        if not self.table_data:
            self.generate()

        true_count = sum(1 for row in self.table_data if row['result'])
        false_count = len(self.table_data) - true_count

        return {
            'total_rows': len(self.table_data),
            'true_results': true_count,
            'false_results': false_count,
            'is_tautology': true_count == len(self.table_data),
            'is_contradiction': false_count == len(self.table_data),
            'is_satisfiable': true_count > 0
        }