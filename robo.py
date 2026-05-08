import cv2
import numpy as np
import pyautogui
import time
import sys
import json
import os

# ==============================================================================
# CONFIGURAÇÕES E AUXILIARES
# ==============================================================================

CONFIG_FILE = "config_robo.json"

def save_config(config):
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f)

def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r') as f:
            return json.load(f)
    return None

def get_safe_region(p1, p2):
    """
    Calcula a região (x, y, w, h) de forma segura, garantindo que w e h sejam positivos.
    p1 e p2 são tuplas (x, y).
    """
    x1, y1 = p1
    x2, y2 = p2
    
    rx = int(min(x1, x2))
    ry = int(min(y1, y2))
    rw = int(abs(x2 - x1))
    rh = int(abs(y2 - y1))
    
    # Previne erro se a área for 0x0
    if rw == 0: rw = 1
    if rh == 0: rh = 1
    
    return (rx, ry, rw, rh)

# ==============================================================================
# FUNÇÕES DE VISÃO E MOVIMENTO
# ==============================================================================

def is_stable(region, threshold=10000):
    """
    Verifica se a região da tela está estável (sem movimento).
    Aplica a correção de região segura solicitada pelo usuário.
    """
    # Se a região for passada como (x, y, w, h) diretamente
    # Supomos que o usuário quer que a lógica de min/max já tenha sido aplicada.
    
    try:
        f1 = np.array(pyautogui.screenshot(region=region))
        time.sleep(0.3)
        f2 = np.array(pyautogui.screenshot(region=region))
        
        diff = cv2.absdiff(f1, f2)
        movement = np.sum(diff)
        
        return movement < threshold
    except Exception as e:
        print(f"Erro no screenshot: {e}")
        return False

def calibrate():
    """
    Modo de calibração interativa.
    Aprende onde olhar (Dados) e onde clicar (App).
    """
    print("\n" + "="*50)
    print("🎯 MODO CALIBRAÇÃO MATRIX")
    print("="*50)
    print("Siga as instruções abaixo:")
    
    config = {"dados": [], "botoes": {}}
    
    # 1. Calibrar Regiões dos 4 Dados
    for i in range(4):
        print(f"\n--- DADO {i+1} ---")
        print("1. Coloque o mouse no CANTO SUPERIOR ESQUERDO da área do dado e pressione ENTER.")
        input()
        p1 = pyautogui.position()
        
        print("2. Coloque o mouse no CANTO INFERIOR DIREITO da área do dado e pressione ENTER.")
        input()
        p2 = pyautogui.position()
        
        region = get_safe_region(p1, p2)
        config["dados"].append(region)
        print(f"✅ Região {i+1} configurada: {region}")
    
    # 2. Calibrar Botões do App (1 a 6)
    print("\n--- BOTÕES DO APP (1 a 6) ---")
    for b in range(1, 7):
        print(f"Coloque o mouse sobre o botão '{b}' do seu app e pressione ENTER.")
        input()
        pos = pyautogui.position()
        config["botoes"][str(b)] = (int(pos.x), int(pos.y))
        print(f"✅ Botão {b} configurado em: {pos}")
        
    save_config(config)
    print("\n" + "="*50)
    print("💾 CONFIGURAÇÃO SALVA COM SUCESSO!")
    print("="*50)
    return config

# ==============================================================================
# LOOP PRINCIPAL
# ==============================================================================

def run_robot(config):
    print("\n🚀 ROBÔ INICIADO. MONITORANDO JOGO...")
    print("Pressione CTRL+C para parar.")
    
    # Notas: Para simplicidade, este exemplo foca na lógica de estabilidade e clique.
    # A leitura real dos números exigiria OCR como o Tesseract (mostrado nos passos anteriores).
    
    while True:
        try:
            # Verifica se todos os dados estão estáveis
            all_stable = True
            for region in config["dados"]:
                if not is_stable(region):
                    all_stable = False
                    break
            
            if all_stable:
                # Exemplo: Se detectou que parou, faria o OCR aqui.
                # Aqui vamos apenas simular que detectou um '6' para teste de clique.
                # No seu caso, você usaria o pytesseract.image_to_string()
                
                print("🎲 Dados pararam! (Simulando detecção...)")
                
                # EXEMPLO DE CLIQUE:
                # Supondo que o OCR leu o número 6 no dado 1
                numero_detectado = "6" 
                if numero_detectado in config["botoes"]:
                    target = config["botoes"][numero_detectado]
                    pyautogui.click(target[0], target[1])
                    print(f"🖱️ Clique realizado no botão {numero_detectado} em {target}")
                
                # Aguarda a próxima rodada
                time.sleep(10)
                
            time.sleep(0.5)
            
        except KeyboardInterrupt:
            print("\n🛑 Robô parado.")
            break
        except Exception as e:
            print(f"⚠️ Erro: {e}")
            time.sleep(1)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "calibrate":
        calibrate()
    else:
        config = load_config()
        if not config:
            print("❌ Nenhuma configuração encontrada. Execute: python robo.py calibrate")
        else:
            run_robot(config)
