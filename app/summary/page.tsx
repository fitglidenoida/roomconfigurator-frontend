'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { apiService } from '../lib/api';
import { parseExcelFile, parseMaterialsListSheet, ExcelParseResult, RoomTypeData, categorizeCostItem } from '../lib/excelParser';

const regionMap: Record<string, string[]> = {
  NAMR: ['USA', 'Canada', 'Mexico'],
  EMESA: ['United Kingdom', 'Germany', 'France', 'South Africa', 'Netherlands'],
  'APACME': ['India', 'Singapore', 'UAE', 'Qatar'],
};

const countryRegionMap: Record<string, { region: string; country: string }> = {
  London: { region: 'EMESA', country: 'United Kingdom' },
  Chennai: { region: 'APACME', country: 'India' },
  Bangalore: { region: 'APACME', country: 'India' },
  Raleigh: { region: 'NAMR', country: 'USA' },
  Boston: { region: 'NAMR', country: 'USA' },
  Amsterdam: { region: 'EMESA', country: 'Netherlands' },
  Dubai: { region: 'APACME', country: 'UAE' },
  Doha: { region: 'APACME', country: 'Qatar' },
  Singapore: { region: 'APACME', country: 'Singapore' },
  Delhi: { region: 'APACME', country: 'India' },
  Mumbai: { region: 'APACME', country: 'India' },
  Paris: { region: 'EMESA', country: 'France' },
  Sydney: { region: 'EMESA', country: 'Australia' },
  Toronto: { region: 'NAMR', country: 'Canada' },
  Hyderabad: { region: 'APACME', country: 'India' },
  Melbourne: { region: 'EMESA', country: 'Australia' },
  Mexico: { region: 'NAMR', country: 'Mexico' },
  Madrid: { region: 'EMESA', country: 'Spain' },
  Kolkata: { region: 'APACME', country: 'India' },
  Pune: { region: 'APACME', country: 'India' },
};

const countryCurrencyMap: Record<string, string> = {
  India: 'INR',
  USA: 'USD',
  Canada: 'CAD',
  Mexico: 'MXN',
  'United Kingdom': 'GBP',
  Germany: 'EUR',
  France: 'EUR',
  'South Africa': 'ZAR',
  Singapore: 'SGD',
  UAE: 'AED',
  Qatar: 'QAR',
  Netherlands: 'EUR',
};

const symbolToCurrencyMap: Record<string, string> = {
  '₹': 'INR',
  '$': 'USD',
  '€': 'EUR',
  '£': 'GBP',
  AED: 'AED',
  SGD: 'SGD',
  QAR: 'QAR',
  ZAR: 'ZAR',
};

