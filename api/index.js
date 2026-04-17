const express = require('express');
const fetch = require('node-fetch'); 
const cors = require('cors'); 
const app = express();

app.use(cors()); 
app.use(express.json());

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const authHeader = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NDI3LCJlbWFpbCI6InBhaGFqaXJvYmxveEBnbWFpbC5jb20iLCJyb2xlIjoidXNlciIsImlhdCI6MTc3NjIyMTA3OSwiZXhwIjoxNzc2ODI1ODc5fQ.-sIPFkMULmUR8wzxPQ3a7TEMIhtQ7oecs6dk4xUOVT8';

app.get('/api/pair', async (req, res) => {
    const nomor = req.query.no;
    const deviceName = req.query.name || 'WACUAN-WA-' + nomor; 
    const modePilihan = req.query.mode || 'off'; 

    if (!nomor) return res.status(400).json({ error: "Nomor WhatsApp tidak terdeteksi." });

    const headers = {
        'accept': '*/*',
        'authorization': authHeader,
        'content-type': 'application/json',
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
    };

    try {
        const reqCreate = await fetch('https://pusatwa.com/api/user/devices', {
            method: 'POST', headers: headers,
            body: JSON.stringify({ name: deviceName })
        });
        const createData = await reqCreate.json();
        const deviceId = createData.id || createData.data?.id;

        if (!deviceId) return res.status(400).json({ error: "Gagal membuat sesi" });

        await delay(1500); 

        await fetch(`https://pusatwa.com/api/user/devices/${deviceId}/scan-qr`, { 
            method: 'POST', headers: headers 
        }).catch(() => {});

        await delay(1000);

        await fetch(`https://pusatwa.com/api/user/devices/${deviceId}/mode`, {
            method: 'PUT', headers: headers, 
            body: JSON.stringify({ mode: modePilihan })
        }).catch(() => {});

        await delay(1500);

        const reqPair = await fetch(`https://pusatwa.com/api/user/devices/${deviceId}/pair`, {
            method: 'POST', headers: headers, 
            body: JSON.stringify({ phone: nomor })
        });
        const pairData = await reqPair.json();

        res.json(pairData);

    } catch (error) {
        res.status(500).json({ error: "Gangguan Gateway API", detail: error.message });
    }
});

app.get('/api/qr', async (req, res) => {
    const deviceName = req.query.name || 'WACUAN-QR-Session';

    const headers = {
        'accept': '*/*',
        'authorization': authHeader,
        'content-type': 'application/json',
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
    };

    try {
        const reqCreate = await fetch('https://pusatwa.com/api/user/devices', {
            method: 'POST', headers: headers,
            body: JSON.stringify({ name: deviceName })
        });
        const createData = await reqCreate.json();
        const deviceId = createData.id || createData.data?.id;

        if (!deviceId) return res.status(400).json({ error: "Gagal membuat sesi" });

        await delay(1500);

        await fetch(`https://pusatwa.com/api/user/devices/${deviceId}/scan-qr`, {
            method: 'POST', headers: headers
        }).catch(() => {});

        await delay(2000); 

        const reqQr = await fetch(`https://pusatwa.com/api/user/devices/${deviceId}/qr`, {
            method: 'GET', headers: headers
        });
        const qrData = await reqQr.json();

        res.json(qrData);

    } catch (error) {
        res.status(500).json({ error: "Gangguan Gateway API", detail: error.message });
    }
});

app.get('/api/devices', async (req, res) => {
    try {
        const response = await fetch('https://pusatwa.com/api/user/devices', {
            method: 'GET',
            headers: { 'accept': '*/*', 'authorization': authHeader }
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Gagal mengambil data perangkat" });
    }
});

app.get('/api/mode', async (req, res) => {
    const deviceId = req.query.id;
    const modePilihan = req.query.mode;

    if (!deviceId || !modePilihan) return res.status(400).json({ error: "Device ID dan Mode wajib diisi" });

    try {
        const response = await fetch(`https://pusatwa.com/api/user/devices/${deviceId}/mode`, {
            method: 'PUT',
            headers: { 'accept': '*/*', 'authorization': authHeader, 'content-type': 'application/json' },
            body: JSON.stringify({ mode: modePilihan })
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Gagal mengubah mode perangkat" });
    }
});

app.get('/api/check-status', async (req, res) => {
    const deviceName = req.query.id; 

    if (!deviceName) return res.status(400).json({ error: "ID Device kosong" });

    try {
        const response = await fetch('https://pusatwa.com/api/user/devices', {
            method: 'GET',
            headers: { 'accept': '*/*', 'authorization': authHeader }
        });
        const data = await response.json();
        const devices = data.data || data; 
        
        if (!Array.isArray(devices)) {
            return res.json({ status: 'pending' });
        }

        const matchedDevice = devices.find(d => d.name === deviceName);

        if (matchedDevice && matchedDevice.status === 'connected') {
            res.json({ status: 'connected', real_id: matchedDevice.id });
        } else {
            res.json({ status: 'pending' });
        }

    } catch (error) {
        res.status(500).json({ error: "Gagal cek status" });
    }
});

module.exports = app;
