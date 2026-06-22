/**
 * Interactive Map Visualization
 * Shows sage birthplaces and migration paths with dynamic colors by era
 */

class SageMap {
  constructor(config = {}) {
    this.mapSelector = config.mapSelector || '#map';
    this.data = null;
    this.map = null;
    this.markers = [];
    this.lines = [];
    this.selectedEra = null;  // Track selected era for filtering
    this.selectedSage = null;  // Track selected individual sage

    // Era colors & names (consistent across all visualizations)
    // Using Hebrew keys to match data.json
    this.eraColors = {
      'בית שני': '#8e44ad',
      'תנאים': '#e74c3c',
      'אמוראים': '#e67e22',
      'גאונים': '#f1c40f',
      'ראשונים': '#27ae60',
      'אחרונים': '#2980b9',
      'עת חדשה': '#1abc9c',
      'Unknown': '#999999',
      'לא ידוע': '#999999'
    };

    // Fallback English names (for backward compatibility)
    this.eraNamesFallback = {
      'second-temple': 'בית שני',
      'tannaim': 'תנאים',
      'amoraim': 'אמוראים',
      'geonim': 'גאונים',
      'rishonim': 'ראשונים',
      'acharonim': 'אחרונים',
      'modern': 'עת חדשה',
      'unknown': 'לא ידוע'
    };

    // Hebrew era names for legend
    this.eraNames = {
      'בית שני': 'בית שני',
      'תנאים': 'תנאים',
      'אמוראים': 'אמוראים',
      'גאונים': 'גאונים',
      'ראשונים': 'ראשונים',
      'אחרונים': 'אחרונים',
      'עת חדשה': 'עת חדשה',
      'Unknown': 'לא ידוע',
      'לא ידוע': 'לא ידוע'
    };

    // Location coordinates - comprehensive list
    this.locationCoords = {
      // Israel & Ancient Lands
      'ירושלים': { lat: 31.768, lng: 35.214, name: 'Jerusalem' },
      'צפן': { lat: 33.0, lng: 35.5, name: 'North Israel' },
      'דרום': { lat: 31.0, lng: 34.8, name: 'South Israel' },
      'יריחו': { lat: 31.861, lng: 35.447, name: 'Jericho' },
      'טבריה': { lat: 32.789, lng: 35.535, name: 'Tiberias' },
      'צפת': { lat: 32.968, lng: 35.497, name: 'Safed' },
      'עכו': { lat: 32.923, lng: 35.087, name: 'Acre' },
      'חברון': { lat: 31.539, lng: 35.207, name: 'Hebron' },
      'קיסריה': { lat: 32.879, lng: 35.086, name: 'Caesarea' },
      'ארץ ישראל': { lat: 31.95, lng: 35.23, name: 'Israel' },
      'חיפה': { lat: 32.8188, lng: 34.9885, name: 'Haifa' },
      'בני ברק': { lat: 32.0971, lng: 34.8219, name: 'Bnei Brak' },
      'תל אביב': { lat: 32.0853, lng: 34.7818, name: 'Tel Aviv' },
      'יבנה': { lat: 31.8766, lng: 34.7506, name: 'Yavne' },

      // Mesopotamia & Persia
      'בבל': { lat: 33.313, lng: 44.361, name: 'Babylon' },
      'בגדד': { lat: 33.313, lng: 44.361, name: 'Baghdad' },
      'פומבדיתא': { lat: 32.6, lng: 43.8, name: 'Pumbedita' },
      'סורא': { lat: 32.5, lng: 44.0, name: 'Sura' },
      'שושן': { lat: 32.167, lng: 48.267, name: 'Shushan/Persia' },
      'פרס': { lat: 32.427, lng: 53.688, name: 'Persia' },

      // Egypt & North Africa
      'מצרים': { lat: 30.044, lng: 31.234, name: 'Egypt' },
      'אלכסנדריה': { lat: 31.203, lng: 29.917, name: 'Alexandria' },
      'קהיר': { lat: 30.044, lng: 31.234, name: 'Cairo' },
      'קירואן': { lat: 35.671, lng: 9.513, name: 'Kairouan' },
      'טוניס': { lat: 36.8065, lng: 10.1815, name: 'Tunis' },
      'פאס': { lat: 33.9716, lng: -5.0041, name: 'Fez' },
      'מרוקו': { lat: 31.791, lng: -4.002, name: 'Morocco' },
      'מקנס': { lat: 33.8869, lng: -5.5553, name: 'Meknes' },
      'אלג\'יריה': { lat: 36.7372, lng: 3.0869, name: 'Algeria' },
      'אלג׳יר': { lat: 36.737, lng: 3.087, name: 'Algiers' },

      // Mediterranean & Europe - Southern
      'יוון': { lat: 37.774, lng: 25.131, name: 'Greece' },
      'אתונה': { lat: 37.974, lng: 23.738, name: 'Athens' },
      'איטליה': { lat: 41.872, lng: 12.567, name: 'Italy' },
      'רומא': { lat: 41.903, lng: 12.496, name: 'Rome' },
      'ונציה': { lat: 45.4408, lng: 12.3155, name: 'Venice' },
      'פדובה': { lat: 45.4064, lng: 11.8768, name: 'Padua' },
      'ליבורנו': { lat: 43.5522, lng: 10.3071, name: 'Livorno' },

      // Spain & Portugal
      'ספרד': { lat: 40.463, lng: -3.750, name: 'Spain' },
      'קורדובה': { lat: 37.891, lng: -4.779, name: 'Cordoba' },
      'קורדובא': { lat: 37.891, lng: -4.779, name: 'Cordoba' },
      'קאסטיליה': { lat: 40.5, lng: -3.7, name: 'Castile' },
      'אראגון': { lat: 41.5, lng: -0.5, name: 'Aragon' },
      'קטלוניה': { lat: 41.6, lng: 1.5, name: 'Catalonia' },
      'ברצלונה': { lat: 41.3851, lng: 2.1734, name: 'Barcelona' },
      'גירונה': { lat: 41.9848, lng: 2.8261, name: 'Girona' },
      'טולדו': { lat: 39.8581, lng: -4.0201, name: 'Toledo' },
      'סרגוסה': { lat: 41.6488, lng: -0.8891, name: 'Saragossa' },
      'פורטוגל': { lat: 39.399872, lng: -8.224454, name: 'Portugal' },
      'ליסבון': { lat: 38.722, lng: -9.139, name: 'Lisbon' },
      'ספרד המוסלמית': { lat: 37.5, lng: -2.5, name: 'Al-Andalus' },

      // France
      'צרפת': { lat: 46.227, lng: 2.213, name: 'France' },
      'פריז': { lat: 48.8566, lng: 2.3522, name: 'Paris' },
      'פרובנס': { lat: 43.9, lng: 5.7, name: 'Provence' },
      'נרבון': { lat: 43.1872, lng: 3.0017, name: 'Narbonne' },
      'מונטפלייר': { lat: 43.6108, lng: 3.8767, name: 'Montpellier' },
      'לוניל': { lat: 43.6235, lng: 4.1311, name: 'Lunel' },
      'אורליאן': { lat: 47.9033, lng: 1.9048, name: 'Orleans' },
      'מץ': { lat: 49.1193, lng: 6.1757, name: 'Metz' },

      // Germany & Central Europe
      'גרמניה': { lat: 51.1657, lng: 10.4515, name: 'Germany' },
      'אשכנז': { lat: 50.0, lng: 10.0, name: 'Ashkenaz' },
      'מגנצא': { lat: 49.9928, lng: 8.2473, name: 'Mainz' },
      'ברין': { lat: 50.0755, lng: 14.4378, name: 'Bryn/Prague area' },
      'רגנסבורג': { lat: 48.9606, lng: 12.1016, name: 'Regensburg' },
      'וורמייזא': { lat: 49.6342, lng: 8.3570, name: 'Worms' },
      'טרואה': { lat: 48.2975, lng: 4.0708, name: 'Troyes' },
      'שפיירא': { lat: 49.3200, lng: 8.4432, name: 'Speyer' },
      'בוהמיה': { lat: 49.5, lng: 15.5, name: 'Bohemia' },
      'פראג': { lat: 50.0755, lng: 14.4378, name: 'Prague' },
      'אוסטריה': { lat: 47.5162, lng: 14.5501, name: 'Austria' },
      'וינה': { lat: 48.2082, lng: 16.3738, name: 'Vienna' },

      // Eastern Europe
      'פולין': { lat: 51.919, lng: 19.145, name: 'Poland' },
      'וילנה': { lat: 54.6872, lng: 25.2797, name: 'Vilna' },
      'ליטא': { lat: 55.169438, lng: 23.881275, name: 'Lithuania' },
      'לובלין': { lat: 51.2465, lng: 22.5684, name: 'Lublin' },
      'ראדין': { lat: 51.8, lng: 22.0, name: 'Radin' },
      'גליציה': { lat: 49.5, lng: 23.0, name: 'Galicia' },
      'וולוז\'ין': { lat: 54.8, lng: 24.2, name: 'Volozhyn' },
      'אוקראינה': { lat: 48.38, lng: 31.165, name: 'Ukraine' },
      'רוסיה': { lat: 55.751, lng: 37.617, name: 'Russia' },
      'מוסקבה': { lat: 55.755, lng: 37.617, name: 'Moscow' },

      // Ottoman Empire
      'טורקיה': { lat: 38.9637, lng: 35.2433, name: 'Turkey' },
      'קושטא': { lat: 41.0082, lng: 28.9784, name: 'Constantinople' },
      'סלוניקי': { lat: 40.6353, lng: 22.9375, name: 'Salonika' },
      'איזמיר': { lat: 38.4235, lng: 27.1428, name: 'Izmir' },
      'הבלקן': { lat: 43.0, lng: 20.0, name: 'Balkans' },
      'סרביה': { lat: 44.0165, lng: 21.0059, name: 'Serbia' },

      // Other
      'הודו': { lat: 20.5937, lng: 78.9629, name: 'India' },
      'תימן': { lat: 15.3694, lng: 48.5165, name: 'Yemen' },

      // Additional locations from sage data
      'ישראל': { lat: 31.95, lng: 35.23, name: 'Israel' },
      'ארה"ב': { lat: 37.09, lng: -95.71, name: 'USA' },
      'נרבונה': { lat: 43.1872, lng: 3.0674, name: 'Narbonne' },
      'צפון אפריקה': { lat: 33.0, lng: 2.0, name: 'North Africa' },
      'קלעת חמאד': { lat: 35.0, lng: 0.0, name: 'Qal\'at Hamad' },
      'אלג\'יר': { lat: 36.737, lng: 3.087, name: 'Algiers' },
      'האימפריה העות\'מאנית': { lat: 39.0, lng: 35.0, name: 'Ottoman Empire' },
      'אירופה': { lat: 50.0, lng: 10.0, name: 'Europe' },
      'יהודה': { lat: 31.93, lng: 35.2, name: 'Judea' },
      'דמפייר': { lat: 43.3, lng: -0.2, name: 'Dampiere' },
      'ליטא': { lat: 55.2, lng: 23.9, name: 'Lithuania' },
      'רוסיה': { lat: 55.7, lng: 37.6, name: 'Russia' },
      'אוסטריה': { lat: 47.5, lng: 14.5, name: 'Austria' },
      'פולין': { lat: 51.9, lng: 19.1, name: 'Poland' },
      'גרמניה': { lat: 51.1, lng: 10.4, name: 'Germany' },
      'צרפת': { lat: 46.2, lng: 2.2, name: 'France' },
      'אשכנז': { lat: 50.0, lng: 10.0, name: 'Ashkenaz' },
      'מרוקו': { lat: 31.791, lng: -4.002, name: 'Morocco' },
    };
  }

