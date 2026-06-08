import webbrowser
import time
import subprocess

# Open browser to map tab
webbrowser.open('http://localhost:8080')
time.sleep(3)

# Take screenshot (PowerShell command)
print("✅ Browser opened. Map legend should be visible at bottom-left.")
