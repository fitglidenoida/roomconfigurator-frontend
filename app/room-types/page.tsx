'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { parseExcelFile, ExcelParseResult, RoomTypeData, determineSubType } from '../lib/excelParser';
import { apiService } from '../lib/api';
import ComponentSuggestionPopup from '../components/ComponentSuggestionPopup';
import { ComponentSuggestion, getComponentSuggestions } from '../lib/componentSuggestions';

const regionMap: Record<string, string[]> = {
  NAMR: ['USA', 'Canada', 'Mexico'],
  EMESA: ['United Kingdom', 'Germany', 'France', 'South Africa', 'Netherlands'],
  'APACME': ['India', 'Singapore', 'UAE', 'Qatar'],
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

function RoomTypeCreationContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const projectName = searchParams.get('projectName');
  
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('');
  const [currency, setCurrency] = useState('');
  const [parseResult, setParseResult] = useState<ExcelParseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedRoomType, setSelectedRoomType] = useState<RoomTypeData | null>(null);
  const [suggestions, setSuggestions] = useState<ComponentSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentComponent, setCurrentComponent] = useState<any>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [existingRoomTypes, setExistingRoomTypes] = useState<any[]>([]);
  const [checkingExisting, setCheckingExisting] = useState(false);
  const [editingRoomType, setEditingRoomType] = useState<number | null>(null);
  const [similarRoomTypes, setSimilarRoomTypes] = useState<any[]>([]);
  const [showSimilarRooms, setShowSimilarRooms] = useState<number | null>(null);

  // Load Excel data from sessionStorage on component mount
  useEffect(() => {
    const storedData = sessionStorage.getItem('excelParseResult');
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        setParseResult(parsedData);
        console.log('Loaded Excel data from sessionStorage:', parsedData);
        
        // Auto-set region, country, and currency from parsed data
        if (parsedData.roomTypes && parsedData.roomTypes.length > 0) {
          const firstRoomType = parsedData.roomTypes[0];
          if (firstRoomType.components && firstRoomType.components.length > 0) {
            const firstComponent = firstRoomType.components[0];
            
            // Set region based on country
            const componentCountry = firstComponent.country;
            const componentCurrency = firstComponent.currency;
            
            // Find region from country
            for (const [regionName, countries] of Object.entries(regionMap)) {
              if (countries.includes(componentCountry)) {
                setRegion(regionName);
                break;
              }
            }
            
            // Set country and currency
            setCountry(componentCountry);
            setCurrency(componentCurrency);
            
            console.log(`Auto-set region: ${region}, country: ${componentCountry}, currency: ${componentCurrency}`);
          }
        }
        
        // Check for existing room types when Excel data is loaded
        checkExistingRoomTypes(parsedData.roomTypes);
      } catch (err) {
        console.error('Failed to parse stored Excel data:', err);
      }
    }
  }, []);

  // Utility function to generate UID from room type name
  const generateUID = (name: string): string => {
    const timestamp = Date.now();
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim();
    return `${slug}-${timestamp}`;
  };

  // Function to check existing room types
  const checkExistingRoomTypes = async (roomTypes: RoomTypeData[]) => {
    if (!roomTypes || roomTypes.length === 0) return;
    
    setCheckingExisting(true);
    try {
      // Fetch all room types - they are region-based, not project-based
      const existingRoomTypesResponse = await apiService.getRoomTypes();
      const allExisting = existingRoomTypesResponse.data.data || [];
      
      setExistingRoomTypes(allExisting);
      console.log(`Found ${allExisting.length} existing room types total:`, allExisting);
    } catch (err) {
      console.error('Failed to fetch existing room types:', err);
      // If the API call fails, just continue without existing room type checking
      setExistingRoomTypes([]);
    } finally {
      setCheckingExisting(false);
    }
  };

  // Helper function to check if a room type already exists
  const isRoomTypeExisting = (roomType: RoomTypeData) => {
    const roomTypeUID = roomType.room_type.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    return existingRoomTypes.some((rt: any) => {
      // Handle both possible data structures (with and without attributes)
      const rtUID = rt.attributes?.room_type || rt.room_type;
      const rtName = rt.attributes?.name || rt.name;
      const rtProject = rt.attributes?.project?.data?.id || rt.project?.id;
      
      // Check if room type belongs to the same project
      if (rtProject !== projectId) {
        return false; // Different project, not a match
      }
      
      // First check: exact name match
      const nameMatch = rtUID === roomTypeUID || 
                       rtName?.toLowerCase() === roomType.room_type.toLowerCase();
      
      if (!nameMatch) return false;
      
      // Second check: if name matches, check if it's a variant by comparing components
      // Get existing room type's components
      const existingComponents = rt.attributes?.components?.data || rt.components?.data || [];
      
      // Compare component counts and types to determine if it's a variant
      const existingComponentCount = existingComponents.length;
      const newComponentCount = roomType.components.length;
      
      // If component counts are significantly different, it's likely a variant
      if (Math.abs(existingComponentCount - newComponentCount) > 2) {
        console.log(`Room type "${roomType.room_type}" has different component count (${newComponentCount} vs ${existingComponentCount}), treating as variant`);
        return false; // Allow creation as variant
      }
      
      // Check for key component differences (e.g., monitor, codec, camera)
      const newComponentTypes = roomType.components.map(c => c.description.toLowerCase());
      const existingComponentTypes = existingComponents.map((c: any) => 
        (c.attributes?.description || c.description || '').toLowerCase()
      );
      
      // Check for significant component differences
      const hasMonitor = newComponentTypes.some((t: string) => t.includes('monitor') || t.includes('display'));
      const hasCodec = newComponentTypes.some((t: string) => t.includes('codec') || t.includes('vc'));
      const hasCamera = newComponentTypes.some((t: string) => t.includes('camera') || t.includes('cam'));
      
      const existingHasMonitor = existingComponentTypes.some((t: string) => t.includes('monitor') || t.includes('display'));
      const existingHasCodec = existingComponentTypes.some((t: string) => t.includes('codec') || t.includes('vc'));
      const existingHasCamera = existingComponentTypes.some((t: string) => t.includes('camera') || t.includes('cam'));
      
      // If key components are different, it's a variant
      if (hasMonitor !== existingHasMonitor || hasCodec !== existingHasCodec || hasCamera !== existingHasCamera) {
        console.log(`Room type "${roomType.room_type}" has different key components, treating as variant`);
        return false; // Allow creation as variant
      }
      
      // If we get here, it's likely the same room type
      console.log(`Room type "${roomType.room_type}" appears to be duplicate, preventing creation`);
      return true;
    });
  };

  const handleCountryChange = (val: string) => {
    setCountry(val);
    const currency = countryCurrencyMap[val] || '';
    setCurrency(currency);
  };

  const handleFileUpload = async (file: File) => {
    if (!file) {
      setError('No file selected.');
      return;
    }

    if (!region || !country) {
      setError('Please select region and country first.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await parseExcelFile(file, region, country, currency);
      setParseResult(result);
      
      if (result.roomTypes.length === 0) {
        setError('No valid room types found in the file.');
      } else {
        setSuccess(`Successfully parsed ${result.roomTypes.length} room types${result.invalidEntries ? ` with ${result.invalidEntries.length} invalid entries` : ''}.`);
      }
    } catch (err) {
      setError('Failed to parse Excel file. Please check the file format.');
      console.error('Parse error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
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
      handleFileUpload(excelFile);
    } else {
      setError('Please drop an Excel file (.xlsx or .xls)');
    }
  };

  const handleCreateRoomType = async (roomType: RoomTypeData) => {
    // Remove project requirement - room types should be region-based, not project-based
    setUploading(true);
    setError('');
    setSuccess('');

    try {
      // Check for existing room types to prevent duplicates
      console.log('Checking for existing room types...');
      const existingRoomTypesResponse = await apiService.getRoomTypes();
      const existingRoomTypes = existingRoomTypesResponse.data.data || [];
      
      // Check if room type already exists (by name or room_type UID)
      const roomTypeUID = roomType.room_type.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const existingRoomType = existingRoomTypes.find((rt: any) => {
        // Handle both possible data structures (with and without attributes)
        const rtUID = rt.attributes?.room_type || rt.room_type;
        const rtName = rt.attributes?.name || rt.name;
        
        // First check: exact name match
        const nameMatch = rtUID === roomTypeUID || 
                         rtName?.toLowerCase() === roomType.room_type.toLowerCase();
        
        if (!nameMatch) return false;
        
        // Second check: if name matches, check if it's a variant by comparing components
        // Get existing room type's components
        const existingComponents = rt.attributes?.components?.data || rt.components?.data || [];
        
        // Compare component counts and types to determine if it's a variant
        const existingComponentCount = existingComponents.length;
        const newComponentCount = roomType.components.length;
        
        // If component counts are significantly different, it's likely a variant
        if (Math.abs(existingComponentCount - newComponentCount) > 2) {
          console.log(`Room type "${roomType.room_type}" has different component count (${newComponentCount} vs ${existingComponentCount}), treating as variant`);
          return false; // Allow creation as variant
        }
        
        // Check for key component differences (e.g., monitor, codec, camera)
        const newComponentTypes = roomType.components.map(c => c.description.toLowerCase());
        const existingComponentTypes = existingComponents.map((c: any) => 
          (c.attributes?.description || c.description || '').toLowerCase()
        );
        
        // Check for significant component differences
        const hasMonitor = newComponentTypes.some((t: string) => t.includes('monitor') || t.includes('display'));
        const hasCodec = newComponentTypes.some((t: string) => t.includes('codec') || t.includes('vc'));
        const hasCamera = newComponentTypes.some((t: string) => t.includes('camera') || t.includes('cam'));
        
        const existingHasMonitor = existingComponentTypes.some((t: string) => t.includes('monitor') || t.includes('display'));
        const existingHasCodec = existingComponentTypes.some((t: string) => t.includes('codec') || t.includes('vc'));
        const existingHasCamera = existingComponentTypes.some((t: string) => t.includes('camera') || t.includes('cam'));
        
        // If key components are different, it's a variant
        if (hasMonitor !== existingHasMonitor || hasCodec !== existingHasCodec || hasCamera !== existingHasCamera) {
          console.log(`Room type "${roomType.room_type}" has different key components, treating as variant`);
          return false; // Allow creation as variant
        }
        
        // If we get here, it's likely the same room type
        console.log(`Room type "${roomType.room_type}" appears to be duplicate, preventing creation`);
        return true;
      });
      
      if (existingRoomType) {
        console.log('Room type already exists:', existingRoomType);
        setSuccess(`Room type "${roomType.room_type}" already exists. Skipping creation.`);
        
        // Remove from parse result
        if (parseResult) {
          setParseResult({
            ...parseResult,
            roomTypes: parseResult.roomTypes.filter(rt => rt.room_type !== roomType.room_type)
          });
        }
        return;
      }

      // Prepare room type data
      const generatedUID = generateUID(roomType.room_type);
      console.log('Generated UID for room type:', roomType.room_type, '->', generatedUID);
      
      // Get region and country from the first component (they should all be the same for a room type)
      const firstComponent = roomType.components[0];
      const region = firstComponent?.region || '';
      const country = firstComponent?.country || '';
      const currency = firstComponent?.currency || 'USD';
      
      console.log(`Room type region: ${region}, country: ${country}, currency: ${currency}`);
      
      const roomTypeData: any = {
        name: roomType.room_type,
        default_pax: 0,
        is_configurable: true,
        description: `Room type created from Excel: ${roomType.room_type}`,
        category: 'customizable',
        room_type: generatedUID, // Generate UID manually
        region: region, // Add region field
        country: country, // Add country field
        currency: currency // Add currency field
        // Note: project relationship will be established through room instances
      };
      
      // Room types are now region-based with proper schema fields
      console.log('Creating room type with region data:', roomTypeData);
      
      try {
        const roomTypeResponse = await apiService.createRoomType(roomTypeData);
        const createdRoomType = roomTypeResponse.data.data;
        console.log('Created room type:', createdRoomType);
        console.log('Created room type project field:', createdRoomType.attributes?.project || createdRoomType.project);
        console.log('Expected project ID:', projectId);
        console.log('Full room type data structure:', JSON.stringify(roomTypeData, null, 2));

        if (!createdRoomType || !createdRoomType.id) {
          throw new Error('Room type creation failed - no ID returned');
        }
        
        // Get the generated UID from the created room type
        const generatedRoomTypeUID = createdRoomType.attributes?.room_type || createdRoomType.room_type || roomTypeData.room_type;
        console.log('Generated room type UID:', generatedRoomTypeUID);
        
        // Validate that we have a valid UID
        if (!generatedRoomTypeUID) {
          console.error('No room type UID generated!');
          console.error('Created room type structure:', JSON.stringify(createdRoomType, null, 2));
          throw new Error('Room type UID generation failed');
        }
        
        console.log('STEP 1 COMPLETE: Room type created with UID:', generatedRoomTypeUID);
        
        // STEP 2: Get or create AV components and collect their data
        console.log('STEP 2: Processing AV components...');
        
        const componentIds: number[] = [];
        let createdCount = 0;
        let linkedCount = 0;
        let skippedCount = 0;
        
        // Determine sub_type once for the entire room type
        // Use user's manual selection if available, otherwise use automatic determination
        const roomSubType = roomType.sub_type || determineSubType(roomType.room_type, roomType.total_cost, roomType.components);
        console.log(`Using sub_type for ${roomType.room_type}: ${roomSubType} (${roomType.sub_type ? 'User Selected' : 'Auto Determined'})`);
        
        for (const component of roomType.components) {
          try {
            // Check if component already exists
            const existingComponentsResponse = await apiService.getAVComponents({
              filters: {
                $and: [
                  { make: { $eq: component.make } },
                  { model: { $eq: component.model } },
                  { description: { $eq: component.description } }
                ]
              }
            });
            
            if (existingComponentsResponse.data.data.length > 0) {
              console.log('Component already exists:', existingComponentsResponse.data.data[0]);
              componentIds.push(existingComponentsResponse.data.data[0].id);
              linkedCount++;
            } else {
              // Create new component
              const componentData = {
                make: component.make,
                model: component.model,
                description: component.description,
                unit_cost: component.unit_cost,
                region: component.region,
                country: component.country,
                currency: component.currency,
                component_type: component.component_type || 'AV Equipment',
                component_category: component.component_category || 'Hardware',
                source_file: component.source_file
              };
              
              console.log('Creating component with data:', componentData);
              const newComponent = await apiService.createAVComponent(componentData);
              console.log('New component created:', newComponent.data.data);
              componentIds.push(newComponent.data.data.id);
              createdCount++;
            }
          } catch (error: any) {
            console.error(`Failed to process component ${component.description}:`, error);
            skippedCount++;
          }
        }
        
        console.log(`STEP 2 COMPLETE: Created ${createdCount} components, linked ${linkedCount}, skipped ${skippedCount}`);
        
        // STEP 3: Create room configuration line items (BOM)
        console.log('STEP 3: Creating room configuration line items...');
        
        let bomLineItemsCreated = 0;
        
        for (const component of roomType.components) {
          try {
            // Find the corresponding AV component to get its ID
            const excelComponent = roomType.components.find(c => 
              c.make === component.make && 
              c.model === component.model && 
              c.description === component.description
            );
            
            // Create individual room configuration entry (BOM line item)
            const roomConfigurationData = {
              room_type: generatedRoomTypeUID, // Use the generated UID
              model: component.model,
              description: component.description,
              make: component.make,
              sub_type: roomSubType, // Use the room-level sub_type
              qty: excelComponent?.qty || 1,
              unit_price: component.unit_cost
              // Note: project relationship will be established through room instances
            };
            
            console.log('Creating room configuration line item with UID:', generatedRoomTypeUID);
            console.log('Room configuration data:', roomConfigurationData);
            
            const roomConfigResponse = await apiService.createRoomConfiguration(roomConfigurationData);
            console.log('Created room configuration line item:', roomConfigResponse.data.data);
            
            // Verify the room_type was set correctly
            const createdConfig = roomConfigResponse.data.data;
            const configRoomType = createdConfig.attributes?.room_type || createdConfig.room_type;
            console.log('Room configuration room_type field:', configRoomType);
            
            if (!configRoomType || configRoomType !== generatedRoomTypeUID) {
              console.error('WARNING: Room configuration room_type field mismatch!');
              console.error('Expected:', generatedRoomTypeUID);
              console.error('Got:', configRoomType);
            }
            
            bomLineItemsCreated++;
          } catch (configErr: any) {
            console.error(`Failed to create room configuration line item for ${component.description}:`, configErr);
          }
        }
        
        console.log(`STEP 3 COMPLETE: Created ${bomLineItemsCreated} room configuration line items`);
        
        // STEP 4: Create room instances and AV-BOQ records
        console.log('STEP 4: Creating room instances and AV-BOQ records...');
        
        // Get room count from the room type data (from row 6 of Excel)
        const roomCount = roomType.count || 1; // Default to 1 if not specified
        console.log(`Creating ${roomCount} room instances for ${roomType.room_type}`);
        
        let roomInstancesCreated = 0;
        let avBoqRecordsCreated = 0;
        
        for (let i = 0; i < roomCount; i++) {
          try {
            // Create room instance
            const roomInstanceData = {
              actual_cost: roomType.total_cost || 0,
              date_completed: new Date().toISOString().split('T')[0], // Today's date
              configuration_used: generatedRoomTypeUID,
              project: projectId,
              linked_boq: {
                room_type: roomType.room_type,
                components: roomType.components.map(c => ({
                  description: c.description,
                  make: c.make,
                  model: c.model,
                  qty: c.qty,
                  unit_cost: c.unit_cost
                }))
              }
            };
            
            console.log(`Creating room instance ${i + 1}/${roomCount}:`, roomInstanceData);
            const roomInstanceResponse = await apiService.createRoomInstance(roomInstanceData);
            const createdRoomInstance = roomInstanceResponse.data.data;
            console.log('Created room instance:', createdRoomInstance);
            
            // Create AV-BOQ record for this room instance
            const avBoqData = {
              country: country,
              pax: roomType.pax_count || 0,
              room_qty: 1, // One BOQ per room instance
              region: region,
              currency: currency,
              exchange_rate: 1, // Default exchange rate
              is_estimate: false, // This is actual data from completed project
              project: projectId,
              room_instance: createdRoomInstance.id
            };
            
            console.log(`Creating AV-BOQ record for room instance ${i + 1}:`, avBoqData);
            const avBoqResponse = await apiService.createAVBOQ(avBoqData);
            console.log('Created AV-BOQ record:', avBoqResponse.data.data);
            
            roomInstancesCreated++;
            avBoqRecordsCreated++;
            
          } catch (error: any) {
            console.error(`Failed to create room instance ${i + 1}:`, error);
          }
        }
        
        console.log(`STEP 4 COMPLETE: Created ${roomInstancesCreated} room instances and ${avBoqRecordsCreated} AV-BOQ records`);
        
        setSuccess(`Successfully created room type: ${roomType.room_type} for region ${region} (${country}) with ${bomLineItemsCreated} BOM line items, ${roomInstancesCreated} room instances, and ${avBoqRecordsCreated} AV-BOQ records. Created: ${createdCount}, Linked: ${linkedCount}, Skipped: ${skippedCount}`);
        
        // Remove from parse result
        if (parseResult) {
          setParseResult({
            ...parseResult,
            roomTypes: parseResult.roomTypes.filter(rt => rt.room_type !== roomType.room_type)
          });
        }
      } catch (error: any) {
        console.error('Room type creation error details:', error.response?.data);
        throw new Error(`Room type creation failed: ${error.response?.data?.error?.message || error.message}`);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Unknown error';
      setError(`Failed to create room type: ${roomType.room_type}. ${errorMessage}`);
      console.error('Creation error:', err);
      console.error('Error response:', err.response?.data);
    } finally {
      setUploading(false);
    }
  };

  const handleComponentClick = async (component: any) => {
    setCurrentComponent(component);
    setLoading(true);
    
    try {
      const componentSuggestions = await getComponentSuggestions({
        id: 0, // Temporary ID for comparison
        make: component.make,
        model: component.model,
        description: component.description,
        unit_cost: component.unit_cost,
        currency: component.currency,
        region: component.region,
        country: component.country,
        component_type: component.component_type || '',
        component_category: component.component_category || ''
      });
      
      setSuggestions(componentSuggestions);
      setShowSuggestions(true);
    } catch (err) {
      setError('Failed to load component suggestions');
      console.error('Suggestion error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptSuggestion = (suggestion: ComponentSuggestion) => {
    // Update the component in the selected room type
    if (selectedRoomType) {
      const updatedRoomType = {
        ...selectedRoomType,
        components: selectedRoomType.components.map(comp => 
          comp.make === currentComponent.make && comp.model === currentComponent.model
            ? { ...comp, ...suggestion }
            : comp
        )
      };
      setSelectedRoomType(updatedRoomType);
    }
    
    setShowSuggestions(false);
    setSuccess('Component updated successfully!');
  };

  const handleRejectSuggestion = (suggestionId: number) => {
    setSuggestions(suggestions.filter(s => s.id !== suggestionId));
    if (suggestions.length === 1) {
      setShowSuggestions(false);
    }
  };

  const handleSubTypeChange = (roomTypeIndex: number, newSubType: string) => {
    if (parseResult) {
      const updatedRoomTypes = [...parseResult.roomTypes];
      updatedRoomTypes[roomTypeIndex] = {
        ...updatedRoomTypes[roomTypeIndex],
        sub_type: newSubType
      };
      setParseResult({
        ...parseResult,
        roomTypes: updatedRoomTypes
      });
    }
    setEditingRoomType(null);
    setSuccess(`Variant updated to ${newSubType} for ${parseResult?.roomTypes[roomTypeIndex]?.room_type}`);
  };

  const findSimilarRoomTypes = async (roomType: RoomTypeData) => {
    try {
      const existingRoomTypesResponse = await apiService.getRoomTypes();
      const existingRoomTypes = existingRoomTypesResponse.data.data || [];
      
      const similarRooms = existingRoomTypes.filter((existing: any) => {
        const existingName = existing.attributes?.name || existing.name;
        const existingRoomType = existing.attributes?.room_type || existing.room_type;
        
        // Check name similarity
        const nameSimilarity = existingName.toLowerCase().includes(roomType.room_type.toLowerCase()) ||
                              roomType.room_type.toLowerCase().includes(existingName.toLowerCase());
        
        // Check if it's the same room type category
        const isSameCategory = existingRoomType === roomType.room_type;
        
        // Check component overlap (if we have component data)
        const existingComponents = existing.attributes?.components?.data || existing.components?.data || [];
        const componentOverlap = existingComponents.length > 0 && roomType.components.length > 0;
        
        return nameSimilarity || isSameCategory || componentOverlap;
      });
      
      return similarRooms;
    } catch (error) {
      console.error('Error finding similar room types:', error);
      return [];
    }
  };

  const handleShowSimilarRooms = async (roomTypeIndex: number) => {
    if (!parseResult) return;
    
    const roomType = parseResult.roomTypes[roomTypeIndex];
    const similar = await findSimilarRoomTypes(roomType);
    setSimilarRoomTypes(similar);
    setShowSimilarRooms(showSimilarRooms === roomTypeIndex ? null : roomTypeIndex);
  };

  return (
    <div className="container mx-auto p-6">
      {/* Navigation Tabs */}
      <div className="mb-8">
        <div className="flex space-x-4 border-b border-gray-200">
          <Link href="/">
            <span
              className={`px-4 py-2 text-sm font-medium rounded-t-md ${
                pathname === '/' ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-500' : 'text-gray-600 hover:text-blue-700'
              }`}
            >
              Room Configurator
            </span>
          </Link>
          <Link href="/summary">
            <span
              className={`px-4 py-2 text-sm font-medium rounded-t-md ${
                pathname === '/summary' ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-500' : 'text-gray-600 hover:text-blue-700'
              }`}
            >
              Room Cost
            </span>
          </Link>
          <Link href="/variants">
            <span
              className={`px-4 py-2 text-sm font-medium rounded-t-md ${
                pathname === '/variants' ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-500' : 'text-gray-600 hover:text-blue-700'
              }`}
            >
              Variants
            </span>
          </Link>
          <Link href="/room-types">
            <span
              className={`px-4 py-2 text-sm font-medium rounded-t-md ${
                pathname === '/room-types' ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-500' : 'text-gray-600 hover:text-blue-700'
              }`}
            >
              Room Types
            </span>
          </Link>
        </div>
      </div>

      <h1 className="text-3xl font-bold mb-8 text-gray-800">Room Type Creation</h1>
      
      {/* Project Context */}
      {projectId && projectName && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-blue-800">Project: {decodeURIComponent(projectName)}</h2>
              <p className="text-sm text-blue-600">Project ID: {projectId}</p>
            </div>
            <Link 
              href="/summary" 
              className="px-4 py-2 text-sm text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition"
            >
              ← Back to Project Setup
            </Link>
          </div>
        </div>
      )}

      {/* File Upload Section */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">
          {parseResult ? 'Excel Data Loaded' : 'Upload Excel File'}
        </h2>
        
        {parseResult && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">
              ✅ Excel data loaded from previous step. {parseResult.roomTypes.length} room types ready for creation.
            </p>
          </div>
        )}
      
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={!region}
            >
              <option value="">Select Country</option>
              {(regionMap[region] || []).map((ct: string) => (
                <option key={ct} value={ct}>{ct}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <input
              type="text"
              value={currency}
              className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50"
              readOnly
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Upload Excel File (.xlsx)</label>
          
          {/* Drag and Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              !region || !country || loading
                ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                : isDragOver
                ? 'border-green-400 bg-green-50 border-solid'
                : 'border-blue-300 bg-blue-50 hover:border-blue-400 hover:bg-blue-100 cursor-pointer'
            }`}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
              if (region && country && !loading) {
                document.getElementById('file-input')?.click();
              }
            }}
          >
            <div className="flex flex-col items-center">
              <svg className="w-12 h-12 text-blue-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-lg font-medium text-gray-700 mb-2">
                {!region || !country 
                  ? 'Select region and country first' 
                  : isDragOver 
                    ? 'Drop your file here!' 
                    : 'Drop your Excel file here'
                }
              </p>
              <p className="text-sm text-gray-500 mb-4">
                or <span className="text-blue-600 font-medium">click to browse</span>
              </p>
              <p className="text-xs text-gray-400">
                Supports .xlsx and .xls files • Both multi-room sheets and one-sheet-per-room formats
              </p>
            </div>
          </div>

          {/* Hidden file input */}
          <input
            id="file-input"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={!region || !country || loading}
          />
        </div>

        {loading && (
          <div className="mt-4 flex items-center text-blue-600">
            <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Parsing Excel file...
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
          </div>
        )}
      </div>

      {/* Cost Summary */}
      {parseResult && (parseResult.labourCost || parseResult.miscellaneousCost) && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Cost Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {parseResult.labourCost && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-800 mb-2">Labour Cost</h3>
                <p className="text-2xl font-bold text-blue-900">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: currency || 'USD'
                  }).format(parseResult.labourCost)}
                </p>
              </div>
            )}
            {parseResult.miscellaneousCost && (
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-medium text-green-800 mb-2">Miscellaneous Cost</h3>
                <p className="text-2xl font-bold text-green-900">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: currency || 'USD'
                  }).format(parseResult.miscellaneousCost)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Room Types Display */}
      {parseResult && parseResult.roomTypes.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">
            Room Types Found
            {checkingExisting && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                (Checking existing room types...)
              </span>
            )}
          </h2>
          
          {/* Variant System Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">📋 Variant System Guide:</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600">
              <div>
                <span className="font-medium text-blue-600">Standard:</span> Basic setup with essential components
              </div>
              <div>
                <span className="font-medium text-purple-600">Premium:</span> Mid-range features with enhanced capabilities
              </div>
              <div>
                <span className="font-medium text-green-600">Executive:</span> High-end features with advanced technology
              </div>
            </div>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-600">
              <div>
                <span className="font-medium text-orange-600">Codec-Based:</span> Dedicated codec setup (Amsterdam style)
              </div>
              <div>
                <span className="font-medium text-red-600">Direct-Connect:</span> VC camera to computer (London style)
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              💡 You can manually adjust variants using the "Edit Variant" button if the auto-detection doesn't match your needs.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              🔍 Use "Compare Similar" to see existing room types and make informed decisions about variants vs duplicates.
            </p>
          </div>

          <div className="space-y-6">
            {parseResult.roomTypes.map((roomType, index) => {
              const isExisting = isRoomTypeExisting(roomType);
              return (
                <div key={index} className={`border rounded-lg p-4 ${isExisting ? 'bg-gray-50 border-gray-300' : 'border-blue-300'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-800">{roomType.room_type}</h3>
                        {roomType.sub_type && (
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            roomType.sub_type !== determineSubType(roomType.room_type, roomType.total_cost, roomType.components)
                              ? 'bg-orange-100 text-orange-800 border border-orange-300'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {roomType.sub_type} Variant
                            {roomType.sub_type !== determineSubType(roomType.room_type, roomType.total_cost, roomType.components) && (
                              <span className="ml-1">(Manual)</span>
                            )}
                            {roomType.sub_type === determineSubType(roomType.room_type, roomType.total_cost, roomType.components) && (
                              <span className="ml-1">(Auto)</span>
                            )}
                          </span>
                        )}
                        {isExisting && (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                            Already Exists
                          </span>
                        )}
                        {!isExisting && (
                          <button
                            onClick={() => setEditingRoomType(editingRoomType === index ? null : index)}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition"
                          >
                            {editingRoomType === index ? 'Cancel' : 'Edit Variant'}
                          </button>
                        )}
                        {!isExisting && (
                          <button
                            onClick={() => handleShowSimilarRooms(index)}
                            className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full hover:bg-green-200 transition"
                          >
                            {showSimilarRooms === index ? 'Hide Similar' : 'Compare Similar'}
                          </button>
                        )}
                      </div>
                      
                      {/* Edit Sub-Type Dropdown */}
                      {editingRoomType === index && !isExisting && (
                        <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <label className="block text-sm font-medium text-blue-800 mb-2">
                            Select Variant Type:
                          </label>
                          <div className="flex gap-2">
                            {['Standard', 'Premium', 'Executive', 'Codec-Based', 'Direct-Connect'].map((subType) => (
                              <button
                                key={subType}
                                onClick={() => handleSubTypeChange(index, subType)}
                                className={`
                                  px-3 py-1 text-sm rounded-md transition ${
                                    roomType.sub_type === subType
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-white text-blue-600 border border-blue-300 hover:bg-blue-50'
                                  }`}
                              >
                                {subType}
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-blue-600 mt-2">
                            💡 <strong>Standard:</strong> Basic setup • <strong>Premium:</strong> Mid-range features • <strong>Executive:</strong> High-end features
                          </p>
                        </div>
                      )}
                      
                      {/* Similar Rooms Comparison */}
                      {showSimilarRooms === index && similarRoomTypes.length > 0 && (
                        <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
                          <h4 className="text-sm font-medium text-green-800 mb-2">
                            📊 Similar Room Types Found ({similarRoomTypes.length}):
                          </h4>
                          <div className="space-y-2">
                            {similarRoomTypes.map((similarRoom, similarIndex) => (
                              <div key={similarIndex} className="p-2 bg-white rounded border border-green-300">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <h5 className="text-sm font-medium text-gray-800">
                                      {similarRoom.attributes?.name || similarRoom.name}
                                    </h5>
                                    <p className="text-xs text-gray-600">
                                      UID: {similarRoom.attributes?.room_type || similarRoom.room_type}
                                    </p>
                                    <p className="text-xs text-gray-600">
                                      Category: {similarRoom.attributes?.category || similarRoom.category}
                                    </p>
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    <span className="px-2 py-1 bg-gray-100 rounded">
                                      {similarRoom.attributes?.default_pax || similarRoom.default_pax || 0} pax
                                    </span>
                                  </div>
                                </div>
                                <div className="mt-2 text-xs text-gray-600">
                                  <p>💡 This room type already exists. Consider creating a variant or linking to it.</p>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 text-xs text-green-700">
                            <p>🎯 <strong>Recommendation:</strong> If these are similar but different setups, create as a variant. If they're identical, consider linking to existing.</p>
                          </div>
                        </div>
                      )}
                      
                      {showSimilarRooms === index && similarRoomTypes.length === 0 && (
                        <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-xs text-blue-700">
                            ✅ No similar room types found. This appears to be a new room type.
                          </p>
                        </div>
                      )}
                      <p className="text-sm text-gray-600">Category: {roomType.category}</p>
                      <p className="text-sm text-gray-600">
                        Hardware Cost: {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: currency || 'USD'
                        }).format(roomType.total_cost)}
                      </p>
                      {roomType.labour_cost && (
                        <p className="text-sm text-blue-600">
                          Labour Cost: {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: currency || 'USD'
                          }).format(roomType.labour_cost)}
                        </p>
                      )}
                      {roomType.miscellaneous_cost && (
                        <p className="text-sm text-green-600">
                          Miscellaneous: {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: currency || 'USD'
                          }).format(roomType.miscellaneous_cost)}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {isExisting ? (
                        <button
                          disabled
                          className="px-4 py-2 bg-gray-400 text-white rounded-md cursor-not-allowed"
                        >
                          Already Exists
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCreateRoomType(roomType)}
                          disabled={uploading}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                          {uploading ? 'Creating...' : 'Create Room Type'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Component</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Make</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Model</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-700">Qty</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-700">Unit Cost</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-700">Total</th>
                          <th className="px-3 py-2 text-center font-medium text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roomType.components.map((component, compIndex) => (
                          <tr key={compIndex} className="border-t">
                            <td className="px-3 py-2 text-gray-800">{component.description}</td>
                            <td className="px-3 py-2 text-gray-600">{component.make}</td>
                            <td className="px-3 py-2 text-gray-600">{component.model}</td>
                            <td className="px-3 py-2 text-right text-gray-600">{component.qty}</td>
                            <td className="px-3 py-2 text-right text-gray-600">
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: component.currency
                              }).format(component.unit_cost)}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-600">
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: component.currency
                              }).format(component.qty * component.unit_cost)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                onClick={() => {
                                  setSelectedRoomType(roomType);
                                  handleComponentClick(component);
                                }}
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                Suggestions
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Component Suggestions Popup */}
      <ComponentSuggestionPopup
        isOpen={showSuggestions}
        onClose={() => setShowSuggestions(false)}
        suggestions={suggestions}
        currentComponent={currentComponent || {
          make: '',
          model: '',
          description: '',
          unit_cost: 0,
          currency: ''
        }}
        onAcceptSuggestion={handleAcceptSuggestion}
        onRejectSuggestion={handleRejectSuggestion}
      />
    </div>
  );
}

export default function RoomTypeCreation() {
  return (
    <Suspense fallback={
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-gray-600">Loading room types...</p>
          </div>
        </div>
      </div>
    }>
      <RoomTypeCreationContent />
    </Suspense>
  );
}