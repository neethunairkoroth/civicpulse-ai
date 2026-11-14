import type { InfrastructureAsset } from '../types/asset';

// Deterministic PRNG so the 500-asset NYC sample is consistent and reproducible
function createSeededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function pick<T>(rand: () => number, items: T[]): T {
  return items[Math.floor(rand() * items.length)];
}

function formatDate(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

interface CategoryTemplate {
  category: string;
  prefix: string;
  count: number;
  locations: string[];
  manufacturers: string[];
  descriptions: string[];
  installYears: [number, number];
  missingManufacturerRate: number;
  missingInstallDateRate: number;
  overdueRate: number;
  missingInspectionRate: number;
  lowConditionRate: number;
}

const NYC_CATEGORY_TEMPLATES: CategoryTemplate[] = [
  {
    category: 'Subway Signals',
    prefix: 'SIG',
    count: 115,
    locations: [
      'IRT Lexington Ave — Grand Central-42 St',
      'IND 8th Ave — 34 St-Penn Station',
      'BMT Broadway — Times Sq-42 St',
      'IND Queens Blvd — Jackson Hts-Roosevelt Ave',
      'BMT Canarsie — Bedford Ave',
      'IRT 7th Ave — Chambers St',
      'IND Fulton St — Hoyt-Schermerhorn',
      'IRT Flushing — Main St Interlocking',
      'IND Concourse — 145 St Tower',
      'BMT 4th Ave — Atlantic Ave-Barclays',
    ],
    manufacturers: [
      'Siemens Mobility',
      'Alstom Transport',
      'Thales Group',
      'Wabtec Railway Electronics',
      'Hitachi Rail STS',
    ],
    descriptions: [
      'CBTC wayside transponder unit controlling headway enforcement along express track.',
      'Vital interlocking relay cabinet managing home signal aspects and approach locking.',
      'Solid-state audio-frequency track circuit receiver for block occupancy detection.',
      'Wayside zone controller interface module with fiber-optic backbone redundancy.',
      'Automatic train stop trip arm and pneumatic actuator assembly at express crossover.',
    ],
    installYears: [2004, 2024],
    missingManufacturerRate: 0.17,
    missingInstallDateRate: 0.14,
    overdueRate: 0.22,
    missingInspectionRate: 0.06,
    lowConditionRate: 0.18,
  },
  {
    category: 'Escalators',
    prefix: 'ESC',
    count: 95,
    locations: [
      '34 St-Herald Sq Mezzanine Bank A',
      'Fulton Center — Dey St Passageway',
      'Grand Central — Lexington Platform 4',
      'Times Sq-42 St — Shuttle Transfer',
      'Lexington Ave-53 St — Deep Bore Shaft',
      'Atlantic Ave-Barclays — LIRR Concourse',
      'Sutphin Blvd-Archer Ave — AirTrain Link',
      '14 St-Union Sq — BMT North Overpass',
      '34 St-Hudson Yards — Lower Cavern',
      'Jay St-MetroTech — Willoughby Entrance',
    ],
    manufacturers: [
      'Schindler Transit',
      'Otis Elevator Co.',
      'KONE Transit Systems',
      'TK Elevator Heavy Duty',
    ],
    descriptions: [
      'Heavy-duty 48-inch transit escalator with variable frequency drive and step-chain tension monitor.',
      'Deep-station truss escalator bank operating 20 hours/day with automated skirt-brush sensors.',
      'Weatherized street-to-mezzanine escalator equipped with heated comb plates and drain sump.',
      'High-rise transfer escalator with regenerative braking and dual handrail speed synchronization.',
    ],
    installYears: [2001, 2023],
    missingManufacturerRate: 0.13,
    missingInstallDateRate: 0.12,
    overdueRate: 0.24,
    missingInspectionRate: 0.05,
    lowConditionRate: 0.22,
  },
  {
    category: 'Track Switches',
    prefix: 'SWI',
    count: 105,
    locations: [
      'Jamaica Yard — Lead Track 4',
      '59 St-Columbus Circle — Express Crossover',
      'Queens Plaza — Interlocking West',
      '14 St-Union Sq — South Diamond',
      'Coney Island Yard — Throat Switch 18',
      'DeKalb Ave — Junction Bypass',
      '96 St-2nd Ave — Terminal Turnout',
      'Woodside-61 St — Express Pocket',
      'West 4 St-Wash Sq — Upper Level',
      'Canal St — Manhattan Bridge Approach',
    ],
    manufacturers: [
      'Voestalpine Railway Systems',
      'Alstom Signaling',
      'Progress Rail',
      'Wabtec Control Systems',
      'Siemens Rail Automation',
    ],
    descriptions: [
      'Electro-hydraulic dual-control switch machine with electric snow-melter heating elements.',
      'High-speed #10 turnout frog and point detector rod assembly on concrete ties.',
      'Pneumatic switch operating mechanism with micro-switch lock indication contacts.',
      'Elevated structure guarded switch point machine with vibration-isolated mounting frame.',
    ],
    installYears: [1999, 2024],
    missingManufacturerRate: 0.15,
    missingInstallDateRate: 0.18,
    overdueRate: 0.26,
    missingInspectionRate: 0.07,
    lowConditionRate: 0.21,
  },
  {
    category: 'Bridge Sensors',
    prefix: 'BRG',
    count: 95,
    locations: [
      'Brooklyn Bridge — Main Span Cable B2',
      'Manhattan Bridge — North Truss Panel 14',
      'Williamsburg Bridge — Tower Saddle East',
      'Ed Koch Queensboro Bridge — Upper Deck Pier 3',
      'RFK Triborough Bridge — Harlem River Lift',
      'Verrazzano-Narrows — West Anchorage',
      'George Washington Bridge — Lower Level Span',
      'Bronx-Whitestone Bridge — Deck Expansion Joint',
    ],
    manufacturers: [
      'Campbell Scientific',
      'HBM Test & Measurement',
      'Geokon Structural',
      'Trimble Monitoring',
      'MicroStrain LORD',
    ],
    descriptions: [
      'Vibrating-wire cable tension strain gauge monitoring suspender rope load fluctuations.',
      'Tri-axial MEMS accelerometer array measuring lateral wind sway and modal frequency.',
      'Laser-optical expansion joint displacement transducer with cellular telemetry gateway.',
      'Acoustic emission corrosion monitor attached to main suspension cable wire bundle.',
    ],
    installYears: [2008, 2025],
    missingManufacturerRate: 0.22,
    missingInstallDateRate: 0.16,
    overdueRate: 0.29,
    missingInspectionRate: 0.09,
    lowConditionRate: 0.19,
  },
  {
    category: 'EV Chargers',
    prefix: 'EVC',
    count: 90,
    locations: [
      'Brooklyn Navy Yard — Municipal Fleet Hub',
      'Midtown West DOT Depot — Pier 76',
      'Queens Borough Hall — Public Fast Lot',
      'Staten Island St. George Ferry Terminal',
      'Bronx Concourse Plaza — Fleet Bay 3',
      'LIC Municipal Garage — Level 2',
      'Lower Manhattan Battery Garage',
      'Sunset Park Bus & Utility Depot',
    ],
    manufacturers: [
      'ABB E-mobility',
      'ChargePoint',
      'Tritium DCFC',
      'BTC Power',
      'EVBox Municipal',
    ],
    descriptions: [
      '150kW liquid-cooled DC fast charger serving municipal fleet vans and transit support vehicles.',
      'Dual-port Level 2 19.2kW curbside pedestal with OCPP 2.0.1 smart load balancing.',
      '350kW high-power depot dispenser paired with battery-buffered peak shaving cabinet.',
      'All-weather NEMA 4X transit plaza charging kiosk with contactless payment terminal.',
    ],
    installYears: [2019, 2026],
    missingManufacturerRate: 0.11,
    missingInstallDateRate: 0.09,
    overdueRate: 0.14,
    missingInspectionRate: 0.04,
    lowConditionRate: 0.12,
  },
];

export function generateNYCSampleDataset(): InfrastructureAsset[] {
  const rand = createSeededRandom(20261114);
  const assets: InfrastructureAsset[] = [];

  for (const tpl of NYC_CATEGORY_TEMPLATES) {
    for (let i = 1; i <= tpl.count; i++) {
      const id = `NYC-${tpl.prefix}-${String(i).padStart(4, '0')}`;
      const location = pick(rand, tpl.locations);

      // Manufacturer with intentional realistic gaps
      const hasManufacturer = rand() >= tpl.missingManufacturerRate;
      const manufacturer = hasManufacturer ? pick(rand, tpl.manufacturers) : null;

      // Install Date with intentional null gaps
      const hasInstallDate = rand() >= tpl.missingInstallDateRate;
      const [minY, maxY] = tpl.installYears;
      const installYear = minY + Math.floor(rand() * (maxY - minY + 1));
      const installMonth = 1 + Math.floor(rand() * 12);
      const installDay = 1 + Math.floor(rand() * 28);
      const installDate = hasInstallDate ? formatDate(installYear, installMonth, installDay) : null;

      // Condition Score (older or missing-metadata assets skew slightly lower)
      const isMissingScore = rand() < 0.03;
      let conditionScore: number | null = null;
      if (!isMissingScore) {
        const isLow = rand() < tpl.lowConditionRate;
        if (isLow) {
          conditionScore = 22 + Math.floor(rand() * 27); // 22 - 48 (Critical)
        } else if (rand() < 0.34) {
          conditionScore = 50 + Math.floor(rand() * 20); // 50 - 69 (Watch)
        } else {
          conditionScore = 70 + Math.floor(rand() * 30); // 70 - 99 (Nominal)
        }
      }

      // Last Inspection relative to 2026-11-14
      let lastInspection: string | null = null;
      const inspRoll = rand();
      if (inspRoll < tpl.missingInspectionRate) {
        lastInspection = null;
      } else if (inspRoll < tpl.missingInspectionRate + tpl.overdueRate) {
        // Overdue: 190 to 640 days prior to 2026-11-14 (2025-02 to 2026-05)
        const daysAgo = 190 + Math.floor(rand() * 450);
        const dt = new Date(Date.UTC(2026, 10, 14) - daysAgo * 86400000);
        lastInspection = dt.toISOString().slice(0, 10);
      } else {
        // Current: 5 to 170 days prior to 2026-11-14
        const daysAgo = 5 + Math.floor(rand() * 165);
        const dt = new Date(Date.UTC(2026, 10, 14) - daysAgo * 86400000);
        lastInspection = dt.toISOString().slice(0, 10);
      }

      // Description (mostly populated, occasional missing field gap)
      const hasDescription = rand() >= 0.05;
      const description = hasDescription ? pick(rand, tpl.descriptions) : null;

      assets.push({
        Asset_ID: id,
        Category: tpl.category,
        Location: location,
        Manufacturer: manufacturer,
        Install_Date: installDate,
        Condition_Score: conditionScore,
        Last_Inspection: lastInspection,
        Description: description,
      });
    }
  }

  return assets;
}
