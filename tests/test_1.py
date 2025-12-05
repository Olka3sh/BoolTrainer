import pytest
import json
import sys
import os

# Добавляем путь к проекту для импорта модулей
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app


class TestBoolTrainerAPI:
    """Тесты для API Bool Trainer"""

    def setup_method(self):
        """Настройка перед каждым тестом"""
        self.client = app.test_client()
        app.config['TESTING'] = True

    def test_truth_table_simple_expression(self):
        """Тест таблицы истинности для простого выражения AND"""
        test_data = {
            'expression': 'a & b',
            'variables': 'a,b'
        }

        response = self.client.post('/api/truth_table',
                                    data=json.dumps(test_data),
                                    content_type='application/json')

        assert response.status_code == 200
        data = response.get_json()

        # Проверяем успешность запроса
        assert data['success'] == True
        assert 'table' in data
        assert 'expression' in data

        # Проверяем структуру таблицы истинности
        table = data['table']
        assert len(table) == 4  # 2 переменные = 4 комбинации

        # Проверяем наличие всех полей в каждой строке
        for row in table:
            assert 'a' in row
            assert 'b' in row
            assert 'result' in row
            assert isinstance(row['result'], bool)

    def test_normal_forms_conversion(self):
        """Тест преобразования в нормальные формы"""
        test_data = {
            'expression': 'a & b',
            'variables': 'a,b'
        }

        response = self.client.post('/api/normal_forms',
                                    data=json.dumps(test_data),
                                    content_type='application/json')

        assert response.status_code == 200
        data = response.get_json()

        # Проверяем успешность запроса
        assert data['success'] == True
        assert 'original' in data
        assert 'cnf' in data
        assert 'dnf' in data

        # Проверяем что все формы содержат исходные переменные
        assert 'a' in data['original']
        assert 'b' in data['original']
        assert 'a' in data['cnf']
        assert 'b' in data['cnf']
        assert 'a' in data['dnf']
        assert 'b' in data['dnf']

    def test_truth_table_complex_expression(self):
        """Тест таблицы истинности для сложного выражения"""
        test_data = {
            'expression': '(a & b) | c',
            'variables': 'a,b,c'
        }

        response = self.client.post('/api/truth_table',
                                    data=json.dumps(test_data),
                                    content_type='application/json')

        assert response.status_code == 200
        data = response.get_json()

        assert data['success'] == True
        table = data['table']

        # 3 переменные = 8 комбинаций
        assert len(table) == 8

        # Проверяем что все переменные присутствуют
        for row in table:
            assert 'a' in row
            assert 'b' in row
            assert 'c' in row
            assert 'result' in row

    def test_truth_table_error_handling(self):
        """Тест обработки ошибок при неверных данных"""
        test_data = {
            'expression': '',
            'variables': ''
        }

        response = self.client.post('/api/truth_table',
                                    data=json.dumps(test_data),
                                    content_type='application/json')

        assert response.status_code == 200
        data = response.get_json()

        # Проверяем что запрос завершился с ошибкой
        assert data['success'] == False
        assert 'error' in data
        assert 'required' in data['error'].lower()

    def test_index_route(self):
        """Тест главной страницы"""
        response = self.client.get('/')

        assert response.status_code == 200
        # Декодируем response.data в строку для проверки
        response_text = response.data.decode('utf-8')

        # Проверяем что основные элементы присутствуют в HTML
        assert 'Bool Trainer' in response_text
        assert 'expressionInput' in response_text
        assert 'variablesInput' in response_text