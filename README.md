# GreenPulse
## AI-Driven Urban Green Intelligence Platform

GreenPulse is a real-time, AI-powered urban green intelligence platform designed to support data-driven sustainable city planning. It integrates live environmental data streaming, AI-based analysis, and interactive geospatial visualization to identify high-priority urban wards for greening and afforestation.

Built for the Hack For Green Bharat hackathon, the project demonstrates how streaming data pipelines, spatial analytics, and large language models can be combined into a practical decision-support system for urban sustainability.

---

## Live and Demo Links

Live Demo (Frontend)  
https://greenplanning-a6dfa.web.app/

Full System Video Demo (Streaming + AI)  
https://drive.google.com/file/d/1S93h6TX79NPR4tB_Pq41cR8f2YBrizuy/view?usp=sharing

---

## Key Features and Capabilities

### Environmental Priority Analysis
- Computes a multi-factor ward-level priority score
- Factors include population density, PM2.5 levels, temperature, and green cover
- Provides transparent and explainable rankings

### Ward Clustering
- Uses K-Means clustering to group wards with similar environmental stress
- Enables region-specific and targeted greening strategies

### Smart Greening Recommendations
- Evaluates open land parcels based on ward priority
- Considers proximity to existing parks and green spaces
- Highlights high-impact afforestation zones

### Real-Time Data Streaming
- Powered by Pathway
- Streams ward-level data directly from CSV sources
- Any change in source data is reflected instantly across the system

### AI-Powered Query Interface
- Supports natural-language questions such as:
  - Which ward needs urgent greening?
  - Which areas have high pollution but low green cover?
- Responses are generated using Groq LLM based on live data

### Interactive Map Visualization
- Built using Leaflet.js
- Toggle between priority view, cluster view, parks, and land-use layers
- Interactive popups provide detailed ward-level insights

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

## System Architecture

GreenPulse follows a streaming-first architecture that connects live environmental data to AI-driven insights and interactive visualization.

Ward-level environmental data is stored in CSV files, which act as the streaming source. These files are continuously monitored by the Pathway engine running inside a Docker container. Whenever the data changes, Pathway processes the updates in real time and outputs structured data in JSON Lines format.

This live data is consumed by a Flask-based REST API that exposes endpoints for ward data and AI queries. The API also forwards natural-language questions to the Groq LLM, ensuring responses are generated using the most recent environmental data.

The frontend application communicates with the Flask API to fetch live ward metrics and AI-generated insights. An interactive map built with Leaflet visualizes ward priorities, clusters, parks, and land-use layers.

---

## Running the Project Locally

### Prerequisites
- Python 3.9 or higher
- Docker
- Groq API key (optional; mock mode available)

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/RanjeetKaur14/GreenPriority.git
cd GreenPriority
```

## Step 2: Configure Environment Variables

Create a `.env` file in the root directory and add:

```bash
GROQ_API_KEY=your_groq_api_key_here
```
### Step 3: Run the Pathway Streaming Engine
```bash
docker build -t greenpulse .
docker run -v "%cd%\data:/app/data" greenpulse
```
### Step 4: Start the Flask Server
```bash
pip install -r requirements.txt
python mock_server.py
```
The API runs at:
http://localhost:5000
### Step 5: Serve the Frontend
```bash
python -m http.server 8001
```
http://localhost:8001/map.html

### Project Structure
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

### Team Members

Ranjeet Kaur
https://github.com/RanjeetKaur14

Sriza Goel
https://github.com/SrizaGoel

Akshat Singh
https://github.com/akshatsingh1427

Lavnaya Tomar
https://github.com/lavanyatomarr

### License

This project is licensed under the MIT License.

### Acknowledgments

Pathway for real-time data streaming
Groq for low-latency LLM inference
Hack For Green Bharat for the challenge and platform
