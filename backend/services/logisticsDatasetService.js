'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_DATASET_PATHS = [
  process.env.LOGISTICS_DATASET_PATH,
  'C:\\Users\\USER\\Downloads\\archive\\logistics_classification_dataset.csv',
  path.resolve(__dirname, '..', 'data', 'logistics_classification_dataset.csv'),
].filter(Boolean);

let cachedProfile = null;

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch === ',' && !quoted) {
      values.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  values.push(current);
  return values.map(v => v.trim());
}

function readRows() {
  const datasetPath = DEFAULT_DATASET_PATHS.find(p => p && fs.existsSync(p));
  if (!datasetPath) return { rows: [], datasetPath: null };

  const raw = fs.readFileSync(datasetPath, 'utf8').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { rows: [], datasetPath };

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map(line => {
    const values = parseCsvLine(line);
    return headers.reduce((row, header, index) => {
      row[header] = values[index];
      return row;
    }, {});
  });

  return { rows, datasetPath };
}

function normalize(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function tally(rows, field) {
  return rows.reduce((map, row) => {
    const key = row[field] || 'Unknown';
    map[key] = (map[key] || 0) + 1;
    return map;
  }, {});
}

function average(rows, field) {
  const nums = rows.map(row => Number(row[field])).filter(Number.isFinite);
  if (!nums.length) return null;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

function minMax(rows, field) {
  const nums = rows.map(row => Number(row[field])).filter(Number.isFinite);
  if (!nums.length) return { min: null, max: null };
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

function buildProfile() {
  const { rows, datasetPath } = readRows();
  const total = rows.length;

  const byRoute = {};
  rows.forEach(row => {
    const routeKey = `${normalize(row.Origin_City)}>${normalize(row.Destination_City)}`;
    if (!byRoute[routeKey]) byRoute[routeKey] = [];
    byRoute[routeKey].push(row);
  });

  return {
    datasetPath,
    totalRows: total,
    originCities: [...new Set(rows.map(r => r.Origin_City).filter(Boolean))],
    destinationCities: [...new Set(rows.map(r => r.Destination_City).filter(Boolean))],
    shipmentTypes: tally(rows, 'Shipment_Type'),
    customerSegments: tally(rows, 'Customer_Segment'),
    onTimeRate: total ? rows.filter(r => Number(r.On_Time) === 1).length / total : null,
    weight: { ...minMax(rows, 'Weight_kg'), average: average(rows, 'Weight_kg') },
    distance: { ...minMax(rows, 'Distance_km'), average: average(rows, 'Distance_km') },
    byRoute,
    loadedAt: new Date().toISOString(),
  };
}

function getProfile() {
  if (!cachedProfile) cachedProfile = buildProfile();
  return cachedProfile;
}

function extractLogisticsFields(text) {
  const body = text || '';
  const find = patterns => {
    for (const pattern of patterns) {
      const match = body.match(pattern);
      if (match && match[1]) {
        return match[1]
          .replace(/\b(?:Origin|Destination|Shipment\s+Type|Shipment_Type|Customer\s+Segment|Customer_Segment|Weight|Distance|Department|Approved\s+by|Signed\s+by|Date|Mode)\b.*$/i, '')
          .trim();
      }
    }
    return null;
  };

  return {
    originCity: find([/\bOrigin(?:_City|\s+City)?\s*:?\s*([A-Za-z\u00C0-\u024F\s.-]{2,40})/i, /\bFrom\s*:?\s*([A-Za-z\u00C0-\u024F\s.-]{2,40})/i]),
    destinationCity: find([/\bDestination(?:_City|\s+City)?\s*:?\s*([A-Za-z\u00C0-\u024F\s.-]{2,40})/i, /\bTo\s*:?\s*([A-Za-z\u00C0-\u024F\s.-]{2,40})/i]),
    shipmentType: find([/\bShipment(?:_Type|\s+Type)?\s*:?\s*([A-Za-z\u00C0-\u024F\s.-]{2,30})/i, /\bMode\s*:?\s*([A-Za-z\u00C0-\u024F\s.-]{2,30})/i]),
    customerSegment: find([/\bCustomer(?:_Segment|\s+Segment)?\s*:?\s*([A-Za-z\u00C0-\u024F\s.-]{2,30})/i]),
    weightKg: Number((find([/\bWeight(?:_kg|\s+kg)?\s*:?\s*([\d,.]+)/i, /([\d,.]+)\s*kg\b/i]) || '').replace(/,/g, '')) || null,
    distanceKm: Number((find([/\bDistance(?:_km|\s+km)?\s*:?\s*([\d,.]+)/i, /([\d,.]+)\s*km\b/i]) || '').replace(/,/g, '')) || null,
  };
}

function rateRoute(profile, fields) {
  if (!fields.originCity || !fields.destinationCity) return null;
  const routeKey = `${normalize(fields.originCity)}>${normalize(fields.destinationCity)}`;
  const routeRows = profile.byRoute[routeKey] || [];
  if (!routeRows.length) return { known: false, sampleSize: 0, onTimeRate: null };
  const onTime = routeRows.filter(row => Number(row.On_Time) === 1).length / routeRows.length;
  return { known: true, sampleSize: routeRows.length, onTimeRate: onTime };
}

function evaluateDocument(text) {
  const profile = getProfile();
  const fields = extractLogisticsFields(text);
  const findings = [];
  const recommendations = [];

  if (!profile.totalRows) {
    return {
      available: false,
      message: 'Logistics dataset not loaded. Set LOGISTICS_DATASET_PATH to the Kaggle CSV file.',
      fields,
      findings,
      recommendations,
    };
  }

  const originKnown = !fields.originCity || profile.originCities.some(c => normalize(c) === normalize(fields.originCity));
  const destinationKnown = !fields.destinationCity || profile.destinationCities.some(c => normalize(c) === normalize(fields.destinationCity));
  const route = rateRoute(profile, fields);
  const shipmentTypeKnown = !fields.shipmentType || Object.keys(profile.shipmentTypes).some(t => normalize(t) === normalize(fields.shipmentType));

  if (!originKnown) findings.push(`Origin city "${fields.originCity}" is not present in the ${profile.totalRows}-record logistics dataset.`);
  if (!destinationKnown) findings.push(`Destination city "${fields.destinationCity}" is not present in the ${profile.totalRows}-record logistics dataset.`);
  if (route && !route.known) findings.push(`Route ${fields.originCity} to ${fields.destinationCity} does not appear in the logistics dataset baseline.`);
  if (!shipmentTypeKnown) findings.push(`Shipment type "${fields.shipmentType}" is not present in the logistics dataset baseline.`);

  if (fields.weightKg && profile.weight.max && fields.weightKg > profile.weight.max * 1.15) {
    findings.push(`Weight ${fields.weightKg} kg is more than 15% above the dataset maximum of ${Math.round(profile.weight.max)} kg.`);
  }
  if (fields.distanceKm && profile.distance.max && fields.distanceKm > profile.distance.max * 1.15) {
    findings.push(`Distance ${fields.distanceKm} km is more than 15% above the dataset maximum of ${Math.round(profile.distance.max)} km.`);
  }
  if (route?.known && route.onTimeRate !== null && route.onTimeRate < 0.5) {
    findings.push(`Route ${fields.originCity} to ${fields.destinationCity} has a low historical on-time rate of ${Math.round(route.onTimeRate * 100)}%.`);
  }

  if (!fields.originCity) recommendations.push('Add origin city so the audit can verify the shipment route against the dataset.');
  if (!fields.destinationCity) recommendations.push('Add destination city so the audit can verify the shipment route against the dataset.');
  if (!fields.shipmentType) recommendations.push('Add shipment type or transport mode for dataset validation.');
  if (!fields.weightKg) recommendations.push('Add shipment weight in kg for abnormal-weight checks.');

  return {
    available: true,
    datasetPath: profile.datasetPath,
    baselineRows: profile.totalRows,
    fields,
    route,
    findings,
    recommendations,
    reference: {
      originCities: profile.originCities,
      destinationCities: profile.destinationCities,
      shipmentTypes: profile.shipmentTypes,
      customerSegments: profile.customerSegments,
      onTimeRate: profile.onTimeRate === null ? null : Math.round(profile.onTimeRate * 100),
      weightKg: {
        min: Math.round(profile.weight.min || 0),
        average: Math.round(profile.weight.average || 0),
        max: Math.round(profile.weight.max || 0),
      },
      distanceKm: {
        min: Math.round(profile.distance.min || 0),
        average: Math.round(profile.distance.average || 0),
        max: Math.round(profile.distance.max || 0),
      },
    },
  };
}

module.exports = {
  getProfile,
  evaluateDocument,
};
