import * as XLSX from 'xlsx';

export interface ExcelComponent {
  description: string;
  make: string;
  model: string;
  qty: number;
  unit_cost: number;
  room_type: string;
  sub_type?: string;
  currency: string;
  region: string;
  country: string;
  component_type?: string;
  component_category?: string;
  source_file: string;
}

export interface RoomTypeData {
  room_type: string;
  components: ExcelComponent[];
  total_cost: number;
  pax_count?: number;
  category?: string;
  labour_cost?: number;
  miscellaneous_cost?: number;
  sub_type?: string;
  count?: number; // For SRM files - number of rooms of this type
}

export interface ExcelParseResult {
  roomTypes: RoomTypeData[];
  invalidEntries?: any[]; // Make optional
  labourCost: number;
  miscellaneousCost: number;
  sourceFile: string;
}

// Header mapping for different Excel formats
const headerMap: Record<string, string> = {
  MANUFACTURER: 'MAKE',
  MAKE: 'MAKE',
  MODEL: 'MODEL',
  'UNIT PRICE': 'UNIT_COST',
  UNIT_PRICE: 'UNIT_COST',
  'UNIT COST': 'UNIT_COST',
  UNIT_COST: 'UNIT_COST',
  DESCRIPTION: 'DESCRIPTION',
  CATEGORY: 'CATEGORY',
  'SUB-CATEGORY': 'SUB_CATEGORY',
  SUB_CATEGORY: 'SUB_CATEGORY',
  QTY: 'QTY',
  QUANTITY: 'QTY',
  TOTAL: 'TOTAL',
};

const cleanIndianNumber = (value: string): number => {
  // Remove ₹ symbol, commas, and spaces, then parse as float
  const cleanValue = String(value).replace(/[₹,\s]/g, '');
  return parseFloat(cleanValue) || 0;
};

const normalizeHeader = (header: string): string => {
  if (!header || typeof header !== 'string') return '';
  return header.trim().toUpperCase().replace(/\s+/g, ' ');
};

// Convert room type names to canonical format
const normalizeRoomTypeName = (roomType: string): string => {
  if (!roomType || typeof roomType !== 'string') return '';
  const name = roomType.trim().toLowerCase();
  
  // Extract variant information (Type 1, Type 2, etc.) before normalization
  const variantMatch = name.match(/(type\s*\d+|variant\s*\d+|version\s*\d+)/i);
  const variant = variantMatch ? variantMatch[1] : '';
  
  console.log(`Normalizing room type: "${roomType}" -> "${name}"`);
  
  // Handle MDP/Partner cabins and convertible offices
  if (name.includes('mdp') || name.includes('partner') || name.includes('cabin') || 
      (name.includes('office') && name.includes('4') && name.includes('pax')) ||
      (name.includes('convertible office') && name.includes('2pax'))) {
    const baseName = 'Partner/MDP Cabin';
    const result = variant ? `${baseName} - ${variant}` : baseName;
    console.log(`  -> MDP/Partner Cabin: "${result}"`);
    return result;
  }
  
  // Handle CO rooms and convertible offices (non-2PAX)
  if (name.includes('co room') || name.includes('co-room') || 
      (name.includes('convertible office') && !name.includes('2pax'))) {
    const baseName = 'CO Room';
    return variant ? `${baseName} - ${variant}` : baseName;
  }
  
  // Handle Multipurpose Room (MPR)
  if (name.includes('multipurpose room') || name.includes('multipurpose-room') || name.includes('mpr')) {
    const baseName = 'MPR';
    return variant ? `${baseName} - ${variant}` : baseName;
  }
  
  // Handle Town Hall variations (Cafe Work Lounge, etc.)
  if (name.includes('cafe work lounge') || name.includes('cafe-work-lounge') || 
      name.includes('work lounge') || name.includes('work-lounge') ||
      (name.includes('cafe') && name.includes('75') && name.includes('pax'))) {
    const baseName = 'Cafe Work Lounge';
    const result = variant ? `${baseName} - ${variant}` : baseName;
    console.log(`  -> Cafe Work Lounge: "${result}"`);
    return result;
  }
  
  // Handle Town Hall as a separate room type
  if (name.includes('town hall') || name.includes('townhall') || name.includes('townhalls')) {
    const baseName = 'Town Hall';
    const result = variant ? `${baseName} - ${variant}` : baseName;
    console.log(`  -> Town Hall: "${result}"`);
    return result;
  }
  
  // Handle Restaurant as a separate room type
  if (name.includes('restaurant')) {
    const baseName = 'Restaurant';
    const result = variant ? `${baseName} - ${variant}` : baseName;
    console.log(`  -> Restaurant: "${result}"`);
    return result;
  }
  
  // Handle Chennai-specific patterns
  if (name.includes('bgm') || name.includes('background music')) {
    if (name.includes('reception') || name.includes('barista')) {
      const baseName = 'BGM Reception & Barista';
      return variant ? `${baseName} - ${variant}` : baseName;
    }
    const baseName = 'BGM System';
    return variant ? `${baseName} - ${variant}` : baseName;
  }
  
  // Handle reception and barista areas
  if (name.includes('reception') && name.includes('barista')) {
    const baseName = 'Reception & Barista Area';
    return variant ? `${baseName} - ${variant}` : baseName;
  }
  if (name.includes('reception')) {
    const baseName = 'Reception Area';
    return variant ? `${baseName} - ${variant}` : baseName;
  }
  if (name.includes('barista')) {
    const baseName = 'Barista Area';
    return variant ? `${baseName} - ${variant}` : baseName;
  }
  
  // Handle workstation and IT help desk
  if (name.includes('workstation')) {
    const baseName = 'Workstation Area';
    return variant ? `${baseName} - ${variant}` : baseName;
  }
  if (name.includes('it help desk') || name.includes('help desk')) {
    const baseName = 'IT Help Desk';
    return variant ? `${baseName} - ${variant}` : baseName;
  }
  
  // Handle recreation area
  if (name.includes('recreation')) {
    const baseName = 'Recreation Area';
    return variant ? `${baseName} - ${variant}` : baseName;
  }
  
  // Handle case team rooms (distinct from regular team rooms)
  if (name.includes('case team') || name.includes('case-team')) {
    const paxMatch = name.match(/(\d+)\s*pax/i);
    if (paxMatch) {
      const paxCount = parseInt(paxMatch[1]);
      const baseName = `${paxCount}pax Case Team Room`;
      return variant ? `${baseName} - ${variant}` : baseName;
    }
    const baseName = 'Case Team Room';
    return variant ? `${baseName} - ${variant}` : baseName;
  }
  
  // Handle person/pax equivalence and team rooms = meeting rooms
  // Pattern: X-person-team-room, X-person-team-rooms, X-person-meeting-room, etc.
  const personTeamMatch = name.match(/(\d+)\s*[-_]?\s*person\s*[-_]?\s*(team|meeting)\s*[-_]?\s*room/i);
  if (personTeamMatch) {
    const paxCount = parseInt(personTeamMatch[1]);
    const baseName = `${paxCount}pax Meeting Room`;
    return variant ? `${baseName} - ${variant}` : baseName;
  }
  
  // Pattern: X-person-room, X-person-rooms
  const personRoomMatch = name.match(/(\d+)\s*[-_]?\s*person\s*[-_]?\s*room/i);
  if (personRoomMatch) {
    const paxCount = parseInt(personRoomMatch[1]);
    const baseName = `${paxCount}pax Meeting Room`;
    return variant ? `${baseName} - ${variant}` : baseName;
  }
  
  // Pattern: XP Meeting Room (Amsterdam format) - where P stands for person/pax
  const pMeetingRoomMatch = name.match(/(\d+)p\s*meeting\s*room/i);
  if (pMeetingRoomMatch) {
    const paxCount = parseInt(pMeetingRoomMatch[1]);
    const baseName = `${paxCount}pax Meeting Room`;
    return variant ? `${baseName} - ${variant}` : baseName;
  }
  
  // Pattern: X person meeting (e.g., "24 person meeting" → "24pax meeting room")
  const personMeetingMatch = name.match(/(\d+)\s*person\s*meeting/i);
  if (personMeetingMatch) {
    const paxCount = parseInt(personMeetingMatch[1]);
    const baseName = `${paxCount}pax Meeting Room`;
    return variant ? `${baseName} - ${variant}` : baseName;
  }
  
  // Pattern: XP Room or XP (general Amsterdam format) - where P stands for person/pax
  const pRoomMatch = name.match(/(\d+)p\s*(room)?/i);
  if (pRoomMatch) {
    const paxCount = parseInt(pRoomMatch[1]);
    const baseName = `${paxCount}pax Meeting Room`;
    return variant ? `${baseName} - ${variant}` : baseName;
  }
  
  // Pattern: team-room, team-rooms, team room, team rooms (but not case team)
  const teamRoomMatch = name.match(/(\d+)\s*[-_]?\s*(team|meeting)\s*[-_]?\s*room/i);
  if (teamRoomMatch && !name.includes('case')) {
    const paxCount = parseInt(teamRoomMatch[1]);
    const baseName = `${paxCount}pax Meeting Room`;
    return variant ? `${baseName} - ${variant}` : baseName;
  }
  
  // Extract PAX count and create canonical name (existing logic)
  const paxMatch = name.match(/(\d+)\s*pax/i);
  if (paxMatch) {
    const paxCount = parseInt(paxMatch[1]);
    const baseName = `${paxCount}pax Meeting Room`;
    return variant ? `${baseName} - ${variant}` : baseName;
  }
  
  // Handle other patterns
  if (name.includes('meeting')) {
    const baseName = 'Meeting Room';
    return variant ? `${baseName} - ${variant}` : baseName;
  }
  if (name.includes('conference')) {
    const baseName = 'Conference Room';
    return variant ? `${baseName} - ${variant}` : baseName;
  }
  if (name.includes('focus')) {
    const baseName = 'Focus Room';
    return variant ? `${baseName} - ${variant}` : baseName;
  }
  if (name.includes('huddle')) {
    const baseName = 'Huddle Room';
    return variant ? `${baseName} - ${variant}` : baseName;
  }
  if (name.includes('training')) {
    const baseName = 'Training Room';
    return variant ? `${baseName} - ${variant}` : baseName;
  }
  
  return roomType.trim();
};

