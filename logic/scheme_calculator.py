import itertools
from sympy import symbols
from collections import defaultdict


class SchemeCalculator:
    """Калькулятор логических схем - УПРОЩЕННАЯ ВЕРСИЯ"""

    def __init__(self, scheme_data, variables_str):
        self.scheme_data = scheme_data
        self.variables_str = variables_str
        self.variables = [v.strip() for v in variables_str.split(',') if v.strip()]

        self.blocks = {block['id']: block for block in scheme_data.get('blocks', [])}
        self.connections = scheme_data.get('connections', [])
        self.wiring = self._build_wiring()

    def _build_wiring(self):
        """Построение проводки для анализа соединений - ИСПРАВЛЕННАЯ ВЕРСИЯ"""
        wiring = defaultdict(list)

        for connection in self.connections:
            connection_id = connection.get('id', '')
            print(f"🔍 Анализ соединения: {connection_id}")

            if '|' in connection_id:
                parts = connection_id.split('|')
                if len(parts) == 2:
                    first_conn, second_conn = parts

                    # Извлекаем ID блоков из коннекторов
                    first_block = first_conn.rsplit('_', 1)[0]
                    second_block = second_conn.rsplit('_', 1)[0]

                    # Анализируем типы коннекторов по их именам
                    first_is_input = 'input' in first_conn
                    first_is_output = 'output' in first_conn
                    second_is_input = 'input' in second_conn
                    second_is_output = 'output' in second_conn

                    print(
                        f"🔍 Коннекторы: {first_conn}(input:{first_is_input}, output:{first_is_output}) | {second_conn}(input:{second_is_input}, output:{second_is_output})")

                    # Определяем направление соединения
                    # Если первый коннектор - input, а второй - output, то направление: second -> first
                    if first_is_input and second_is_output:
                        source_block = second_block
                        target_block = first_block
                        wiring[target_block].append(source_block)
                        print(f"🔍 Добавлено: {source_block} -> {target_block}")
                    # Если первый коннектор - output, а второй - input, то направление: first -> second
                    elif first_is_output and second_is_input:
                        source_block = first_block
                        target_block = second_block
                        wiring[target_block].append(source_block)
                        print(f"🔍 Добавлено: {source_block} -> {target_block}")
                    else:
                        print(f"🔍 Пропущено: неопределенное направление")

        print(f"🔍 Итоговая проводка: {dict(wiring)}")
        return wiring

    def calculate_truth_table(self):
        """Расчет таблицы истинности для схемы"""
        if not self.variables:
            return []

        table = []

        # Анализируем структуру схемы
        scheme_info = self._analyze_scheme_type()
        print(f"🔍 Анализ схемы: {scheme_info}")

        for values in itertools.product([False, True], repeat=len(self.variables)):
            row = {var: bool(val) for var, val in zip(self.variables, values)}

            # Вычисляем результат на основе типа схемы
            result = self._calculate_by_scheme_type(scheme_info, values)
            row['result'] = result

            table.append(row)

        return table

    def _analyze_scheme_type(self):
        """Анализ типа схемы с определением NOT переменной"""
        blocks = self.blocks
        wiring = self.wiring

        # Проверяем наличие блоков разных типов
        has_and = any(b.get('type') == 'AND' for b in blocks.values())
        has_or = any(b.get('type') == 'OR' for b in blocks.values())
        has_not = any(b.get('type') == 'NOT' for b in blocks.values())
        has_xor = any(b.get('type') == 'XOR' for b in blocks.values())

        # Находим VARIABLE блоки и их имена
        var_blocks = {id: block for id, block in blocks.items()
                      if block.get('type') == 'VARIABLE'}

        # Создаем mapping ID блока к имени переменной
        block_to_var = {}
        for block_id, block in var_blocks.items():
            var_name = block.get('variable', '')
            if var_name:
                block_to_var[block_id] = var_name

        print(f"🔍 VARIABLE блоки: {block_to_var}")
        print(f"🔍 Проводка: {dict(wiring)}")

        # Определяем, к какой переменной применяется NOT
        not_target_var = None
        not_block_id = None

        if has_not:
            # Находим NOT блок
            not_block_id = next((id for id, block in blocks.items()
                                 if block.get('type') == 'NOT'), None)

            print(f"🔍 Найден NOT блок: {not_block_id}")

            if not_block_id and not_block_id in wiring:
                # Смотрим, какие блоки подключены к NOT (это будут входы NOT)
                not_inputs = wiring[not_block_id]
                print(f"🔍 Входы NOT блока: {not_inputs}")

                for source_block in not_inputs:
                    if source_block in block_to_var:
                        not_target_var = block_to_var[source_block]
                        print(f"🔍 NOT подключен к переменной: {not_target_var}")
                        break
                    else:
                        print(f"🔍 NOT вход {source_block} не является VARIABLE блоком")

        # Определяем переменные в AND
        and_vars = []
        if has_and:
            # Находим AND блок
            and_block_id = next((id for id, block in blocks.items()
                                 if block.get('type') == 'AND'), None)

            print(f"🔍 Найден AND блок: {and_block_id}")

            if and_block_id and and_block_id in wiring:
                # Смотрим, какие блоки подключены к AND
                and_inputs = wiring[and_block_id]
                print(f"🔍 Входы AND блока: {and_inputs}")

                for source_block in and_inputs:
                    if source_block in block_to_var:
                        var_name = block_to_var[source_block]
                        and_vars.append(var_name)
                        print(f"🔍 AND подключен к переменной: {var_name}")
                    elif source_block == not_block_id:
                        # Если к AND подключен NOT блок, используем NOT переменную
                        if not_target_var:
                            and_vars.append(f"NOT_{not_target_var}")
                            print(f"🔍 AND подключен к NOT блоку: NOT_{not_target_var}")

        # Формируем информацию о схеме
        scheme_info = {
            'has_and': has_and,
            'has_or': has_or,
            'has_not': has_not,
            'has_xor': has_xor,
            'not_target_var': not_target_var,
            'and_vars': and_vars
        }

        return scheme_info

    def _calculate_by_scheme_type(self, scheme_info, input_values):
        """Вычисление результата по типу схемы с учетом NOT переменной"""
        has_and = scheme_info['has_and']
        has_or = scheme_info['has_or']
        has_not = scheme_info['has_not']
        has_xor = scheme_info['has_xor']
        not_target_var = scheme_info['not_target_var']
        and_vars = scheme_info['and_vars']

        # Создаем mapping переменных к значениям
        var_values = {}
        for i, var in enumerate(self.variables):
            if i < len(input_values):
                var_values[var] = input_values[i]

        print(f"🔍 Вычисление: vars={var_values}, and_vars={and_vars}, not_target={not_target_var}")

        # Логика AND с NOT
        if has_and and has_not:
            if not_target_var and and_vars:
                # Определяем порядок переменных в AND
                if len(and_vars) == 1:
                    # Одна переменная напрямую, другая через NOT
                    direct_var = and_vars[0]
                    val1 = var_values.get(direct_var, False)
                    val2 = not var_values.get(not_target_var, False)
                    result = val1 and val2
                    print(
                        f"🔍 Вычисление: {direct_var}({val1}) AND NOT {not_target_var}({var_values.get(not_target_var)}) = {result}")
                    return result
                elif len(and_vars) == 2:
                    # Две переменные в AND
                    var1, var2 = and_vars
                    if f"NOT_{not_target_var}" in and_vars:
                        # Одна переменная с NOT
                        if and_vars[0] == f"NOT_{not_target_var}":
                            val1 = not var_values.get(not_target_var, False)
                            val2 = var_values.get(var2, False)
                            result = val1 and val2
                            print(
                                f"🔍 Вычисление: NOT {not_target_var}({var_values.get(not_target_var)}) AND {var2}({val2}) = {result}")
                        else:
                            val1 = var_values.get(var1, False)
                            val2 = not var_values.get(not_target_var, False)
                            result = val1 and val2
                            print(
                                f"🔍 Вычисление: {var1}({val1}) AND NOT {not_target_var}({var_values.get(not_target_var)}) = {result}")
                        return result
                    else:
                        # Обе переменные прямые, применяем NOT к целевой переменной
                        val1 = var_values.get(var1, False)
                        val2 = var_values.get(var2, False)
                        if not_target_var == var1:
                            result = (not val1) and val2
                            print(f"🔍 Вычисление: NOT {var1}({val1}) AND {var2}({val2}) = {result}")
                        elif not_target_var == var2:
                            result = val1 and (not val2)
                            print(f"🔍 Вычисление: {var1}({val1}) AND NOT {var2}({val2}) = {result}")
                        else:
                            result = val1 and val2
                            print(f"🔍 Вычисление: {var1}({val1}) AND {var2}({val2}) = {result}")
                        return result

            # Резервная логика
            if len(input_values) >= 2:
                result = input_values[0] and (not input_values[1])
                print(f"🔍 Вычисление (резерв): {input_values[0]} AND NOT {input_values[1]} = {result}")
                return result
            else:
                return input_values[0] if input_values else False

        # Простой AND
        elif has_and:
            result = input_values[0] and input_values[1] if len(input_values) >= 2 else input_values[0]
            print(f"🔍 Вычисление: {input_values[0]} AND {input_values[1]} = {result}")
            return result

        # Простой OR
        elif has_or:
            result = input_values[0] or input_values[1] if len(input_values) >= 2 else input_values[0]
            print(f"🔍 Вычисление: {input_values[0]} OR {input_values[1]} = {result}")
            return result

        # Простой NOT
        elif has_not:
            if not_target_var and not_target_var in var_values:
                result = not var_values[not_target_var]
                print(f"🔍 Вычисление: NOT {not_target_var}({var_values[not_target_var]}) = {result}")
                return result
            else:
                result = not input_values[0] if input_values else False
                print(f"🔍 Вычисление: NOT {input_values[0]} = {result}")
                return result

        # Простой XOR
        elif has_xor:
            result = input_values[0] != input_values[1] if len(input_values) >= 2 else input_values[0]
            print(f"🔍 Вычисление: {input_values[0]} XOR {input_values[1]} = {result}")
            return result

        else:
            result = input_values[0] if input_values else False
            print(f"🔍 Вычисление: DEFAULT {result}")
            return result

    def validate_scheme(self):
        """Простая валидация схемы"""
        blocks = self.scheme_data.get('blocks', [])

        return {
            'is_valid': len(blocks) > 0,
            'blocks_count': len(blocks),
            'connections_count': len(self.connections),
            'issues': [] if len(blocks) > 0 else ['Схема не содержит блоков']
        }