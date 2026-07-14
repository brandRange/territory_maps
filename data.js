// =============================================================
// NTWAABAN BOUNDARY DATA
//
// This is the only file you need to touch when boundaries change.
// Replace `ntwaabanData` with whatever you export from QGIS as
// GeoJSON (Layer -> Export -> Save Features As -> GeoJSON,
// CRS = WGS84 / EPSG:4326).
//
// Each feature needs, at minimum: properties.id (used in ?id=
// links and must be unique), properties.name, properties.block
// (used for colour-coding), properties.description (optional).
// =============================================================

const ntwaabanData = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": { "id": "G4A", "name": "Behind Washing Bay", "block": "Block A", "description": "Behind washing bay" },
      "geometry": { "type": "Polygon", "coordinates": [[
        [ -1.674062570112727, 5.003673564782011, 0.0 ], [ -1.672217835252269, 5.005310937006353, 0.0 ], [ -1.672585132662675, 5.005757917642374, 0.0 ], [ -1.672928038197712, 5.005419295083868, 0.0 ], [ -1.673606424937785, 5.004866228155683, 0.0 ], [ -1.673732838408206, 5.004711204854189, 0.0 ], [ -1.673987594040406, 5.004518594446162, 0.0 ], [ -1.674375197200474, 5.004135653373432, 0.0 ], [ -1.674352631865583, 5.003983727364476, 0.0 ], [ -1.674062570112727, 5.003673564782011, 0.0 ]
      ]] }
    },
    
    

    // ------------------------------------KH--------------------------------------------------
    {
      "type": "Feature",
      "properties": { "id": "KH", "name": "KINGDOM HALL", "block": "Block KH", "description": "Kingdom Hall" },
      "geometry": { "type": "Polygon", "coordinates": [[
        [ -1.677304621349041, 5.001257232164877, 0.0 ], [ -1.677421339456939, 5.001130277851473, 0.0 ], [ -1.677181591857776, 5.000885677097554, 0.0 ], [ -1.677040606186718, 5.001007391928852, 0.0 ], [ -1.677292473990811, 5.001257440395282, 0.0 ], [ -1.677304621349041, 5.001257232164877, 0.0 ]
      ]] }
    }
  ]
};
