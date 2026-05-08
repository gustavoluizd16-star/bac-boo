import pyautogui
import sys
import os

def capture_region(x, y, width=50, height=50, filename="dado_teste.png"):
    """
    Tira um screenshot de uma região específica e salva em arquivo.
    """
    print(f"📸 Capturando região: X={x}, Y={y}, W={width}, H={height}")
    
    try:
        # Captura a região (x, y, largura, altura)
        # O pyautogui retorna um objeto PIL Image
        screenshot = pyautogui.screenshot(region=(x, y, width, height))
        
        # Salva a imagem
        screenshot.save(filename)
        
        print(f"✅ Imagem salva com sucesso: {os.path.abspath(filename)}")
        print("Dica: Abra esta imagem para conferir se o número do dado está centralizado e nítido.")
        
    except Exception as e:
        print(f"❌ Erro ao capturar: {e}")

if __name__ == "__main__":
    # Se o usuário passar coordenadas via terminal, usa elas. Caso contrário, usa valores padrão.
    # Exemplo: python capture_test.py 530 810
    if len(sys.argv) >= 3:
        target_x = int(sys.argv[1])
        target_y = int(sys.argv[2])
    else:
        print("⚠️ Coordenadas não fornecidas. Usando valores de exemplo (530, 810).")
        target_x = 530
        target_y = 810
        print("Uso: python capture_test.py <X> <Y>")

    capture_region(target_x, target_y)
