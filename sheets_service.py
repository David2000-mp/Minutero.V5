# sheets_service.py
from googleapiclient.discovery import build
from google.oauth2.service_account import Credentials
import os
import json

SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]

def get_sheet_data(spreadsheet_id, range_name):
    try:
        # 1. Obtener las credenciales desde la variable de entorno de Vercel
        creds_json_str = os.getenv("GOOGLE_CREDENTIALS_JSON")
        if not creds_json_str:
            print("!!! ERROR FATAL: No se encontró la variable de entorno 'GOOGLE_CREDENTIALS_JSON'.")
            return None

        # 2. Convertir el string JSON de las credenciales a un diccionario de Python
        creds_dict = json.loads(creds_json_str)

        # 3. Crear las credenciales desde el diccionario
        creds = Credentials.from_service_account_info(creds_dict, scopes=SCOPES)
        service = build('sheets', 'v4', credentials=creds)
        sheet = service.spreadsheets()
        
        print("\n>>> Intentando conectar con Google Sheets usando variables de entorno...")
        result = sheet.values().get(spreadsheetId=spreadsheet_id, range=range_name).execute()
        values = result.get('values', [])
        
        if not values:
            print(">>> ¡Conexión exitosa, pero no se encontraron datos!")
        else:
            print(f">>> ¡Conexión exitosa! Se encontraron {len(values)} filas.")
        
        return values

    except Exception as e:
        print("\n\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        print("!!! ERROR AL CONECTAR CON LA API DE GOOGLE SHEETS:")
        # Imprime el error en los logs de Vercel para que puedas depurarlo
        print(e)
        print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n\n")
        return None