// Helper function to determine sub-type variant based on room type, features, and cost
export const determineSubType = (roomType: string, totalCost: number, components: ExcelComponent[]): string => {
  const name = roomType.toLowerCase();
  
  // Analyze component features to determine sophistication level
  const hasHighEndFeatures = components.some(comp => {
    if (!comp.description || typeof comp.description !== 'string') return false;
    const desc = comp.description.toLowerCase();
    return desc.includes('4k') ||
           desc.includes('interactive') ||
           desc.includes('touch screen') ||
           desc.includes('ptz') ||
           desc.includes('beamforming') ||
           desc.includes('dante') ||
           desc.includes('q-sys') ||
           desc.includes('crestron') ||
           desc.includes('extron') ||
           desc.includes('biamp') ||
           desc.includes('tesira');
  });
  
  const hasMidRangeFeatures = components.some(comp => {
    if (!comp.description || typeof comp.description !== 'string') return false;
    const desc = comp.description.toLowerCase();
    return desc.includes('hdmi') ||
           desc.includes('poly') ||
           desc.includes('logitech') ||
           desc.includes('sennheiser') ||
           desc.includes('qsc') ||
           desc.includes('lightware');
  });
  
  // For Partner/MDP Cabin - determine variant based on setup configuration
  if (name.includes('partner/mdp cabin') || name.includes('partner cabin') || name.includes('mdp cabin')) {
    const hasTV = components.some(comp => {
      if (!comp.description || typeof comp.description !== 'string') return false;
      const desc = comp.description.toLowerCase();
      return desc.includes('tv') || desc.includes('display') || desc.includes('monitor');
    });
    const hasMonitor = components.some(comp => {
      if (!comp.description || typeof comp.description !== 'string') return false;
      const desc = comp.description.toLowerCase();
      return desc.includes('monitor') || desc.includes('display');
    });
    const _hasCodec = components.some(comp => {
      if (!comp.description || typeof comp.description !== 'string') return false;
      const desc = comp.description.toLowerCase();
      return desc.includes('codec') || desc.includes('poly studio') || desc.includes('poly x');
    });
    const hasSwitcher = components.some(comp => {
      if (!comp.description || typeof comp.description !== 'string') return false;
      const desc = comp.description.toLowerCase();
      return desc.includes('switcher') || desc.includes('switching') || desc.includes('ucx') || desc.includes('lightware');
    });
    
    // Count cameras
    const cameraCount = components.filter(comp => {
      if (!comp.description || typeof comp.description !== 'string') return false;
      const desc = comp.description.toLowerCase();
      return desc.includes('camera') || desc.includes('webcam') || desc.includes('ptz');
    }).length;
    
    // Executive setup: TV + Monitor/Display + 2+ cameras + Switcher (single desk setup)
    if (hasTV && hasMonitor && cameraCount >= 2 && hasSwitcher) {
      return 'Executive';
    }
    
    // Premium setup: TV + Display + 2+ cameras without switcher (separate tables setup)
    if (hasTV && hasMonitor && cameraCount >= 2 && !hasSwitcher) {
      return 'Premium';
    }
    
    // Standard setup: Basic setup with display and camera
    if (hasMonitor && cameraCount >= 1) {
      return 'Standard';
    }
  }
  
  // For Meeting Rooms - determine variant based on VC setup
  if (name.includes('pax meeting room') || name.includes('meeting room') || name.includes('4pax') || name.includes('6pax') || name.includes('8pax') || name.includes('10pax')) {
    const _hasCodec = components.some(comp => {
      if (!comp.description || typeof comp.description !== 'string') return false;
      const desc = comp.description.toLowerCase();
      return desc.includes('codec') || desc.includes('poly studio') || desc.includes('poly x') || desc.includes('x70') || desc.includes('e70');
    });
    
    const hasVCCamera = components.some(comp => {
      if (!comp.description || typeof comp.description !== 'string') return false;
      const desc = comp.description.toLowerCase();
      return desc.includes('vc camera') || desc.includes('video conference camera') || desc.includes('poly e70');
    });
    
    const hasDirectConnection = components.some(comp => {
      if (!comp.description || typeof comp.description !== 'string') return false;
      const desc = comp.description.toLowerCase();
      return desc.includes('computer') || desc.includes('pc') || desc.includes('laptop');
    });
    
    const hasHighEndAudio = components.some(comp => {
      if (!comp.description || typeof comp.description !== 'string') return false;
      const desc = comp.description.toLowerCase();
      return desc.includes('beamforming') || desc.includes('dante') || desc.includes('q-sys');
    });
    
    // Codec-based setup (Amsterdam style) - Poly X70, E70 with codec
    if (_hasCodec && !hasDirectConnection) {
      return 'Codec-Based';
    }
    
    // Direct connection setup (London style) - VC camera connected to computer
    if (hasVCCamera && hasDirectConnection && !_hasCodec) {
      return 'Direct-Connect';
    }
    
    // High-end setup with premium features
    if (hasHighEndAudio || (hasHighEndFeatures && totalCost > 30000)) {
      return 'Executive';
    }
    
    // Mid-range setup
    if (hasMidRangeFeatures || totalCost > 15000) {
      return 'Premium';
    }
    
    return 'Standard';
  }
  
  // For specific room types - use feature-based logic
  if (name.includes('co room') || name.includes('town hall') || name.includes('mpr') || 
      name.includes('social area') || name.includes('cafe work lounge') ||
      (hasHighEndFeatures && totalCost > 50000)) {
    return 'Executive';
  }
  
  if (name.includes('conference') || name.includes('training') || 
      name.includes('case team') || name.includes('workstation area') ||
      (hasMidRangeFeatures && totalCost > 25000)) {
    return 'Premium';
  }
  
  // Default categorization based on cost and features
  if (totalCost > 50000 || hasHighEndFeatures) {
    return 'Executive';
  }
  
  if (totalCost > 25000 || hasMidRangeFeatures) {
    return 'Premium';
  }
  
  return 'Standard';
};