  async init() {
    // Store data reference (lazy init - will render when view is activated)
    if (window.graphData && window.graphData.nodes && window.graphData.nodes.length > 0) {
      this.data = window.graphData;
      console.log('✓ Map stored data reference (will initialize on tab click)');
    } else {
      console.log('⏳ [Map] Waiting for data...');
      document.addEventListener('supabaseReady', () => {
        this.data = window.graphData;
        console.log('✓ Map ready on supabaseReady');
      }, { once: true });
    }
  }

  // Call this when the map tab is clicked
  activateMap() {
    if (!this.data) {
      console.error('❌ Map: No data available');
      return;
    }

    if (this.map) {
      console.log('✓ Map already initialized');
      return; // Already initialized
    }

    console.log('🗺️ Activating map...');
    this._initializeMap();
  }

  _initializeMap() {
    try {
      if (!this.data.nodes || this.data.nodes.length === 0) {
        throw new Error('No nodes for map');
      }

      console.log(`🗺️ Map: initializing with ${this.data.nodes.length} sages`);

      // Wait for DOM to be ready
      setTimeout(() => {
        this.setupLeaflet();
        if (this.map) {
          this.renderSages();
          this.renderMigrations();
          this.renderLegend();

          // Check URL for selected sage
          const params = new URLSearchParams(window.location.search);
          const sageId = params.get('sage');
          if (sageId) {
            const sage = this.data.nodes.find(s => String(s.id) === sageId);
            if (sage) {
              console.log(`📌 Loading sage from URL: ${sage.label}`);
              setTimeout(() => this.filterBySage(sage), 500);
            }
          }

          console.log('✅ Map rendered successfully with legend');
        }
      }, 100);
    } catch (error) {
      console.error('✗ Map init failed:', error);
      console.trace();
    }
  }

