// ================= CONFIGURATION =================
const MAP_CENTER = [28.6139, 77.2090];
const MAP_ZOOM = 11;

const PRIORITY_COLORS = { 'Low': '#1a9850', 'Medium': '#fee08b', 'High': '#d73027' };
const CLUSTER_COLORS = ['#1f78b4', '#33a02c', '#e31a23'];
const LANDUSE_COLORS = { residential: '#9ecae1', commercial: '#fdae6b', industrial: '#bdbdbd' };

// ================= MAP SETUP =================
const map = L.map('map').setView(MAP_CENTER, MAP_ZOOM);

const baseMaps = {
  "Street": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }),
  "Satellite": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: '© Esri' }),
  "Light Gray": L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: '© CartoDB' })
};
baseMaps.Street.addTo(map);

const wardPriorityLayer = L.layerGroup().addTo(map);
const wardClusterLayer = L.layerGroup();
const potentialLayer = L.layerGroup().addTo(map);
const parksLayer = L.layerGroup().addTo(map);
const landUseLayer = L.layerGroup().addTo(map);

let wardData = {};
let wardGeoJson = null;
let parksGeoJson = null;

// ================= LOAD ALL DATA =================
// ================= LOAD ALL DATA =================
// Fetch live ward data from Pathway
async function fetchLiveWardData() {
  const response = await fetch('http://localhost:5000/v1/tables/wards/');
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const rows = await response.json();
  const wardData = {};
  rows.forEach(row => {
    const key = row.ward_name.trim().toLowerCase().replace(/\s+/g, ' ');
    wardData[key] = {
      population: +row.Population,
      pm25: +row.PM25,
      temp: +row.Avg_Temp,
      green: +row.Green_Are,
      openLand: +row.Open_Land,
      priorityScore: +row.Priority_Sci,
      priorityLevel: row.Priority_Level
    };
  });
  console.log('Live ward data loaded:', Object.keys(wardData).length, 'wards');
  return wardData;
}

// Load all GeoJSON files (these are static – no change)
Promise.all([
  fetchLiveWardData(),
  fetch("data/delhi_wards.geojson").then(res => res.json()),
  fetch("data/open_potential_land.geojson").then(res => res.json()),
  fetch("data/parks.geojson").then(res => res.json()),
  fetch("data/residential_commercial_industrial.geojson").then(res => res.json())
]).then(([liveWardData, wardsGeo, potentialGeo, parksGeo, landuseGeo]) => {

  // Assign live data to global wardData
  wardData = liveWardData;

  // ----- K‑Means Clustering (using live data) -----
  const wardKeys = Object.keys(wardData);
  const features = wardKeys.map(key => {
    const d = wardData[key];
    return [ d.pm25 / 200, d.population / 200000, d.temp / 40, d.green / 20 ];
  });
  const kmeans = skmeans(features, 3);
  kmeans.idxs.forEach((clusterIdx, i) => {
    wardData[wardKeys[i]].cluster = clusterIdx;
  });
  console.log('Clustering done – 3 clusters');

  // Store GeoJSON references
  wardGeoJson = wardsGeo;
  parksGeoJson = parksGeo;

  // Score potential land (AI Level 3) – requires turf
  if (typeof turf !== 'undefined') {
    scorePotentialLand(potentialGeo);
  } else {
    console.error('Turf.js not loaded – cannot score potential land');
    loadPotentialLandFallback(potentialGeo);
  }

  // Load all layers
  loadWards(wardsGeo);
  loadParks(parksGeo);
  loadLandUse(landuseGeo);
  addMapControls();

}).catch(error => {
  console.error("Error loading data:", error);
  alert("Failed to load map data. Check console for details.");
});

// ================= HELPER =================
function getWardData(feature) {
  const props = feature.properties;
  const wardName = props.ward_name || props.WARD_NAME || props.name || props.Ward_Name || props.WardName || '';
  if (!wardName) return null;
  const key = wardName.trim().toLowerCase().replace(/\s+/g, ' ');
  return wardData[key];
}