export default function ProjectMetadataForm() {
  const router = useRouter();
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('');
  const [currency, setCurrency] = useState('');
  const [capex, setCapex] = useState('');
  const [networkCost, setNetworkCost] = useState('');
  const [labourCost, setLabourCost] = useState('');
  const [inflation, setInflation] = useState('15'); // Default 15% inflation
  const [miscCost, setMiscCost] = useState('');
  const [projectName, setProjectName] = useState('');
  
  // Labour cost calculation based on region/country
  const getLabourCostPercentage = (region: string, country: string): number => {
    // Different labour cost percentages based on region/country
    const labourRates: { [key: string]: number } = {
      'APACME': 12, // 12% for APACME region
      'EMESA': 15,  // 15% for EMESA region
      'NAMR': 18,   // 18% for NAMR region
      'United Kingdom': 18,     // 18% for UK
      'USA': 20,     // 20% for US
      'Canada': 16, // 16% for Canada
      'Australia': 14, // 14% for Australia
      'Singapore': 13, // 13% for Singapore
      'India': 10,  // 10% for India
      'UAE': 12,    // 12% for UAE
      'Qatar': 12,  // 12% for Qatar
    };
    
    // Try country first, then region, then default
    return labourRates[country] || labourRates[region] || 15;
  };
  
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [invalidEntries, setInvalidEntries] = useState<any[]>([]);
  
  // New state for room configuration workflow
  const [parseResult, setParseResult] = useState<ExcelParseResult | null>(null);
  const [fileType, setFileType] = useState<'SRM' | 'BOQ' | null>(null);
  const [detectedFileType, setDetectedFileType] = useState<'SRM' | 'BOQ' | null>(null);
  const [fileContent, setFileContent] = useState<any>(null);
  const [showFileTypeConfirmation, setShowFileTypeConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [projectCreated, setProjectCreated] = useState(false);
  
  // Calculate total room costs from parsed data
  const calculateTotalRoomCosts = (): number => {
    if (!parseResult || !parseResult.roomTypes) return 0;
    return parseResult.roomTypes.reduce((sum: number, room: any) => sum + (room.total_cost || 0), 0);
  };
  
  // Calculate total hardware cost (room costs + network + miscellaneous)
  const calculateTotalHardwareCost = (): number => {
    const roomCosts = calculateTotalRoomCosts();
    const networkCostValue = parseFloat(networkCost) || 0;
    const miscCostValue = parseFloat(miscCost) || 0;
    return roomCosts + networkCostValue + miscCostValue;
  };

  // Calculate actual labour percentage based on manual entry or default
  const getActualLabourPercentage = (): number => {
    const manualLabourCost = parseFloat(labourCost) || 0;
    const totalHardwareCost = calculateTotalHardwareCost();
    
    if (manualLabourCost > 0 && totalHardwareCost > 0) {
      return (manualLabourCost / totalHardwareCost) * 100;
    }
    
    return getLabourCostPercentage(region, country);
  };
  
  // Auto-calculate labour cost when region/country changes or room data changes
  useEffect(() => {
    if (region && country && parseResult) {
      // Only auto-calculate if user hasn't manually entered a labour cost
      const currentLabourCost = parseFloat(labourCost) || 0;
      if (currentLabourCost === 0) {
        // If no manual entry, calculate based on total hardware cost
        const totalHardwareCost = calculateTotalHardwareCost();
        const labourPercentage = getLabourCostPercentage(region, country);
        const calculatedLabourCost = totalHardwareCost * (labourPercentage / 100);
        setLabourCost(calculatedLabourCost.toFixed(2));
      }
      // If user has entered a value, keep it as is
    } else if (region && country && !parseResult) {
      // If no room data yet, just show the percentage for reference
      const currentLabourCost = parseFloat(labourCost) || 0;
      if (currentLabourCost === 0) {
        setLabourCost(''); // Clear the field until we have room data
      }
    }
  }, [region, country, parseResult, networkCost, miscCost]);

  const handleInputChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const payload = {
      project_name: projectName,
      region,
      country,
      currency,
      capex_amount: parseFloat(capex) || 0,
      network_cost: parseFloat(networkCost) || 0,
      labour_cost: parseFloat(labourCost) || 0,
      inflation: parseFloat(inflation) || 0,
      misc_cost: parseFloat(miscCost) || 0,
    };

    try {
      await apiService.createProject(payload);
      setSuccess('Project data submitted successfully!');
    } catch (err) {
      console.error('Submission error:', err);
      setError('Failed to submit project data. Please try again.');
    }
  };

  const handleCountryChange = (val: string) => {
    setCountry(val);
    const currency = countryCurrencyMap[val] || '';
    setCurrency(currency);
  };

  // Function to detect file type (SRM vs BOQ)
  const detectFileType = (fileName: string, fileContent: any): 'SRM' | 'BOQ' => {
    const fileNameLower = fileName.toLowerCase();
    
    // Check file name for clues
    if (fileNameLower.includes('srm') || fileNameLower.includes('space') || fileNameLower.includes('requirement')) {
      return 'SRM';
    }
    if (fileNameLower.includes('boq') || fileNameLower.includes('bill') || fileNameLower.includes('quantity')) {
      return 'BOQ';
    }
    
    // Check content structure - SRM typically has room counts, BOQ has detailed components
    // This is a simplified check - you can enhance this based on your actual file structures
    if (fileContent && typeof fileContent === 'object') {
      const hasRoomCounts = Object.values(fileContent).some((sheet: any) => 
        sheet && Array.isArray(sheet) && sheet.some((row: any) => 
          row && typeof row === 'object' && 
          (row.room_type || row.room_name || row.count || row.quantity)
        )
      );
      
      if (hasRoomCounts) {
        return 'SRM';
      }
    }
    
    // Default to SRM if uncertain
    return 'SRM';
  };

  // Simple SRM parser that extracts room types without validation
  const parseSRMFile = async (
    fileContent: any,
    region: string,
    country: string,
    currency: string
  ): Promise<ExcelParseResult> => {
    return new Promise((resolve, reject) => {
      try {
        // Process the file content directly
        const roomTypes: RoomTypeData[] = [];
        const invalidEntries: any[] = [];
        
        // Process each sheet in the file content
        Object.keys(fileContent).forEach(sheetName => {
          console.log(`Processing sheet: ${sheetName}`);
          const sheetData = fileContent[sheetName];
          if (!Array.isArray(sheetData)) return;
          
          console.log(`Sheet data rows: ${sheetData.length}`);
          
          // Look for room type and count columns
          console.log(`\n=== Processing rows in ${sheetName} ===`);
          sheetData.forEach((row: any, rowIndex: number) => {
            // Debug: Show what we're reading
            const roomTypeValue = row.room_type || row.room_name || row['Room Type'] || row['Room Name'] || '';
            const countValue = row.count || row.quantity || row.Count || row.Quantity || 0;
            console.log(`Row ${rowIndex + 1}: room_type="${roomTypeValue}", count="${countValue}"`);
            
            if (roomTypeValue && countValue) {
              const roomTypeName = String(roomTypeValue).trim();
              const count = parseFloat(String(countValue)) || 0;
              
              // Skip empty rows
              if (!roomTypeName) {
                return;
              }
              
              // Skip header row (contains "room type" or similar)
              if (roomTypeName.toLowerCase().includes('room type') || 
                  roomTypeName.toLowerCase().includes('space type') ||
                  roomTypeName.toLowerCase().includes('type') && roomTypeName.toLowerCase().includes('count')) {
                console.log(`Skipping header row: "${roomTypeName}"`);
                return;
              }
              
              // Skip if count is 0 or invalid
              if (count <= 0) {
                console.log(`Skipping zero count for: "${roomTypeName}"`);
                return;
              }
              
              // Normalize room type name (convert "Single Offices" to "Partner Cabins")
              let normalizedRoomType = roomTypeName;
              if (roomTypeName.toLowerCase().includes('single office') || roomTypeName.toLowerCase().includes('single offices')) {
                normalizedRoomType = 'Partner Cabins';
              }
              
              // Create a simple room type entry without components
              roomTypes.push({
                room_type: normalizedRoomType,
                components: [], // Empty components array for SRM
                total_cost: 0, // Will be calculated later during mapping
                pax_count: 0,
                category: 'SRM Room Type',
                labour_cost: 0,
                miscellaneous_cost: 0,
                sub_type: 'Standard',
                count: count // Store the count from SRM
              });
              
              console.log(`Found SRM room type: ${roomTypeName} -> ${normalizedRoomType} (count: ${count})`);
            }
          });
          
          console.log(`Total room types found in sheet ${sheetName}: ${roomTypes.length}`);
        });
        
        const result: ExcelParseResult = {
          roomTypes,
          invalidEntries,
          labourCost: 0,
          miscellaneousCost: 0,
          sourceFile: 'SRM File'
        };
        
        resolve(result);
      } catch (error) {
        console.error('SRM parsing error:', error);
        reject(error);
      }
    });
  };

  // New handlers for room configuration workflow
  const handleRoomConfigFileUpload = async (file: File) => {
    if (!region || !country) {
      setError('Please select region and country first.');
      return;
    }

    // File validation for demo
    const maxSize = 10 * 1024 * 1024; // 10MB limit
    if (file.size > maxSize) {
      setError('File size too large. Please upload a file smaller than 10MB.');
      return;
    }

    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/octet-stream' // Some systems send this for Excel files
    ];
    
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      setError('Please upload a valid Excel file (.xlsx or .xls)');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // First, read the file to detect its type
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Convert workbook to JSON for analysis
          const fileContent: any = {};
          workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            fileContent[sheetName] = XLSX.utils.sheet_to_json(worksheet);
          });
          
          // Store file content and detected type for confirmation
          setFileContent(fileContent);
          const detectedType = detectFileType(file.name, fileContent);
          setDetectedFileType(detectedType);
          setShowFileTypeConfirmation(true);
          setLoading(false);
          
        } catch (error) {
          console.error('Error reading file:', error);
          setError('Failed to read the file. Please try again.');
          setLoading(false);
        }
      };
      
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error processing file:', error);
      setError('Failed to process the file. Please try again.');
      setLoading(false);
    }
  };

  const handleFileTypeConfirmation = async (confirmedType: 'SRM' | 'BOQ') => {
    setFileType(confirmedType);
    setShowFileTypeConfirmation(false);
    setLoading(true);
    
    try {
      if (confirmedType === 'SRM') {
        // Process as SRM - extract room requirements
        const result = await parseSRMFile(fileContent, region, country, currency);
        setParseResult(result);
        
        if (result.roomTypes.length === 0) {
          setError('No room types found in the SRM file.');
        } else {
          // Store SRM data in sessionStorage for room mapping page
          const srmData = result.roomTypes.map((room, index) => ({
            id: `srm-${index}`,
            room_name: room.room_type,
            space_type: room.room_type.toLowerCase().includes('partner') || 
                       room.room_type.toLowerCase().includes('office') || 
                       room.room_type.toLowerCase().includes('workstation') ||
                       room.room_type.toLowerCase().includes('cabin') ||
                       room.room_type.toLowerCase().includes('desk') ||
                       room.room_type.toLowerCase().includes('individual') ? 'i-space' : 'we-space',
            count: room.count || 1,
            category: room.category || 'SRM Room Type',
            description: `From SRM: ${room.room_type} (Count: ${room.count || 1})`
          }));
          
          sessionStorage.setItem('srmData', JSON.stringify(srmData));
          
          // Store project details for room mapping page
          // For SRM: Use manual input or calculated percentages (no extraction)
          const projectData = {
            region,
            country,
            currency,
            projectName,
            capex,
            networkCost,
            labourCost, // Use manual input for SRM
            miscCost,   // Use manual input for SRM
            inflation
          };
          sessionStorage.setItem('projectData', JSON.stringify(projectData));
          
          // Debug: Log SRM cost handling
          console.log('SRM Flow - Cost handling:', {
            manualLabourCost: labourCost,
            manualMiscCost: miscCost,
            calculatedLabourPercentage: getLabourCostPercentage(region, country),
            note: 'SRM uses manual input or calculated percentages (no extraction)'
          });
          
          setSuccess(`SRM file processed! Found ${result.roomTypes.length} room types. Ready to map to existing room types.`);
        }
              } else {
          // Process as BOQ - extract detailed components and create room instances
          const result = await parseExcelFileContent(fileContent, region, country, currency);
          setParseResult(result);
          
          if (result.roomTypes.length === 0) {
            setError('No valid components found in the BOQ file.');
          } else {
            // Create room instances and AV BOQ from the BOQ data
            await createRoomInstancesAndAVBOQ(result, region, country, currency);
            
            // Store project details for consistency with SRM flow
            // For BOQ: Use extracted costs from file, fallback to manual input
            const projectData = {
              region,
              country,
              currency,
              projectName,
              capex,
              networkCost,
              labourCost: result.labourCost || labourCost, // Use extracted labour cost if available
              miscCost: result.miscellaneousCost || miscCost, // Use extracted misc cost if available
              inflation
            };
            sessionStorage.setItem('projectData', JSON.stringify(projectData));
            
            // Store the parse result for room-types page
            sessionStorage.setItem('excelParseResult', JSON.stringify(result));
            
            // Create bill of materials for main configurator
            const billOfMaterials = result.roomTypes.flatMap(room => room.components);
            sessionStorage.setItem('billOfMaterials', JSON.stringify(billOfMaterials));
            
            // Create final project costs
            const totalHardwareCost = result.roomTypes.reduce((sum, room) => sum + room.total_cost, 0);
            // Use extracted labour and miscellaneous costs from parser, fallback to manual input or calculation
            const labourCostValue = result.labourCost || parseFloat(labourCost) || (totalHardwareCost * (getLabourCostPercentage(region, country) / 100));
            const inflationValue = parseFloat(inflation) || 0;
            const networkCostValue = parseFloat(networkCost) || 0;
            const miscCostValue = result.miscellaneousCost || parseFloat(miscCost) || 0;
            
            // Debug: Log which cost values are being used
            console.log('Cost extraction debug:', {
              extractedLabourCost: result.labourCost,
              manualLabourCost: parseFloat(labourCost),
              calculatedLabourCost: totalHardwareCost * (getLabourCostPercentage(region, country) / 100),
              finalLabourCost: labourCostValue,
              extractedMiscCost: result.miscellaneousCost,
              manualMiscCost: parseFloat(miscCost),
              finalMiscCost: miscCostValue
            });
            
            const finalProjectCosts = {
              hardware_cost: totalHardwareCost,
              labour_cost: labourCostValue,
              network_cost: networkCostValue,
              miscellaneous_cost: miscCostValue,
              inflation_amount: (totalHardwareCost + labourCostValue + networkCostValue + miscCostValue) * (inflationValue / 100),
              total_project_cost: totalHardwareCost + labourCostValue + networkCostValue + miscCostValue + ((totalHardwareCost + labourCostValue + networkCostValue + miscCostValue) * (inflationValue / 100))
            };
            sessionStorage.setItem('finalProjectCosts', JSON.stringify(finalProjectCosts));
            
            // Debug: Log all stored data
            console.log('BOQ Flow - All stored data:');
            console.log('projectData:', projectData);
            console.log('excelParseResult:', result);
            console.log('billOfMaterials:', billOfMaterials);
            console.log('finalProjectCosts:', finalProjectCosts);
            console.log('roomInstances:', sessionStorage.getItem('roomInstances'));
            console.log('avBOQ:', sessionStorage.getItem('avBOQ'));
            
            setSuccess(`BOQ file processed! Found ${result.roomTypes.length} room types. Created room instances and AV BOQ.`);
          }
        }
    } catch (error) {
      console.error('Error processing file:', error);
      setError('Failed to process the file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const parseExcelFileContent = async (fileContent: any, region: string, country: string, currency: string): Promise<ExcelParseResult> => {
    console.log('Parsing BOQ file content using intelligent parser');
    
    // Use XLSX directly instead of the File-based parser
    try {
      // Convert fileContent to workbook format that XLSX can process
      const workbook = XLSX.utils.book_new();
      
      // Add sheets to workbook
      Object.keys(fileContent).forEach(sheetName => {
        const sheetData = fileContent[sheetName];
        if (Array.isArray(sheetData)) {
          const worksheet = XLSX.utils.json_to_sheet(sheetData);
          XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        }
      });
      
      console.log('Created workbook with sheets:', workbook.SheetNames);
      
      // Use the existing robust Excel parser with workbook
      console.log('Using parseMaterialsListSheet for all BOQ files');
      const result = parseMaterialsListSheet(workbook, 'BOQ_File.xlsx', region, country, currency);
      
      console.log('Parsing result from existing parser:', result);
      return result;
    } catch (error) {
      console.error('Error using existing parser, falling back to intelligent simplified parser:', error);
      console.log('🤖 ML: Using intelligent fallback with sheet detection and type safety');
      
      // Intelligent fallback parser with ML-like sheet detection
      const roomTypes: RoomTypeData[] = [];
      const invalidEntries: any[] = [];
      
      // ML-like sheet detection: Skip irrelevant sheets
      const relevantSheets = Object.keys(fileContent).filter(sheetName => {
        const lowerSheetName = sheetName.toLowerCase();
        // Skip sheets that are typically not room data
        const skipSheets = ['summary', 'index', 'contents', 'toc', 'metadata', 'info', 'notes', 'readme'];
        const shouldSkip = skipSheets.some(skip => lowerSheetName.includes(skip));
        
        if (shouldSkip) {
          console.log(`🤖 ML: Skipping irrelevant sheet "${sheetName}" (contains: ${skipSheets.find(skip => lowerSheetName.includes(skip))})`);
          return false;
        }
        
        // Prefer sheets with more data (likely to be main content)
        const sheetData = fileContent[sheetName];
        const hasEnoughData = Array.isArray(sheetData) && sheetData.length > 10;
        
        if (!hasEnoughData) {
          console.log(`🤖 ML: Skipping sheet "${sheetName}" (insufficient data: ${sheetData?.length || 0} rows)`);
          return false;
        }
        
        console.log(`🤖 ML: Processing relevant sheet "${sheetName}" (${sheetData.length} rows)`);
        return true;
      });
      
      if (relevantSheets.length === 0) {
        console.error('🤖 ML: No relevant sheets found! Available sheets:', Object.keys(fileContent));
        throw new Error('No relevant sheets found in the file');
      }
      
      // Process only relevant sheets
      relevantSheets.forEach(sheetName => {
        console.log(`Processing relevant sheet: ${sheetName}`);
        const sheetData = fileContent[sheetName];
        
        console.log(`Sheet ${sheetName} has ${sheetData.length} rows`);
        
        // For BOQ files, the room type is the sheet name itself
        const roomType = sheetName;
        console.log(`Using sheet name as room type: ${roomType}`);
        
        // Filter and process components using the existing categorization logic
        const components = sheetData.map((row: any) => {
          // Handle BOQ structure with __EMPTY_ fields
          const description = row.__EMPTY_1 || row.description || row.Description || row.desc || row.Desc || row.name || row.Name || '';
          const make = row.__EMPTY_2 || row.make || row.Make || row.manufacturer || row.Manufacturer || '';
          const model = row.__EMPTY_3 || row.model || row.Model || row.model_number || row.ModelNumber || '';
          const qty = parseFloat(row.__EMPTY_4 || row.qty || row.Qty || row.quantity || row.Quantity || row.QTY || '1') || 1;
          const unit_cost = parseFloat(row.__EMPTY_6 || row.unit_cost || row['Unit Cost'] || row.unit_price || row['Unit Price'] || row.price || row.Price || row.cost || row.Cost || '0') || 0;
          
          return {
            description: String(description || ''), // Ensure string type
            make: String(make || ''),
            model: String(model || ''),
            qty,
            unit_cost,
            room_type: roomType,
            currency: currency,
            region: region,
            country: country,
            source_file: 'BOQ File'
          };
        }).filter((comp: any) => {
          // Use the existing categorization logic to filter out non-hardware items
          const category = categorizeCostItem(comp.description);
          return category === 'hardware' && comp.description && comp.unit_cost > 0 && comp.description.trim() !== '';
        });
        
        if (components.length > 0) {
          const totalCost = components.reduce((sum: number, comp: any) => sum + (comp.qty * comp.unit_cost), 0);
          
          const roomTypeData = {
            room_type: roomType,
            components,
            total_cost: totalCost,
            pax_count: 0,
            category: 'BOQ Room Type',
            sub_type: 'Standard'
          };
          
          console.log(`Created room type "${roomType}" with ${components.length} components:`, roomTypeData);
          roomTypes.push(roomTypeData);
        } else {
          console.log(`No valid components found for room type "${roomType}"`);
        }
      });
      
      return {
        roomTypes,
        invalidEntries,
        labourCost: 0,
        miscellaneousCost: 0,
        sourceFile: 'BOQ File'
      };
    }
  };

  const createRoomInstancesAndAVBOQ = async (parseResult: ExcelParseResult, region: string, country: string, currency: string) => {
    try {
      console.log('Creating room instances and AV BOQ from parseResult:', parseResult);
      
      // Create room instances for each room type
      const roomInstances = [];
      for (const roomType of parseResult.roomTypes) {
        console.log('Processing room type:', roomType);
        
        const roomInstance = {
          room_type: roomType.room_type,
          sub_type: roomType.sub_type || 'Standard',
          region,
          country,
          currency,
          total_cost: roomType.total_cost,
          components: roomType.components.map(comp => ({
            description: comp.description,
            make: comp.make,
            model: comp.model,
            qty: comp.qty,
            unit_cost: comp.unit_cost,
            currency: comp.currency
          }))
        };
        roomInstances.push(roomInstance);
        console.log('Created room instance:', roomInstance);
      }
      
      // Store room instances in sessionStorage
      sessionStorage.setItem('roomInstances', JSON.stringify(roomInstances));
      console.log('Stored roomInstances in sessionStorage:', roomInstances);
      
      // Create AV BOQ from the components
      const avBOQ = {
        project_name: projectName,
        region,
        country,
        currency,
        total_cost: parseResult.roomTypes.reduce((sum, room) => sum + room.total_cost, 0),
        room_types: parseResult.roomTypes.map(room => ({
          room_type: room.room_type,
          sub_type: room.sub_type || 'Standard',
          components: room.components,
          total_cost: room.total_cost
        }))
      };
      
      // Store AV BOQ in sessionStorage
      sessionStorage.setItem('avBOQ', JSON.stringify(avBOQ));
      console.log('Stored avBOQ in sessionStorage:', avBOQ);
      
      console.log('Successfully created room instances and AV BOQ');
    } catch (error) {
      console.error('Error creating room instances and AV BOQ:', error);
      throw error;
    }
  };

  const handleRoomConfigFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleRoomConfigFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const excelFile = files.find(file => file.name.endsWith('.xlsx') || file.name.endsWith('.xls'));
    
    if (excelFile) {
      handleRoomConfigFileUpload(excelFile);
    } else {
      setError('Please drop an Excel file (.xlsx or .xls)');
    }
  };

  const handleCreateProjectAndContinue = async () => {
    if (!projectName || !region || !country || !parseResult) {
      setError('Please fill in all required fields and upload an Excel file');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check for existing projects to prevent duplicates
      console.log('Checking for existing projects...');
      const existingProjectsResponse = await apiService.getProjects({
        filters: {
          project_name: { $eq: projectName },
          region: { $eq: region },
          country: { $eq: country }
        }
      });
      
      const existingProjects = existingProjectsResponse.data.data || [];
      if (existingProjects.length > 0) {
        setError(`Project "${projectName}" already exists in ${region}/${country}. Please use a different project name.`);
        setLoading(false);
        return;
      }

      // Calculate total project cost
      const totalHardwareCost = parseResult.roomTypes.reduce((sum, room) => sum + room.total_cost, 0);
      const totalLabourCost = parseResult.labourCost || 0;
      const totalMiscellaneousCost = parseResult.miscellaneousCost || 0;
      const totalCapex = totalHardwareCost + totalLabourCost + totalMiscellaneousCost;

      // Create project
      // Cost priority: Manual input > Extracted from file > 0
      const manualLabourCost = parseFloat(labourCost) || 0;
      const manualMiscCost = parseFloat(miscCost) || 0;
      const extractedLabourCost = parseResult.labourCost || 0;
      const extractedMiscCost = parseResult.miscellaneousCost || 0;
      
      // Use manual input if provided (> 0), otherwise use extracted costs from parser
      // This ensures extracted costs (109,030.71 labour, 18,866.97 misc) are used when manual fields are empty
      const finalLabourCost = manualLabourCost > 0 ? manualLabourCost : extractedLabourCost;
      const finalMiscCost = manualMiscCost > 0 ? manualMiscCost : extractedMiscCost;
      
      // Debug: Log cost mapping
      console.log('Project creation cost mapping:', {
        manualLabourCost,
        manualMiscCost,
        extractedLabourCost,
        extractedMiscCost,
        finalLabourCost,
        finalMiscCost,
        manualLabourInput: labourCost,
        manualMiscInput: miscCost
      });
      
      const projectData = {
        project_name: projectName,
        region,
        country,
        currency,
        capex_amount: parseFloat(capex) || 0, // Leave blank for PM to fill
        network_cost: parseFloat(networkCost) || 0,
        labour_cost: finalLabourCost,
        inflation: parseFloat(inflation) || 0,
        misc_cost: finalMiscCost,
        notes: `Project created from Excel file: ${parseResult.sourceFile}. Total project estimate: ${totalCapex}`
      };

      console.log('Creating project with data:', projectData);
      const projectResponse = await apiService.createProject(projectData);
      const createdProject = projectResponse.data.data;

      setProjectCreated(true);
      setSuccess(`Project created successfully! Redirecting to room type creation...`);

      // Store Excel data in sessionStorage for room types page
      sessionStorage.setItem('excelParseResult', JSON.stringify(parseResult));
      
      // Navigate to room types page with project ID
      setTimeout(() => {
        router.push(`/room-types?projectId=${createdProject.id}&projectName=${encodeURIComponent(projectName)}`);
      }, 2000);

    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Unknown error';
      setError(`Failed to create project: ${errorMessage}`);
      console.error('Project creation error:', err);
      console.error('Error response:', err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const headerMap: Record<string, string> = {
    MANUFACTURER: 'MAKE',
    MAKE: 'MAKE',
    MODEL: 'MODEL',
    'UNIT PRICE': 'UNIT COST',
    UNIT_PRICE: 'UNIT COST',
    DESCRIPTION: 'DESCRIPTION',
    CATEGORY: 'CATEGORY',
    'SUB-CATEGORY': 'SUB-CATEGORY',
  };

  const normalizeHeader = (header: string): string =>
    header?.trim()?.toUpperCase()?.replace(/\s+/g, ' ');

  function inferLocationFromFileName(fileName: string): { region: string; country: string } {
    const city = Object.keys(countryRegionMap).find((city) =>
      fileName.toLowerCase().includes(city.toLowerCase())
    );
    return city ? countryRegionMap[city] : { region: '', country: '' };
  }

  const parseWorkbook = (
    workbook: XLSX.WorkBook,
    fileName: string,
    formRegion: string,
    formCountry: string
  ): { validComponents: any[]; invalidEntries: any[] } => {
    const validComponents: any[] = [];
    const invalidEntries: any[] = [];
    let { region, country } = formCountry
      ? { region: formRegion, country: formCountry }
      : inferLocationFromFileName(fileName);

    if (!region && country) {
      for (const reg in regionMap) {
        if (regionMap[reg].includes(country)) {
          region = reg;
          break;
        }
      }
    }

    // ---------- STYLE A ----------
    const avSheet = workbook.Sheets['AV'];
    if (avSheet) {
      const sheetRange = XLSX.utils.decode_range(avSheet['!ref'] || '');
      const headerRowIndex = 4; // Row 5
      const dataStartIndex = 10; // Row 11
      const headers: string[] = [];

      for (let C = sheetRange.s.c; C <= sheetRange.e.c; ++C) {
        const cell = avSheet[XLSX.utils.encode_cell({ r: headerRowIndex, c: C })];
        const rawHeader = cell ? String(cell.v) : '';
        const normalized = normalizeHeader(rawHeader);
        headers.push(headerMap[normalized] || normalized);
      }

      const currency = avSheet['B2']?.v || countryCurrencyMap[country] || 'USD';

      for (let R = dataStartIndex; R <= sheetRange.e.r; ++R) {
        const row: Record<string, any> = {};
        for (let C = sheetRange.s.c; C <= sheetRange.e.c; ++C) {
          const cell = avSheet[XLSX.utils.encode_cell({ r: R, c: C })];
          const header = headers[C - sheetRange.s.c];
          if (header && cell) {
            row[header] = cell.v;
          }
        }

        if (!row['MAKE'] || !row['MODEL']) {
          invalidEntries.push({
            make: row['MAKE'] || '',
            model: String(row['MODEL'] || '').trim(),
            description: row['DESCRIPTION'] || '',
            unit_cost: parseFloat(row['UNIT COST'] || 0) || 0,
            currency,
            region: region || '',
            country: country || '',
            component_type: row['CATEGORY'] || '',
            component_category: row['SUB-CATEGORY'] || '',
            source_file: fileName,
            reason: 'Missing make or model',
          });
          continue;
        }

        const unitCost = parseFloat(row['UNIT COST'] || 0) || 0;
        if (unitCost === 0) {
          invalidEntries.push({
            make: row['MAKE'] || '',
            model: String(row['MODEL'] || '').trim(),
            description: row['DESCRIPTION'] || '',
            unit_cost: unitCost,
            currency,
            region: region || '',
            country: country || '',
            component_type: row['CATEGORY'] || '',
            component_category: row['SUB-CATEGORY'] || '',
            source_file: fileName,
            reason: 'Zero unit cost',
          });
          continue;
        }

        validComponents.push({
          make: row['MAKE'] || '',
          model: String(row['MODEL'] || '').trim(),
          description: row['DESCRIPTION'] || '',
          unit_cost: unitCost,
          currency,
          region: region || '',
          country: country || '',
          component_type: row['CATEGORY'] || '',
          component_category: row['SUB-CATEGORY'] || '',
          is_active: true,
          source_file: fileName,
        });
      }

      return { validComponents, invalidEntries };
    }

    // ---------- STYLE B ----------
    workbook.SheetNames.forEach((sheetName) => {
      if (!sheetName || sheetName.toLowerCase().includes('summary') || sheetName === 'AV') return;
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) return;

      const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
      const headerRow = rows[5];
      if (!headerRow || headerRow.length < 2) return;

      const headers: string[] = headerRow.map((h: any) => {
        const normalized = normalizeHeader(String(h));
        return headerMap[normalized] || normalized;
      });

      let inferredCurrency = countryCurrencyMap[country] || 'INR';

      for (let i = 9; i < rows.length; i++) {
        const rowArray = rows[i];
        const nextRowArray = rows[i + 1] || [];
        const isEmpty = (arr: any[]) => arr.every((cell) => !cell || String(cell).trim() === '');
        if (isEmpty(rowArray) && isEmpty(nextRowArray)) break;
        if (isEmpty(rowArray)) continue;

        const row: Record<string, any> = {};
        rowArray.forEach((cell, colIndex) => {
          const key = headers[colIndex];
          if (key) row[key] = cell;
        });

        if (!row['MAKE'] || !row['MODEL']) {
          invalidEntries.push({
            make: row['MAKE'] || '',
            model: String(row['MODEL'] || '').trim(),
            description: row['DESCRIPTION'] || '',
            unit_cost: parseFloat(row['UNIT COST'] || 0) || 0,
            currency: inferredCurrency,
            region: region || '',
            country: country || '',
            component_type: row['CATEGORY'] || '',
            component_category: row['SUB-CATEGORY'] || '',
            source_file: fileName,
            room_type: sheetName,
            reason: 'Missing make or model',
          });
          continue;
        }

        const rawPrice = row['UNIT COST'] || '0';
        if (typeof rawPrice === 'string') {
          const match = rawPrice.match(/(₹|\$|€|£|AED|SGD|QAR|ZAR)/);
          if (match) inferredCurrency = symbolToCurrencyMap[match[0]] || inferredCurrency;
        }

        const unitCost = parseFloat(String(rawPrice).replace(/[^\d.]/g, '')) || 0;
        if (unitCost === 0) {
          invalidEntries.push({
            make: row['MAKE'] || '',
            model: String(row['MODEL'] || '').trim(),
            description: row['DESCRIPTION'] || '',
            unit_cost: unitCost,
            currency: inferredCurrency,
            region: region || '',
            country: country || '',
            component_type: row['CATEGORY'] || '',
            component_category: row['SUB-CATEGORY'] || '',
            source_file: fileName,
            room_type: sheetName,
            reason: 'Zero unit cost',
          });
          continue;
        }

        validComponents.push({
          make: row['MAKE'] || '',
          model: String(row['MODEL'] || '').trim(),
          description: row['DESCRIPTION'] || '',
          unit_cost: unitCost,
          currency: inferredCurrency,
          region: region || '',
          country: country || '',
          component_type: row['CATEGORY'] || '',
          component_category: row['SUB-CATEGORY'] || '',
          is_active: true,
          source_file: fileName,
          room_type: sheetName,
        });
      }
    });

    return { validComponents, invalidEntries };
  };

  const checkExistingComponents = async (components: any[]): Promise<any[]> => {
    const newComponents: any[] = [];
    const newInvalidEntries: any[] = [...invalidEntries]; // Copy existing invalid entries

    for (const component of components) {
      try {
        const response = await apiService.getAVComponents({
          filters: {
            make: component.make,
            model: component.model,
            country: component.country,
          },
        });

        const existingComponents = response.data.data || [];
        const existsWithSamePrice = existingComponents.some((existing: any) => {
          const attrs = existing.attributes || existing;
          if (!attrs || typeof attrs.unit_cost === 'undefined') {
            console.warn(`Invalid response for component ${component.make} ${component.model}:`, existing);
            return false;
          }
          return attrs.unit_cost === component.unit_cost;
        });

        if (!existsWithSamePrice) {
          newComponents.push(component);
        } else {
          newInvalidEntries.push({
            ...component,
            reason: 'Duplicate entry with same unit cost',
          });
        }
      } catch (err) {
        console.error(`Error checking component ${component.make} ${component.model}:`, err);
        newInvalidEntries.push({
          ...component,
          reason: 'Error checking for duplicates',
        });
        newComponents.push(component); // Add component if check fails to avoid data loss
      }
    }

    setInvalidEntries(newInvalidEntries);
    return newComponents;
  };

  const generateValidationSheet = (invalidEntries: any[]) => {
    const worksheet = XLSX.utils.json_to_sheet(
      invalidEntries.map(entry => ({
        Make: entry.make,
        Model: entry.model,
        Description: entry.description,
        Unit_Cost: entry.unit_cost,
        Currency: entry.currency,
        Region: entry.region,
        Country: entry.country,
        Component_Type: entry.component_type,
        Component_Category: entry.component_category,
        Room_Type: entry.room_type || '',
        Source_File: entry.source_file,
        Reason: entry.reason,
      })),
      { header: ['Make', 'Model', 'Description', 'Unit_Cost', 'Currency', 'Region', 'Country', 'Component_Type', 'Component_Category', 'Room_Type', 'Source_File', 'Reason'] }
    );

    // Set column widths for better readability
    worksheet['!cols'] = [
      { wch: 20 }, // Make
      { wch: 20 }, // Model
      { wch: 40 }, // Description
      { wch: 15 }, // Unit_Cost
      { wch: 10 }, // Currency
      { wch: 15 }, // Region
      { wch: 15 }, // Country
      { wch: 20 }, // Component_Type
      { wch: 20 }, // Component_Category
      { wch: 15 }, // Room_Type
      { wch: 30 }, // Source_File
      { wch: 30 }, // Reason
    ];

    // Add bold headers
    XLSX.utils.sheet_add_aoa(worksheet, [['Make', 'Model', 'Description', 'Unit_Cost', 'Currency', 'Region', 'Country', 'Component_Type', 'Component_Category', 'Room_Type', 'Source_File', 'Reason']], { origin: 'A1' });
    for (let i = 1; i <= 12; i++) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: i - 1 })];
      if (cell) cell.s = { font: { bold: true } };
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Invalid Entries');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `validation_report_${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setError('No file selected.');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);
    setInvalidEntries([]);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const { validComponents, invalidEntries } = parseWorkbook(workbook, file.name, region, country);

        setInvalidEntries(invalidEntries);

        if (!country && invalidEntries.some(entry => !entry.country)) {
          setError('Warning: No country selected, and some entries could not infer location from file name.');
        }

        if (validComponents.length === 0) {
          setError('No valid components found in the file. Download the validation report for details.');
          setUploading(false);
          return;
        }

        const newComponents = await checkExistingComponents(validComponents);

        if (newComponents.length === 0 && invalidEntries.length === 0) {
          setError('No new components to upload after deduplication.');
          setUploading(false);
          return;
        }

        if (newComponents.length > 0) {
                  // Create components one by one since there's no bulk endpoint
        for (const component of newComponents) {
          await apiService.createAVComponent(component);
        }
                  setSuccess(`Successfully uploaded ${newComponents.length} components! ${invalidEntries.length > 0 ? `${invalidEntries.length} entries were skipped.` : ''}`);
        console.log('✅ Upload successful:', newComponents.length, 'components created');
        }

        if (invalidEntries.length > 0) {
          setError(`${invalidEntries.length} entries were skipped. Download the validation report for details.`);
        }
      } catch (err) {
        console.error('Upload error:', err);
        setError('Failed to upload file. Please check the file format and try again.');
      } finally {
        setUploading(false);
      }
    };
    reader.onerror = () => {
      setError('Error reading file. Please try again.');
      setUploading(false);
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="flex space-x-2 border-b border-gray-200 overflow-x-auto">
            <Link href="/">
              <span className="px-3 py-2 text-sm font-medium rounded-t-md whitespace-nowrap text-gray-600 hover:text-blue-700">
                Configurator
              </span>
            </Link>
            <Link href="/summary">
              <span className="px-3 py-2 text-sm font-medium rounded-t-md whitespace-nowrap bg-blue-100 text-blue-700 border-b-2 border-blue-500">
                Project Data
              </span>
            </Link>
            <Link href="/room-configuration">
              <span className="px-3 py-2 text-sm font-medium rounded-t-md whitespace-nowrap text-gray-600 hover:text-blue-700">
                Configuration
              </span>
            </Link>
            <Link href="/variants">
              <span className="px-3 py-2 text-sm font-medium rounded-t-md whitespace-nowrap text-gray-600 hover:text-blue-700">
                Variants
              </span>
            </Link>
            <Link href="/dashboard">
              <span className="px-3 py-2 text-sm font-medium rounded-t-md whitespace-nowrap text-gray-600 hover:text-blue-700">
                Dashboard
              </span>
            </Link>
          </div>
        </div>

        <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Project Setup</h1>
        
        {/* 5-Minute Workflow Progress */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-blue-800">5-Minute Cost Estimation Workflow</h3>
            <span className="text-sm text-blue-600 font-medium">Step 1 of 4</span>
          </div>
          <div className="flex space-x-2">
            <div className="flex-1 bg-blue-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full w-1/4"></div>
            </div>
            <div className="flex-1 bg-gray-200 rounded-full h-2"></div>
            <div className="flex-1 bg-gray-200 rounded-full h-2"></div>
            <div className="flex-1 bg-gray-200 rounded-full h-2"></div>
          </div>
          <div className="flex justify-between text-xs text-blue-600 mt-2">
            <span>Project Setup</span>
            <span>Room Mapping</span>
            <span>Configuration</span>
            <span>Cost Summary</span>
          </div>
        </div>
      </div>
        
        {/* Project Details Form - Always visible */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Project Details</h3>
          <form onSubmit={(e) => { e.preventDefault(); handleCreateProjectAndContinue(); }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                >
                  <option value="">Select Region</option>
                  {Object.keys(regionMap).map((reg) => (
                    <option key={reg} value={reg}>{reg}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <select
                  value={country}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  disabled={!region}
                >
                  <option value="">Select Country</option>
                  {(regionMap[region] || []).map((ct: string) => (
                    <option key={ct} value={ct}>{ct}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="e.g., London Q1 Expansion"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Local Currency</label>
                <input
                  type="text"
                  value={currency}
                  className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Approved IT Capex Amount</label>
                <input
                  type="number"
                  value={capex}
                  onChange={(e) => setCapex(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Network Cost</label>
                <input
                  type="number"
                  value={networkCost}
                  onChange={(e) => setNetworkCost(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>

                              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Labour Cost 
                    {region && country && (
                      <span className="text-xs text-gray-500 ml-2">
                        ({getActualLabourPercentage().toFixed(1)}% of hardware costs)
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    value={labourCost}
                    onChange={(e) => setLabourCost(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder={
                      region && country 
                        ? `Enter amount or leave empty for ${getLabourCostPercentage(region, country)}% auto-calculation`
                        : "Select region and country first"
                    }
                  />
                  {region && country && !parseResult && (
                    <p className="text-xs text-blue-600 mt-1">
                      Will be calculated as {getLabourCostPercentage(region, country)}% of total hardware costs once file is uploaded, or enter your own amount
                    </p>
                  )}
                  {parseResult && labourCost && (
                    <div className="text-xs text-gray-600 mt-1">
                      {parseFloat(labourCost) > 0 ? (
                        <span className="text-green-600">
                          ✓ Using manual labour cost entry
                        </span>
                      ) : (
                        <span>
                          Auto-calculated as {getActualLabourPercentage().toFixed(1)}% of {calculateTotalHardwareCost().toLocaleString()} hardware costs
                        </span>
                      )}
                    </div>
                  )}
                </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Miscellaneous Cost</label>
                <input
                  type="number"
                  value={miscCost}
                  onChange={(e) => setMiscCost(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Inflation Rate (%)</label>
                <input
                  type="number"
                  value={inflation}
                  onChange={(e) => setInflation(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Cost Summary - Show when we have room data or region/country selected */}
        {(parseResult || (region && country)) && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Cost Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {parseResult ? (
                <>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm text-gray-600">Total Room Costs</p>
                    <p className="text-xl font-bold text-blue-600">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: currency || 'USD'
                      }).format(calculateTotalRoomCosts())}
                    </p>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="text-sm text-gray-600">Total Hardware Cost</p>
                    <p className="text-xl font-bold text-green-600">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: currency || 'USD'
                      }).format(calculateTotalHardwareCost())}
                    </p>
                    <p className="text-xs text-gray-500">
                      Room costs + Network + Misc
                    </p>
                  </div>
                  
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <p className="text-sm text-gray-600">Labour Cost</p>
                    <p className="text-xl font-bold text-orange-600">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: currency || 'USD'
                      }).format(parseFloat(labourCost) || 0)}
                    </p>
                    {region && country && (
                      <p className="text-xs text-gray-500">
                        {parseFloat(labourCost) > 0 ? (
                          <span className="text-green-600">Manual entry</span>
                        ) : (
                          <span>{getActualLabourPercentage().toFixed(1)}% of hardware costs</span>
                        )}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm text-gray-600">Total Room Costs</p>
                    <p className="text-xl font-bold text-blue-600 text-gray-400">
                      Upload file to calculate
                    </p>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="text-sm text-gray-600">Total Hardware Cost</p>
                    <p className="text-xl font-bold text-green-600 text-gray-400">
                      Room costs + Network + Misc
                    </p>
                  </div>
                  
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <p className="text-sm text-gray-600">Labour Cost</p>
                    <p className="text-xl font-bold text-orange-600 text-gray-400">
                      {region && country ? `${getLabourCostPercentage(region, country)}% of hardware costs` : 'Select region/country'}
                    </p>
                    {region && country && (
                      <p className="text-xs text-blue-600">
                        Will be calculated automatically
                      </p>
                    )}
                  </div>
                </>
              )}
              
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <p className="text-sm text-gray-600">Network Cost</p>
                <p className="text-xl font-bold text-purple-600">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: currency || 'USD'
                  }).format(parseFloat(networkCost) || 0)}
                </p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-sm text-gray-600">Miscellaneous</p>
                <p className="text-xl font-bold text-green-600">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: currency || 'USD'
                  }).format(parseFloat(miscCost) || 0)}
                </p>
              </div>
            </div>
            
            {/* Total with Inflation */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              {parseResult ? (
                <>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-lg font-semibold text-gray-800">Subtotal (Before Inflation)</span>
                    <span className="text-xl font-bold text-gray-800">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: currency || 'USD'
                      }).format(
                        calculateTotalRoomCosts() + 
                        (parseFloat(labourCost) || 0) + 
                        (parseFloat(networkCost) || 0) + 
                        (parseFloat(miscCost) || 0)
                      )}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Inflation ({inflation}%)</span>
                    <span className="text-sm text-gray-600">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: currency || 'USD'
                      }).format(
                        (calculateTotalRoomCosts() + 
                        (parseFloat(labourCost) || 0) + 
                        (parseFloat(networkCost) || 0) + 
                        (parseFloat(miscCost) || 0)) * (parseFloat(inflation) / 100)
                      )}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                    <span className="text-xl font-bold text-gray-900">Total Project Cost</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: currency || 'USD'
                      }).format(
                        (calculateTotalRoomCosts() + 
                        (parseFloat(labourCost) || 0) + 
                        (parseFloat(networkCost) || 0) + 
                        (parseFloat(miscCost) || 0)) * (1 + parseFloat(inflation) / 100)
                      )}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-600 mb-2">Upload your project file to see cost calculations</p>
                  <p className="text-sm text-gray-500">
                    Labour cost will be calculated as {region && country ? `${getLabourCostPercentage(region, country)}%` : 'X%'} of hardware costs
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* File Upload Section - Always visible */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Upload Project File</h3>
          <p className="text-gray-600 mb-6">Upload your SRM or BOQ file to continue with the project setup.</p>
            
            {/* File Upload Area */}
            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver 
                  ? 'border-blue-400 bg-blue-50' 
                  : 'border-gray-300 hover:border-blue-400'
              }`}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="space-y-4">
                <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <div>
                  <p className="text-lg font-medium text-gray-900">Drop your file here</p>
                  <p className="text-sm text-gray-500">or click to browse</p>
                </div>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleRoomConfigFileInputChange}
                  className="hidden"
                  id="file-upload"
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Choose File
                </button>
                <p className="text-xs text-gray-500">
                  Supports: SRM (Space Requirement Matrix) and BOQ (Bill of Quantities) files<br/>
                  Formats: .xlsx, .xls, .csv
                </p>
              </div>
            </div>
            
            {/* File Type Confirmation Modal */}
            {showFileTypeConfirmation && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold text-gray-800">Confirm File Type</h3>
                      <button
                        onClick={() => setShowFileTypeConfirmation(false)}
                        className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                      >
                        ×
                      </button>
                    </div>
                    
                    <div className="mb-6">
                      <p className="text-gray-600 mb-4">
                        We detected this file as a <strong>{detectedFileType}</strong> file. Please confirm the file type to proceed:
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                          detectedFileType === 'SRM' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                        }`}>
                          <div className="flex items-center mb-2">
                            <input
                              type="radio"
                              name="fileType"
                              value="SRM"
                              checked={detectedFileType === 'SRM'}
                              onChange={() => setDetectedFileType('SRM')}
                              className="mr-2"
                            />
                            <h4 className="font-semibold text-gray-800">SRM (Space Requirement Matrix)</h4>
                          </div>
                          <p className="text-sm text-gray-600">
                            Contains room types and quantities. Used for room mapping and configuration.
                          </p>
                        </div>
                        
                        <div className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                          detectedFileType === 'BOQ' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                        }`}>
                          <div className="flex items-center mb-2">
                            <input
                              type="radio"
                              name="fileType"
                              value="BOQ"
                              checked={detectedFileType === 'BOQ'}
                              onChange={() => setDetectedFileType('BOQ')}
                              className="mr-2"
                            />
                            <h4 className="font-semibold text-gray-800">BOQ (Bill of Quantities)</h4>
                          </div>
                          <p className="text-sm text-gray-600">
                            Contains detailed component specifications. Used to create room types and instances.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setShowFileTypeConfirmation(false)}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleFileTypeConfirmation(detectedFileType!)}
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {loading ? 'Processing...' : 'Confirm & Process'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* File Processing Status */}
            {parseResult && (
              <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-green-800 font-medium">
                        {fileType === 'SRM' ? 'SRM File' : 'BOQ File'} processed successfully!
                      </p>
                      <p className="text-green-700 text-sm">
                        Found {parseResult.roomTypes.length} {fileType === 'SRM' ? 'room types' : 'components'} • Ready to continue
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    {fileType === 'SRM' ? (
                      <Link href="/room-mapping">
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                          Continue to Room Mapping →
                        </button>
                      </Link>
                    ) : (
                      <Link href="/room-types">
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                          Continue to Room Types →
                        </button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>


        {/* Error and Success Messages */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-green-800 font-medium">{success}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}