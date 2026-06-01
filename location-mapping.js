/**
 * Hebrew Location → Coordinates Mapping for Leaflet Map
 */

const LOCATION_MAP = {
  // Israel
  'ירושלים': [31.768, 35.214],
  'Jerusalem': [31.768, 35.214],
  'ארץ ישראל': [31.5, 35.2],
  'Eretz Israel': [31.5, 35.2],
  'טבריה': [32.8, 35.4],
  'Tiberias': [32.8, 35.4],
  'ירושלים': [31.768, 35.214],
  'צפת': [32.96, 35.49],
  'Safed': [32.96, 35.49],
  'חיפה': [32.82, 34.99],
  'Haifa': [32.82, 34.99],

  // Egypt & North Africa
  'מצרים': [26.8, 30.8],
  'Egypt': [26.8, 30.8],
  'אלכסנדריה': [31.2, 29.9],
  'Alexandria': [31.2, 29.9],
  'קהיר': [30.04, 31.24],
  'Cairo': [30.04, 31.24],

  // Iraq/Babylon
  'בבל': [32.5, 44.4],
  'Babylon': [32.5, 44.4],
  'בגדד': [33.31, 44.36],
  'Baghdad': [33.31, 44.36],

  // Spain
  'ספרד': [40.5, -3.7],
  'Spain': [40.5, -3.7],
  'קורדובה': [37.89, -4.77],
  'Cordoba': [37.89, -4.77],
  'סביליה': [37.39, -5.98],
  'Seville': [37.39, -5.98],
  'טולדו': [39.86, -4.02],
  'Toledo': [39.86, -4.02],
  'לבי': [39.47, -0.38],
  'Lleida': [39.47, -0.38],
  'אראגון': [41.5, -0.8],
  'Aragon': [41.5, -0.8],

  // France & Provence
  'צרפת': [46.2, 2.2],
  'France': [46.2, 2.2],
  'פרובנס': [43.9, 5.0],
  'Provence': [43.9, 5.0],
  'פריז': [48.86, 2.35],
  'Paris': [48.86, 2.35],
  'טראוז': [43.6, 1.44],
  'Troyes': [43.6, 1.44],
  'אורליאן': [47.9, 1.9],
  'Orleans': [47.9, 1.9],
  'לוקס': [47.97, 1.6],
  'Chalons': [48.97, 4.37],

  // Germany & Central Europe
  'גרמניה': [51.2, 10.5],
  'Germany': [51.2, 10.5],
  'קולוניה': [50.94, 6.96],
  'Cologne': [50.94, 6.96],
  'וורמס': [49.63, 8.36],
  'Worms': [49.63, 8.36],
  'מיינץ': [50.12, 8.28],
  'Mainz': [50.12, 8.28],
  'תריר': [49.75, 9.22],
  'Trier': [49.75, 9.22],

  // Poland
  'פולין': [51.92, 19.15],
  'Poland': [51.92, 19.15],
  'קרקוב': [50.05, 19.94],
  'Krakow': [50.05, 19.94],
  'וורשה': [52.23, 21.01],
  'Warsaw': [52.23, 21.01],

  // Italy
  'איטליה': [41.9, 12.6],
  'Italy': [41.9, 12.6],
  'רומא': [41.9, 12.5],
  'Rome': [41.9, 12.5],
  'פדובה': [45.41, 11.88],
  'Padua': [45.41, 11.88],

  // Ottoman Empire & Turkey
  'איזמיר': [38.4, 27.1],
  'Izmir': [38.4, 27.1],
  'קושטא': [41.01, 28.98],
  'Constantinople': [41.01, 28.98],
  'תיסלוניקי': [40.64, 22.94],
  'Thessaloniki': [40.64, 22.94],

  // Eastern Europe
  'אוקראינה': [49.0, 31.3],
  'Ukraine': [49.0, 31.3],
  'גליציה': [49.3, 24.0],
  'Galicia': [49.3, 24.0],
  'קאמניץ': [49.73, 25.5],
  'Kamianets': [49.73, 25.5],
  'מעהרין': [49.3, 17.6],
  'Moravia': [49.3, 17.6],
  'בהמיה': [49.74, 15.47],
  'Bohemia': [49.74, 15.47],
  'בודפשט': [47.5, 19.04],
  'Budapest': [47.5, 19.04],

  // Yemen
  'תימן': [15.3, 48.2],
  'Yemen': [15.3, 48.2],
  'צנעא': [15.55, 48.52],
  'Sana\'a': [15.55, 48.52],

  // USA
  'ארה״ב': [37.09, -95.71],
  'USA': [37.09, -95.71],
  'ניו יורק': [40.71, -74.01],
  'New York': [40.71, -74.01],
  'בוסטון': [42.36, -71.06],
  'Boston': [42.36, -71.06],
  'בלטימור': [39.29, -76.61],
  'Baltimore': [39.29, -76.61],
  'פילדלפיה': [39.95, -75.17],
  'Philadelphia': [39.95, -75.17],

  // North Africa
  'אלג׳יריה': [36.74, 3.06],
  'Algeria': [36.74, 3.06],
  'מרוקו': [31.79, -7.09],
  'Morocco': [31.79, -7.09],
  'תוניס': [36.81, 10.16],
  'Tunisia': [36.81, 10.16],
  'ליביה': [26.34, 17.23],
  'Libya': [26.34, 17.23],

  // General regions
  'אירופה': [50, 15],
  'Europe': [50, 15],
  'אסיה': [34.04, 100.62],
  'Asia': [34.04, 100.62],
  'אפריקה': [-8.67, 34.89],
  'Africa': [-8.67, 34.89],
};

/**
 * Extract coordinates from location string (may have multiple locations)
 * Returns array of [lat, lng] pairs
 */
function parseLocation(locationStr) {
  if (!locationStr) return [];

  const coords = [];

  // Split by various separators
  const parts = locationStr.split(/[,;→]/).map(s => s.trim());

  for (const part of parts) {
    // Try exact match first
    if (LOCATION_MAP[part]) {
      coords.push({ name: part, coords: LOCATION_MAP[part] });
      continue;
    }

    // Try partial match (contains keyword)
    for (const [key, coord] of Object.entries(LOCATION_MAP)) {
      if (part.includes(key) || key.includes(part)) {
        coords.push({ name: key, coords: coord });
        break;
      }
    }
  }

  return coords;
}

/**
 * Get color for sage by era
 */
function getEraColor(era) {
  const colorMap = {
    'second-temple': '#ff7f0e',
    'tannaim': '#2ca02c',
    'amoraim': '#d62728',
    'geonim': '#9467bd',
    'rishonim': '#9467bd',
    'acharonim': '#8c564b',
    'modern': '#e377c2',
    'unknown': '#999999'
  };
  return colorMap[era] || '#999';
}
