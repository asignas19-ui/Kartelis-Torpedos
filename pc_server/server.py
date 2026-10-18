import http.server
import socketserver
import socket
import json
import random
import time
import os
import sys
import threading
from urllib.parse import urlparse, parse_qs

PORT = 8080
active_sessions = {}
session_results = {}

def get_lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

LAN_IP = get_lan_ip()

def generate_pairing_code():
    return f"{random.randint(100000, 999999)}"

HTML_DASHBOARD = r"""<!DOCTYPE html>
<html lang="lt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Standoff 2 - Tournament Player Verifier</title>
    <style>
        :root {
            --bg: #0f141c;
            --surface: #18202c;
            --surface-hover: #1f2b3b;
            --primary: #4f46e5;
            --primary-glow: rgba(79, 70, 229, 0.4);
            --accent: #06b6d4;
            --text: #f8fafc;
            --text-dim: #94a3b8;
            --border: #334155;
            --pass: #10b981;
            --warn: #f59e0b;
            --fail: #ef4444;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        body { background: var(--bg); color: var(--text); padding: 24px; min-height: 100vh; }
        .container { max-width: 1200px; margin: 0 auto; }
        
        header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 20px; margin-bottom: 24px; }
        .title-group h1 { font-size: 24px; font-weight: 700; color: #fff; }
        .title-group p { font-size: 14px; color: var(--text-dim); margin-top: 4px; }
        
        .code-box {
            background: linear-gradient(135deg, rgba(79,70,229,0.15), rgba(6,182,212,0.15));
            border: 2px dashed var(--accent);
            border-radius: 12px;
            padding: 16px 28px;
            text-align: center;
        }
        .code-box .label { font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: var(--accent); }
        .code-box .code { font-size: 38px; font-weight: 800; letter-spacing: 6px; color: #fff; font-family: monospace; }
        .code-box .ip-hint { font-size: 13px; color: var(--text-dim); margin-top: 4px; }

        .dashboard-grid { display: grid; grid-template-columns: 350px 1fr; gap: 24px; }
        
        .panel { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
        .panel h2 { font-size: 16px; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; }
        
        .status-badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; }
        .status-waiting { background: #334155; color: #cbd5e1; }
        .status-pass { background: rgba(16,185,129,0.2); color: var(--pass); border: 1px solid var(--pass); }
        .status-warn { background: rgba(245,158,11,0.2); color: var(--warn); border: 1px solid var(--warn); }
        .status-fail { background: rgba(239,68,68,0.2); color: var(--fail); border: 1px solid var(--fail); }

        .player-info-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 14px; }
        .player-info-item span:first-child { color: var(--text-dim); }
        .player-info-item span:last-child { font-weight: 500; }

        .audit-section { margin-bottom: 20px; }
        .audit-section-title { font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: var(--text-dim); margin-bottom: 10px; }
        .audit-table { width: 100%; border-collapse: collapse; }
        .audit-table tr { border-bottom: 1px solid rgba(255,255,255,0.06); }
        .audit-table td { padding: 10px 12px; font-size: 13px; }
        .audit-table td.tag { width: 100px; text-align: right; }
        
        .badge-pill { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; }
        .pill-pass { background: rgba(16,185,129,0.2); color: var(--pass); }
        .pill-warn { background: rgba(245,158,11,0.2); color: var(--warn); }
        .pill-fail { background: rgba(239,68,68,0.2); color: var(--fail); }

        .banner { padding: 16px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; display: none; }
        .banner-fail { background: rgba(239,68,68,0.15); border: 1px solid var(--fail); color: #fca5a5; display: block; }
        .banner-pass { background: rgba(16,185,129,0.15); border: 1px solid var(--pass); color: #86efac; display: block; }
        .banner-warn { background: rgba(245,158,11,0.15); border: 1px solid var(--warn); color: #fde68a; display: block; }

        .empty-placeholder { text-align: center; padding: 60px 20px; color: var(--text-dim); }
        .pulse { animation: pulseAnim 2s infinite ease-in-out; }
        @keyframes pulseAnim {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
        }
        
        .actions-bar { margin-top: 16px; display: flex; gap: 10px; }
        button { background: var(--primary); color: white; border: none; padding: 10px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; transition: 0.2s; }
        button:hover { opacity: 0.9; }
        button.secondary { background: #334155; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="title-group">
                <h1>Tournament Integrity Dashboard</h1>
                <p>Standoff 2 Mobile Player Verification System (Anti-Instrumentation Audit)</p>
            </div>
            <div class="code-box">
                <div class="label">TELEFONO PORAVIMO KODAS</div>
                <div class="code" id="pairingCode">------</div>
                <div class="ip-hint" id="serverIp">Jungtis per: {{LAN_IP}}:8080</div>
            </div>
        </header>

        <div class="dashboard-grid">
            <div class="panel">
                <h2>
                    <span>Žaidėjo Įrenginys</span>
                    <span id="playerStatusBadge" class="status-badge status-waiting">Laukiama...</span>
                </h2>
                <div id="playerDeviceInfo">
                    <div class="player-info-item"><span>Modelis:</span><span id="devModel">-</span></div>
                    <div class="player-info-item"><span>Android versija:</span><span id="devAndroid">-</span></div>
                    <div class="player-info-item"><span>Žaidėjas / Nick:</span><span id="devNick">-</span></div>
                    <div class="player-info-item"><span>Standoff 2 įdiegimas:</span><span id="devInstall">-</span></div>
                    <div class="player-info-item"><span>Paketo parašas:</span><span id="devSig">-</span></div>
                    <div class="player-info-item"><span>Patikros laikas:</span><span id="devTime">-</span></div>
                </div>
                <div class="actions-bar">
                    <button class="secondary" onclick="newSession()">Naujas kodas</button>
                    <button onclick="window.print()">Spausdinti / PDF</button>
                </div>
            </div>

            <div class="panel">
                <h2>Patikros Išvada ir Rezultatai</h2>
                <div id="verdictBanner" class="banner"></div>

                <div id="resultsContainer">
                    <div class="empty-placeholder pulse">
                        <h3>Laukiama ataskaitos iš telefono...</h3>
                        <p style="margin-top: 8px;">1. Telefone atidarykite patikros programėlę (APK).<br>2. Įveskite aukščiau matomą 6 skaitmenų kodą.<br>3. Paspauskite „Pradėti patikrą“.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let currentCode = "";

        async function fetchSession() {
            try {
                const res = await fetch('/api/session/current');
                const data = await res.json();
                currentCode = data.code;
                document.getElementById('pairingCode').innerText = data.code;
                document.getElementById('serverIp').innerText = "Adresas: " + data.lan_ip + ":8080";
                
                if (data.report) {
                    renderReport(data.report);
                }
            } catch (e) {
                console.error(e);
            }
        }

        async function newSession() {
            const res = await fetch('/api/session/new', { method: 'POST' });
            const data = await res.json();
            currentCode = data.code;
            document.getElementById('pairingCode').innerText = data.code;
            document.getElementById('resultsContainer').innerHTML = `
                <div class="empty-placeholder pulse">
                    <h3>Laukiama naujo žaidėjo patikros...</h3>
                    <p style="margin-top: 8px;">Įveskite naują kodą <b>${data.code}</b> žaidėjo telefone.</p>
                </div>`;
            document.getElementById('verdictBanner').style.display = 'none';
            document.getElementById('playerStatusBadge').className = 'status-badge status-waiting';
            document.getElementById('playerStatusBadge').innerText = 'Laukiama...';
        }

        function renderReport(r) {
            document.getElementById('devModel').innerText = r.device_model || 'N/A';
            document.getElementById('devAndroid').innerText = 'Android ' + (r.android_version || 'N/A');
            document.getElementById('devNick').innerText = r.player_nickname || 'Žaidėjas';
            document.getElementById('devInstall').innerText = r.so2_installer || 'Nezinomas';
            document.getElementById('devSig').innerText = r.so2_signature_valid ? 'Validus (Google Play)' : 'MODIFIKUOTAS!';
            document.getElementById('devTime').innerText = new Date(r.timestamp * 1000).toLocaleTimeString();

            const badge = document.getElementById('playerStatusBadge');
            const banner = document.getElementById('verdictBanner');

            if (r.verdict === 'LEGIT') {
                badge.className = 'status-badge status-pass';
                badge.innerText = 'ŠVARUS / VERIFIED';
                banner.className = 'banner banner-pass';
                banner.innerHTML = '<strong>PATIKRA SĖKMINGA:</strong> Žaidėjo klientas yra oficialus, neaptikta jokių pašalinių modulių, bibliotekų injekcijų ar žinomų trečiųjų šalių įrankių.';
            } else if (r.verdict === 'WARNING') {
                badge.className = 'status-badge status-warn';
                badge.innerText = 'ĮTARTINAS (WARNING)';
                banner.className = 'banner banner-warn';
                banner.innerHTML = '<strong>ĮSPĖJIMAS:</strong> Rasta įtartinų parametrų (pvz., aktyvus Root arba kūrėjo nustatymai), tačiau tiesioginių žaidimo modifikacijų neaptikta. Reikalinga teisėjo peržiūra.';
            } else {
                badge.className = 'status-badge status-fail';
                badge.innerText = 'BLOKUOTAS / FLAGGED';
                banner.className = 'banner banner-fail';
                banner.innerHTML = '<strong>KRITINĖ RIZIKA:</strong> Aptikti neleistini moduliai, modifikuotas žaidimo paketas arba pašaliniai failai atmintyje!';
            }

            let html = '';
            for (const section of r.sections) {
                html += `<div class="audit-section">
                    <div class="audit-section-title">${section.title}</div>
                    <table class="audit-table">`;
                for (const item of section.items) {
                    let pillClass = item.status === 'PASS' ? 'pill-pass' : (item.status === 'WARN' ? 'pill-warn' : 'pill-fail');
                    html += `<tr>
                        <td><strong>${item.name}</strong><br><span style="color:#94a3b8;font-size:12px;">${item.details || ''}</span></td>
                        <td class="tag"><span class="badge-pill ${pillClass}">${item.status}</span></td>
                    </tr>`;
                }
                html += `</table></div>`;
            }
            document.getElementById('resultsContainer').innerHTML = html;
        }

        fetchSession();
        setInterval(fetchSession, 2000);
    </script>
</body>
</html>
"""

