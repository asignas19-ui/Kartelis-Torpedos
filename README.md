# Standoff 2 - Tournament Player Verifier (Anti-Instrumentation Suite)

Ši sistema sukurta turnyrų ir varžybų organizatoriams, kad prieš mačą būtų galima greitai ir patikimai patikrinti, ar žaidėjas naudoja švarų, oficialų *Standoff 2* klientą, ar nėra įsidiegęs neleistinų modulių, virtualių erdvių ar modifikuotų failų.

---

## 📁 Projekto Struktūra

* **`pc_server/`** — Kompiuterio serveris ir teisėjo valdymo pultas (Dashboard).
  * `server.py` — Pagrindinis Python serveris su realaus laiko tamsia tema ir statistika.
  * `start_server.bat` — Paleidimas vienu paspaudimu.
* **`android_client/`** — Telefono programėlės (APK) išeities kodas.
  * `app/src/main/java/com/tournament/integritychecker/` — Patikros logika, Standoff 2 parašo analizė, failų skenavimas.
* **`adb_fast_check/`** — Greitoji patikra per USB laidą (nereikia diegti APK į telefoną).
  * `fast_check_adb.bat` / `fast_check_adb.py`.

---

## 🚀 Kaip naudotis (Žingsnis po žingsnio)

### 1 Žingsnis: Paleiskite PC Serverį
1. Atidarykite aplanką `tournament_checker/pc_server/`.
2. Dukart spustelėkite `start_server.bat` (arba terminale paleiskite `python server.py`).
3. Naršyklėje automatiškai atsidarys valdymo pultas (`http://localhost:8080`).
4. Ekrane pamatysite:
   * **PC IP adresą** (pvz. `192.168.1.150:8080`)
   * **6 skaitmenų poravimo kodą** (pvz. `492018`).

### 2 Žingsnis: Žaidėjas atlieka patikrą telefone (APK)
1. Žaidėjo telefone paleidžiama patikros programėlė.
2. Įvedamas teisėjo nurodytas **IP adresas**, **6 skaitmenų kodas** ir žaidėjo **Nick**.
3. Spaudžiama **„PRADĖTI PATIKRĄ“**.
4. Programėlė automatiškai patikrina:
   * Ar Standoff 2 įdiegtas iš oficialaus **Google Play Store**.
   * Ar žaidimo sertifikatas ir SHA-256 parašas yra originalūs.
   * Ar nėra Root prieigos (`su`, Magisk, KernelSU).
   * Ar nėra įdiegtų žinomų manipuliavimo įrankių (`GameGuardian`, `VirtualXposed`, `Twoyi` ir kt.).
   * Ar atsisiuntimų aplanke nėra neleistinų `.lua` ar `.so` skriptų.
5. Ataskaita akimirksniu nusiunčiama į PC serverį.

### 3 Žingsnis: Teisėjas mato išvadą PC ekrane
PC ekrane automatiškai atsiranda žaidėjo duomenys ir verdiktas:
* 🟢 **ŠVARUS / VERIFIED (LEGIT)** — Oficialus žaidimas, jokių įtartinų procesų.
* 🟡 **ĮTARTINAS (WARNING)** — Rasta Root prieiga arba kūrėjo nustatymai.
* 🔴 **BLOKUOTAS / FLAGGED** — Modifikuotas žaidimo failas arba neleistini įrankiai.