// Categorize room type based on canonical name
const categorizeRoomType = (roomType: string, _components: ExcelComponent[]): string => {
  if (!roomType || typeof roomType !== 'string') return 'Unknown';
  const name = roomType.toLowerCase();
  
  // Handle special room types first
  if (name.includes('partner/mdp cabin') || name.includes('co room')) {
    return 'Executive Suite';
  }
  
  if (name.includes('cafe work lounge') || name.includes('work lounge')) {
    return 'Cafe Work Lounge';
  }
  
  if (name.includes('town hall') || name.includes('townhall') || name.includes('townhalls')) {
    return 'Town Hall';
  }
  
  if (name.includes('restaurant')) {
    return 'Restaurant';
  }
  
  if (name.includes('mpr') || name.includes('multipurpose room')) {
    return 'Multipurpose Room';
  }
  
  if (name.includes('case team')) {
    return 'Case Team Room';
  }
  
  // Handle pax-based categorization for meeting rooms
  const paxMatch = roomType.match(/(\d+)pax/i);
  const paxCount = paxMatch ? parseInt(paxMatch[1]) : 0;
  
  if (paxCount <= 4) {
    return 'Small Meeting Room';
  } else if (paxCount <= 8) {
    return 'Standard Meeting Room';
  } else if (paxCount <= 12) {
    return 'Conference Room';
  } else {
    return 'Large Conference Room';
  }
};

// Helper function to extract pax count from room type name
// const extractPaxCount = (roomType: string): number => {
//   const paxMatch = roomType.match(/(\d+)pax/i);
//   return paxMatch ? parseInt(paxMatch[1]) : 0;
// };

// Helper function to categorize cost line items
export const categorizeCostItem = (description: string): 'labour' | 'miscellaneous' | 'hardware' => {
  if (!description || typeof description !== 'string') return 'hardware';
  const desc = description.toLowerCase();
  
  // Labour cost keywords
  const labourKeywords = [
    'installation', 'commissioning', 'testing', 'programming', 'training', 'documentation',
    'conceptualization', 'conceptulizing', 'design engineering', 'engineering',
    'setup', 'configuration', 'integration', 'deployment', 'implementation',
    'project management', 'supervision', 'coordination', 'planning',
    'user orientation', 'handover', 'warranty', 'support', 'maintenance',
    'cable management', 'termination', 'crimping', 'soldering', 'assembly',
    'mounting', 'bracketing', 'fixing', 'anchoring', 'drilling', 'cutting',
    'painting charges', 'painting cost'
  ];
  
  // Miscellaneous cost keywords (non-hardware items)
  const miscKeywords = [
    'required installation', 'installation accessories', 'accessories', 'accessory', 
    'miscellaneous hardware', 'tags', 'naming tags', 'velcro', 'tapes', 'sleeves',
    'wired tags', 'cable ties', 'zip ties', 'labels', 'markers', 'pens',
    'consumables', 'materials', 'supplies', 'tools', 'equipment rental',
    'freight', 'shipping', 'delivery', 'transport', 'logistics',
    'insurance', 'packing', 'unpacking', 'storage', 'warehousing',
    'permit', 'license', 'certification', 'approval', 'inspection',
    'tax', 'duty', 'customs', 'import', 'export', 'clearance',
    'overhead', 'administrative', 'office', 'utilities', 'rent',
    'miscellaneous', 'misc', 'others', 'additional', 'extra',
    'contingency', 'buffer', 'allowance', 'provision',
    'airmag', 'aircharge', 'lumpsum'
  ];
  
  // Check for labour costs first
  for (const keyword of labourKeywords) {
    if (desc.includes(keyword)) {
      return 'labour';
    }
  }
  
  // Check for miscellaneous costs
  for (const keyword of miscKeywords) {
    if (desc.includes(keyword)) {
      return 'miscellaneous';
    }
  }
  
  // Default to hardware if no specific category found
  return 'hardware';
};

// Function to extract project-level costs from cost line items
// const extractProjectLevelCosts = (worksheet: XLSX.WorkSheet): { labourCost: number, miscellaneousCost: number } => {
//   let labourCost = 0;
//   let miscellaneousCost = 0;
//   
//   // Get the range of data
//   const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
//   
//   // Look for cost line items in the worksheet
//   for (let row = range.s.r; row <= range.e.r; row++) {
//     for (let col = range.s.c; col <= range.e.c; col++) {
//       const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
//       const cell = worksheet[cellAddress];
//       
//       if (cell && cell.t === 's') {
//         const cellValue = cell.v.toString().toLowerCase();
//         
//         // Look for cost line items that contain specific keywords
//         if (cellValue.includes('project management') || 
//             cellValue.includes('training') ||
//             cellValue.includes('documentation') ||
//             cellValue.includes('installation') ||
//             cellValue.includes('testing') ||
//             cellValue.includes('commissioning') ||
//             cellValue.includes('painting') ||
//             cellValue.includes('programming') ||
//             cellValue.includes('freight') ||
//             cellValue.includes('insurance') ||
//             cellValue.includes('delivery') ||
//             cellValue.includes('aircharge') ||
//             cellValue.includes('airmag')) {
//           
//           // Try to find the cost value in adjacent cells
//           let costValue = 0;
//           
//           // Check right adjacent cell for cost
//           const rightCellAddress = XLSX.utils.encode_cell({ r: row, c: col + 1 });
//           const rightCell = worksheet[rightCellAddress];
//           if (rightCell && (rightCell.t === 'n' || (rightCell.t === 's' && !isNaN(parseFloat(rightCell.v))))) {
//             costValue = parseFloat(rightCell.v) || 0;
//           }
//           
//           // Check cell below for cost
//           const belowCellAddress = XLSX.utils.encode_cell({ r: row + 1, c: col });
//           const belowCell = worksheet[belowCellAddress];
//           if (belowCell && (belowCell.t === 'n' || (belowCell.t === 's' && !isNaN(parseFloat(belowCell.v))))) {
//             costValue = parseFloat(belowCell.v) || 0;
//           }
//           
//           // Categorize the cost
//           const category = categorizeCostItem(cell.v.toString());
//           
//           if (category === 'labour') {
//             labourCost += costValue;
//             console.log(`Found labour cost: "${cell.v}" = ${costValue}`);
//           } else if (category === 'miscellaneous') {
//             miscellaneousCost += costValue;
//             console.log(`Found miscellaneous cost: "${cell.v}" = ${costValue}`);
//           }
//         }
//       }
//     }
//   }
//   
//   console.log(`Total extracted labour cost: ${labourCost}`);
//   console.log(`Total extracted miscellaneous cost: ${miscellaneousCost}`);
//   
//   return { labourCost, miscellaneousCost };
// };

