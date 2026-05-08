import cv2
import numpy as np
import pyautogui
import time
import requests

# --- CONFIGURAÇÕES DA MATRIZ ---
APP_URL = "https://ais-dev-yk3w7ta6kiq4nzlzcrffic-525638171734.us-east1.run.app"
API_URL = f"{APP_URL}/api/results"

# --- CALIBRAÇÃO (MUITO IMPORTANTE) ---
# Se o robô "não lê", ajuste estas coordenadas.
# Use (X, Y, LARGURA, ALTURA)
REGIAO_RESULTADO = (460, 750, 200, 100) # Ajuste a área de captura aqui
DELAY_LOOP = 0.2 
CONFIDENCE_THRESHOLD = 300 

def detectar_cor_dominante(imagem):
    """Analisa a imagem e identifica o vencedor."""
    hsv = cv2.cvtColor(imagem, cv2.COLOR_BGR2HSV)
    
    # Mascaras de cor calibradas
    mascaras = {
        'P': cv2.inRange(hsv, np.array([100, 150, 50]), np.array([140, 255, 255])), # Azul
        'B': cv2.add(
            cv2.inRange(hsv, np.array([0, 150, 50]), np.array([10, 255, 255])),
            cv2.inRange(hsv, np.array([170, 150, 50]), np.array([180, 255, 255]))
        ), # Vermelho
        'T': cv2.inRange(hsv, np.array([20, 100, 100]), np.array([35, 255, 255])) # Empate
    }

    pontos = {cor: cv2.countNonZero(mask) for cor, mask in mascaras.items()}
    vencedor = max(pontos, key=pontos.get)

    if pontos[vencedor] > CONFIDENCE_THRESHOLD:
        return vencedor, pontos[vencedor]
    return None, 0

def iniciar_monitoramento():
    print("\n" + "="*60)
    print("🔥 MATRIX LOGIC ROBOT v6.0 - MODO CALIBRAÇÃO ATIVA")
    print(f"📡 CONECTADO: {APP_URL}")
    print("="*60)
    print("1. Coloque o mouse sobre o centro do resultado no jogo.")
    print("2. O robô irá imprimir a posição e cor abaixo.")
    print("3. Atualize REGIAO_RESULTADO com os valores ideais.")
    print("="*60)
    
    ultimo_resultado = None

    while True:
        try:
            # Calibração em Tempo Real
            mx, my = pyautogui.position()
            cor_pixel = pyautogui.pixel(mx, my)
            
            # Captura
            screenshot = pyautogui.screenshot(region=REGIAO_RESULTADO)
            frame = cv2.cvtColor(np.array(screenshot), cv2.COLOR_RGB2BGR)

            vencedor, forca = detectar_cor_dominante(frame)
            
            print(f"\r🔍 Lendo... Mouse: ({mx}, {my}) Cor: {cor_pixel} | Detecção: {vencedor or 'Nada'} ({forca})", end="")

            if vencedor and vencedor != ultimo_resultado:
                valor_simulado = 10 
                print(f"\n🎯 [DETECTADO] {vencedor} | Sincronizando com App...")

                payload = {"cor": vencedor, "valor": valor_simulado}
                try:
                    res = requests.post(API_URL, json=payload, timeout=0.5)
                    if res.status_code == 200:
                        print(f"✅ SINCRONIZADO!")
                    else:
                        print(f"❌ ERRO API: {res.status_code}")
                except:
                    print(f"⚠️ App Indisponível")

                ultimo_resultado = vencedor

        except:
            pass

        time.sleep(DELAY_LOOP)

if __name__ == "__main__":
    # Importante: Instale pip install opencv-python numpy pyautogui requests
    print("Aguardando Início...")
    iniciar_monitoramento()
