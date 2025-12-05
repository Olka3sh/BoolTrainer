from sympy import to_cnf, to_dnf


class NormalFormConverter:
    """Конвертер нормальных форм"""

    def __init__(self, expression):
        self.original_expression = expression
        self.cnf_form = None
        self.dnf_form = None

    def to_cnf(self):
        """Конъюнктивная нормальная форма"""
        try:
            self.cnf_form = to_cnf(self.original_expression, simplify=True)
            return str(self.cnf_form)
        except Exception as e:
            return f"Ошибка преобразования в КНФ: {str(e)}"

    def to_dnf(self):
        """Дизъюнктивная нормальная форма"""
        try:
            self.dnf_form = to_dnf(self.original_expression, simplify=True)
            return str(self.dnf_form)
        except Exception as e:
            return f"Ошибка преобразования в ДНФ: {str(e)}"

    def compare_complexity(self):
        """Сравнение сложности различных форм"""
        original_len = len(str(self.original_expression))
        cnf_len = len(str(self.cnf_form)) if self.cnf_form else 0
        dnf_len = len(str(self.dnf_form)) if self.dnf_form else 0

        return {
            'original': original_len,
            'cnf': cnf_len,
            'dnf': dnf_len,
            'most_compact': 'original' if original_len <= min(cnf_len, dnf_len)
            else 'cnf' if cnf_len <= dnf_len else 'dnf'
        }

    def get_cnf_clauses(self):
        """Получение клауз КНФ (для расширения)"""
        if self.cnf_form:
            return str(self.cnf_form).replace('&', ' AND ').replace('|', ' OR ')
        return "Сначала выполните преобразование в КНФ"

    def get_dnf_terms(self):
        """Получение термов ДНФ (для расширения)"""
        if self.dnf_form:
            return str(self.dnf_form).replace('|', ' OR ').replace('&', ' AND ')
        return "Сначала выполните преобразование в ДНФ"