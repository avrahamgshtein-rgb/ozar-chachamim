// Shared location gazetteer — Hebrew/English place name → {lat, lng}.
// Extracted from GeoMap.tsx so the Sage Dossier mini-map (and any future
// view) can resolve coordinates without importing the full map component.
import type { Sage } from './types'

export const LOCATION_COORDS: Record<string, { lat: number; lng: number }> = {
  // ── ארץ ישראל ─────────────────────────────────────────────────────────
  'ירושלים':    { lat: 31.768,  lng: 35.214  },
  'Jerusalem':  { lat: 31.768,  lng: 35.214  },
  'ארץ ישראל': { lat: 31.95,   lng: 35.23   },
  'ישראל':      { lat: 31.95,   lng: 35.23   },
  'Israel':     { lat: 31.95,   lng: 35.23   },
  'יהודה':      { lat: 31.93,   lng: 35.2    },
  'טבריה':      { lat: 32.789,  lng: 35.535  },
  'Tiberias':   { lat: 32.789,  lng: 35.535  },
  'צפת':        { lat: 32.968,  lng: 35.497  },
  'Safed':      { lat: 32.968,  lng: 35.497  },
  'עכו':        { lat: 32.923,  lng: 35.087  },
  'Acre':       { lat: 32.923,  lng: 35.087  },
  'חברון':      { lat: 31.539,  lng: 35.207  },
  'Hebron':     { lat: 31.539,  lng: 35.207  },
  'יבנה':       { lat: 31.877,  lng: 34.751  },
  'ציפורי':     { lat: 32.752,  lng: 35.279  },
  'קיסריה':     { lat: 32.879,  lng: 35.086  },
  'לוד':        { lat: 31.948,  lng: 35.144  },
  'יריחו':      { lat: 31.861,  lng: 35.447  },
  'בני ברק':    { lat: 32.097,  lng: 34.821  },
  'Bnei Brak':  { lat: 32.097,  lng: 34.821  },
  'חיפה':       { lat: 32.819,  lng: 34.989  },
  'תל אביב':    { lat: 32.085,  lng: 34.782  },
  // Bare 'צפון'/'דרום' used to live here. As substrings they matched inside
  // "צפון אפריקה" and "דרום צרפת" and pinned North African and French sages
  // to the Galilee; directions are not places.

  // ── בבל / עיראק / פרס ──────────────────────────────────────────────────
  // בבל is Babylonia of the academies, anchored at the ruins of Babylon near
  // Sura. It used to sit on Baghdad, a city founded in 762.
  'בבל':        { lat: 32.542,  lng: 44.421  },
  'Babylon':    { lat: 32.542,  lng: 44.421  },
  'בגדד':       { lat: 33.313,  lng: 44.361  },
  'בגדאד':      { lat: 33.313,  lng: 44.361  },
  'Baghdad':    { lat: 33.313,  lng: 44.361  },
  // Pumbedita is Fallujah on the Euphrates; Sura lay south, near Hillah.
  'פומבדיתא':   { lat: 33.35,   lng: 43.78   },
  'Pumbedita':  { lat: 33.35,   lng: 43.78   },
  'סורא':       { lat: 32.35,   lng: 44.40   },
  'Sura':       { lat: 32.35,   lng: 44.40   },
  'שושן':       { lat: 32.167,  lng: 48.267  },
  'פרס':        { lat: 32.427,  lng: 53.688  },
  'Persia':     { lat: 32.427,  lng: 53.688  },
  'חלב':        { lat: 36.202,  lng: 37.167  },
  'Aleppo':     { lat: 36.202,  lng: 37.167  },

  // ── מצרים ──────────────────────────────────────────────────────────────
  'מצרים':      { lat: 30.044,  lng: 31.234  },
  'Egypt':      { lat: 30.044,  lng: 31.234  },
  'קהיר':       { lat: 30.044,  lng: 31.234  },
  'Cairo':      { lat: 30.044,  lng: 31.234  },
  'אלכסנדריה': { lat: 31.203,  lng: 29.917  },
  'Alexandria': { lat: 31.203,  lng: 29.917  },

  // ── צפון אפריקה ────────────────────────────────────────────────────────
  'צפון אפריקה': { lat: 33.0,   lng: 2.0    },
  'קירואן':     { lat: 35.671,  lng: 9.513   },
  'Kairouan':   { lat: 35.671,  lng: 9.513   },
  'טוניס':      { lat: 36.807,  lng: 10.182  },
  'Tunis':      { lat: 36.807,  lng: 10.182  },
  'תוניסיה':    { lat: 33.89,   lng: 9.54    },
  'פאס':        { lat: 33.972,  lng: -5.004  },
  'Fez':        { lat: 33.972,  lng: -5.004  },
  'פס':         { lat: 33.972,  lng: -5.004  },
  'מרוקו':      { lat: 31.791,  lng: -4.002  },
  'Morocco':    { lat: 31.791,  lng: -4.002  },
  'מקנס':       { lat: 33.887,  lng: -5.555  },
  "אלג'יריה":   { lat: 36.737,  lng: 3.087   },
  "אלג'יר":     { lat: 36.737,  lng: 3.087   },
  'Algeria':    { lat: 36.737,  lng: 3.087   },
  'טריפולי':    { lat: 32.89,   lng: 13.19   },
  'Tripoli':    { lat: 32.89,   lng: 13.19   },

  // ── ספרד / פורטוגל ─────────────────────────────────────────────────────
  'ספרד':        { lat: 40.463,  lng: -3.750  },
  'Spain':       { lat: 40.463,  lng: -3.750  },
  'ספרד המוסלמית': { lat: 37.5, lng: -2.5    },
  'קורדובה':     { lat: 37.891,  lng: -4.779  },
  'קורדובא':     { lat: 37.891,  lng: -4.779  },
  'Cordoba':     { lat: 37.891,  lng: -4.779  },
  'טולדו':       { lat: 39.858,  lng: -4.020  },
  'Toledo':      { lat: 39.858,  lng: -4.020  },
  'ברצלונה':     { lat: 41.385,  lng: 2.173   },
  'Barcelona':   { lat: 41.385,  lng: 2.173   },
  'גירונה':      { lat: 41.985,  lng: 2.826   },
  'Girona':      { lat: 41.985,  lng: 2.826   },
  'סרגוסה':      { lat: 41.649,  lng: -0.889  },
  'קאסטיליה':    { lat: 40.5,    lng: -3.7    },
  'אראגון':      { lat: 41.5,    lng: -0.5    },
  'קטלוניה':     { lat: 41.6,    lng: 1.5     },
  'פורטוגל':     { lat: 39.400,  lng: -8.224  },
  'ליסבון':      { lat: 38.722,  lng: -9.139  },
  'Lisbon':      { lat: 38.722,  lng: -9.139  },

  // ── צרפת / פרובנס ──────────────────────────────────────────────────────
  'צרפת':        { lat: 46.227,  lng: 2.213   },
  'France':      { lat: 46.227,  lng: 2.213   },
  'פריז':        { lat: 48.857,  lng: 2.352   },
  'Paris':       { lat: 48.857,  lng: 2.352   },
  'פרובנס':      { lat: 43.9,    lng: 5.7     },
  'פרובאנס':     { lat: 43.83,   lng: 5.78    },
  'Provence':    { lat: 43.9,    lng: 5.7     },
  'נרבון':       { lat: 43.187,  lng: 3.002   },
  'נרבונה':      { lat: 43.187,  lng: 3.002   },
  'Narbonne':    { lat: 43.187,  lng: 3.002   },
  'מונטפלייר':   { lat: 43.611,  lng: 3.877   },
  'Montpellier': { lat: 43.611,  lng: 3.877   },
  'לוניל':       { lat: 43.624,  lng: 4.131   },
  'Lunel':       { lat: 43.624,  lng: 4.131   },
  'אורליאן':     { lat: 47.903,  lng: 1.905   },
  'מץ':          { lat: 49.119,  lng: 6.176   },
  'טרואה':       { lat: 48.297,  lng: 4.071   },
  'Troyes':      { lat: 48.297,  lng: 4.071   },
  // Dampierre of the Tosafists is in Champagne (Aube), near Troyes and
  // Ramerupt, not in the Pyrenees where this entry used to point.
  'דמפייר':      { lat: 48.56,   lng: 4.37    },

  // ── גרמניה / אשכנז ─────────────────────────────────────────────────────
  'גרמניה':      { lat: 51.166,  lng: 10.452  },
  'Germany':     { lat: 51.166,  lng: 10.452  },
  'אשכנז':       { lat: 50.0,    lng: 10.0    },
  'Ashkenaz':    { lat: 50.0,    lng: 10.0    },
  'מגנצא':       { lat: 49.993,  lng: 8.247   },
  'Mainz':       { lat: 49.993,  lng: 8.247   },
  'וורמייזא':    { lat: 49.634,  lng: 8.357   },
  'Worms':       { lat: 49.634,  lng: 8.357   },
  'שפיירא':      { lat: 49.320,  lng: 8.443   },
  'Speyer':      { lat: 49.320,  lng: 8.443   },
  'רגנסבורג':    { lat: 48.961,  lng: 12.102  },
  'Regensburg':  { lat: 48.961,  lng: 12.102  },

  // ── בוהמיה / אוסטריה / הונגריה ─────────────────────────────────────────
  'פראג':        { lat: 50.076,  lng: 14.438  },
  'Prague':      { lat: 50.076,  lng: 14.438  },
  'בוהמיה':      { lat: 49.5,    lng: 15.5    },
  'אוסטריה':     { lat: 47.516,  lng: 14.550  },
  'Austria':     { lat: 47.516,  lng: 14.550  },
  'וינה':        { lat: 48.208,  lng: 16.374  },
  'Vienna':      { lat: 48.208,  lng: 16.374  },
  'פרשבורג':     { lat: 48.150,  lng: 17.110  },
  'Bratislava':  { lat: 48.150,  lng: 17.110  },

  // ── פולין / ליטא / גליציה ──────────────────────────────────────────────
  'פולין':       { lat: 51.919,  lng: 19.145  },
  'Poland':      { lat: 51.919,  lng: 19.145  },
  'וילנה':       { lat: 54.687,  lng: 25.280  },
  'Vilna':       { lat: 54.687,  lng: 25.280  },
  'Vilnius':     { lat: 54.687,  lng: 25.280  },
  'ליטא':        { lat: 55.169,  lng: 23.881  },
  'Lithuania':   { lat: 55.169,  lng: 23.881  },
  'לובלין':      { lat: 51.247,  lng: 22.568  },
  'Lublin':      { lat: 51.247,  lng: 22.568  },
  'ראדין':       { lat: 51.8,    lng: 22.0    },
  'גליציה':      { lat: 49.5,    lng: 23.0    },
  'Galicia':     { lat: 49.5,    lng: 23.0    },
  "וולוז'ין":    { lat: 54.8,    lng: 24.2    },
  'Volozhin':    { lat: 54.8,    lng: 24.2    },
  'Volozhyn':    { lat: 54.8,    lng: 24.2    },
  'נובהרדוק':    { lat: 53.6,    lng: 25.83   },
  'פוזנא':       { lat: 52.41,   lng: 16.93   },
  'קרקוב':       { lat: 50.062,  lng: 19.937  },
  'Krakow':      { lat: 50.062,  lng: 19.937  },
  'גור':         { lat: 52.05,   lng: 21.0    },

  // ── רוסיה / אוקראינה ───────────────────────────────────────────────────
  'רוסיה':       { lat: 55.751,  lng: 37.617  },
  'Russia':      { lat: 55.751,  lng: 37.617  },
  'מוסקבה':      { lat: 55.755,  lng: 37.617  },
  'Moscow':      { lat: 55.755,  lng: 37.617  },
  'אוקראינה':    { lat: 48.38,   lng: 31.165  },
  'Ukraine':     { lat: 48.38,   lng: 31.165  },

  // ── טורקיה / בלקן ─────────────────────────────────────────────────────
  'טורקיה':      { lat: 38.964,  lng: 35.243  },
  'Turkey':      { lat: 38.964,  lng: 35.243  },
  'קושטא':       { lat: 41.008,  lng: 28.978  },
  'Constantinople': { lat: 41.008, lng: 28.978 },
  'Istanbul':    { lat: 41.008,  lng: 28.978  },
  'סלוניקי':     { lat: 40.635,  lng: 22.938  },
  'Salonika':    { lat: 40.635,  lng: 22.938  },
  'Thessaloniki':{ lat: 40.635,  lng: 22.938  },
  'איזמיר':      { lat: 38.424,  lng: 27.143  },
  'Izmir':       { lat: 38.424,  lng: 27.143  },
  'הבלקן':       { lat: 43.0,    lng: 20.0    },
  'סרביה':       { lat: 44.017,  lng: 21.006  },

  // ── איטליה ─────────────────────────────────────────────────────────────
  'איטליה':      { lat: 41.872,  lng: 12.567  },
  'Italy':       { lat: 41.872,  lng: 12.567  },
  'רומא':        { lat: 41.903,  lng: 12.496  },
  'Rome':        { lat: 41.903,  lng: 12.496  },
  'ונציה':       { lat: 45.441,  lng: 12.316  },
  'Venice':      { lat: 45.441,  lng: 12.316  },
  'פדובה':       { lat: 45.406,  lng: 11.877  },
  'Padua':       { lat: 45.406,  lng: 11.877  },
  'ליבורנו':     { lat: 43.552,  lng: 10.307  },
  'Livorno':     { lat: 43.552,  lng: 10.307  },

  // ── יוון ───────────────────────────────────────────────────────────────
  'יוון':        { lat: 37.774,  lng: 25.131  },
  'Greece':      { lat: 37.774,  lng: 25.131  },
  'אתונה':       { lat: 37.974,  lng: 23.738  },
  'Athens':      { lat: 37.974,  lng: 23.738  },

  // ── מזרח אחר ───────────────────────────────────────────────────────────
  'תימן':        { lat: 15.369,  lng: 48.517  },
  'Yemen':       { lat: 15.369,  lng: 48.517  },
  'הודו':        { lat: 20.594,  lng: 78.963  },
  'India':       { lat: 20.594,  lng: 78.963  },

  // ── כללי / מודרני ───────────────────────────────────────────────────────
  'ארה"ב':       { lat: 37.09,   lng: -95.71  },
  'USA':         { lat: 37.09,   lng: -95.71  },
  'אירופה':      { lat: 50.0,    lng: 10.0    },
  'Europe':      { lat: 50.0,    lng: 10.0    },
  "האימפריה העות'מאנית": { lat: 39.0, lng: 35.0 },

  // ── תוספת: מקומות שהופיעו במחקרים ולא היו במילון ────────────────────────
  // Reference geography, not sage data. Only places identifiable with
  // confidence were added; genuinely obscure names from the corpus were left
  // out rather than guessed — an approximate coordinate silently misplaces a
  // sage on the map, which is worse than leaving the stop unresolved.
  'ורשה':        { lat: 52.23,  lng: 21.01  },
  "לודז'":       { lat: 51.76,  lng: 19.46  },
  'לבוב':        { lat: 49.84,  lng: 24.03  },
  'למברג':       { lat: 49.84,  lng: 24.03  },
  'בריסק':       { lat: 52.10,  lng: 23.73  },
  'מינסק':       { lat: 53.90,  lng: 27.57  },
  'פינסק':       { lat: 52.12,  lng: 26.10  },
  'סלוצק':       { lat: 53.03,  lng: 27.55  },
  'קובנה':       { lat: 54.90,  lng: 23.90  },
  'סלבודקה':     { lat: 54.91,  lng: 23.88  },
  'ביאליסטוק':   { lat: 53.13,  lng: 23.16  },
  'טלז':         { lat: 55.98,  lng: 22.25  },
  'מיר':         { lat: 53.45,  lng: 26.47  },
  'קלם':         { lat: 55.63,  lng: 22.93  },
  "פוניבז'":     { lat: 55.73,  lng: 24.36  },
  'ברודי':       { lat: 50.08,  lng: 25.15  },
  'ויטבסק':      { lat: 55.19,  lng: 30.20  },
  'ליובאוויטש':  { lat: 54.36,  lng: 31.95  },
  'הומל':        { lat: 52.44,  lng: 31.00  },
  'גרודנה':      { lat: 53.68,  lng: 23.83  },
  "ז'ולקווה":    { lat: 50.06,  lng: 23.97  },
  'פלוצק':       { lat: 52.55,  lng: 19.71  },
  "ברנוביץ'":    { lat: 53.13,  lng: 26.01  },
  'נמירוב':      { lat: 48.97,  lng: 28.84  },
  'ליסא':        { lat: 51.84,  lng: 16.58  },
  'ברסלאו':      { lat: 51.11,  lng: 17.03  },
  'קניגסברג':    { lat: 54.71,  lng: 20.51  },
  'נירנברג':     { lat: 49.45,  lng: 11.08  },

  'פרנקפורט':    { lat: 50.11,  lng: 8.68   },
  'ברלין':       { lat: 52.52,  lng: 13.40  },
  'המבורג':      { lat: 53.55,  lng: 9.99   },
  'אלטונה':      { lat: 53.55,  lng: 9.93   },
  'אמסטרדם':     { lat: 52.37,  lng: 4.90   },
  'לונדון':      { lat: 51.51,  lng: -0.13  },
  'גייטסהד':     { lat: 54.95,  lng: -1.60  },
  'אנגליה':      { lat: 52.50,  lng: -1.50  },
  'הולנד':       { lat: 52.20,  lng: 5.30   },
  'בון':         { lat: 50.73,  lng: 7.10   },
  'קלן':         { lat: 50.94,  lng: 6.96   },
  'וירצבורג':    { lat: 49.79,  lng: 9.93   },
  'ארפורט':      { lat: 50.98,  lng: 11.03  },
  'אאוגסבורג':   { lat: 48.37,  lng: 10.90  },
  'פולדא':       { lat: 50.55,  lng: 9.68   },
  'בינגן':       { lat: 49.97,  lng: 7.90   },
  'האלה':        { lat: 51.48,  lng: 11.97  },
  'גוסלר':       { lat: 51.91,  lng: 10.43  },
  'וינר נוישטט': { lat: 47.81,  lng: 16.24  },
  'אייזנשטט':    { lat: 47.85,  lng: 16.52  },
  'הונגריה':     { lat: 47.16,  lng: 19.50  },
  'מוראביה':     { lat: 49.40,  lng: 16.90  },
  'ברין':        { lat: 49.20,  lng: 16.61  },
  'ברנו':        { lat: 49.20,  lng: 16.61  },
  'קרמס':        { lat: 48.41,  lng: 15.61  },
  'מרסיי':       { lat: 43.30,  lng: 5.37   },
  'קרקסון':      { lat: 43.21,  lng: 2.35   },
  'פרפיניאן':    { lat: 42.70,  lng: 2.90   },
  'טולוז':       { lat: 43.60,  lng: 1.44   },
  'פושקייר':     { lat: 43.69,  lng: 4.28   },
  'ויטרי':       { lat: 48.72,  lng: 4.58   },
  'סבויה':       { lat: 45.60,  lng: 6.30   },
  'קורביל':      { lat: 48.61,  lng: 2.48   },

  'מיורקה':      { lat: 39.57,  lng: 2.65   },
  'סיציליה':     { lat: 37.60,  lng: 14.02  },
  'נאפולי':      { lat: 40.85,  lng: 14.27  },
  'מנטובה':      { lat: 45.16,  lng: 10.79  },
  'פרארה':       { lat: 44.84,  lng: 11.62  },
  'בולוניה':     { lat: 44.49,  lng: 11.34  },
  'פאביה':       { lat: 45.19,  lng: 9.16   },
  'ורונה':       { lat: 45.44,  lng: 10.99  },
  'קפואה':       { lat: 41.10,  lng: 14.21  },
  'טודלה':       { lat: 42.06,  lng: -1.61  },
  'בורגוס':      { lat: 42.34,  lng: -3.70  },
  'סביליה':      { lat: 37.39,  lng: -5.98  },
  'וולנסיה':     { lat: 39.47,  lng: -0.38  },
  'לוסנה':       { lat: 37.41,  lng: -4.49  },
  'אסטלה':       { lat: 42.67,  lng: -2.03  },
  'נבארה':       { lat: 42.70,  lng: -1.65  },
  'מלאגה':       { lat: 36.72,  lng: -4.42  },

  'דמשק':        { lat: 33.51,  lng: 36.29  },
  'סוריה':       { lat: 34.80,  lng: 38.00  },
  'צור':         { lat: 33.27,  lng: 35.20  },
  'עזה':         { lat: 31.50,  lng: 34.47  },
  'בית שאן':     { lat: 32.50,  lng: 35.50  },
  'יפו':         { lat: 32.05,  lng: 34.75  },
  'נתיבות':      { lat: 31.42,  lng: 34.59  },
  'פתח תקווה':   { lat: 32.09,  lng: 34.89  },
  'קרים':        { lat: 45.30,  lng: 34.40  },
  'אדריאנופול':  { lat: 41.68,  lng: 26.56  },
  'בורסה':       { lat: 40.19,  lng: 29.06  },
  // Nehardea stood on the Euphrates beside Pumbedita, not on the Tigris.
  'נהרדעא':      { lat: 33.25,  lng: 43.95  },
  'מחוזא':       { lat: 33.10,  lng: 44.50  },
  'צנעא':        { lat: 15.35,  lng: 44.21  },
  'תעיז':        { lat: 13.58,  lng: 44.02  },
  'עדן':         { lat: 12.79,  lng: 45.02  },
  "ג'רבה":       { lat: 33.81,  lng: 10.85  },
  'תלמסאן':      { lat: 34.88,  lng: -1.31  },
  'סאלי':        { lat: 34.05,  lng: -6.80  },
  'מרקש':        { lat: 31.63,  lng: -7.99  },
  'ריסאני':      { lat: 31.28,  lng: -4.26  },
  'סאוטה':       { lat: 35.89,  lng: -5.32  },
  'אגאדיר':      { lat: 30.42,  lng: -9.60  },

  'ניו יורק':    { lat: 40.71,  lng: -74.01 },
  'ברוקלין':     { lat: 40.68,  lng: -73.94 },
  'קליבלנד':     { lat: 41.50,  lng: -81.69 },
  'בולטימור':    { lat: 39.29,  lng: -76.61 },
  'לייקווד':     { lat: 40.10,  lng: -74.22 },

  // ── תוספת: מקומות שהופיעו ב־location ולא נמצאו במילון ──────────────────
  // Same standard as the block above: only places identifiable with
  // confidence. Deliberately absent: 'כרמל' (the "כרמל, יהודה" of 1 Sam 25 is
  // south of Hebron, not the mountain by Haifa) and 'כפרי' (a village near
  // Sura with no agreed site).
  'גרנדה':       { lat: 37.18,  lng: -3.60  },
  'שילה':        { lat: 32.055, lng: 35.29  },
  'בית לחם':     { lat: 31.705, lng: 35.20  },
  'מצפה':        { lat: 31.886, lng: 35.217 },   // biblical Mizpah (Tell en-Nasbeh)
  'מצפה רמון':   { lat: 30.61,  lng: 34.80  },
  'גזר':         { lat: 31.859, lng: 34.92  },
  'כפר עציון':   { lat: 31.652, lng: 35.117 },
  'כפר הרא"ה':   { lat: 32.39,  lng: 34.92  },
  'מושב פורת':   { lat: 32.30,  lng: 34.93  },
  'נתניה':       { lat: 32.33,  lng: 34.86  },
  'אשדוד':       { lat: 31.80,  lng: 34.65  },
  'נהלל':        { lat: 32.69,  lng: 35.19  },
  'שדות ים':     { lat: 32.49,  lng: 34.89  },
  'גליל':        { lat: 32.85,  lng: 35.40  },
  'שומרון':      { lat: 32.25,  lng: 35.20  },
  'השרון':       { lat: 32.30,  lng: 34.90  },
  'מואב':        { lat: 31.40,  lng: 35.75  },
  'סיני':        { lat: 29.50,  lng: 33.90  },
  'חרן':         { lat: 36.865, lng: 39.031 },
  'פדן ארם':     { lat: 36.865, lng: 39.031 },
  'חדייב':       { lat: 36.19,  lng: 44.01  },   // Adiabene, around Arbil
  'פוסטאט':      { lat: 30.006, lng: 31.231 },
  'לוב':         { lat: 31.0,   lng: 16.0   },   // coastal Tripolitania, where its Jews lived
  'קלעת בן חמאד': { lat: 35.814, lng: 4.789 },
  "טנג'יר":      { lat: 35.76,  lng: -5.83  },
  'תאפיללת':     { lat: 31.30,  lng: -4.25  },
  'מוזע':        { lat: 13.27,  lng: 43.52  },
  'גיברלטר':     { lat: 36.14,  lng: -5.35  },
  'קורפו':       { lat: 39.62,  lng: 19.92  },
  'כרתים':       { lat: 35.24,  lng: 24.90  },
  'קנדיה':       { lat: 35.34,  lng: 25.13  },
  'זמורה':       { lat: 41.50,  lng: -5.75  },
  'רמרו':        { lat: 48.518, lng: 4.293  },   // Ramerupt, Rabbeinu Tam's town
  'נורמנדי':     { lat: 49.20,  lng: 0.40   },
  'צפון צרפת':   { lat: 48.80,  lng: 3.00   },
  'דרום צרפת':   { lat: 43.60,  lng: 3.90   },
  'בזייה':       { lat: 43.344, lng: 3.216  },   // Béziers
  'ארל':         { lat: 43.677, lng: 4.630  },   // Arles
  'קרפנטרה':     { lat: 44.055, lng: 5.048  },
  'ניס':         { lat: 43.70,  lng: 7.27   },
  'אנטוורפן':    { lat: 51.22,  lng: 4.40   },
  'דסאו':        { lat: 51.835, lng: 12.243 },
  'הלברשטאדט':   { lat: 51.896, lng: 11.047 },
  'ברגן-בלזן':   { lat: 52.758, lng: 9.908  },
  'פרוסיה':      { lat: 53.40,  lng: 17.50  },
  'דנציג':       { lat: 54.35,  lng: 18.65  },
  'גריידיץ':     { lat: 52.23,  lng: 16.37  },   // Grätz / Grodzisk
  'גוריציה':     { lat: 45.94,  lng: 13.62  },
  'בודפשט':      { lat: 47.498, lng: 19.040 },
  'סגד':         { lat: 46.253, lng: 20.148 },
  'סרייבו':      { lat: 43.856, lng: 18.413 },
  'יוגוסלביה':   { lat: 44.0,   lng: 20.5   },
  'פודוליה':     { lat: 49.0,   lng: 27.5   },
  'פרמישלאן':    { lat: 49.67,  lng: 24.56  },
  'סוכטשוב':     { lat: 52.23,  lng: 20.24  },
  'סלונים':      { lat: 53.09,  lng: 25.32  },
  'לידא':        { lat: 53.89,  lng: 25.30  },
  'טיקטין':      { lat: 53.20,  lng: 22.77  },
  'סובאלק':      { lat: 54.10,  lng: 22.93  },
  'ראזינאי':     { lat: 55.38,  lng: 23.12  },
  'בלארוס':      { lat: 53.70,  lng: 27.90  },
  'שקלוב':       { lat: 54.21,  lng: 30.29  },
  'ליאדי':       { lat: 54.60,  lng: 30.92  },
  "רוגצ'וב":     { lat: 53.09,  lng: 30.05  },
  "צ'רניגוב":    { lat: 51.49,  lng: 31.29  },
  'לטביה':       { lat: 56.90,  lng: 24.60  },
  'ריגה':        { lat: 56.95,  lng: 24.11  },
  'דווינסק':     { lat: 55.87,  lng: 26.53  },
  'בויסק':       { lat: 56.41,  lng: 24.19  },
  'רוסטוב':      { lat: 47.23,  lng: 39.72  },
  'גאורגיה':     { lat: 42.30,  lng: 43.40  },
  'כותאיסי':     { lat: 42.27,  lng: 42.70  },
  'סקוטלנד':     { lat: 56.50,  lng: -4.20  },
  'אירלנד':      { lat: 53.40,  lng: -8.00  },
  'ברונקס':      { lat: 40.84,  lng: -73.87 },
  'בוסטון':      { lat: 42.36,  lng: -71.06 },
  'מזרח אירופה': { lat: 51.50,  lng: 25.0   },
  'מרכז אירופה': { lat: 50.0,   lng: 15.0   },
  'ביזנטיון':    { lat: 41.008, lng: 28.978 },
  'האימפריה הרומית': { lat: 41.903, lng: 12.496 },
}

