import cv2
import numpy as np
import pyautogui
import time
import requests
import json
import os
import sys

# ==============================================================================
# CONFIGURAÇÃO DO ROBÔ AUTOMATIZADO (BAC BO) - TESSERACT VERSION
# ==============================================================================

try:
    import pytesseract
    # CAMINHO DO TESSERACT (Ajuste se necessário)
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
except ImportError:
    pytesseract = None
    print("❌ ERRO: Biblioteca 'pytesseract' não encontrada. Instale com: pip install pytesseract")

# 1. URL DO SEU DASHBOARD
# Use a URL que aparece no seu navegador quando abre o app (até o .app)
BASE_URL = "https://ais-dev-yk3w7ta6kiq4nzlzcrffic-525638171734.us-east1.run.app"
API_URL = f"{BASE_URL}/api/results"
STATUS_URL = f"{BASE_URL}/api/robot/status"

# 2. COORDENADAS DOS DADOS (X, Y, LARGURA, ALTURA)
# Use 'python automation_robot.py calibrate' para encontrar estas coordenadas.
COORDINATES = {
    "p1": (530, 810, 50, 50),
    "p2": (640, 810, 50, 50),
    "b1": (1230, 810, 50, 50),
    "b2": (1340, 810, 50, 50)
}

# 3. CONFIGURAÇÕES DE IMAGEM & SENSORES
THRESHOLD_VAL = 175    # 0-255: Filtra o fundo. Aumente se a mesa for muito clara.
STABILITY_LIMIT = 25000 # Sensibilidade de movimento (quanto menor, mais rigoroso)
TESSERACT_CONFIG = '--psm 13 -c tessedit_char_whitelist=123456' # PSM 13 = Raw Line/Character

# ==============================================================================
# MOTOR DE PROCESSAMENTO DE IMAGEM
# ==============================================================================

def preprocess_for_ocr(img):
    """
    Refina a imagem para o Tesseract:
    - Cinza -> Blur -> Threshold binário -> Resize
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Redução de ruído (ruído digital da câmera)
    blurred = cv2.medianBlur(gray, 3)
    
    # Thresholding para deixar o número preto e o fundo branco (THRESH_BINARY_INV)
    # ou vice-versa dependendo da cor do dado.
    _, thresh = cv2.threshold(blurred, THRESHOLD_VAL, 255, cv2.THRESH_BINARY_INV)
    
    # O Tesseract lê muito melhor em resoluções maiores
    scaled = cv2.resize(thresh, None, fx=4, fy=4, interpolation=cv2.INTER_CUBIC)
    
    return scaled

def update_status(status, message):
    """Envia o status atual do robô para o Dashboard via SSE."""
    try:
        requests.post(STATUS_URL, json={"status": status, "message": message}, timeout=2)
    except:
        pass

def read_die_number(region_key):
    """Captura a região, processa e executa o OCR via Tesseract."""
    if not pytesseract: return None
    
    region = COORDINATES[region_key]
    try:
        screenshot = pyautogui.screenshot(region=region)
        img = np.array(screenshot)
        img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
        
        processed = preprocess_for_ocr(img)
        
        text = pytesseract.image_to_string(processed, config=TESSERACT_CONFIG).strip()
        # Filtra apenas o primeiro caractere se vier mais de um
        if text and text[0] in "123456":
            return int(text[0])
    except Exception as e:
        print(f"⚠️ Erro OCR ({region_key}): {e}")
        update_status("ERRO", f"Falha no OCR ({region_key})")
        
    return None

def is_round_stable():
    """Detecta se os dados pararam de se mover na tela."""
    screenshots = []
    # Log de espera por estabilidade
    update_status("AGUARDANDO", "Esperando dados pararem...")
    
    for _ in range(2):
        snap = []
        for key in COORDINATES:
            shot = pyautogui.screenshot(region=COORDINATES[key])
            snap.append(np.array(shot))
        screenshots.append(snap)
        time.sleep(0.4) 
    
    for i in range(len(COORDINATES)):
        diff = cv2.absdiff(screenshots[0][i], screenshots[1][i])
        if np.sum(diff) > STABILITY_LIMIT:
            return False 
            
    return True

# ==============================================================================
# INTEGRAÇÃO E LOOP
# ==============================================================================

def main_loop():
    print("\n" + "="*50)
    print("🚀 MATRIX AUTOMATION ROBOT v3.6 (TESSERACT)")
    print("="*50)
    print(f"API: {API_URL}")
    print("Pressione CTRL+C para encerrar.\n")
    
    update_status("INICIADO", "Robô de automação pronto!")
    last_round_id = None
    
    while True:
        try:
            # 1. Aguarda estabilidade visual nos 4 dados
            if is_round_stable():
                update_status("DETECÇÃO", "Lendo números dos dados...")
                
                # 2. Faz a leitura dos 4 dados usando a função integrada
                results = {k: read_die_number(k) for k in COORDINATES}
                
                # Verifica se todos os 4 campos foram capturados com sucesso
                if all(v is not None for v in results.values()):
                    p_sum = results["p1"] + results["p2"]
                    b_sum = results["b1"] + results["b2"]
                    
                    winner = "P" if p_sum > b_sum else "B" if b_sum > p_sum else "T"
                    win_val = p_sum if winner != "B" else b_sum
                    
                    # ID único para não enviar a mesma mão várias vezes
                    round_id = f"{p_sum}v{b_sum}_{int(time.time() // 30)}" # Garante unicidade por rodada aproximada
                    
                    if round_id != last_round_id:
                        msg = f"{winner} | P:{p_sum} vs B:{b_sum}"
                        print(f"🎲 [DETECTADO] {msg}")
                        update_status("RESULTADO", msg)
                        
                        # Envio para API
                        payload = {"cor": winner, "valor": win_val}
                        try:
                            r = requests.post(API_URL, json=payload, timeout=5)
                            if r.status_code == 200:
                                print("✅ Dados sincronizados com o Dashboard.")
                                last_round_id = round_id
                                time.sleep(15) # Pausa após rodada
                            else:
                                print(f"❌ Erro na API ({r.status_code}): {r.text}")
                        except Exception as api_err:
                            print(f"⚠️ Erro de conexão: {api_err}")
                            update_status("ERRO", "Falha de conexão com API")
                else:
                    missed = [k for k, v in results.items() if v is None]
                    print(f"⏳ Leitura parcial, tentando novamente... (Falha em: {missed})")
                    update_status("SCAN", f"Leitura parcial: {len(missed)} dados falharam.")

            time.sleep(0.5)
            
        except KeyboardInterrupt:
            update_status("PARADO", "Robô finalizado pelo usuário.")
            print("\n🛑 Robô finalizado.")
            break
        except Exception as e:
            print(f"⚠️ Erro no loop principal: {e}")
            update_status("ERRO", str(e))
            time.sleep(2)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "calibrate":
        print("\n📍 MODO CALIBRAÇÃO")
        print("Mova o mouse até o CENTRO do dado e anote os valores de X e Y.")
        try:
            while True:
                x, y = pyautogui.position()
                print(f"COORDENADAS ATUAIS -> X: {x} | Y: {y}   (Ctrl+C para sair)", end="\r")
                time.sleep(0.1)
        except KeyboardInterrupt:
            print("\nCalibração encerrada.")
    else:
        if not pytesseract:
            print("❌ Falta dependência: pip install pytesseract opencv-python pyautogui requests")
        else:
            main_loop()