// ================= AI SCORING FOR POTENTIAL LAND =================
function scorePotentialLand(geojson) {
  if (!wardGeoJson || !parksGeoJson) {
    console.warn('Ward or park data not ready for scoring');
    return;
  }

  // Pre‑compute ward polygons with data
  const wards = [];
  wardGeoJson.features.forEach(f => {
    const data = getWardData(f);
    if (!data) return;

    try {
      let poly;
      if (f.geometry.type === 'Polygon') {
        poly = turf.polygon(f.geometry.coordinates);
      } else if (f.geometry.type === 'MultiPolygon') {
        poly = turf.multiPolygon(f.geometry.coordinates);
      } else {
        return;
      }
      wards.push({ poly, data });
    } catch (e) {
      console.warn('Skipping ward due to geometry error', e);
    }
  });

  // Pre‑compute park points
  const parkPoints = [];
  parksGeoJson.features.forEach(f => {
    if (!f.geometry) return;
    try {
      if (f.geometry.type === 'Point') {
        parkPoints.push(turf.point(f.geometry.coordinates));
      } else if (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon') {
        parkPoints.push(turf.centroid(f));
      }
    } catch (e) {
      // ignore
    }
  });

  const scoredFeatures = [];

  geojson.features.forEach(feature => {
    if (!feature.geometry) return;

    try {
      let centroid;
      if (feature.geometry.type === 'Point') {
        centroid = turf.point(feature.geometry.coordinates);
      } else if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
        centroid = turf.centroid(feature);
      } else {
        return;
      }

      // Find containing ward
      let population = 0, wardPriority = 0;
      for (let w of wards) {
        if (turf.booleanPointInPolygon(centroid, w.poly)) {
          population = w.data.population;
          wardPriority = w.data.priorityScore;
          break;
        }
      }

      // Distance to nearest park
      let minDist = Infinity;
      parkPoints.forEach(p => {
        const d = turf.distance(centroid, p);
        if (d < minDist) minDist = d;
      });
      const distScore = minDist === Infinity ? 0 : Math.max(0, 1 - (minDist / 5));

      const popNorm = Math.min(population / 200000, 1);
      const totalScore = 0.5 * wardPriority + 0.3 * popNorm + 0.2 * distScore;

      feature.properties = feature.properties || {};
      feature.properties.aiScore = totalScore;
      feature.properties.population = population;
      feature.properties.wardPriority = wardPriority;

      scoredFeatures.push(feature);
    } catch (e) {
      console.warn('Error scoring potential feature', e);
    }
  });

  if (scoredFeatures.length === 0) {
    console.warn('No scored potential land features to display');
    return;
  }

  console.log(`Displaying ${scoredFeatures.length} recommended sites`);

  // Add to map with improved visibility
  L.geoJSON({ type: 'FeatureCollection', features: scoredFeatures }, {
    style: feature => {
      const score = feature.properties.aiScore || 0;
      const color = score > 0.7 ? '#006837' :
                    score > 0.4 ? '#31a354' :
                    score > 0.2 ? '#78c679' : '#ffffb2';
      return { fillColor: color, color: '#000', weight: 1.5, fillOpacity: 0.7 };
    },
    pointToLayer: (feature, latlng) => {
      const score = feature.properties.aiScore || 0;
      const color = score > 0.7 ? '#006837' :
                    score > 0.4 ? '#31a354' :
                    score > 0.2 ? '#78c679' : '#ffffb2';
      return L.circleMarker(latlng, { radius: 8, fillColor: color, color: '#000', weight: 1.5, fillOpacity: 0.9 });
    },
    onEachFeature: (feature, layer) => {
      const p = feature.properties;
      layer.bindPopup(`
        <b>Potential Green Zone</b><br>
        AI Recommendation Score: ${(p.aiScore * 100).toFixed(1)}%<br>
        Population in ward: ${p.population?.toLocaleString() || 'N/A'}<br>
        Ward priority: ${p.wardPriority?.toFixed(3) || 'N/A'}
      `);
    }
  }).addTo(potentialLayer);
}

// ================= FALLBACK if Turf not loaded =================
function loadPotentialLandFallback(geojson) {
  L.geoJSON(geojson, {
    style: {
      fillColor: '#90ee90',
      color: 'transparent',
      weight: 0,
      fillOpacity: 0.3
    },
    pointToLayer: (feature, latlng) => {
      return L.circleMarker(latlng, {
        radius: 4,
        fillColor: '#90ee90',
        color: 'transparent',
        weight: 0,
        fillOpacity: 0.4
      });
    }
  }).addTo(potentialLayer);
}