  setupLeaflet() {
    console.log('🔍 Looking for map container with selector:', this.mapSelector);

    // Use getElementById for direct access
    const mapContainer = document.getElementById('map');
    console.log('📦 Map container found via getElementById?', !!mapContainer);

    if (!mapContainer) {
      console.error('❌ Map container NOT found!');
      return;
    }

    console.log('✅ Map container found! Size:', mapContainer.offsetWidth, 'x', mapContainer.offsetHeight);
    console.log('   Parent:', mapContainer.parentElement?.id, mapContainer.parentElement?.className);
    console.log('   CSS display:', window.getComputedStyle(mapContainer).display);
    console.log('   Parent CSS display:', window.getComputedStyle(mapContainer.parentElement).display);

    // Ensure container has proper size and position
    mapContainer.style.width = '100%';
    mapContainer.style.height = '100%';
    mapContainer.style.position = 'relative';

    console.log('📐 After style update: Size:', mapContainer.offsetWidth, 'x', mapContainer.offsetHeight);

    // Initialize Leaflet map - pass element directly, not selector
    try {
      console.log('🔧 Creating L.map() with element object...');
      this.map = L.map(mapContainer, {
        center: [25, 15],
        zoom: 3,
        zoomControl: true,
        attributionControl: true
      });

      console.log('✅ Leaflet map object created successfully');
      console.log('📍 Map bounds:', this.map.getBounds());
    } catch (error) {
      console.error('❌ Failed to create Leaflet map:', error);
      console.error('   mapContainer type:', typeof mapContainer);
      console.error('   mapContainer:', mapContainer);
      throw error;
    }

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19
    }).addTo(this.map);

    // Invalidate size to fix rendering
    setTimeout(() => {
      this.map.invalidateSize();
    }, 100);

    console.log('✓ Leaflet map initialized with center [25, 15] zoom 3');
  }

  renderSages() {
    if (!this.map || !this.data) return;

    // Group sages by location - support multiple locations
    const sagesByLocation = {};
    let locationsUsed = 0;

    this.data.nodes.forEach(sage => {
      // Extract all locations (split by ; or , or and)
      const rawLocation = sage.location || '';
      const locationParts = rawLocation
        .split(/[;,]|and|וגם|ו/)
        .map(loc => loc.trim())
        .filter(loc => loc.length > 0);

      // Use primary location (first one), or first matching one
      let primaryLocation = locationParts[0];

      // Try to find a matching location in our coords
      for (const locPart of locationParts) {
        if (this.locationCoords[locPart]) {
          primaryLocation = locPart;
          break;
        }
      }

      if (!sagesByLocation[primaryLocation]) {
        sagesByLocation[primaryLocation] = [];
      }
      sagesByLocation[primaryLocation].push(sage);
    });

    // Create markers for each location
    for (const [locationName, sages] of Object.entries(sagesByLocation)) {
      const coords = this.locationCoords[locationName];

      if (!coords) {
        console.warn(`⚠️ No coordinates for location: ${locationName}`);
        continue;
      }

      locationsUsed++;

      // Get dominant era for this location
      const eras = sages.map(s => s.era || 'unknown');
      const dominantEra = this.getMostCommon(eras);
      const color = this.eraColors[dominantEra] || '#999';

      // Count sages by era at this location
      const sagesByEra = {};
      sages.forEach(s => {
        const era = s.era || 'לא ידוע';
        sagesByEra[era] = (sagesByEra[era] || 0) + 1;
      });

      // Create era breakdown string
      const eraBreakdown = Object.entries(sagesByEra)
        .map(([era, count]) => `${era}: ${count}`)
        .join(' | ');

      // Create circle marker for each sage at this location
      // Scatter them around the same point so you can see multiple sages
      sages.forEach((sage, idx) => {
        // Scatter positions around the location
        // Create a small radius around the main point (0.02 degrees ≈ 2km)
        const radius = 0.02; // degrees
        const angle = (idx / sages.length) * Math.PI * 2; // Distribute evenly in circle
        const distance = (idx % 5) * 0.004 + 0.003; // Different distances for layering

        const scatteredLat = coords.lat + Math.cos(angle) * distance;
        const scatteredLng = coords.lng + Math.sin(angle) * distance;

        const marker = L.circleMarker([scatteredLat, scatteredLng], {
          radius: 10, // Fixed size (not overlapping)
          fillColor: this.eraColors[sage.era] || color,
          color: '#fff',
          weight: 2,
          opacity: 0.85,
          fillOpacity: 0.85
        })
          .bindPopup(`
            <div style="text-align: right; direction: rtl; font-family: 'Frank Ruhl Libre', serif; color: #333; min-width: 250px;">
              <!-- Header with Era Color -->
              <strong style="color: ${this.eraColors[sage.era]}; font-size: 1.1rem; display: block; margin-bottom: 6px;">
                ${sage.label}
              </strong>

              <!-- Core Info -->
              <div style="background: #f9f9f9; padding: 6px; border-radius: 3px; margin-bottom: 6px; font-size: 0.85rem; border-right: 4px solid ${this.eraColors[sage.era]};">
                <p style="margin: 2px 0;">
                  <span style="font-weight: 600;">תקופה:</span> ${sage.era || 'לא ידוע'}
                </p>
                <p style="margin: 2px 0;">
                  <span style="font-weight: 600;">מקום:</span> ${coords.name}
                </p>
                ${sage.dates ? `<p style="margin: 2px 0;"><span style="font-weight: 600;">שנים:</span> ${sage.dates}</p>` : ''}
              </div>

              <!-- Brief Bio -->
              ${sage.bio ? `
              <p style="margin: 4px 0; font-size: 0.82rem; color: #555; line-height: 1.3;">
                ${sage.bio.substring(0, 120)}${sage.bio.length > 120 ? '...' : ''}
              </p>
              ` : ''}

              <!-- Field & Concept -->
              ${sage.field ? `<p style="margin: 3px 0; font-size: 0.8rem;"><span style="font-weight: 600;">תחום:</span> ${sage.field}</p>` : ''}
              ${sage.core_concept ? `<p style="margin: 3px 0; font-size: 0.8rem; font-style: italic; color: #666;">💡 ${sage.core_concept.substring(0, 70)}...</p>` : ''}

              <!-- Link -->
              ${sage.wikipedia ? `<p style="margin: 4px 0;"><a href="${sage.wikipedia}" target="_blank" style="color: #0066cc; font-size: 0.85rem;">🔗 Wikipedia</a></p>` : ''}
            </div>
          `)
          .bindTooltip(this.createTooltipContent(sage), {
            permanent: false,
            direction: 'top',
            className: 'sage-tooltip-rich'
          })
          .on('mouseover', function() {
            this.setRadius(25);
            this.setStyle({ weight: 3, opacity: 1 });
          })
          .on('mouseout', function() {
            if (!this.sage.isSelected) {
              this.setRadius(Math.min(20, 8 + idx * 0.5));
              this.setStyle({ weight: 2, opacity: 0.8 });
            }
          })
          .on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            this.filterBySage(sage, marker);
          })
          .addTo(this.map);

        // Store location info for later
        marker.locationName = locationName;
        marker.sageCount = sages.length;
        marker.eraBreakdown = sagesByEra;

        marker.sage = sage;
        sage.marker = marker;
        this.markers.push(marker);
      });
    }

    console.log(`✓ Created ${locationsUsed} location markers`);
  }

  getMostCommon(arr) {
    const counts = {};
    let max = 0, common = arr[0] || 'unknown';

    for (const item of arr) {
      counts[item] = (counts[item] || 0) + 1;
      if (counts[item] > max) {
        max = counts[item];
        common = item;
      }
    }

    return common;
  }

  // Create rich tooltip content with dates, locations, and links
  createTooltipContent(sage) {
    let content = `<div style="direction: rtl; font-family: 'Frank Ruhl Libre', serif; white-space: nowrap;">`;

    // Sage name (bold and colored by era)
    content += `<strong style="color: ${this.eraColors[sage.era] || '#333'}; display: block; margin-bottom: 3px;">
      ${sage.label}
    </strong>`;

    // Era
    if (sage.era) {
      content += `<span style="font-size: 0.85rem; color: #666;">
        <span style="font-weight: 600;">תקופה:</span> ${sage.era}
      </span><br/>`;
    }

    // Birth date and death date (if available)
    if (sage.birth_year || sage.death_year) {
      let dateStr = '';
      if (sage.birth_year && sage.death_year) {
        dateStr = `${sage.birth_year}-${sage.death_year}`;
      } else if (sage.birth_year) {
        dateStr = `נולד ${sage.birth_year}`;
      } else if (sage.death_year) {
        dateStr = `מת ${sage.death_year}`;
      }
      content += `<span style="font-size: 0.85rem; color: #666;">
        📅 ${dateStr}
      </span><br/>`;
    }

    // Birthplace
    if (sage.birthplace) {
      content += `<span style="font-size: 0.85rem; color: #666;">
        <span style="font-weight: 600;">נולד ב:</span> ${sage.birthplace}
      </span><br/>`;
    }

    // Migration locations
    if (sage.location) {
      const locations = sage.location.split(/[;,]/i).map(l => l.trim()).filter(l => l);
      if (locations.length > 0) {
        content += `<span style="font-size: 0.85rem; color: #666;">
          <span style="font-weight: 600;">מקומות:</span> ${locations.slice(0, 2).join(', ')}
        </span><br/>`;
      }
    }

    // Spotify link
    if (sage.spotify) {
      content += `<a href="${sage.spotify}" target="_blank" style="color: #1DB954; font-size: 0.85rem; text-decoration: none;">
        🎵 Spotify
      </a><br/>`;
    }

    // Wikipedia link
    if (sage.wikipedia) {
      content += `<a href="${sage.wikipedia}" target="_blank" style="color: #0066cc; font-size: 0.85rem; text-decoration: none;">
        🔗 Wikipedia
      </a>`;
    }

    content += `</div>`;
    return content;
  }

  // Create interactive legend
  renderLegend() {
    if (!this.map) return;

    const legendDiv = L.control({ position: 'bottomright' });

    legendDiv.onAdd = () => {
      const div = L.DomUtil.create('div', 'map-legend');

      // Responsive sizing
      const isMobile = window.innerWidth < 768;
      const padding = isMobile ? '10px' : '15px';
      const maxWidth = isMobile ? '90vw' : '250px';
      const fontSize = isMobile ? '0.75rem' : '0.85rem';

      div.style.cssText = `
        background: white;
        padding: ${padding};
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        font-family: 'Frank Ruhl Libre', serif;
        direction: rtl;
        text-align: right;
        max-width: ${maxWidth};
        max-height: 70vh;
        overflow-y: auto;
        z-index: 1000;
        font-size: ${fontSize};
      `;

      // Title
      const title = document.createElement('h3');
      title.textContent = '🕐 תקופות';
      title.style.cssText = 'margin: 0 0 10px 0; font-size: 0.95rem; color: #333;';
      div.appendChild(title);

      // Count sages and migration paths by era
      const countByEra = {};
      const migrationsByEra = {};

      this.data.nodes.forEach(s => {
        const era = s.era || 'unknown';
        countByEra[era] = (countByEra[era] || 0) + 1;

        // Count migrations for this era
        if (s.location) {
          const locs = s.location.split(/[;,→/]/).filter(l => l.trim().length > 2);
          if (locs.length >= 2) {
            migrationsByEra[era] = (migrationsByEra[era] || 0) + 1;
          }
        }
      });

      // Era buttons with counts and migrations
      Object.entries(this.eraNames).forEach(([eraKey, eraName]) => {
        const count = countByEra[eraKey] || 0;
        const migrations = migrationsByEra[eraKey] || 0;

        const btn = document.createElement('div');
        btn.style.cssText = `
          padding: 8px 10px;
          margin: 5px 0;
          border-radius: 4px;
          cursor: pointer;
          border: 2px solid ${this.eraColors[eraKey]};
          background: white;
          color: ${this.eraColors[eraKey]};
          font-weight: 600;
          font-size: 0.85rem;
          transition: all 0.2s;
          display: flex;
          justify-content: space-between;
          align-items: center;
        `;

        btn.innerHTML = `
          <span>
            <span style="display: inline-block; width: 10px; height: 10px;
                      background: ${this.eraColors[eraKey]};
                      border-radius: 50%; margin-left: 8px;"></span>
            ${eraName}
          </span>
          <span style="font-size: 0.7rem; opacity: 0.7;">
            ${count}${migrations > 0 ? ` (${migrations}→)` : ''}
          </span>
        `;

        btn.eraKey = eraKey;
        btn.title = `${count} חכמים, ${migrations} עם מסלולי הגירה`;

        btn.addEventListener('click', () => {
          // Update all buttons styling
          document.querySelectorAll('.era-btn').forEach(b => {
            if (b === btn) {
              b.style.background = this.eraColors[eraKey];
              b.style.color = 'white';
              b.style.borderColor = this.eraColors[eraKey];
            } else {
              b.style.background = 'white';
              b.style.color = this.eraColors[b.eraKey];
              b.style.borderColor = this.eraColors[b.eraKey];
            }
          });
          this.filterByEraAndZoom(eraKey);
        });
        btn.addEventListener('mouseover', () => {
          if (this.selectedEra !== eraKey) {
            btn.style.background = this.eraColors[eraKey];
            btn.style.color = 'white';
          }
        });
        btn.addEventListener('mouseout', () => {
          if (this.selectedEra !== eraKey) {
            btn.style.background = 'white';
            btn.style.color = this.eraColors[eraKey];
          }
        });

        btn.className = 'era-btn';

        div.appendChild(btn);
      });

      // Reset button
      const resetBtn = document.createElement('div');
      resetBtn.textContent = '🔄 הצג הכל';
      resetBtn.style.cssText = `padding: 8px 10px; margin-top: 10px; background: #333;
                               color: white; border-radius: 4px; cursor: pointer;
                               font-weight: 600; text-align: center; transition: all 0.2s;`;
      resetBtn.addEventListener('click', () => this.resetFilter());
      resetBtn.addEventListener('mouseover', () => resetBtn.style.background = '#555');
      resetBtn.addEventListener('mouseout', () => resetBtn.style.background = '#333');
      div.appendChild(resetBtn);

      // Info text
      const infoText = document.createElement('small');
      infoText.textContent = '💡 לחץ על עיגול לראות חכם בודד';
      infoText.style.cssText = `display: block; margin-top: 8px; color: #666; font-style: italic; text-align: center;`;
      div.appendChild(infoText);

      return div;
    };

    legendDiv.addTo(this.map);
    console.log('✓ Legend created');
  }

  // Filter by era - dimmed non-selected, highlighted selected
  filterByEra(eraKey) {
    this.selectedEra = eraKey;
    this.markers.forEach(m => {
      if (m.sage && m.sage.era === eraKey) {
        // Selected era - full opacity and highlight
        m.setStyle({
          opacity: 1.0,
          weight: 3,
          fillOpacity: 0.95
        });
        m.setRadius(15); // Slightly larger for emphasis
      } else {
        // Other eras - dimmed
        m.setStyle({
          opacity: 0.15,
          weight: 1,
          fillOpacity: 0.15
        });
        m.setRadius(10); // Back to normal size
      }
    });
    this.lines.forEach(l => {
      if (l.sage && l.sage.era === eraKey) {
        // Selected era - visible
        l.setStyle({ opacity: 0.8, weight: 3 });
      } else {
        // Other eras - very dim
        l.setStyle({ opacity: 0.05, weight: 1 });
      }
    });
    console.log(`✨ Filtering by era: ${eraKey}`);
  }

  // Filter by era AND zoom to bounds
  filterByEraAndZoom(eraKey) {
    this.filterByEra(eraKey);

    // Find bounds of sages in this era
    const sagesInEra = this.data.nodes.filter(s => s.era === eraKey);
    const bounds = L.latLngBounds();

    sagesInEra.forEach(sage => {
      if (sage.location) {
        const locs = sage.location.split(/[;,]|and|וגם|ו/).map(l => l.trim());
        locs.forEach(loc => {
          for (const [key, coord] of Object.entries(this.locationCoords)) {
            if (loc.toLowerCase().includes(key.toLowerCase()) ||
                key.toLowerCase().includes(loc.toLowerCase())) {
              bounds.extend([coord.lat, coord.lng]);
              break;
            }
          }
        });
      }
    });

    // Zoom to bounds if valid
    if (bounds.isValid()) {
      this.map.fitBounds(bounds, { padding: [50, 50] });
      console.log(`📍 Zoomed to ${this.eraNames[eraKey]}`);
    }
  }

  // Filter by single sage
  filterBySage(sage, marker) {
    this.selectedSage = sage;
    sage.isSelected = true;

    // Hide all markers except the selected one
    this.markers.forEach(m => {
      if (m.sage === sage) {
        m.setRadius(30);
        m.setStyle({ weight: 4, opacity: 1 });
      } else {
        m.setStyle({ weight: 2, opacity: 0.05 });
      }
    });

    // Show only lines connected to this sage
    this.lines.forEach(l => {
      if (l.sage === sage) {
        l.setStyle({ opacity: 0.8, weight: 4, dashArray: '8, 2' });
      } else {
        l.setStyle({ opacity: 0.02 });
      }
    });

    // Zoom to sage's locations
    if (sage.location) {
      const locs = sage.location.split(/[;,→/]/).map(l => l.trim());
      const bounds = L.latLngBounds();

      locs.forEach(loc => {
        for (const [key, coord] of Object.entries(this.locationCoords)) {
          if (loc.toLowerCase().includes(key.toLowerCase()) ||
              key.toLowerCase().includes(loc.toLowerCase())) {
            bounds.extend([coord.lat, coord.lng]);
            break;
          }
        }
      });

      if (bounds.isValid()) {
        this.map.fitBounds(bounds, { padding: [100, 100] });
      }
    }

    // Update URL with selected sage
    const url = new URL(window.location);
    url.searchParams.set('sage', sage.id);
    window.history.pushState({ sage: sage.id }, '', url);

    // Dispatch event to show sidebar with sage details
    document.dispatchEvent(new CustomEvent('selectNode', { detail: { sage } }));

    console.log(`👤 Filtering by sage: ${sage.label} (URL: ?sage=${sage.id})`);
  }

  // Reset all filters - show all sages with full brightness
  resetFilter() {
    this.selectedEra = null;
    this.selectedSage = null;

    this.data.nodes.forEach(s => s.isSelected = false);

    // Reset all markers to full visibility
    this.markers.forEach(m => {
      m.setRadius(10);  // Normal size
      m.setStyle({
        weight: 2,
        opacity: 0.85,
        fillOpacity: 0.85
      });
    });

    // Reset all lines to normal visibility
    this.lines.forEach(l => l.setStyle({
      opacity: 0.5,
      weight: 2,
      dashArray: '8, 4'
    }));

    // Reset map view
    this.map.setView([25, 15], 3);

    // Update legend buttons styling
    document.querySelectorAll('.era-btn').forEach(btn => {
      btn.style.background = 'white';
      btn.style.color = this.eraColors[btn.eraKey];
      btn.style.borderColor = this.eraColors[btn.eraKey];
    });

    // Clear URL parameter
    const url = new URL(window.location);
    url.searchParams.delete('sage');
    window.history.pushState({}, '', url);

    console.log('✨ All sages visible - filter reset');
  }

  // Draw migration paths as arrows
  renderMigrations() {
    if (!this.map) return;

    console.log('📍 Drawing migration paths...');

    let pathCount = 0;
    let noPathCount = 0;

    // Look for sages with multiple locations
    this.data.nodes.forEach(sage => {
      if (!sage.location || sage.location === 'Unknown') return;

      // Split by common delimiters
      const locationStr = sage.location
        .replace(/→/g, ';')  // Convert arrows to semicolons
        .replace(/\//g, ';')  // Convert slashes to semicolons
        .replace(/ו/g, ';');  // Convert Hebrew 'and' to semicolons

      const locations = locationStr
        .split(';')
        .map(loc => loc.trim())
        .filter(loc => loc.length > 2);  // Only non-empty locations

      if (locations.length < 2) {
        noPathCount++;
        return;
      }

      const coords = [];
      const foundLocs = [];

      // Find matching coordinates for each location
      for (const loc of locations) {
        let found = false;

        // Try exact match first
        if (this.locationCoords[loc]) {
          coords.push(this.locationCoords[loc]);
          foundLocs.push(loc);
          found = true;
        } else {
          // Try partial match
          for (const [key, coord] of Object.entries(this.locationCoords)) {
            if (loc.toLowerCase().includes(key.toLowerCase()) ||
                key.toLowerCase().includes(loc.toLowerCase())) {
              coords.push(coord);
              foundLocs.push(key);
              found = true;
              break;
            }
          }
        }

        if (!found && loc.length > 0) {
          console.log(`  ⚠️ Location not found: "${loc}" (for ${sage.label})`);
        }
      }

      // Draw polyline if we have at least 2 valid coordinates
      if (coords.length >= 2) {
        const latLngs = coords.map(c => [c.lat, c.lng]);
        const color = this.eraColors[sage.era] || '#999';

        const line = L.polyline(latLngs, {
          color: color,
          weight: 3,
          opacity: 0.5,
          dashArray: '8, 4',
          className: `migration-${sage.id}`,
          interactive: true
        })
          .on('mouseover', function() {
            this.setStyle({
              weight: 5,
              opacity: 0.9,
              dashArray: '8, 2'
            });
            this.bringToFront();
          })
          .on('mouseout', function() {
            if (!line.sage.isSelected) {
              this.setStyle({
                weight: 3,
                opacity: 0.5,
                dashArray: '8, 4'
              });
            }
          })
          .on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            this.filterBySage(sage);
          })
          .addTo(this.map);

        line.sage = sage;
        this.lines.push(line);
        pathCount++;

        if (pathCount <= 5) {
          console.log(`  ✓ ${sage.label}: ${foundLocs.join(' → ')}`);
        }
      }
    });

    console.log(`✓ Drew ${pathCount} migration paths (${noPathCount} sages without paths)`);
  }
}

// Export
export { SageMap };
