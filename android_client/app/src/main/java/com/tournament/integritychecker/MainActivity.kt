package com.tournament.integritychecker

import android.app.Activity
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class MainActivity : Activity() {

    private lateinit var etServerIp: EditText
    private lateinit var etPairingCode: EditText
    private lateinit var etNickname: EditText
    private lateinit var btnStartScan: Button
    private lateinit var tvConsoleLog: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        etServerIp = findViewById(R.id.etServerIp)
        etPairingCode = findViewById(R.id.etPairingCode)
        etNickname = findViewById(R.id.etNickname)
        btnStartScan = findViewById(R.id.btnStartScan)
        tvConsoleLog = findViewById(R.id.tvConsoleLog)

        btnStartScan.setOnClickListener {
            val serverIp = etServerIp.text.toString().trim()
            val code = etPairingCode.text.toString().trim()
            val nick = etNickname.text.toString().trim().ifEmpty { "Žaidėjas" }

            if (serverIp.isEmpty() || code.length != 6) {
                Toast.makeText(this, "Įveskite serverio IP ir 6 skaitmenų kodą!", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            runVerification(serverIp, code, nick)
        }
    }

    private fun log(message: String) {
        runOnUiThread {
            tvConsoleLog.append("$message\n")
        }
    }

    private fun runVerification(serverIp: String, code: String, nickname: String) {
        btnStartScan.isEnabled = false
        tvConsoleLog.text = "[*] Pradedama Standoff 2 kliento patikra...\n"

        thread {
            try {
                log("[1/4] Tikrinamas Standoff 2 diegimo vientisumas...")
                Thread.sleep(600)
                log("[2/4] Tikrinama Root ir sistemos aplinka...")
                Thread.sleep(600)
                log("[3/4] Skenuojami įdiegti trečiųjų šalių paketai...")
                Thread.sleep(600)
                log("[4/4] Analizuojami saugyklos atsisiuntimai...")
                Thread.sleep(600)

                val scanner = IntegrityScanner(this)
                val reportJson = scanner.executeFullScan(code, nickname)

                val verdict = reportJson.optString("verdict")
                log("[+] Skenavimas baigtas. Verdiktas: $verdict")
                log("[*] Siunčiama ataskaita į PC serverį ($serverIp)...")

                val targetUrl = if (serverIp.startsWith("http://") || serverIp.startsWith("https://")) {
                    "$serverIp/api/report/submit"
                } else {
                    "http://$serverIp/api/report/submit"
                }

                val url = URL(targetUrl)
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json")
                conn.connectTimeout = 5000
                conn.readTimeout = 5000
                conn.doOutput = true

                val writer = OutputStreamWriter(conn.outputStream)
                writer.write(reportJson.toString())
                writer.flush()
                writer.close()

                val respCode = conn.responseCode
                if (respCode == 200) {
                    log("\n[SĖKMĖ] Ataskaita sėkmingai pristatyta teisėjui!")
                    log("Rezultatai jau matomi PC ekrane.")
                } else {
                    log("\n[KLAIDA] Serveris atmetė užklausą (Kodas: $respCode). Patikrinkite poravimo kodą.")
                }
                conn.disconnect()

            } catch (e: Exception) {
                log("\n[KLAIDA] Nepavyko susisiekti su PC serveriu: ${e.localizedMessage}")
                log("Įsitikinkite, kad telefonas ir PC yra tame pačiame Wi-Fi tinkle!")
            } finally {
                runOnUiThread {
                    btnStartScan.isEnabled = true
                }
            }
        }
    }
}
