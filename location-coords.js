/**
 * Precise Location Coordinates for Sages
 * Hebrew locations mapped to lat/lng
 */

const LOCATION_COORDS = {
  // Israel
  'ירושלים': { lat: 31.768, lng: 35.214, name: 'Jerusalem' },
  'Jerusalem': { lat: 31.768, lng: 35.214, name: 'Jerusalem' },
  'צפון': { lat: 33.0, lng: 35.5, name: 'North Israel' },
  'דרום': { lat: 31.0, lng: 34.8, name: 'South Israel' },
  'יריחו': { lat: 31.861, lng: 35.447, name: 'Jericho' },
  'טבריה': { lat: 32.789, lng: 35.535, name: 'Tiberias' },
  'צפת': { lat: 32.968, lng: 35.497, name: 'Safed' },
  'עכו': { lat: 32.923, lng: 35.087, name: 'Acre' },
  'חברון': { lat: 31.539, lng: 35.207, name: 'Hebron' },
  'קיסריה': { lat: 32.879, lng: 35.086, name: 'Caesarea' },
  'לוד': { lat: 31.948, lng: 35.144, name: 'Lod' },

  // Diaspora - Babylon & Levant
  'בבל': { lat: 33.313, lng: 44.361, name: 'Babylon' },
  'Babylon': { lat: 33.313, lng: 44.361, name: 'Babylon' },
  'בגדד': { lat: 33.313, lng: 44.361, name: 'Baghdad' },
  'Baghdad': { lat: 33.313, lng: 44.361, name: 'Baghdad' },
  'חלב': { lat: 36.202, lng: 37.167, name: 'Aleppo' },
  'Aleppo': { lat: 36.202, lng: 37.167, name: 'Aleppo' },

  // Egypt
  'מצרים': { lat: 30.044, lng: 31.234, name: 'Egypt' },
  'Egypt': { lat: 30.044, lng: 31.234, name: 'Egypt' },
  'אלכסנדריה': { lat: 31.203, lng: 29.917, name: 'Alexandria' },
  'Alexandria': { lat: 31.203, lng: 29.917, name: 'Alexandria' },
  'קהיר': { lat: 30.044, lng: 31.234, name: 'Cairo' },

  // Greece
  'יוון': { lat: 37.774, lng: 25.131, name: 'Greece' },
  'Greece': { lat: 37.774, lng: 25.131, name: 'Greece' },
  'אתונה': { lat: 37.974, lng: 23.738, name: 'Athens' },
  'Athens': { lat: 37.974, lng: 23.738, name: 'Athens' },

  // Rome
  'רומא': { lat: 41.903, lng: 12.496, name: 'Rome' },
  'Rome': { lat: 41.903, lng: 12.496, name: 'Rome' },
  'איטליה': { lat: 41.872, lng: 12.567, name: 'Italy' },
  'Italy': { lat: 41.872, lng: 12.567, name: 'Italy' },

  // Spain & North Africa
  'ספרד': { lat: 40.463, lng: -3.750, name: 'Spain' },
  'Spain': { lat: 40.463, lng: -3.750, name: 'Spain' },
  'קורדובה': { lat: 37.891, lng: -4.779, name: 'Cordoba' },
  'Cordoba': { lat: 37.891, lng: -4.779, name: 'Cordoba' },
  'סאוטה': { lat: 35.889, lng: -5.310, name: 'Ceuta' },
  'Ceuta': { lat: 35.889, lng: -5.310, name: 'Ceuta' },

  // France
  'צרפת': { lat: 46.227, lng: 2.213, name: 'France' },
  'France': { lat: 46.227, lng: 2.213, name: 'France' },

  // Germany
  'גרמניה': { lat: 51.166, lng: 10.451, name: 'Germany' },
  'Germany': { lat: 51.166, lng: 10.451, name: 'Germany' },

  // Poland
  'פולין': { lat: 51.919, lng: 19.145, name: 'Poland' },
  'Poland': { lat: 51.919, lng: 19.145, name: 'Poland' },

  // Russia
  'רוסיה': { lat: 61.524, lng: 105.318, name: 'Russia' },
  'Russia': { lat: 61.524, lng: 105.318, name: 'Russia' },
  'ווילנה': { lat: 54.687, lng: 25.287, name: 'Vilna' },
  'Vilna': { lat: 54.687, lng: 25.287, name: 'Vilna' },
};

/**
 * Get coordinates for a location
 */
function getCoordinatesForLocation(locationStr) {
  if (!locationStr) return null;

  const location = locationStr.trim();

  // Direct match
  if (LOCATION_COORDS[location]) {
    return LOCATION_COORDS[location];
  }

  // Case-insensitive match
  for (const [key, coord] of Object.entries(LOCATION_COORDS)) {
    if (key.toLowerCase() === location.toLowerCase()) {
      return coord;
    }
  }

  // Partial match
  for (const [key, coord] of Object.entries(LOCATION_COORDS)) {
    if (location.includes(key) || key.includes(location)) {
      return coord;
    }
  }

  return null;
}

/**
 * Get color by era (consistent with map legend and graph)
 */
function getEraColor(eraKey) {
  const colorMap = {
    'second-temple': '#8e44ad',  // Purple
    'tannaim': '#e74c3c',        // Red
    'amoraim': '#e67e22',        // Orange
    'geonim': '#f1c40f',         // Yellow
    'rishonim': '#27ae60',       // Green
    'acharonim': '#2980b9',      // Blue
    'modern': '#1abc9c',         // Turquoise
    'unknown': '#999999'         // Gray
  };

  return colorMap[eraKey] || colorMap['unknown'];
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LOCATION_COORDS, getCoordinatesForLocation, getEraColor };
}
