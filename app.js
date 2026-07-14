// =============================================================
// NTWAABAN MAP — app logic
// Depends on: Leaflet (loaded in index.html), ntwaabanData (data.js)
// =============================================================

const params = new URLSearchParams(window.location.search);
const requestedId = params.get('id');
const restrictedMode = !!requestedId;

// In restricted mode, only the requested feature is ever loaded onto the
// map or into the DOM — not just hidden via CSS. Note this is a
// presentational restriction, not real access control: the full dataset
// still lives in data.js, so it's suitable for "point someone at their
// own block" but not for confidential/sensitive boundaries.
const dataToLoad = restrictedMode
  ? { type: 'FeatureCollection', features: ntwaabanData.features.filter(f => f.properties.id === requestedId) }
  : ntwaabanData;

const map = L.map('map', { zoomControl: false }).setView([6.001, -1.747], 15);

// maxZoom = how far the MAP will let you zoom.
// maxNativeZoom = how far the TILE SERVER actually has imagery.
// Beyond maxNativeZoom, Leaflet stretches the last real tile instead of
// requesting one that doesn't exist (that request-for-nothing produced
// the old "map data not available" tile).
const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 22, maxNativeZoom: 19, attribution: '© OpenStreetMap contributors'
});

const satLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 22, maxNativeZoom: 18, attribution: 'Esri World Imagery'
});

// Default basemap is satellite.
let satelliteOn = true;
satLayer.addTo(map);
document.getElementById('satelliteBtn').textContent = '🗺'; // shows the OTHER option you can switch to

// --- Colour by block ---
const blockColors = {
  'Block A': '#1a73e8',
  'Block B': '#34a853',
  'Block C': '#fbbc04',
  'Block D': '#a142f4',
  'Block KH': '#ea4335'
};
function styleForBlock(block) {
  const c = blockColors[block] || '#1a73e8';
  return { color: c, weight: 3, fillOpacity: 0 }; // outline-only until selected
}
const highlightStyle = { color: '#ff3d00', weight: 3, fillColor: '#da9a87', fillOpacity: 0.28 };

const geoLayer = L.geoJSON(dataToLoad, {
  style: f => styleForBlock(f.properties.block)
}).addTo(map);

// --- Zoom-dependent permanent labels ---
geoLayer.eachLayer(l => {
  l.bindTooltip(l.feature.properties.id, {
    permanent: true, direction: 'center', className: 'area-label'
  });
});
function updateLabelVisibility() {
  const show = map.getZoom() >= 17;
  geoLayer.eachLayer(l => { show ? l.openTooltip() : l.closeTooltip(); });
}
map.on('zoomend', updateLabelVisibility);
updateLabelVisibility();

let selectedLayer = null;
let userMarker = null;
let userLatLng = null;
let nearestMarker = null;
let watchId = null;
let lastDistanceMeters = null;

// --- Area switcher panel ---
const topbar = document.getElementById('topbar');
const areaPanel = document.getElementById('areaPanel');
const areaList = document.getElementById('areaList');
const areaSearch = document.getElementById('areaSearch');

function renderAreaList(filter) {
  areaList.innerHTML = '';
  const q = (filter || '').toLowerCase();
  dataToLoad.features
    .filter(f => !q || f.properties.id.toLowerCase().includes(q) || f.properties.name.toLowerCase().includes(q))
    .forEach(f => {
      const btn = document.createElement('button');
      btn.className = 'area-item';
      const dot = document.createElement('span');
      dot.className = 'dot';
      dot.style.background = (blockColors[f.properties.block] || '#1a73e8');
      const label = document.createElement('span');
      label.className = 'name';
      label.innerHTML = '<b>' + f.properties.id + '</b> — ' + f.properties.name;
      btn.appendChild(dot);
      btn.appendChild(label);
      btn.addEventListener('click', () => {
        selectArea(f.properties.id, true);
        closePanel();
      });
      areaList.appendChild(btn);
    });
}

function openPanel() {
  areaPanel.classList.add('open');
  topbar.classList.add('open');
  areaSearch.value = '';
  renderAreaList('');
  setTimeout(() => areaSearch.focus(), 150);
}
function closePanel() {
  areaPanel.classList.remove('open');
  topbar.classList.remove('open');
}

if (restrictedMode) {
  // Single-block link: no switcher, no browsing to other areas.
  // The topbar becomes a plain, non-interactive info display.
  areaPanel.style.display = 'none';
  topbar.style.cursor = 'default';
  topbar.querySelector('.chev').style.display = 'none';
} else {
  renderAreaList('');
  areaSearch.addEventListener('input', () => renderAreaList(areaSearch.value));
  topbar.addEventListener('click', () => {
    areaPanel.classList.contains('open') ? closePanel() : openPanel();
  });
}

function findFeatureLayer(id) {
  let found = null;
  geoLayer.eachLayer(l => { if (l.feature.properties.id === id) found = l; });
  return found;
}

function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const s = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
function formatDistance(m) {
  return m < 1000 ? Math.round(m) + 'm' : (m / 1000).toFixed(2) + 'km';
}

function updateSubtitle() {
  if (!selectedLayer) return;
  const p = selectedLayer.feature.properties;
  const parts = [p.block, p.description].filter(Boolean);
  if (lastDistanceMeters !== null) parts.push(formatDistance(lastDistanceMeters) + ' to boundary');
  document.getElementById('areaSub').textContent = parts.join(' · ');
}