current_code = generate_pairing_code()
latest_report = None

class TournamentAuditHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Clean terminal logging
        pass

    def do_GET(self):
        global current_code, latest_report
        parsed = urlparse(self.path)

        if parsed.path == "/" or parsed.path == "/index.html":
            content = HTML_DASHBOARD.replace("{{LAN_IP}}", LAN_IP).encode('utf-8')
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)

        elif parsed.path == "/api/session/current":
            data = {
                "code": current_code,
                "lan_ip": LAN_IP,
                "report": latest_report
            }
            self.send_json(data)

        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        global current_code, latest_report
        parsed = urlparse(self.path)

        if parsed.path == "/api/session/new":
            current_code = generate_pairing_code()
            latest_report = None
            print(f"\n[SERVER] Sugeneruotas naujas kodas: {current_code}")
            self.send_json({"status": "ok", "code": current_code})

        elif parsed.path == "/api/report/submit":
            length = int(self.headers.get('Content-Length', 0))
            raw_body = self.rfile.read(length).decode('utf-8')
            try:
                report = json.loads(raw_body)
                received_code = str(report.get("pairing_code", "")).strip()

                if received_code == current_code:
                    latest_report = report
                    print("\n" + "="*50)
                    print(f"[AUDITAS GAUTAS] Žaidėjas: {report.get('player_nickname', 'Nezinomas')}")
                    print(f"Modelis: {report.get('device_model')} (Android {report.get('android_version')})")
                    print(f"Galutinis Verdiktas: {report.get('verdict')}")
                    print("="*50)
                    self.send_json({"status": "accepted", "message": "Ataskaita sekmingai uzfiksuota"})
                else:
                    self.send_json({"status": "error", "message": "Neteisingas poravimo kodas"}, status=400)
            except Exception as e:
                self.send_json({"status": "error", "message": str(e)}, status=500)
        else:
            self.send_response(404)
            self.end_headers()

    def send_json(self, data, status=200):
        body = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

def run_server():
    server = socketserver.TCPServer(("0.0.0.0", PORT), TournamentAuditHandler)
    print("\n" + "#"*60)
    print("      STANDOFF 2 - TOURNAMENT VERIFIER SERVER ACTIVE")
    print("#"*60)
    print(f"[*] Teisėjo Dashboard naršyklėje:  http://localhost:{PORT}")
    print(f"[*] Telefono prijungimo adresas:    http://{LAN_IP}:{PORT}")
    print(f"[*] Aktyvus poravimo kodas:        {current_code}")
    print("#"*60 + "\n")
    server.serve_forever()

if __name__ == "__main__":
    run_server()
