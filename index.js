const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// إضافة توجيه للمسار الرئيسي
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


const app = express();
app.use(express.json());
app.use(express.static('public'));

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
        console.log(`Request for key ${key} completed. Status: ${response.status}`);
        return { key, status: response.status, result: response.data };
    } catch (error) {
        console.error(`Error for key ${key}:`, error.message);
        return { key, status: error.response?.status || 500, result: error.message };
    }
}

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

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));

module.exports = app;
