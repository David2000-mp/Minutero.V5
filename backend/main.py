# main.py
from flask import Flask, send_from_directory, jsonify
from sheets_service import get_sheet_data
import os

app = Flask(__name__, static_folder='../frontend')

@app.route("/read_sheet")
def read_sheet():
    spreadsheet_id = "1vcFLkwELmJ2yGjNFzsR-h95Y04FZkY5CHDXxy4q1WrI"
    range_name = "Respuestas de formulario 1!A1:Z"

    try:
        data = get_sheet_data(spreadsheet_id, range_name)
        if data is None:
            return jsonify({"error": "No se pudo conectar con Google Sheets. Revisa la terminal del servidor."}), 500
        
        if not data or len(data) < 2:
            return jsonify({"data": []})

        headers = [h.strip() for h in data[0]]
        required_columns = ["¿Quién eres?", "Estado de la tarea", "¿Qué tipo de propuesta es?", "Describe brevemente la idea."]
        
        try:
            col_indices_map = {header: i for i, header in enumerate(headers)}
            for col in required_columns:
                if col not in col_indices_map:
                    raise KeyError(f"La columna requerida '{col}' no se encontró. Columnas encontradas: {headers}")
            
            estado_col_index = col_indices_map["Estado de la tarea"]
            tipo_propuesta_index = col_indices_map["¿Qué tipo de propuesta es?"]
        
        except KeyError as e:
            print(f"!!! ERROR DE CONFIGURACIÓN: {e}")
            return jsonify({"error": str(e)}), 500

        agenda_agrupada = {}
        for row in data[1:]:
            if len(row) > estado_col_index:
                status_value = row[estado_col_index].strip()
                if status_value.lower() != 'finalizado' and status_value != "":
                    tipo_propuesta = row[tipo_propuesta_index].strip() if len(row) > tipo_propuesta_index else "Sin categoría"
                    if tipo_propuesta not in agenda_agrupada:
                        agenda_agrupada[tipo_propuesta] = []
                    
                    new_row = []
                    for col_name in required_columns:
                        col_index = col_indices_map[col_name]
                        new_row.append(row[col_index] if len(row) > col_index else "")
                    
                    agenda_agrupada[tipo_propuesta].append(new_row)
        
        agenda_final = [{"categoria": cat, "tareas": tasks} for cat, tasks in agenda_agrupada.items()]
        return jsonify({"data": agenda_final})

    except Exception as e:
        print(f"!!! ERROR INESPERADO EN main.py: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/")
def serve_frontend():
    return send_from_directory("../frontend", "index.html")

@app.route("/<path:path>")
def serve_static_files(path):
    return send_from_directory("../frontend", path)

if __name__ == "__main__":
    app.run("localhost", 5000, debug=True)