// Parse the specific Excel structure with materials list and room columns
export const parseMaterialsListSheet = (
  workbook: XLSX.WorkBook,
  fileName: string,
  region: string,
  country: string,
  currency: string
): ExcelParseResult => {
  const roomTypes: RoomTypeData[] = [];
  const invalidEntries: any[] = [];
  let labourCost = 0;
  let miscellaneousCost = 0;
  
  // Find the AV sheet first, then fall back to other sheets
  let sheetName = '';
  let sheet: XLSX.WorkSheet | undefined;
  
  // First try to find a sheet with "AV" in the name
  for (const name of workbook.SheetNames) {
    if (name.toLowerCase().includes('av')) {
      sheetName = name;
      sheet = workbook.Sheets[name];
      console.log(`Found AV sheet: ${sheetName}`);
      break;
    }
  }
  
  // If no AV sheet found, use the first sheet
  if (!sheet) {
    sheetName = workbook.SheetNames[0];
    sheet = workbook.Sheets[sheetName];
    console.log(`No AV sheet found, using first sheet: ${sheetName}`);
  }
  
  console.log(`Processing sheet: ${sheetName}`);
  
  if (!sheet) {
    throw new Error('No valid sheet found in the workbook');
  }
  
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  console.log(`Sheet range: ${sheet['!ref']}`);
  
  // Find the header row (row 5 = index 4) - this is where room types are located
  const headerRowIndex = 4; // Row 5 = index 4
  const headers: string[] = [];
  
  // Extract headers from row 5
  for (let C = 0; C <= range.e.c; ++C) {
    const cell = sheet[XLSX.utils.encode_cell({ r: headerRowIndex, c: C })];
    const headerValue = cell ? String(cell.v).trim() : '';
    const normalized = normalizeHeader(headerValue);
    headers.push(headerMap[normalized] || normalized);
  }
  
  // Debug: Log detected headers
  console.log('Detected headers:', headers);
  
  // Extract labour costs from row 7 for each room type
  const labourCostRow = 6; // 0-indexed, so row 7 = index 6
  const labourCosts: { roomType: string; cost: number }[] = [];
  
  for (let C = 1; C <= range.e.c; ++C) {
    const roomTypeCell = sheet[XLSX.utils.encode_cell({ r: headerRowIndex, c: C })];
    const labourCostCell = sheet[XLSX.utils.encode_cell({ r: labourCostRow, c: C })];
    
    if (roomTypeCell && labourCostCell) {
      const roomType = String(roomTypeCell.v).trim();
      const cost = parseFloat(String(labourCostCell.v)) || 0;
      
      // Skip if it's not a room type column
      if (roomType && !['DESCRIPTION', 'MAKE', 'MODEL', 'QTY', 'QUANTITY', 'UNIT_COST', 'UNIT PRICE', 'TOTAL', 'ITEM_NO', 'MANUFACTURER'].includes(normalizeHeader(roomType))) {
        labourCosts.push({ roomType, cost });
        console.log(`Found labour cost for ${roomType}: ${cost} (total cost from row 7)`);
      }
    }
  }
  
  // Calculate total labour cost (these are already total costs from row 7)
  labourCost = labourCosts.reduce((sum, item) => sum + item.cost, 0);
  console.log('Total labour cost from dedicated rows:', labourCost);
  
  // Extract miscellaneous costs from row 9 for each room type
  const miscCostRow = 8; // 0-indexed, so row 9 = index 8
  const miscCosts: { roomType: string; cost: number }[] = [];
  
  for (let C = 1; C <= range.e.c; ++C) {
    const roomTypeCell = sheet[XLSX.utils.encode_cell({ r: headerRowIndex, c: C })];
    const miscCostCell = sheet[XLSX.utils.encode_cell({ r: miscCostRow, c: C })];
    
    if (roomTypeCell && miscCostCell) {
      const roomType = String(roomTypeCell.v).trim();
      const cost = parseFloat(String(miscCostCell.v)) || 0;
      
      // Skip if it's not a room type column
      if (roomType && !['DESCRIPTION', 'MAKE', 'MODEL', 'QTY', 'QUANTITY', 'UNIT_COST', 'UNIT PRICE', 'TOTAL', 'ITEM_NO', 'MANUFACTURER'].includes(normalizeHeader(roomType))) {
        miscCosts.push({ roomType, cost });
        console.log(`Found misc cost for ${roomType}: ${cost}`);
      }
    }
  }
  
  // Calculate total miscellaneous cost (these are already total costs from row 9)
  miscellaneousCost = miscCosts.reduce((sum, item) => sum + item.cost, 0);
  console.log('Total miscellaneous cost from dedicated rows:', miscellaneousCost);
  
  // Extract room counts from row 6 for each room type
  const roomCountRow = 5; // 0-indexed, so row 6 = index 5
  const roomCounts: { roomType: string; count: number }[] = [];
  
  for (let C = 1; C <= range.e.c; ++C) {
    const roomTypeCell = sheet[XLSX.utils.encode_cell({ r: headerRowIndex, c: C })];
    const roomCountCell = sheet[XLSX.utils.encode_cell({ r: roomCountRow, c: C })];
    
    if (roomTypeCell && roomCountCell) {
      const roomType = String(roomTypeCell.v).trim();
      const count = parseInt(String(roomCountCell.v)) || 0;
      
      // Skip if it's not a room type column
      if (roomType && !['DESCRIPTION', 'MAKE', 'MODEL', 'QTY', 'QUANTITY', 'UNIT_COST', 'UNIT PRICE', 'TOTAL', 'ITEM_NO', 'MANUFACTURER'].includes(normalizeHeader(roomType))) {
        roomCounts.push({ roomType, count });
        console.log(`Found room count for ${roomType}: ${count} (from row 6)`);
      }
    }
  }
  
  // Find room type columns (columns that contain room names, not component data)
  const roomTypeColumns: { colIndex: number; roomType: string }[] = [];
  
  // Comprehensive list of columns to exclude (not room types)
  const excludeColumns = [
    'DESCRIPTION', 'DESC', 'ITEM_DESCRIPTION',
    'MAKE', 'MANUFACTURER', 'BRAND',
    'MODEL', 'MODEL_NO', 'MODEL_NUMBER',
    'QTY', 'QUANTITY', 'QTY_REQUIRED',
    'UNIT_COST', 'UNIT_PRICE', 'UNIT_COST_PRICE', 'PRICE',
    'TOTAL', 'TOTAL_COST', 'TOTAL_PRICE', 'AMOUNT',
    'TAX', 'TAX_AMOUNT', 'GST', 'VAT',
    'ITEM_NO', 'ITEM_NUMBER', 'SL_NO', 'SERIAL_NO',
    'CATEGORY', 'SUB_CATEGORY', 'TYPE',
    'REMARKS', 'NOTES', 'COMMENTS',
    'SUPPLIER', 'VENDOR', 'PROVIDER',
    'WARRANTY', 'WARRANTY_PERIOD',
    'DELIVERY', 'DELIVERY_TIME', 'LEAD_TIME'
  ];
  
  // Read room types from row 5 (index 4) - this is the AV sheet structure
  const roomTypeRowIndex = 4; // Row 5 = index 4
  
  for (let C = 1; C <= range.e.c; ++C) { // Start from column B (index 1)
    const cell = sheet[XLSX.utils.encode_cell({ r: roomTypeRowIndex, c: C })];
    const roomTypeValue = cell ? String(cell.v).trim() : '';
    
    if (roomTypeValue && !excludeColumns.includes(normalizeHeader(roomTypeValue))) {
      const normalizedRoomType = normalizeRoomTypeName(roomTypeValue);
      roomTypeColumns.push({ colIndex: C, roomType: normalizedRoomType });
      console.log(`Found room type column ${C}: "${roomTypeValue}" -> "${normalizedRoomType}"`);
    }
  }
  
  console.log(`Total room types found: ${roomTypeColumns.length}`);
  
  if (roomTypeColumns.length === 0) {
    throw new Error('No valid room types found in the file. Please check row 5 contains room type names.');
  }
  
  // Helper function to check if a row is a section header
  const isSectionHeader = (rowIndex: number): boolean => {
    const descCell = sheet[XLSX.utils.encode_cell({ r: rowIndex, c: 0 })];
    if (!descCell || !descCell.v) return false;
    
    const desc = String(descCell.v).trim().toLowerCase();
    if (!desc) return false;
    
    // Check for section header patterns
    const sectionPatterns = [
      /^[ivxlcdm]+\.\s*/, // Roman numerals like "I.", "II.", "III."
      /^[a-z]\.\s*/, // Letters like "A.", "B.", "C."
      /^[0-9]+\.\s*/, // Numbers like "1.", "2.", "3."
      /installation materials/i,
      /display devices/i,
      /accessories/i,
      /materials/i,
      /devices/i,
      /equipment/i,
      /components/i,
      /hardware/i,
      /software/i,
      /services/i
    ];
    
    return sectionPatterns.some(pattern => pattern.test(desc));
  };
  
  // Helper function to check if a row contains valid component data
  const hasValidComponentData = (rowIndex: number, colIndex: number): boolean => {
    const descriptionColIndex = headers.findIndex(h => h.includes('DESCRIPTION') || h.includes('DESC'));
    const makeColIndex = headers.findIndex(h => h.includes('MAKE') || h.includes('MANUFACTURER'));
    const modelColIndex = headers.findIndex(h => h.includes('MODEL'));
    
    const descCol = descriptionColIndex >= 0 ? descriptionColIndex : 0;
    const makeCol = makeColIndex >= 0 ? makeColIndex : 1;
    const modelCol = modelColIndex >= 0 ? modelColIndex : 2;
    
    const descriptionCell = sheet[XLSX.utils.encode_cell({ r: rowIndex, c: descCol })];
    const makeCell = sheet[XLSX.utils.encode_cell({ r: rowIndex, c: makeCol })];
    const modelCell = sheet[XLSX.utils.encode_cell({ r: rowIndex, c: modelCol })];
    const qtyCell = sheet[XLSX.utils.encode_cell({ r: rowIndex, c: colIndex })];
    
    if (!descriptionCell || !makeCell || !modelCell) return false;
    
    const description = String(descriptionCell.v).trim();
    const make = String(makeCell.v).trim();
    const model = String(modelCell.v).trim();
    const qty = qtyCell ? parseFloat(String(qtyCell.v)) || 0 : 0;
    
    // Must have description, make, and model, and quantity > 0
    return description.length > 0 && make.length > 0 && model.length > 0 && qty > 0;
  };
  
  // Helper function to check if a row is completely blank
  const isCompletelyBlank = (rowIndex: number): boolean => {
    for (let C = 0; C <= Math.min(10, range.e.c); ++C) { // Check first 10 columns
      const cell = sheet[XLSX.utils.encode_cell({ r: rowIndex, c: C })];
      if (cell && String(cell.v).trim().length > 0) {
        return false;
      }
    }
    return true;
  };

  // Process each room type column
  roomTypeColumns.forEach(({ colIndex, roomType }) => {
    const components: ExcelComponent[] = [];
    
    console.log(`\n=== Processing room type: ${roomType} ===`);
    
    // Process data rows (start from row 11 for component data)
    let consecutiveBlankRows = 0;
    const maxConsecutiveBlanks = 15; // Increased to handle more blank rows
    let lastValidDataRow = 10; // Row 11 = index 10
    
    for (let R = 10; R <= range.e.r; ++R) { // Row 11 = index 10
      // Find the correct column indices based on headers
      const descriptionColIndex = headers.findIndex(h => h.includes('DESCRIPTION') || h.includes('DESC'));
      const makeColIndex = headers.findIndex(h => h.includes('MAKE') || h.includes('MANUFACTURER'));
      const modelColIndex = headers.findIndex(h => h.includes('MODEL'));
      
      // Default to column A, B, C if not found
      const descCol = descriptionColIndex >= 0 ? descriptionColIndex : 0;
      const makeCol = makeColIndex >= 0 ? makeColIndex : 1;
      const modelCol = modelColIndex >= 0 ? modelColIndex : 2;
      
      const descriptionCell = sheet[XLSX.utils.encode_cell({ r: R, c: descCol })];
      const makeCell = sheet[XLSX.utils.encode_cell({ r: R, c: makeCol })];
      const modelCell = sheet[XLSX.utils.encode_cell({ r: R, c: modelCol })];
      const qtyCell = sheet[XLSX.utils.encode_cell({ r: R, c: colIndex })]; // Room-specific quantity
      
      // Check if this is a section header
      if (isSectionHeader(R)) {
        console.log(`Row ${R + 1}: Section header detected: "${descriptionCell ? String(descriptionCell.v) : ''}"`);
        consecutiveBlankRows = 0; // Reset blank row counter
        continue; // Skip section headers but continue parsing
      }
      
      // Check if this row is completely blank
      if (isCompletelyBlank(R)) {
        consecutiveBlankRows++;
        console.log(`Row ${R + 1}: Completely blank row (consecutive blanks: ${consecutiveBlankRows})`);
        
        // If we've hit too many consecutive blank rows, stop processing
        if (consecutiveBlankRows >= maxConsecutiveBlanks) {
          console.log(`Stopping at row ${R + 1} - reached ${maxConsecutiveBlanks} consecutive blank rows`);
          break;
        }
        continue;
      }
      
      // Check if this row has valid component data
      if (!hasValidComponentData(R, colIndex)) {
        // This row has some data but not valid component data
        // Check if it might be a continuation or sub-item
        const desc = descriptionCell ? String(descriptionCell.v).trim() : '';
        const make = makeCell ? String(makeCell.v).trim() : '';
        const model = modelCell ? String(modelCell.v).trim() : '';
        
        // If we have some meaningful data, log it but don't count as blank
        if (desc || make || model) {
          console.log(`Row ${R + 1}: Partial data - Desc="${desc}", Make="${make}", Model="${model}" (continuing)`);
          consecutiveBlankRows = 0;
        } else {
          consecutiveBlankRows++;
        }
        continue;
      }
      
      // Reset blank row counter if we found valid data
      consecutiveBlankRows = 0;
      lastValidDataRow = R;
      
      if (!descriptionCell || !makeCell || !modelCell) continue;
      
      const description = String(descriptionCell.v).trim();
      const make = String(makeCell.v).trim();
      const model = String(modelCell.v).trim();
      const qty = qtyCell ? parseFloat(String(qtyCell.v)) || 0 : 0;
      
      // Debug logging for row processing
      console.log(`Processing row ${R + 1}: Description="${description}", Make="${make}", Model="${model}", Qty=${qty}`);
      
      if (!description || !make || !model || qty === 0) continue;
      
      // Find unit cost (usually in a separate column or calculate from total)
      let unitCost = 0;
      
      // Look for unit cost in the same row across different columns
      for (let costCol = 0; costCol < headers.length; costCol++) {
        if (headers[costCol].includes('COST') || headers[costCol].includes('PRICE')) {
          const costCell = sheet[XLSX.utils.encode_cell({ r: R, c: costCol })];
          if (costCell) {
            unitCost = parseFloat(String(costCell.v)) || 0;
            break;
          }
        }
      }
      
      // If no unit cost found, try to calculate from total
      if (unitCost === 0) {
        for (let totalCol = 0; totalCol < headers.length; totalCol++) {
          if (headers[totalCol].includes('TOTAL')) {
            const totalCell = sheet[XLSX.utils.encode_cell({ r: R, c: totalCol })];
            if (totalCell && qty > 0) {
              const total = parseFloat(String(totalCell.v)) || 0;
              unitCost = total / qty;
              break;
            }
          }
        }
      }
      
      if (unitCost === 0) {
        invalidEntries.push({
          description,
          make,
          model,
          qty,
          unit_cost: 0,
          room_type: roomType,
          currency,
          region,
          country,
          source_file: fileName,
          reason: 'Zero unit cost'
        });
        continue;
      }
      
      components.push({
        description,
        make,
        model,
        qty,
        unit_cost: unitCost,
        room_type: roomType,
        currency,
        region,
        country,
        source_file: fileName,
        component_type: 'AV Equipment',
        component_category: 'Hardware'
      });
    }
    
    if (components.length > 0) {
      const totalCost = components.reduce((sum, comp) => sum + (comp.qty * comp.unit_cost), 0);
      const paxMatch = roomType.match(/(\d+)pax/i);
      const paxCount = paxMatch ? parseInt(paxMatch[1]) : 0;
      const subType = determineSubType(roomType, totalCost, components);
      
      // Find room count from row 6 data
      const roomCountData = roomCounts.find(rc => rc.roomType === roomType);
      const roomCount = roomCountData ? roomCountData.count : 1; // Default to 1 if not found
      
      roomTypes.push({
        room_type: roomType,
        components,
        total_cost: totalCost,
        pax_count: paxCount,
        category: categorizeRoomType(roomType, components),
        labour_cost: labourCost, // Use extracted labour cost
        miscellaneous_cost: miscellaneousCost, // Use extracted miscellaneous cost
        sub_type: subType, // Add sub-type variant
        count: roomCount // Add room count from row 6
      });
      
      console.log(`Created room type: ${roomType} (${subType} variant) - Total cost: ${totalCost}, Room count: ${roomCount} (last valid data row: ${lastValidDataRow + 1})`);
    }
  });
  
  // Filter out non-hardware items from all room types
  console.log('\n=== Filtering out non-hardware items from BOQ ===');
  const nonHardwareKeywords = [
    'miscellaneous hardware', 'connectors', 'av cabling', 'freight and insurance cost for delivery',
    'aircharge airmag silver collar', 'project management', 'training and documentation',
    'installation, testing & commissioning', 'painting charges for painting existing',
    'termination block', 'lump sum', 'service'
  ];
  
  roomTypes.forEach(roomType => {
    const originalCount = roomType.components.length;
    roomType.components = roomType.components.filter(component => {
      if (!component.description || typeof component.description !== 'string') return true; // Keep components without description
      const desc = component.description.toLowerCase();
      const shouldExclude = nonHardwareKeywords.some(keyword => desc.includes(keyword));
      
      if (shouldExclude) {
        console.log(`Excluding from ${roomType.room_type}: "${component.description}"`);
      }
      
      return !shouldExclude;
    });
    
    const filteredCount = roomType.components.length;
    const excludedCount = originalCount - filteredCount;
    
    if (excludedCount > 0) {
      console.log(`Filtered ${roomType.room_type}: ${originalCount} → ${filteredCount} components (excluded ${excludedCount})`);
      
      // Recalculate total cost after filtering
      roomType.total_cost = roomType.components.reduce((sum, comp) => sum + (comp.qty * comp.unit_cost), 0);
      console.log(`Updated total cost for ${roomType.room_type}: ${roomType.total_cost}`);
    }
  });
  
  console.log('\n=== FINAL RESULTS ===');
  console.log(`Total room types found: ${roomTypes.length}`);
  console.log(`Total labour cost: ${labourCost}`);
  console.log(`Total miscellaneous cost: ${miscellaneousCost}`);
  
  return {
    roomTypes,
    invalidEntries,
    labourCost,
    miscellaneousCost,
    sourceFile: fileName
  };
};