// ── Aliases ───────────────────────────────────────────────────────────────
// Spelling variants and English names → the one name the rest of the app
// shows. The map, the place cohort and the place filter all speak the
// canonical name, so "פרובאנס" and "פרובנס" are one cohort, not two. An alias
// needs no coordinates of its own; it borrows its canonical place's.
const PLACE_ALIASES: Record<string, string> = {
  'Jerusalem': 'ירושלים', 'Israel': 'ארץ ישראל', 'ישראל': 'ארץ ישראל',
  'ארץ כנען': 'ארץ ישראל', 'כנען': 'ארץ ישראל',
  'Tiberias': 'טבריה', 'Safed': 'צפת', 'Acre': 'עכו', 'Hebron': 'חברון',
  'Bnei Brak': 'בני ברק', 'מדבר סיני': 'סיני',
  'Babylon': 'בבל', 'עיראק': 'בבל', 'בגדאד': 'בגדד', 'Baghdad': 'בגדד',
  'Pumbedita': 'פומבדיתא', 'Sura': 'סורא', 'Persia': 'פרס', 'Aleppo': 'חלב',
  'Egypt': 'מצרים', 'Cairo': 'קהיר', 'Alexandria': 'אלכסנדריה',
  'Kairouan': 'קירואן', 'Tunis': 'טוניס', 'פס': 'פאס', 'Fez': 'פאס',
  'Morocco': 'מרוקו', 'Algeria': "אלג'יריה", 'Tripoli': 'טריפולי',
  "ג'רבא": "ג'רבה",
  'Spain': 'ספרד', 'קורדובא': 'קורדובה', 'Cordoba': 'קורדובה',
  'Toledo': 'טולדו', 'טולידו': 'טולדו', 'Barcelona': 'ברצלונה', 'Girona': 'גירונה',
  'קסטיליה': 'קאסטיליה', 'Lisbon': 'ליסבון', 'מלגה': 'מלאגה',
  'אל-אנדלוס': 'ספרד המוסלמית', 'אנדלוסיה': 'ספרד המוסלמית',
  'France': 'צרפת', 'Paris': 'פריז', 'פרובאנס': 'פרובנס', 'Provence': 'פרובנס',
  'נרבון': 'נרבונה', 'Narbonne': 'נרבונה', 'Montpellier': 'מונטפלייר',
  'מונפלייה': 'מונטפלייר', 'Lunel': 'לוניל', 'Troyes': 'טרואה',
  'בדרש': 'בזייה', 'טרינקטיי': 'ארל',
  'Germany': 'גרמניה', 'Ashkenaz': 'אשכנז', 'Mainz': 'מגנצא', 'מיינץ': 'מגנצא',
  'Worms': 'וורמייזא', 'Speyer': 'שפיירא', 'שפירא': 'שפיירא',
  'Regensburg': 'רגנסבורג',
  'Prague': 'פראג', 'Austria': 'אוסטריה', 'Vienna': 'וינה', 'Bratislava': 'פרשבורג',
  'Poland': 'פולין', 'Vilna': 'וילנה', 'Vilnius': 'וילנה', 'Lithuania': 'ליטא',
  'Lublin': 'לובלין', 'Galicia': 'גליציה', 'Volozhin': "וולוז'ין",
  'Volozhyn': "וולוז'ין", 'Krakow': 'קרקוב', 'נובהרודוק': 'נובהרדוק',
  'למברג': 'לבוב', 'ברין': 'ברנו',
  'Russia': 'רוסיה', 'Moscow': 'מוסקבה', 'Ukraine': 'אוקראינה',
  'Turkey': 'טורקיה', 'Constantinople': 'קושטא', 'Istanbul': 'קושטא',
  'Salonika': 'סלוניקי', 'Thessaloniki': 'סלוניקי', 'Izmir': 'איזמיר',
  'Italy': 'איטליה', 'Rome': 'רומא', 'Venice': 'ונציה', 'Padua': 'פדובה',
  'פאדובה': 'פדובה', 'Livorno': 'ליבורנו', 'ליוורנו': 'ליבורנו',
  'Greece': 'יוון', 'Athens': 'אתונה', 'Yemen': 'תימן', 'India': 'הודו',
  'USA': 'ארה"ב', 'ארצות הברית': 'ארה"ב', 'Europe': 'אירופה',
}

