const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

async function getJsonFiles() {
    const jsonDir = path.join(__dirname, 'json_files');
    const files = await fs.readdir(jsonDir);
    return files.filter(file => file.endsWith('.json'));
}

async function sendRequest(key, encodedPlayerName) {
    const url = "https://us-central1-jackaro-2426c.cloudfunctions.net/NudgePlayer/";
    const headers = {
        "Host": "us-central1-jackaro-2426c.cloudfunctions.net",
        "accept": "*/*",
        "content-type": "application/x-www-form-urlencoded",
        "x-unity-version": "2021.3.15f1",
        "user-agent": "Jackaro/252 CFNetwork/1492.0.1 Darwin/23.3.0",
        "accept-language": "ar"
    };
    const data = `otherId=${key}&playerName=${encodedPlayerName}`;

    try {
        const response = await axios.post(url, data, { headers });
        console.log(`Status for key ${key}: ${response.status}`);
        return { key, status: response.status };
    } catch (error) {
        console.error(`Status for key ${key}: ${error.response?.status || 500}`);
        return { key, status: error.response?.status || 500 };
    }
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/json-files', async (req, res) => {
    try {
        const files = await getJsonFiles();
        res.json(files);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get JSON files' });
    }
});

app.post('/send', async (req, res) => {
    const { playerName, jsonFile } = req.body;
    const encodedPlayerName = encodeURIComponent(playerName);

    try {
        const filePath = path.join(__dirname, 'json_files', jsonFile);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const keys = JSON.parse(fileContent);

        const results = await Promise.all(keys.map(key => sendRequest(key, encodedPlayerName)));
        res.json({ message: "تم إرسال الطلبات بنجاح", results });
    } catch (error) {
        res.status(500).json({ error: 'Failed to process requests' });
    }
});

// إضافة معالج للأخطاء
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// تصدير التطبيق
module.exports = app;

// تشغيل الخادم فقط إذا تم تشغيل الملف مباشرة
if (require.main === module) {
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Server running on port ${port}`));
}