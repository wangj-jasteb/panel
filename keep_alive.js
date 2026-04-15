const express = require('express');
const server = express();

server.all('/', (req, res) => {
    res.send(`
    <html>
        <head><title>WANG JASTEB BOT</title></head>
        <body style="background:#0c111d; color:#f5d742; font-family:Inter; display:flex; align-items:center; justify-content:center; height:100vh; margin:0;">
            <div style="text-align:center;">
                <h1 style="font-size:48px;">WANG JASTEB</h1>
                <p>Bot WhatsApp sedang online 🗿</p>
                <p style="color:#65748c;">Prefix: ! | Ketik !menu</p>
            </div>
        </body>
    </html>
    `);
});

function keepAlive() {
    server.listen(3000, () => {
        console.log('[KEEP-ALIVE] Server siap di port 3000');
    });
}

module.exports = keepAlive;
