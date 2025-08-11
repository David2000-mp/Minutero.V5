from flask import Flask, jsonify, send_from_directory
from sheets_service import get_sheet_data
import os

app = Flask(__name__, static_folder='../frontend')

@app.route('/read_sheet')
def read_sheet():
    # Cambia estos valores por los de tu Google Sheet
    spreadsheet_id = os.environ.get('SPREADSHEET_ID', 'TU_SPREADSHEET_ID')
    range_name = os.environ.get('SHEET_RANGE', 'A1:Z')
    data = get_sheet_data(spreadsheet_id, range_name)
    if data is None:
        return jsonify({'error': 'No se pudo obtener datos de Google Sheets'}), 500
    return jsonify({'data': data})

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