// ── Place kinds ───────────────────────────────────────────────────────────
// A location string often names a city and the land around it ("צפת, ארץ
// ישראל", "טולדו (ספרד)"). The most specific place wins, so each canonical
// name carries a rank. Anything not listed below is a city. 'area' sits under
// country: continents, empires and macro-regions that span several countries
// are the least useful thing to put a pin on.
export type PlaceKind = 'city' | 'region' | 'country' | 'area'

const COUNTRIES = [
  'ארץ ישראל', 'בבל', 'פרס', 'מצרים', 'תוניסיה', 'מרוקו', "אלג'יריה", 'לוב',
  'ספרד', 'פורטוגל', 'צרפת', 'גרמניה', 'אשכנז', 'אוסטריה', 'הונגריה', 'פולין',
  'ליטא', 'לטביה', 'בלארוס', 'רוסיה', 'אוקראינה', 'טורקיה', 'יוון', 'איטליה',
  'תימן', 'הודו', 'ארה"ב', 'אנגליה', 'הולנד', 'סקוטלנד', 'אירלנד', 'סרביה',
  'יוגוסלביה', 'גאורגיה', 'סוריה',
]
const REGIONS = [
  'יהודה', 'גליל', 'שומרון', 'השרון', 'מואב', 'סיני', 'פדן ארם', 'חדייב', 'קרים',
  'ספרד המוסלמית', 'קטלוניה', 'קאסטיליה', 'אראגון', 'נבארה', 'מיורקה',
  'סיציליה', 'כרתים', 'פרובנס', 'דרום צרפת', 'צפון צרפת', 'נורמנדי', 'סבויה',
  'בוהמיה', 'מוראביה', 'גליציה', 'פודוליה', 'פרוסיה', 'תאפיללת',
]
const AREAS = [
  'אירופה', 'מזרח אירופה', 'מרכז אירופה', 'צפון אפריקה', 'הבלקן',
  "האימפריה העות'מאנית", 'האימפריה הרומית', 'ביזנטיון',
]

