from sympy import symbols, sympify
from sympy.logic.boolalg import BooleanFunction
from sympy.parsing.sympy_parser import parse_expr
from sympy.parsing.sympy_parser import standard_transformations

class ExpressionError(Exception):
    """Кастомное исключение для ошибок выражений"""
    pass

class ExpressionProcessor:
    """Обработчик логических выражений"""

    def __init__(self, expression_str, variables_str):
        self.original_expression = expression_str
        self.variables_str = variables_str
        self.sympy_expression = None
        self.sympy_variables = None
        self.is_parsed = False

    def parse(self):
        """Парсинг выражения и переменных"""
        try:
            # Нормализация синтаксиса
            normalized_expr = self._normalize_syntax(self.original_expression)

            # Парсинг переменных
            self.sympy_variables = self._parse_variables()

            # Парсинг выражения
            self.sympy_expression = self._parse_expression(normalized_expr)
            self.is_parsed = True

            return True

        except Exception as e:
            raise ExpressionError(f"Ошибка парсинга: {str(e)}")

    def _normalize_syntax(self, expression):
        """Приведение синтаксиса к формату SymPy"""
        return (expression
                .replace('&&', '&')
                .replace('||', '|')
                .replace('!', '~'))

    def _parse_variables(self):
        """Парсинг строки переменных"""
        variables = [v.strip() for v in self.variables_str.split(',') if v.strip()]
        if not variables:
            raise ExpressionError("Не указаны переменные")

        # Создаем символы
        sym_vars = symbols(','.join(variables))
        return [sym_vars] if len(variables) == 1 else list(sym_vars)

    def _parse_expression(self, expression_str):
        """Парсинг выражения"""
        try:
            transformations = standard_transformations
            expr = parse_expr(expression_str,
                            transformations=transformations,
                            evaluate=False)
            return expr
        except Exception as e:
            raise ExpressionError(f"Не удалось распарсить выражение: {str(e)}")

    def validate(self):
        """Валидация выражения"""
        if not self.is_parsed:
            self.parse()

        return {
            'is_valid': True,
            'variables_count': len(self.sympy_variables),
            'complexity': len(str(self.sympy_expression))
        }