// Legacy function for backward compatibility
// const parseMultiRoomSheet = (
//   workbook: XLSX.WorkBook,
//   fileName: string,
//   region: string,
//   country: string,
//   currency: string
// ): ExcelParseResult => {
//   return parseMaterialsListSheet(workbook, fileName, region, country, currency);
// };

const parseSingleRoomSheets = (
  workbook: XLSX.WorkBook,
  fileName: string,
  region: string,
  country: string,
  currency: string
): ExcelParseResult => {
  const roomTypes: RoomTypeData[] = [];
  const invalidEntries: any[] = [];
  let labourCost = 0;
  let miscellaneousCost = 0;
  
  console.log('Processing separate room sheets:', workbook.SheetNames);
  
  // First, process the Summary sheet to extract labour costs
  const summarySheet = workbook.Sheets['Summary'];
  if (summarySheet) {
    console.log('Processing Summary sheet for labour costs...');
    const summaryRange = XLSX.utils.decode_range(summarySheet['!ref'] || '');
    
    // Debug: Show Summary sheet content
    console.log('=== Summary Sheet Debug ===');
    for (let debugRow = 0; debugRow <= Math.min(20, summaryRange.e.r); ++debugRow) {
      const descCell = summarySheet[XLSX.utils.encode_cell({ r: debugRow, c: 1 })];
      const costCell = summarySheet[XLSX.utils.encode_cell({ r: debugRow, c: 6 })]; // Column G
      
      const desc = descCell ? String(descCell.v).trim() : '';
      const cost = costCell ? String(costCell.v).trim() : '';
      
      if (desc || cost) {
        console.log(`Summary Row ${debugRow + 1}: Desc="${desc}", Cost="${cost}"`);
      }
    }
    console.log('=== End Summary Debug ===');
    
    // Look for conceptualization item specifically and get cost from column G
    for (let R = 0; R <= summaryRange.e.r; ++R) {
      for (let C = 0; C <= summaryRange.e.c; ++C) {
        const cell = summarySheet[XLSX.utils.encode_cell({ r: R, c: C })];
        if (cell) {
          const cellValue = String(cell.v).toLowerCase();
          if (cellValue.includes('conceptualization') || cellValue.includes('conceptulizing') || 
              cellValue.includes('design engineering') || cellValue.includes('programming') ||
              cellValue.includes('installation') || cellValue.includes('commissioning') ||
              cellValue.includes('documentation') || cellValue.includes('user orientation')) {
            
            console.log(`Found labour-related item in Summary sheet row ${R + 1}: "${cell.v}"`);
            
            // Look specifically in column G (index 6) for the cost
            const costCell = summarySheet[XLSX.utils.encode_cell({ r: R, c: 6 })];
            if (costCell) {
              const costValue = String(costCell.v);
              const cleanCost = costValue.replace(/[₹,\s]/g, '');
              const cost = parseFloat(cleanCost);
              
              if (!isNaN(cost) && cost > 0) {
                labourCost += cost;
                console.log(`Found labour cost in Summary sheet column G: "${cell.v}" = ${cost}`);
                break;
              }
            }
            
            // If not found in column G, search nearby columns
            for (let costCol = C + 1; costCol <= Math.min(C + 10, summaryRange.e.c); ++costCol) {
              const costCell = summarySheet[XLSX.utils.encode_cell({ r: R, c: costCol })];
              if (costCell) {
                const costValue = String(costCell.v);
                const cleanCost = costValue.replace(/[₹,\s]/g, '');
                const cost = parseFloat(cleanCost);
                
                if (!isNaN(cost) && cost > 0) {
                  labourCost += cost;
                  console.log(`Found labour cost in Summary sheet: "${cell.v}" = ${cost} (from column ${costCol + 1})`);
                  break;
                }
              }
            }
          }
        }
      }
    }
    
    console.log(`Total labour cost extracted from Summary sheet: ${labourCost}`);
  }
  
  workbook.SheetNames.forEach(sheetName => {
    try {
      // Skip summary, index, or other non-room sheets (but we already processed Summary above)
      if (!sheetName || typeof sheetName !== 'string') {
        console.log('Skipping invalid sheet name:', sheetName);
        return;
      }
      
      if (sheetName.toLowerCase().includes('summary') || 
          sheetName.toLowerCase().includes('index') ||
          sheetName.toLowerCase().includes('total') ||
          sheetName.toLowerCase().includes('overview')) {
        console.log('Skipping non-room sheet:', sheetName);
        return;
      }
    
    console.log('Processing sheet:', sheetName);
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return;
    
    const range = XLSX.utils.decode_range(sheet['!ref'] || '');
    if (range.e.r < 5) {
      console.log('Sheet too small, skipping:', sheetName);
      return;
    }
    
    // Debug: Show first few rows to understand structure
    console.log('=== Sheet Structure Debug ===');
    for (let debugRow = 0; debugRow <= Math.min(15, range.e.r); ++debugRow) {
      const descCell = sheet[XLSX.utils.encode_cell({ r: debugRow, c: 1 })];
      const makeCell = sheet[XLSX.utils.encode_cell({ r: debugRow, c: 2 })];
      const modelCell = sheet[XLSX.utils.encode_cell({ r: debugRow, c: 3 })];
      const qtyCell = sheet[XLSX.utils.encode_cell({ r: debugRow, c: 4 })];
      
      const desc = descCell ? String(descCell.v).trim() : '';
      const make = makeCell ? String(makeCell.v).trim() : '';
      const model = modelCell ? String(modelCell.v).trim() : '';
      const qty = qtyCell ? String(qtyCell.v).trim() : '';
      
      if (desc || make || model || qty) {
        console.log(`Row ${debugRow + 1}: Desc="${desc}", Make="${make}", Model="${model}", Qty="${qty}"`);
      }
    }
    console.log('=== End Debug ===');
    
    // Extract room type name from sheet name
    const roomType = normalizeRoomTypeName(sheetName);
    console.log('Extracted room type from sheet name:', sheetName, '→', roomType);
    
    // Skip if room type couldn't be extracted (but allow the original sheet name if normalization didn't change it)
    if (!roomType) {
      console.log('Could not extract valid room type from sheet name, skipping:', sheetName);
      return;
    }
    
    const components: ExcelComponent[] = [];
    
    // Find header row by looking for 'Description' column
    let headerRowIndex = 0;
    for (let R = 0; R <= Math.min(20, range.e.r); ++R) { // Increased search range to 20 rows
      // Look for 'Description' in column B (index 1) since column A is usually S.NO
      const cell = sheet[XLSX.utils.encode_cell({ r: R, c: 1 })];
      if (cell && String(cell.v).toLowerCase().includes('description')) {
        headerRowIndex = R;
        break;
      }
    }
    
    console.log('Found header row at index:', headerRowIndex);
    
    // Extract headers
    const headers: string[] = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell = sheet[XLSX.utils.encode_cell({ r: headerRowIndex, c: C })];
      const rawHeader = cell ? String(cell.v) : '';
      const normalized = normalizeHeader(rawHeader);
      headers.push(headerMap[normalized] || normalized);
    }
    
    console.log('Headers found:', headers);
    
    // Helper function to check if a row is a section header
    const isSectionHeader = (rowIndex: number): boolean => {
      const descCell = sheet[XLSX.utils.encode_cell({ r: rowIndex, c: 1 })];
      if (!descCell || !descCell.v) return false;
      
      const desc = String(descCell.v).trim().toLowerCase();
      if (!desc) return false;
      
      // Check for section header patterns
      const sectionPatterns = [
        /^[ivxlcdm]+\.\s*/, // Roman numerals like "I.", "II.", "III."
        /^[a-z]\.\s*/, // Letters like "A.", "B.", "C."
        /^[0-9]+\.\s*/, // Numbers like "1.", "2.", "3."
        /installation materials/i,
        /display devices/i,
        /accessories/i,
        /materials/i,
        /devices/i,
        /equipment/i,
        /components/i,
        /hardware/i,
        /software/i,
        /services/i
      ];
      
      return sectionPatterns.some(pattern => pattern.test(desc));
    };
    
    // Helper function to check if a row contains valid component data
    const hasValidComponentData = (rowIndex: number): boolean => {
      const descriptionCell = sheet[XLSX.utils.encode_cell({ r: rowIndex, c: 1 })];
      const makeCell = sheet[XLSX.utils.encode_cell({ r: rowIndex, c: 2 })];
      const modelCell = sheet[XLSX.utils.encode_cell({ r: rowIndex, c: 3 })];
      const qtyCell = sheet[XLSX.utils.encode_cell({ r: rowIndex, c: 4 })];
      
      if (!descriptionCell || !makeCell || !modelCell) return false;
      
      const description = String(descriptionCell.v).trim();
      const make = String(makeCell.v).trim();
      const model = String(modelCell.v).trim();
      const qty = qtyCell ? cleanIndianNumber(String(qtyCell.v)) : 0;
      
      // Must have description, make, and model, and quantity > 0
      return description.length > 0 && make.length > 0 && model.length > 0 && qty > 0;
    };
    
    // Helper function to check if a row is completely blank
    const isCompletelyBlank = (rowIndex: number): boolean => {
      for (let C = 0; C <= Math.min(10, range.e.c); ++C) { // Check first 10 columns
        const cell = sheet[XLSX.utils.encode_cell({ r: rowIndex, c: C })];
        if (cell && String(cell.v).trim().length > 0) {
          return false;
        }
      }
      return true;
    };
    
    // Process data rows with improved logic
    let consecutiveBlankRows = 0;
    const maxConsecutiveBlanks = 15; // Increased to handle more blank rows
    let lastValidDataRow = headerRowIndex;
    
    for (let R = headerRowIndex + 1; R <= range.e.r; ++R) {
      // Updated column indices for Chennai structure:
      // Column A (0): S.NO
      // Column B (1): DESCRIPTION  
      // Column C (2): MAKE
      // Column D (3): MODEL
      // Column E (4): QTY
      // Column F/G/H: PRICE columns
      const descriptionCell = sheet[XLSX.utils.encode_cell({ r: R, c: 1 })]; // Column B
      const makeCell = sheet[XLSX.utils.encode_cell({ r: R, c: 2 })]; // Column C
      const modelCell = sheet[XLSX.utils.encode_cell({ r: R, c: 3 })]; // Column D
      const qtyCell = sheet[XLSX.utils.encode_cell({ r: R, c: 4 })]; // Column E
      
      // Look for unit price in the price columns (F, G, H)
      let unitCostCell = null;
      for (let priceCol = 5; priceCol <= Math.min(7, range.e.c); ++priceCol) {
        const cell = sheet[XLSX.utils.encode_cell({ r: R, c: priceCol })];
        if (cell && !isNaN(parseFloat(String(cell.v)))) {
          unitCostCell = cell;
          break;
        }
      }
      
      // Check if this is a section header
      if (isSectionHeader(R)) {
        console.log(`Row ${R + 1}: Section header detected: "${descriptionCell ? String(descriptionCell.v) : ''}"`);
        consecutiveBlankRows = 0; // Reset blank row counter
        continue; // Skip section headers but continue parsing
      }
      
      // Check if this row is completely blank
      if (isCompletelyBlank(R)) {
        consecutiveBlankRows++;
        console.log(`Row ${R + 1}: Completely blank row (consecutive blanks: ${consecutiveBlankRows})`);
        
        // If we've hit too many consecutive blank rows, stop processing
        if (consecutiveBlankRows >= maxConsecutiveBlanks) {
          console.log(`Stopping at row ${R + 1} - reached ${maxConsecutiveBlanks} consecutive blank rows`);
          break;
        }
        continue;
      }
      
      // Check if this row has valid component data
      if (!hasValidComponentData(R)) {
        // This row has some data but not valid component data
        // Check if it might be a continuation or sub-item
        const desc = descriptionCell ? String(descriptionCell.v).trim() : '';
        const make = makeCell ? String(makeCell.v).trim() : '';
        const model = modelCell ? String(modelCell.v).trim() : '';
        
        // If we have some meaningful data, log it but don't count as blank
        if (desc || make || model) {
          console.log(`Row ${R + 1}: Partial data - Desc="${desc}", Make="${make}", Model="${model}" (continuing)`);
          consecutiveBlankRows = 0;
        } else {
          consecutiveBlankRows++;
        }
        continue;
      }
      
      // Reset blank row counter if we found valid data
      consecutiveBlankRows = 0;
      lastValidDataRow = R;
      
      const description = String(descriptionCell.v).trim();
      const make = String(makeCell.v).trim();
      const model = String(modelCell.v).trim();
      const qty = qtyCell ? cleanIndianNumber(String(qtyCell.v)) : 0;
      const unitCost = unitCostCell ? cleanIndianNumber(String(unitCostCell.v)) : 0;
      
      console.log(`Processing row ${R + 1}: Description="${description}", Make="${make}", Model="${model}", Qty=${qty}, UnitCost=${unitCost}`);
      
      if (!description || !make || !model || qty === 0 || unitCost === 0) continue;
      
      // Check if this is a labour or miscellaneous cost item (embedded in component data)
      const descLower = description.toLowerCase();
      const isLabourItem = descLower.includes('project management') || descLower.includes('training') ||
                          descLower.includes('documentation') || descLower.includes('painting charges') ||
                          descLower.includes('painting cost') || descLower.includes('programming cost') ||
                          descLower.includes('installation') || descLower.includes('commissioning') ||
                          descLower.includes('testing') || descLower.includes('lump sum');
      
      const isMiscItem = descLower.includes('miscellaneous hardware') || descLower.includes('freight') ||
                        descLower.includes('delivery') || descLower.includes('insurance') ||
                        descLower.includes('airmag') || descLower.includes('aircharge') ||
                        descLower.includes('connectors') || descLower.includes('av cabling') ||
                        descLower.includes('termination block');
      
      if (isLabourItem) {
        const totalComponentCost = qty * unitCost;
        labourCost += totalComponentCost;
        console.log(`✓ Found embedded LABOUR cost: "${description}" = ${totalComponentCost}`);
        continue; // Skip adding to components array
      }
      
      if (isMiscItem) {
        const totalComponentCost = qty * unitCost;
        miscellaneousCost += totalComponentCost;
        console.log(`✓ Found embedded MISCELLANEOUS cost: "${description}" = ${totalComponentCost}`);
        continue; // Skip adding to components array
      }
      
      // Skip labour and miscellaneous items that appear at the bottom of the sheet
      const isBottomLabourItem = descLower.includes('labour cost') || descLower.includes('labor cost') || 
                                descLower.includes('installation cost') || descLower.includes('commissioning cost') ||
                                descLower.includes('programming cost') || descLower.includes('training cost') ||
                                descLower.includes('project management') || descLower.includes('training') ||
                                descLower.includes('documentation') || descLower.includes('painting charges') ||
                                descLower.includes('painting cost') || descLower.includes('programming');
      
      const isBottomMiscItem = descLower.includes('miscellaneous cost') || descLower.includes('misc cost') ||
                              descLower.includes('miscellaneous hardware') || descLower.includes('accessories') || 
                              descLower.includes('materials') || descLower.includes('delivery') ||
                              descLower.includes('freight') || descLower.includes('insurance') ||
                              descLower.includes('packing') || descLower.includes('airmag') ||
                              descLower.includes('aircharge') || descLower.includes('lumpsum');
      
      if (isBottomLabourItem || isBottomMiscItem) {
        console.log(`Skipping bottom cost item: "${description}" (already processed)`);
        continue;
      }
      
      // Categorize the component
      const costCategory = categorizeCostItem(description);
      const totalComponentCost = qty * unitCost;
      
      console.log(`Row ${R + 1} categorization: "${description}" → ${costCategory} (${totalComponentCost})`);
      
      if (costCategory === 'labour') {
        labourCost += totalComponentCost;
        console.log(`✓ Added to LABOUR: "${description}" = ${totalComponentCost}`);
        continue; // Skip adding to components array
      } else if (costCategory === 'miscellaneous') {
        miscellaneousCost += totalComponentCost;
        console.log(`✓ Added to MISCELLANEOUS: "${description}" = ${totalComponentCost}`);
        continue; // Skip adding to components array
      }
      
      console.log(`✓ Added to HARDWARE: "${description}" = ${totalComponentCost}`);
      
      // Only add hardware components to the components array
      components.push({
        description,
        make,
        model,
        qty,
        unit_cost: unitCost,
        room_type: roomType,
        currency,
        region,
        country,
        source_file: fileName,
        component_type: 'AV Equipment',
        component_category: 'Hardware'
      });
    }
    
    console.log(`Found ${components.length} components in sheet ${sheetName} (last valid data row: ${lastValidDataRow + 1})`);
    
    if (components.length > 0) {
      const totalCost = components.reduce((sum, comp) => sum + (comp.qty * comp.unit_cost), 0);
      const paxMatch = roomType.match(/(\d+)pax/i);
      const paxCount = paxMatch ? parseInt(paxMatch[1]) : 0;
      
      roomTypes.push({
        room_type: roomType,
        components,
        total_cost: totalCost,
        pax_count: paxCount,
        category: categorizeRoomType(roomType, components)
      });
      
      console.log(`Created room type: ${roomType} with ${components.length} components, total cost: ${totalCost}`);
    }
    } catch (error) {
      console.error(`Error processing sheet ${sheetName}:`, error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    }
  });
  
  console.log(`Total room types created from separate sheets: ${roomTypes.length}`);
  console.log(`Total labour cost extracted: ${labourCost}`);
  console.log(`Total miscellaneous cost extracted: ${miscellaneousCost}`);
  
  return {
    roomTypes,
    invalidEntries,
    labourCost,
    miscellaneousCost,
    sourceFile: fileName
  };
};