const KIND_OF = new Map<string, PlaceKind>([
  ...COUNTRIES.map(n => [n, 'country'] as const),
  ...REGIONS.map(n => [n, 'region'] as const),
  ...AREAS.map(n => [n, 'area'] as const),
])
const KIND_RANK: Record<PlaceKind, number> = { city: 0, region: 1, country: 2, area: 3 }

// ── Matching ──────────────────────────────────────────────────────────────
// Free text is split on list punctuation, then gazetteer names are matched
// as whole words, never as substrings — the substring matcher this replaces
// found 'צפון' inside "צפון אפריקה" and 'פס' inside any word containing פס.

/** Geresh/gershayim/maqaf variants → the ASCII forms the gazetteer uses. */
function normalizePlaceText(s: string): string {
  return s
    .replace(/[׳‘’`´]/g, "'")
    .replace(/[״“”]/g, '"')
    .replace(/־/g, '-')
}

/** Separators between places in a location string: , ; / → ( ) – and kin. */
const SEPARATORS = /\s+-\s+|[,;/→←()[\]–—:|\n]/

/**
 * One-letter Hebrew prepositions and conjunctions that fuse onto a name:
 * "ליטא וירושלים", "טולידו שבספרד". Tried only when the bare word is not a
 * place itself, so 'מיר' stays Mir and is never read as מ + יר.
 */
const HEBREW_PREFIXES = ['ו', 'ב', 'ל', 'מ', 'ש', 'ה', 'וב', 'ול', 'ומ', 'וה', 'שב', 'של', 'מה']

interface Entry { words: string[]; name: string }

/** First word → every gazetteer name starting with it, longest first. */
const BY_FIRST_WORD: Map<string, Entry[]> = (() => {
  const index = new Map<string, Entry[]>()
  const add = (surface: string, name: string) => {
    const words = normalizePlaceText(surface).split(/\s+/)
    const bucket = index.get(words[0]) ?? []
    bucket.push({ words, name })
    index.set(words[0], bucket)
  }
  for (const key of Object.keys(LOCATION_COORDS)) add(key, PLACE_ALIASES[key] ?? key)
  for (const [alias, name] of Object.entries(PLACE_ALIASES)) add(alias, name)
  index.forEach(bucket => bucket.sort((a, b) => b.words.length - a.words.length))
  return index
})()

export interface PlaceHit {
  /** Canonical gazetteer name. */
  name: string
  kind: PlaceKind
  lat: number
  lng: number
}

function hitFor(name: string): PlaceHit | null {
  const c = LOCATION_COORDS[name]
  if (!c) return null
  return { name, kind: KIND_OF.get(name) ?? 'city', lat: c.lat, lng: c.lng }
}

/** Longest gazetteer name starting at words[i], with or without a prefix. */
function matchAt(words: string[], i: number): { name: string; length: number } | null {
  const tryFirst = (first: string) => {
    for (const e of BY_FIRST_WORD.get(first) ?? []) {
      if (i + e.words.length > words.length) continue
      let ok = true
      for (let k = 1; k < e.words.length; k++) {
        if (words[i + k] !== e.words[k]) { ok = false; break }
      }
      if (ok) return { name: e.name, length: e.words.length }
    }
    return null
  }
  const exact = tryFirst(words[i])
  if (exact) return exact
  for (const p of HEBREW_PREFIXES) {
    if (words[i].length - p.length < 2 || !words[i].startsWith(p)) continue
    const m = tryFirst(words[i].slice(p.length))
    if (m) return m
  }
  return null
}

/**
 * Every gazetteer place a free-text location names, in order of mention,
 * each canonical place once.
 */
export function placeHits(text: string | undefined | null): PlaceHit[] {
  if (!text) return []
  const out: PlaceHit[] = []
  const seen = new Set<string>()
  for (const token of normalizePlaceText(text).split(SEPARATORS)) {
    const words = token.trim().split(/\s+/).filter(Boolean)
    for (let i = 0; i < words.length; ) {
      const m = matchAt(words, i)
      if (!m) { i++; continue }
      i += m.length
      if (seen.has(m.name)) continue
      const hit = hitFor(m.name)
      if (hit) { seen.add(m.name); out.push(hit) }
    }
  }
  return out
}

/** The place to pin: city over region over country over area, then first mentioned. */
export function primaryPlace(text: string | undefined | null): PlaceHit | null {
  let best: PlaceHit | null = null
  for (const h of placeHits(text)) {
    if (!best || KIND_RANK[h.kind] < KIND_RANK[best.kind]) best = h
  }
  return best
}

/** A single place name (a migration stop, a cohort chip) → its canonical name. */
export function canonicalPlace(name: string | undefined | null): string | null {
  return primaryPlace(name)?.name ?? null
}

/** Place name or free-text location → coords of its primary place. */
export function coordsForName(name: string | undefined | null): { lat: number; lng: number } | null {
  const p = primaryPlace(name)
  return p ? { lat: p.lat, lng: p.lng } : null
}

/** Sage → primary coords (explicit coordinates win, else resolved location). */
export function resolveCoords(sage: Sage): { lat: number; lng: number } | null {
  if (sage.coordinates) return sage.coordinates
  return coordsForName(sage.location)
}

/** Sage → the canonical place its marker stands on, or null when unplaced. */
export function primaryPlaceOf(sage: Sage): string | null {
  if (sage.coordinates) return null
  return primaryPlace(sage.location)?.name ?? null
}
