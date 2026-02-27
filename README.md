# GreenPulse
## AI-Driven Urban Green Intelligence Platform

**Live Demo:** https://greenplanning-a6dfa.web.app/  
**Video Demo:** https://drive.google.com/file/d/1S93h6TX79NPR4tB_Pq41cR8f2YBrizuy/view?usp=sharing  

---

## Overview

GreenPulse is a real-time, AI-powered urban green intelligence platform designed to support sustainable city planning. It integrates live environmental data streaming with AI-driven analysis to help identify high-priority wards for greening and afforestation interventions.

Built for the Hack For Green Bharat hackathon, the project demonstrates how streaming data, spatial analysis, and large language models can be combined into a decision-support system for urban sustainability.

---

## Key Capabilities

### Environmental Priority Analysis
- Computes a multi-factor ward-level priority score
- Factors include population density, PM2.5 levels, temperature, and green cover
- Provides transparent and explainable rankings

### Ward Clustering
- Uses K-Means clustering to group wards with similar environmental stress
- Enables targeted and region-specific planning strategies

### Smart Greening Recommendations
- Evaluates open land parcels based on ward priority
- Considers proximity to existing parks and green spaces
- Highlights high-impact afforestation zones

### Real-Time Data Streaming
- Uses Pathway to stream ward-level data from CSV sources
- Any change in source data is reflected instantly across the system

### AI-Powered Query Interface
- Supports natural-language questions such as:
  - “Which ward needs urgent greening?”
  - “Which areas have high pollution but low green cover?”
- Responses are generated using Groq LLM based on live data

### Interactive Map Visualization
- Built using Leaflet and supporting geospatial libraries
- Toggle between priority view, cluster view, parks, and land-use layers
- Interactive popups for detailed ward-level insights

---

## Technology Stack

### Backend
- Pathway (real-time streaming engine)
- Python
- Flask (REST API and LLM proxy)

### AI and Analytics
- Groq LLM (LLaMA 3.1)
- K-Means clustering

### Frontend
- HTML, CSS, JavaScript
- Leaflet.js
- D3.js
- Turf.js

### Deployment
- Docker
- Firebase Hosting

---
CSV (Streaming Source)
|
v
Pathway (Docker Container)
|
v
Live JSONL Output
|
v
Flask REST API (/wards, /ask)
|
+-----> Groq LLM
|
v
Frontend (Interactive Map + AI Queries)


---

## Running the Project Locally

### Prerequisites
- Python 3.9 or higher
- Docker
- Groq API key (optional; mock mode available)

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/RanjeetKaur14/GreenPlanning-.git
cd GreenPlanning-
Step 2: Configure Environment Variables

Create a .env file in the root directory:

GROQ_API_KEY=your_groq_api_key_here
Step 3: Run the Pathway Streaming Engine
docker build -t greenpulse .
docker run -v "%cd%\data:/app/data" greenpulse

Pathway continuously monitors:

data/ward_priority.csv

and writes live updates to:

data/live_wards.jsonl
Step 4: Start the Flask Server
pip install -r requirements.txt
python mock_server.py

The API runs at:

http://localhost:5000
Step 5: Serve the Frontend
python -m http.server 8001

Open in browser:

http://localhost:8001/map.html
Demonstration
Live Deployment

https://greenplanning-a6dfa.web.app/

(Frontend only, static data)

Full System Demo

https://drive.google.com/file/d/1S93h6TX79NPR4tB_Pq41cR8f2YBrizuy/view?usp=sharing

(Shows real-time updates and AI-powered queries running locally)

Project Structure
.
├── data/
│   ├── ward_priority.csv
│   ├── delhi_wards.geojson
│   ├── parks.geojson
│   └── ...
├── Dockerfile
├── pathway_server.py
├── mock_server.py
├── index.html
├── map.html
├── script.js
├── style.css
├── .env
└── README.md
Team Members

Ranjeet Kaur
GitHub: https://github.com/RanjeetKaur14

Akshat Singh
GitHub: https://github.com/akshatsingh1427

License

This project is licensed under the MIT License.

Acknowledgments

Pathway for real-time data streaming

Groq for low-latency LLM inference

Hack For Green Bharat for the challenge and platform

## System Architecture
