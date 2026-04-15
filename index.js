const keepAlive = require('./keep_alive');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

// ================== KONFIGURASI ==================
const BOT_NAME = 'WANG JASTEB';
const PREFIX = '!'; // Command dengan tanda seru
const OWNER_NUMBER = '6283150287016@s.whatsapp.net'; // Ganti dengan nomor Bos (format: 62xxx@s.whatsapp.net)

// ================== DATABASE ==================
const dbDir = path.join(__dirname, 'database');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir);

const GROUP_DB = path.join(dbDir, 'group.json');
const KONTAK_DB = path.join(dbDir, 'kontak.json');

let groupDB = fs.existsSync(GROUP_DB) ? JSON.parse(fs.readFileSync(GROUP_DB)) : {};
let kontakDB = fs.existsSync(KONTAK_DB) ? JSON.parse(fs.readFileSync(KONTAK_DB)) : {};

function saveGroupDB() {
    fs.writeFileSync(GROUP_DB, JSON.stringify(groupDB, null, 2));
}

function saveKontakDB() {
    fs.writeFileSync(KONTAK_DB, JSON.stringify(kontakDB, null, 2));
}

async function fetchAllGroups(sock) {
    const groups = await sock.groupFetchAllParticipating();
    const result = {};
    let index = 1;
    for (const id in groups) {
        const group = groups[id];
        result[id] = {
            name: group.subject,
            id: id,
            index: index++
        };
    }
    groupDB = result;
    saveGroupDB();
    return groupDB;
}

