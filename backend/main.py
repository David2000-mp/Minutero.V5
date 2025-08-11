# main.py
from flask import Flask, jsonify, send_from_directory
from .sheets_service import get_sheet_data
import os

# --- Configuración de la App Flask ---
# Le decimos a Flask que la carpeta 'frontend' (que está un nivel arriba) 
# es donde buscará los archivos estáticos como index.html, CSS y JS.
app = Flask(__name__, static_folder='../frontend')

# --- Ruta de la API para obtener datos ---
@app.route("/read_sheet")
def read_sheet():
    spreadsheet_id = "1vcFLkwELmJ2yGjNFzsR-h95Y04FZkY5CHDXxy4q1WrI"
    range_name = "Respuestas de formulario 1!A1:Z"

    try:
        data = get_sheet_data(spreadsheet_id, range_name)
        if data is None:
            return jsonify({"error": "No se pudo obtener datos de Google Sheets."}), 500
        
        if not data or len(data) < 2:
            return jsonify({"data": []})

        headers = [h.strip() for h in data[0]]
        required_columns = ["¿Quién eres?", "Estado de la tarea", "¿Qué tipo de propuesta es?", "Describe brevemente la idea."]
        
        col_indices_map = {header: i for i, header in enumerate(headers)}
        for col in required_columns:
            if col not in col_indices_map:
                raise KeyError(f"Columna requerida '{col}' no encontrada. Disponibles: {headers}")
        
        estado_col_index = col_indices_map["Estado de la tarea"]
        tipo_propuesta_index = col_indices_map["¿Qué tipo de propuesta es?"]

        agenda_agrupada = {}
        for row in data[1:]:
            if len(row) > estado_col_index:
                status_value = row[estado_col_index].strip()
                if status_value.lower() != 'finalizado' and status_value != "":
                    tipo_propuesta = row[tipo_propuesta_index].strip() if len(row) > tipo_propuesta_index else "Sin categoría"
                    if tipo_propuesta not in agenda_agrupada:
                        agenda_agrupada[tipo_propuesta] = []
                    
                    new_row = [row[col_indices_map[col_name]] if len(row) > col_indices_map[col_name] else "" for col_name in required_columns]
                    agenda_agrupada[tipo_propuesta].append(new_row)
        
        agenda_final = [{"categoria": cat, "tareas": tasks} for cat, tasks in agenda_agrupada.items()]
        return jsonify({"data": agenda_final})

    except KeyError as e:
        return jsonify({"error": f"Error de configuración de columna: {e}"}), 500
    except Exception as e:
        return jsonify({"error": f"Error inesperado en el servidor: {str(e)}"}), 500

# --- Rutas para servir el Frontend ---
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        # Si la ruta es un archivo existente (CSS, JS, imagen), lo sirve.
        return send_from_directory(app.static_folder, path)
    else:
        # Para cualquier otra ruta, sirve el index.html principal.
        # Esto es clave para que funcionen las Single Page Applications (SPA).
        return send_from_directory(app.static_folder, 'index.html')

# --- Bloque para pruebas locales (Vercel no lo usa) ---
if __name__ == "__main__":
    app.run(host="localhost", port=5000, debug=True)