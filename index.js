const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// تخزين حالة المهام (في الذاكرة، يمكن استبدالها بقاعدة بيانات)
const tasks = {};

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
        return { key, status: response.status, result: response.data };
    } catch (error) {
        return { key, status: error.response?.status || 500, result: error.message };
    }
}

async function processInBackground(taskId, playerName, jsonFile) {
    try {
        const filePath = path.join(__dirname, 'json_files', jsonFile);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const keys = JSON.parse(fileContent);
        
        for (let i = 0; i < keys.length; i++) {
            await sendRequest(keys[i], playerName);
            tasks[taskId].progress = Math.round((i + 1) / keys.length * 100);
            tasks[taskId].processedRequests = i + 1;
            tasks[taskId].totalRequests = keys.length;
        }
        
        tasks[taskId].status = 'completed';
    } catch (error) {
        tasks[taskId].status = 'error';
        tasks[taskId].error = error.message;
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

app.post('/start-task', async (req, res) => {
    const { playerName, jsonFile } = req.body;
    const taskId = uuidv4();
    
    tasks[taskId] = { status: 'running', progress: 0, processedRequests: 0, totalRequests: 0 };
    
    // بدء المعالجة في الخلفية
    processInBackground(taskId, playerName, jsonFile);
    
    res.json({ taskId, message: "تم بدء المهمة" });
});

app.get('/task-status/:taskId', (req, res) => {
    const { taskId } = req.params;
    const task = tasks[taskId];
    if (task) {
        res.json(task);
    } else {
        res.status(404).json({ error: "المهمة غير موجودة" });
    }
});

module.exports = app;

if (require.main === module) {
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Server running on port ${port}`));
}