function selectArea(id, updateUrl) {
  if (selectedLayer) selectedLayer.setStyle(styleForBlock(selectedLayer.feature.properties.block));

  const layer = findFeatureLayer(id);
  const nameEl = document.getElementById('areaName');
  const subEl = document.getElementById('areaSub');
  const navBtn = document.getElementById('navigateBtn');

  if (!layer) {
    nameEl.textContent = 'Area not found: ' + id;
    subEl.textContent = '';
    navBtn.style.display = 'none';
    return;
  }

  layer.setStyle(highlightStyle);
  selectedLayer = layer;
  lastDistanceMeters = null;
  map.fitBounds(layer.getBounds(), { padding: [60, 60], maxZoom: 18 });

  const p = layer.feature.properties;
  nameEl.textContent = p.name || p.id;

  if (userLatLng) {
    const nearest = nearestPointOnPolygon(userLatLng, layer);
    if (nearest) {
      lastDistanceMeters = haversineMeters(userLatLng, nearest);
      if (nearestMarker) map.removeLayer(nearestMarker);
      nearestMarker = L.circleMarker(nearest, {
        radius: 7, color: '#fff', weight: 2, fillColor: '#fbbc04', fillOpacity: 1
      }).addTo(map);
    }
  }
  updateSubtitle();

  navBtn.style.display = 'flex';
  navBtn.onclick = () => navigateTo(layer);

  if (updateUrl) {
    const url = new URL(window.location);
    url.searchParams.set('id', id);
    window.history.replaceState({}, '', url);
  }
}

function closestPointOnSegment(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { pt: a, dist: Math.hypot(p[0] - a[0], p[1] - a[1]) };
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const pt = [a[0] + t * dx, a[1] + t * dy];
  return { pt, dist: Math.hypot(p[0] - pt[0], p[1] - pt[1]) };
}

function nearestPointOnPolygon(userLatLng, layer) {
  const geom = layer.feature.geometry;
  const rings = geom.type === 'Polygon' ? geom.coordinates : geom.coordinates.flat();
  const p = [userLatLng[1], userLatLng[0]];

  let best = null;
  rings.forEach(ring => {
    for (let i = 0; i < ring.length - 1; i++) {
      const res = closestPointOnSegment(p, ring[i], ring[i + 1]);
      if (!best || res.dist < best.dist) best = res;
    }
  });
  return best ? [best.pt[1], best.pt[0]] : null;
}

function navigateTo(layer) {
  let destination = layer.getBounds().getCenter();

  if (userLatLng) {
    const nearest = nearestPointOnPolygon(userLatLng, layer);
    if (nearest) destination = { lat: nearest[0], lng: nearest[1] };
  }

  const url = 'https://www.google.com/maps/dir/?api=1&destination=' + destination.lat + ',' + destination.lng;
  window.open(url, '_blank');
}

// --- Live GPS tracking (toggle on/off) ---
function onPosition(pos) {
  const first = (userLatLng === null);
  userLatLng = [pos.coords.latitude, pos.coords.longitude];

  if (userMarker) map.removeLayer(userMarker);
  userMarker = L.circleMarker(userLatLng, {
    radius: 8, color: '#fff', weight: 2, fillColor: '#4285f4', fillOpacity: 1
  }).addTo(map);

  if (selectedLayer) {
    const nearest = nearestPointOnPolygon(userLatLng, selectedLayer);
    if (nearest) {
      lastDistanceMeters = haversineMeters(userLatLng, nearest);
      if (nearestMarker) map.removeLayer(nearestMarker);
      nearestMarker = L.circleMarker(nearest, {
        radius: 7, color: '#fff', weight: 2, fillColor: '#fbbc04', fillOpacity: 1
      }).addTo(map);
      updateSubtitle();
    }
  } else if (first) {
    map.setView(userLatLng, 17);
  }
}

document.getElementById('locateBtn').addEventListener('click', () => {
  const btn = document.getElementById('locateBtn');
  if (!navigator.geolocation) {
    alert('Geolocation not supported on this device/browser.');
    return;
  }
  if (watchId === null) {
    watchId = navigator.geolocation.watchPosition(onPosition, err => {
      alert('Could not get location: ' + err.message);
    }, { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 });
    btn.classList.add('active');
  } else {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
    btn.classList.remove('active');
  }
});

// --- Basemap toggle ---
document.getElementById('satelliteBtn').addEventListener('click', () => {
  satelliteOn = !satelliteOn;
  if (satelliteOn) {
    map.removeLayer(streetLayer);
    satLayer.addTo(map);
    document.getElementById('satelliteBtn').textContent = '🗺';
  } else {
    map.removeLayer(satLayer);
    streetLayer.addTo(map);
    document.getElementById('satelliteBtn').textContent = '🛰';
  }
});

document.getElementById('fullscreenBtn').addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen();
  }
});

// --- Initial state ---
if (requestedId) {
  selectArea(requestedId, false);
} else {
  document.getElementById('areaName').textContent = 'Ntwaaban';
  document.getElementById('areaSub').textContent = 'Tap to choose an area';
  map.fitBounds(geoLayer.getBounds(), { padding: [40, 40] });
}
