from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

# Ruta al archivo JSON de credenciales
CREDENTIALS_FILE = 'c:/Users/david/Downloads/minutero-468417-b2377b9ff977.json'

# ID de la hoja de cálculo de Google Sheets
SPREADSHEET_ID = 'tu_spreadsheet_id'  # Reemplaza con el ID de tu hoja de cálculo

# Rango de datos que deseas leer (por ejemplo, 'Hoja1!A1:D10')
RANGE_NAME = 'Hoja1!A1:D10'

def obtener_datos_google_sheets():
    """
    Conecta con Google Sheets y obtiene los datos del rango especificado.
    """
    try:
        # Autenticación con las credenciales
        credentials = Credentials.from_service_account_file(
            CREDENTIALS_FILE, 
            scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"]
        )

        # Construcción del servicio de Google Sheets
        service = build('sheets', 'v4', credentials=credentials)
        sheet = service.spreadsheets()

        # Leer los datos de la hoja de cálculo
        result = sheet.values().get(spreadsheetId=SPREADSHEET_ID, range=RANGE_NAME).execute()
        values = result.get('values', [])

        if not values:
            print('No se encontraron datos en la hoja de cálculo.')
        else:
            print('Datos obtenidos:')
            for row in values:
                print(row)
    except Exception as e:
        print(f"Error al obtener datos de Google Sheets: {e}")

# Llamar a la función para probar
obtener_datos_google_sheets()