// ================= WARD LAYERS =================
function loadWards(geojson) {
  // Priority layer
  L.geoJSON(geojson, {
    style: feature => {
      const d = getWardData(feature);
      return {
        fillColor: d ? PRIORITY_COLORS[d.priorityLevel] : '#cccccc',
        color: '#333',
        weight: 1.2,
        fillOpacity: 0.7
      };
    },
    onEachFeature: attachWardEvents
  }).addTo(wardPriorityLayer);

  // Cluster layer (hidden initially)
  L.geoJSON(geojson, {
    style: feature => {
      const d = getWardData(feature);
      return {
        fillColor: d ? CLUSTER_COLORS[d.cluster] : '#cccccc',
        color: '#333',
        weight: 1.2,
        fillOpacity: 0.7
      };
    },
    onEachFeature: attachWardEvents
  }).addTo(wardClusterLayer);
}

function attachWardEvents(feature, layer) {
  const d = getWardData(feature);
  if (!d) return;

  const wardName = feature.properties.ward_name || feature.properties.WardName || 'Unknown';
  layer.bindPopup(`
    <b>${wardName}</b><br>
    Population: ${d.population.toLocaleString()}<br>
    PM2.5: ${d.pm25}<br>
    Avg Temp: ${d.temp} °C<br>
    Green Cover: ${d.green}%<br>
    Priority Score: ${d.priorityScore.toFixed(3)} (${d.priorityLevel})<br>
    Cluster: ${d.cluster !== undefined ? d.cluster : 'N/A'}
  `);

  layer.on('mouseover', function() {
    this.setStyle({ weight: 3, color: '#333', fillOpacity: 0.8 });
    this.bringToFront();
    document.getElementById('info-content').innerHTML = `
      <b>${wardName}</b><br>
      Priority: ${d.priorityLevel}<br>
      PM2.5: ${d.pm25}<br>
      Green: ${d.green}%
    `;
    document.getElementById('info-panel').style.display = 'block';
  });

  layer.on('mouseout', function() {
    this.setStyle({ weight: 1.2, color: '#333', fillOpacity: 0.7 });
    document.getElementById('info-panel').style.display = 'none';
  });
}

// ================= PARKS =================
function loadParks(geojson) {
  L.geoJSON(geojson, {
    style: { fillColor: '#2e7d32', color: '#1b5e20', weight: 1.5, fillOpacity: 0.5 },
    pointToLayer: (feature, latlng) => L.circleMarker(latlng, { radius: 6, fillColor: '#2e7d32', color: '#1b5e20', weight: 1, fillOpacity: 0.8 }),
    onEachFeature: (feature, layer) => {
      const name = feature.properties.name || feature.properties.NAME || 'Park';
      layer.bindPopup(`<b>${name}</b>`);
    }
  }).addTo(parksLayer);
}

// ================= LAND USE =================
function loadLandUse(geojson) {
  L.geoJSON(geojson, {
    style: feature => ({
      fillColor: LANDUSE_COLORS[feature.properties.landuse] || '#dddddd',
      color: '#666',
      weight: 0.8,
      fillOpacity: 0.4
    }),
    onEachFeature: (feature, layer) => {
      const type = feature.properties.landuse || 'unknown';
      layer.bindPopup(`Land use: <b>${type}</b>`);
    }
  }).addTo(landUseLayer);
}

// ================= CONTROLS =================
function addMapControls() {
  L.control.scale({ imperial: false, metric: true }).addTo(map);

  const legend = L.control({ position: 'bottomright' });
  legend.onAdd = function() {
    const div = L.DomUtil.create('div', 'legend');
    div.innerHTML = `
      <h4>Ward Priority</h4>
      <i style="background: ${PRIORITY_COLORS.Low};"></i> Low<br>
      <i style="background: ${PRIORITY_COLORS.Medium};"></i> Medium<br>
      <i style="background: ${PRIORITY_COLORS.High};"></i> High<br>
      <hr>
      <h4>Ward Clusters (K‑Means)</h4>
      <i style="background: ${CLUSTER_COLORS[0]};"></i> Cluster 0<br>
      <i style="background: ${CLUSTER_COLORS[1]};"></i> Cluster 1<br>
      <i style="background: ${CLUSTER_COLORS[2]};"></i> Cluster 2<br>
      <hr>
      <i style="background: #2e7d32; border-radius: 50%; width: 12px; height: 12px; margin-right: 10px;"></i> Parks / Green
    `;
    return div;
  };
  legend.addTo(map);

  L.control.layers(baseMaps, {
    "Ward Priority (Score)": wardPriorityLayer,
    "Ward Clusters": wardClusterLayer,
    "Recommended Sites": potentialLayer,
    "Existing Green Spaces": parksLayer,
    "Urban Land Use": landUseLayer
  }, { collapsed: false }).addTo(map);
}