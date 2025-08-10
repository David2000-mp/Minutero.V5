# sheets_service.py
from googleapiclient.discovery import build
from google.oauth2.service_account import Credentials
import os

# MUY IMPORTANTE: Asegúrate de que este nombre sea IDÉNTICO al de tu archivo .json
SERVICE_ACCOUNT_FILE = "minutero-468417-b2377b9ff977.json"

SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]

def get_sheet_data(spreadsheet_id, range_name):
    try:
        creds = None
        if os.path.exists(SERVICE_ACCOUNT_FILE):
            creds = Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)
        else:
            creds_json = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS_JSON")
            if not creds_json:
                print(f"!!! ERROR FATAL: No se encuentra el archivo de credenciales '{SERVICE_ACCOUNT_FILE}' ni la variable de entorno GOOGLE_APPLICATION_CREDENTIALS_JSON.")
                return None
            import json
            creds_dict = json.loads(creds_json)
            creds = Credentials.from_service_account_info(creds_dict, scopes=SCOPES)

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