// ================== FUNGSI UTAMA ==================
async function startBot() {
    keepAlive();

    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        printQRInTerminal: false,
        browser: [BOT_NAME, 'Chrome', '1.0.0'],
        logger: pino({ level: 'silent' })
    });

    // ========== PAIRING CODE (RAILWAY FRIENDLY - TANPA INPUT) ==========
    if (!sock.authState.creds.registered) {
        console.log('\n📲 ==================================');
        console.log('🔐 METODE PAIRING CODE - WANG JASTEB');
        console.log('====================================');
        
        // ⚠️ GANTI NOMOR DI BAWAH INI DENGAN NOMOR WA TUMBAL BOS (format: 628xxx)
        const phoneNumber = '6283150287016'; // <--- GANTI NOMOR DI SINI
        console.log(`📱 Menggunakan nomor: ${phoneNumber}`);

        try {
            const code = await sock.requestPairingCode(phoneNumber);
            console.log(`\n🔢 KODE PAIRING ANDA: ${code}`);
            console.log('📌 Buka WhatsApp HP > Perangkat Tertaut > Tautkan Perangkat');
            console.log('📌 Pilih "Tautkan dengan Kode", lalu masukkan kode di atas.\n');
            console.log('⏳ Menunggu koneksi...');
        } catch (err) {
            console.error('❌ Gagal mendapatkan pairing code:', err);
        }
    }

    // ========== CONNECTION UPDATE ==========
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('❌ Koneksi terputus, mencoba reconnect...');
            if (shouldReconnect) {
                startBot();
            } else {
                console.log('🔴 Logout terdeteksi. Hapus folder auth_info lalu jalankan ulang.');
            }
        } else if (connection === 'open') {
            console.log(`✅ ${BOT_NAME} berhasil terhubung!`);
            sock.sendMessage(OWNER_NUMBER, { 
                text: `🤖 *${BOT_NAME}*\n✅ Bot online!\n\nKetik *!menu* untuk daftar perintah.` 
            });
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // ========== HANDLE PESAN ==========
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const sender = msg.key.remoteJid;
        const textMessage = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const command = textMessage.startsWith(PREFIX) ? textMessage.slice(PREFIX.length).trim().toLowerCase() : null;
        const dotCommand = textMessage.startsWith('.') ? textMessage.slice(1).trim().toLowerCase() : null;

        // ========== COMMAND DENGAN PREFIX ! ==========
        if (command) {
            switch (command) {
                case 'ping':
                    await sock.sendMessage(sender, { text: '🏓 *PONG!* Bot aktif.' });
                    break;

                case 'menu':
                    const menuText = `🤖 *${BOT_NAME} - MENU UTAMA*\n\n` +
                        `*${PREFIX}ping* - Cek status bot\n` +
                        `*${PREFIX}menu* - Tampilkan menu ini\n` +
                        `*${PREFIX}info* - Info bot\n` +
                        `*${PREFIX}owner* - Kontak owner\n` +
                        `*${PREFIX}harga [game]* - Lihat harga\n\n` +
                        `📢 *MENU PUSHKONTAK*\n` +
                        `*.cekidgc* - Lihat daftar grup\n` +
                        `*.svkontak idgc | nama* - Simpan kontak grup\n` +
                        `*.pushkontak idgc | pesan | delay* - Kirim pesan massal\n` +
                        `*.trxdone JENIS | HARGA* - Catat transaksi selesai\n\n` +
                        `👑 Owner: Wang Jasteb\n` +
                        `📞 Nomor: 083150287016\n` +
                        `📢 Saluran: https://whatsapp.com/channel/0029Vb7nRxqAu3aYhu1PCY35`;
                    await sock.sendMessage(sender, { text: menuText });
                    break;

                case 'info':
                    await sock.sendMessage(sender, { 
                        text: `📦 *INFO BOT*\n\nNama: ${BOT_NAME}\nPrefix: ${PREFIX}\nStatus: Online\nServer: Railway\n\nBot siap melayani orderan 24/7.` 
                    });
                    break;

                case 'owner':
                    await sock.sendMessage(sender, { 
                        text: `👑 *OWNER*\n\nNama: Wang Jasteb\nWhatsApp: wa.me/6283150287016\n\nHubungi jika ada kendala.` 
                    });
                    break;

                case 'harga ff':
                case 'harga freefire':
                    await sock.sendMessage(sender, { 
                        text: `💎 *HARGA FREE FIRE*\n\nJASTEB:\n5K = 50 Ress\n10K = 100 Ress\n15K = 150 Ress\n...dst\n\nUNCHEK:\n5K = 25 Ress\n10K = 50 Ress\n15K = 75 Ress\n...dst\n\nKunjungi website resmi untuk harga lengkap.` 
                    });
                    break;

                case 'harga ml':
                case 'harga mobilelegend':
                    await sock.sendMessage(sender, { 
                        text: `💎 *HARGA MOBILE LEGEND*\n\nJASTEB:\n5K = 25 Ress\n10K = 50 Ress\n15K = 75 Ress\n...dst\n\nUNCHEK:\n5K = 20 Ress\n10K = 40 Ress\n15K = 60 Ress\n...dst\n\nKunjungi website resmi untuk harga lengkap.` 
                    });
                    break;

                case 'harga pubg':
                    await sock.sendMessage(sender, { 
                        text: `💎 *HARGA PUBG*\n\nJASTEB:\n5K = 25 Ress\n10K = 50 Ress\n15K = 75 Ress\n...dst\n\nUNCHEK:\n5K = 20 Ress\n10K = 40 Ress\n15K = 60 Ress\n...dst\n\nKunjungi website resmi untuk harga lengkap.` 
                    });
                    break;

                default:
                    await sock.sendMessage(sender, { 
                        text: `❓ Perintah tidak dikenal. Ketik *${PREFIX}menu* untuk bantuan.` 
                    });
            }
        }

        // ========== COMMAND DENGAN PREFIX . (TITIK) ==========
        if (dotCommand) {
            const args = textMessage.split(' ').slice(1).join(' ');
            const cmd = dotCommand.split(' ')[0];

            switch (cmd) {
                case 'cekidgc': {
                    const groups = await fetchAllGroups(sock);
                    let text = '*📋 DAFTAR GRUP*\n\n';
                    for (const id in groups) {
                        const g = groups[id];
                        text += `🔹 *${g.index}.* ${g.name}\n   ID: \`${g.id}\`\n\n`;
                    }
                    text += `_Total: ${Object.keys(groups).length} grup_`;
                    await sock.sendMessage(sender, { text });
                    break;
                }

                case 'svkontak': {
                    const parts = args.split('|').map(p => p.trim());
                    if (parts.length < 2) {
                        await sock.sendMessage(sender, { text: '❌ Format salah!\nContoh: *.svkontak idgc | NamaAwal*' });
                        break;
                    }
                    const groupId = parts[0];
                    const baseName = parts[1];

                    if (!groupDB[groupId]) {
                        await sock.sendMessage(sender, { text: '❌ ID Grup tidak ditemukan. Jalankan *.cekidgc* dulu.' });
                        break;
                    }

                    try {
                        const metadata = await sock.groupMetadata(groupId);
                        const participants = metadata.participants;
                        
                        let lastIndex = 0;
                        for (const key in kontakDB) {
                            if (kontakDB[key].name && kontakDB[key].name.startsWith(baseName)) {
                                const match = kontakDB[key].name.match(new RegExp(`${baseName} (\\d+)$`));
                                if (match) lastIndex = Math.max(lastIndex, parseInt(match[1]));
                            }
                        }

                        let savedCount = 0;
                        for (const p of participants) {
                            const jid = p.id;
                            if (!kontakDB[jid]) {
                                lastIndex++;
                                kontakDB[jid] = {
                                    name: `${baseName} ${lastIndex}`,
                                    jid: jid,
                                    savedFrom: groupId,
                                    savedAt: new Date().toISOString()
                                };
                                savedCount++;
                            }
                        }
                        saveKontakDB();
                        await sock.sendMessage(sender, { text: `✅ Berhasil menyimpan *${savedCount}* kontak baru dengan nama "${baseName} X".\nTotal kontak: ${Object.keys(kontakDB).length}` });
                    } catch (e) {
                        console.error(e);
                        await sock.sendMessage(sender, { text: '❌ Gagal mengambil anggota grup. Pastikan bot masih di dalam grup.' });
                    }
                    break;
                }

                case 'pushkontak': {
                    if (sender !== OWNER_NUMBER) {
                        await sock.sendMessage(sender, { text: '❌ Hanya owner yang bisa menggunakan fitur ini.' });
                        break;
                    }

                    const parts = args.split('|').map(p => p.trim());
                    if (parts.length < 3) {
                        await sock.sendMessage(sender, { text: '❌ Format salah!\nContoh: *.pushkontak idgc | Pesan | 1*' });
                        break;
                    }
                    const groupId = parts[0];
                    const message = parts[1];
                    const delay = parseInt(parts[2]) || 1;

                    if (!groupDB[groupId]) {
                        await sock.sendMessage(sender, { text: '❌ ID Grup tidak ditemukan. Jalankan *.cekidgc* dulu.' });
                        break;
                    }

                    try {
                        const metadata = await sock.groupMetadata(groupId);
                        const participants = metadata.participants;
                        let success = 0, fail = 0;

                        await sock.sendMessage(sender, { text: `🚀 Memulai pushkontak ke ${participants.length} anggota dengan delay ${delay} detik...` });

                        for (const p of participants) {
                            const jid = p.id;
                            try {
                                await sock.sendMessage(jid, { text: message });
                                success++;
                                console.log(`✅ Terkirim ke ${jid}`);
                            } catch (e) {
                                fail++;
                                console.log(`❌ Gagal kirim ke ${jid}`);
                            }
                            await new Promise(resolve => setTimeout(resolve, delay * 1000));
                        }

                        await sock.sendMessage(sender, { text: `✅ Pushkontak selesai.\nBerhasil: ${success}\nGagal: ${fail}` });
                    } catch (e) {
                        console.error(e);
                        await sock.sendMessage(sender, { text: '❌ Gagal melakukan pushkontak. Pastikan bot masih di grup.' });
                    }
                    break;
                }

                case 'trxdone': {
                    const parts = args.split('|').map(p => p.trim());
                    if (parts.length < 2) {
                        await sock.sendMessage(sender, { text: '❌ Format salah!\nContoh: *.trxdone Jasteb | 10000*' });
                        break;
                    }
                    const jenis = parts[0];
                    const harga = parts[1];
                    const now = new Date();
                    const tanggal = `${now.getDate()}-${now.getMonth()+1}-${now.getFullYear()}`;
                    const jam = now.toTimeString().split(' ')[0].slice(0,5);

                    const report = `✅ *TRANSAKSI SELESAI*\n\n` +
                                   `JENIS : ${jenis}\n` +
                                   `HARGA : Rp${parseInt(harga).toLocaleString('id-ID')}\n` +
                                   `WAKTU TRX : ${tanggal} ${jam}`;

                    await sock.sendMessage(sender, { text: report });
                    break;
                }

                default:
                    // abaikan jika bukan command titik yang dikenal
                    break;
            }
        }
    });
}

startBot();
