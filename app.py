from flask import Flask, request, render_template, jsonify
import json
import asyncio
import aiohttp
import urllib.parse
import os

app = Flask(__name__)

def get_json_files():
    json_dir = os.path.join(os.path.dirname(__file__), 'json_files')
    return [f for f in os.listdir(json_dir) if f.endswith('.json')]

async def send_request(session, key, encoded_player_name):
    url = "https://us-central1-jackaro-2426c.cloudfunctions.net/NudgePlayer/"
    headers = {
        "Host": "us-central1-jackaro-2426c.cloudfunctions.net",
        "accept": "*/*",
        "content-type": "application/x-www-form-urlencoded",
        "x-unity-version": "2021.3.15f1",
        "user-agent": "Jackaro/252 CFNetwork/1492.0.1 Darwin/23.3.0",
        "accept-language": "ar"
    }
    data = f"otherId={key}&playerName={encoded_player_name}"
    
    async with session.post(url, headers=headers, data=data) as response:
        result = await response.text()
        print(f"Request for key {key} completed. Status: {response.status}")
        return key, response.status, result

async def process_requests(player_name, json_file):
    file_path = os.path.join(os.path.dirname(__file__), 'json_files', json_file)
    with open(file_path, 'r', encoding='utf-8') as file:
        keys = json.load(file)
    
    encoded_player_name = urllib.parse.quote(player_name)
    
    async with aiohttp.ClientSession() as session:
        tasks = []
        for key in keys:
            task = asyncio.ensure_future(send_request(session, key, encoded_player_name))
            tasks.append(task)
        
        results = await asyncio.gather(*tasks)
    
    return results

@app.route('/')
def index():
    json_files = get_json_files()
    return render_template('index.html', json_files=json_files)

@app.route('/send', methods=['POST'])
def send():
    player_name = request.json['playerName']
    json_file = request.json['jsonFile']
    
    # استخدام asyncio بطريقة متوافقة مع Flask
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    results = loop.run_until_complete(process_requests(player_name, json_file))
    loop.close()
    
    return jsonify({"message": "تم إرسال الطلبات بنجاح", "results": str(results)})

# هذا السطر مطلوب لـ Vercel
app = app

if __name__ == "__main__":
    app.run(debug=True)