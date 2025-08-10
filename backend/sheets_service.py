# sheets_service.py
from googleapiclient.discovery import build
from google.oauth2.service_account import Credentials
import os

# MUY IMPORTANTE: Asegúrate de que este nombre sea IDÉNTICO al de tu archivo .json
SERVICE_ACCOUNT_FILE = "minutero-468417-b2377b9ff977.json"

SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]

def get_sheet_data(spreadsheet_id, range_name):
    try:
        if not os.path.exists(SERVICE_ACCOUNT_FILE):
            print(f"!!! ERROR FATAL: No se encuentra el archivo de credenciales '{SERVICE_ACCOUNT_FILE}'.")
            return None

        creds = Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)
        service = build('sheets', 'v4', credentials=creds)
        sheet = service.spreadsheets()
        
        print(">>> Conectando con Google Sheets...")
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
        print(e)
        print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n\n")
        return None