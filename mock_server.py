from flask import Flask, jsonify, request
from flask_cors import CORS
import csv
import os
import json
from dotenv import load_dotenv
import openai

load_dotenv()
app = Flask(__name__)
CORS(app)

# Path to the JSONL file written by Pathway
PATHWAY_JSONL = "data/live_wards.jsonl"

def load_ward_data_from_pathway():
    """Read live data from Pathway's JSONL output."""
    try:
        data = []
        with open(PATHWAY_JSONL, 'r') as f:
            for line in f:
                data.append(json.loads(line))
        return data
    except Exception as e:
        print(f"Error reading Pathway JSONL: {e}")
        return None

def load_csv_data_fallback():
    """Fallback: read CSV directly if Pathway is unavailable."""
    data = []
    with open('data/ward_priority.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            for key in ['Population', 'PM25', 'Avg_Temp', 'Green_Are', 'Open_Land', 'Priority_Sci']:
                row[key] = float(row[key]) if row[key] else 0.0
            data.append(row)
    return data

def get_ward_data():
    """Primary: try Pathway JSONL, fallback to CSV."""
    data = load_ward_data_from_pathway()
    if data is not None:
        print("Using live data from Pathway")
        return data
    else:
        print("Pathway unavailable, using fallback CSV")
        return load_csv_data_fallback()

@app.route('/v1/tables/wards/', methods=['GET'])
def get_wards():
    return jsonify(get_ward_data())

@app.route('/v1/tables/highest_priority/', methods=['GET'])
def get_highest_priority():
    data = get_ward_data()
    if not data:
        return jsonify({})
    highest = max(data, key=lambda x: x['Priority_Sci'])
    return jsonify(highest)

@app.route('/v1/query/ask', methods=['POST'])
def ask_llm():
    req = request.get_json()
    question = req.get('query') or req.get('question') or ''
    
    wards = get_ward_data()
    if not wards:
        return jsonify({"result": "No ward data available."})
    
    highest = max(wards, key=lambda w: w['Priority_Sci'])
    top_wards = sorted(wards, key=lambda w: w['Priority_Sci'], reverse=True)[:3]
    summary = "Current ward data (top 3 by priority score):\n"
    for w in top_wards:
        summary += f"- {w['ward_name']}: Priority Score {w['Priority_Sci']:.3f} (PM2.5: {w['PM25']}, Green Cover: {w['Green_Are']}%)\n"
    summary += f"Highest priority ward: {highest['ward_name']} with score {highest['Priority_Sci']:.3f}.\n"
    
    groq_key = os.getenv('GROQ_API_KEY')
    if groq_key:
        try:
            client = openai.OpenAI(
                api_key=groq_key,
                base_url="https://api.groq.com/openai/v1"
            )
            response = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": f"You are an urban planning assistant with access to live ward data. Use the following data to answer questions.\n\n{summary}"},
                    {"role": "user", "content": question}
                ],
                max_tokens=200
            )
            answer = response.choices[0].message.content
            return jsonify({"result": answer})
        except Exception as e:
            return jsonify({"result": f"Groq error: {e}. Using fallback: Based on current data, {summary}"})
    else:
        return jsonify({"result": f"[Mock] Based on current data: {summary} Your question: '{question}'"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)