import subprocess
import sys
import time

def run_cmd(cmd):
    try:
        res = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=10)
        return res.stdout.strip()
    except Exception as e:
        return f"Error: {e}"

def main():
    print("="*60)
    print("      STANDOFF 2 - FAST ADB TOURNAMENT CHECKER (PC)")
    print("="*60)
    print("[*] Tikrinamas prijungtas telefonas per USB...")
    
    devices = run_cmd("adb devices")
    print(devices)
    if "device" not in devices.replace("List of devices attached", ""):
        print("[!] Klaida: Telefonas neprijungtas arba neijungtas USB debugging.")
        print("[*] Ijunkite telefone 'USB Debugging' ir prijunkite USB laidu.")
        input("\nPaspauskite Enter, kad iseitumete..."); return

    print("\n[1/5] Tikrinamas Standoff 2 paketas...")
    pkg_path = run_cmd("adb shell pm path com.axlebolt.standoff2")
    if not pkg_path:
        print("  [!] Standoff 2 NERASTAS telefone!")
    else:
        print(f"  [+] Paketo vieta: {pkg_path}")

    installer = run_cmd("adb shell pm list packages -i com.axlebolt.standoff2")
    print(f"  [+] Diegimo saltinis: {installer}")
    if "com.android.vending" in installer:
        print("  [PASS] Oficialus Google Play leidimas.")
    else:
        print("  [FAIL / WARN] Perrinktas arba rankiniu budu idiegtas APK!")

    print("\n[2/5] Tikrinami neleistini treciuju saliu paketai...")
    packages = run_cmd("adb shell pm list packages")
    suspicious = ["gameguardian", "cheat", "luckypatch", "xposed", "lsposed", "vphonegaga", "f1vm", "twoyi"]
    found_susp = [s for s in suspicious if s in packages.lower()]
    if found_susp:
        print(f"  [FAIL] Rasti neleistini paketai: {found_susp}")
    else:
        print("  [PASS] Treciuju saliu irankiu paketu nerasta.")

    print("\n[3/5] Tikrinami Root ir su binarai...")
    su_test = run_cmd("adb shell which su")
    if su_test and "not found" not in su_test:
        print(f"  [WARN] Aptiktas su binaras: {su_test}")
    else:
        print("  [PASS] su binaras nerastas.")

    print("\n[4/5] Tikrinamas Atsisiuntimu aplankas (/sdcard/Download)...")
    downloads = run_cmd("adb shell ls -la /sdcard/Download")
    print("  Turinys:")
    for line in downloads.splitlines()[:15]:
        print("    " + line)

    print("\n" + "="*60)
    print("Patikra baigta. Perziurekite rezultatus auksciau.")
    print("="*60)
    input("\nPaspauskite Enter...")

if __name__ == "__main__":
    main()