export const parseExcelFile = async (
  file: File,
  region: string,
  country: string,
  currency: string
): Promise<ExcelParseResult> => {
  return new Promise((resolve, reject) => {
    // Validate file input
    if (!file || !(file instanceof File)) {
      reject(new Error('Invalid file input: file must be a valid File object'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        if (!e.target?.result) {
          reject(new Error('Failed to read file: no result from FileReader'));
          return;
        }

        const data = new Uint8Array(e.target.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        console.log('Excel file sheets:', workbook.SheetNames);
        
        const hasMultipleSheets = workbook.SheetNames.length > 1;
        const hasAVSheet = workbook.SheetNames.some(name => {
          if (!name || typeof name !== 'string') return false;
          return name.toLowerCase().includes('av') ||
                 name.toLowerCase().includes('boq');
        });

        let result: ExcelParseResult;
        
        // Check if this is a single-sheet file with multiple room types
        if (!hasMultipleSheets || hasAVSheet) {
          console.log('Using parseMaterialsListSheet - single sheet or has AV sheet');
          result = parseMaterialsListSheet(workbook, file.name, region, country, currency);
        } else {
          // Multiple sheets without AV sheet - treat as separate room sheets
          console.log('Using parseSingleRoomSheets - multiple sheets without AV');
          result = parseSingleRoomSheets(workbook, file.name, region, country, currency);
        }
        
        console.log('Parsing result:', result);
        resolve(result);
      } catch (error) {
        console.error('Excel parsing error:', error);
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}; 