' Chạy watchdog.ps1 hoàn toàn ẩn (không hiện cửa sổ console).
Set sh = CreateObject("WScript.Shell")
sh.Run "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -NonInteractive -File ""d:\Projects\order-nexora\ops\watchdog.ps1""", 0, False
