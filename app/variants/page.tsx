'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { apiService, fetchAllPages } from '../lib/api';

type RoomType = {
  id: number;
  documentId: string;
  room_type: string; // This is the UID
  name: string;      // This is the user-friendly name
  default_pax: number;
  is_configurable: boolean;
  description: string;
  category: string;
  region?: string;   // Added region field
  country?: string;  // Added country field
  currency?: string; // Added currency field
  attributes?: any;  // Added attributes for Strapi response structure
};

type RoomConfiguration = {
  id: number;
  documentId: string;
  room_type: string;
  model: string;
  description: string;
  make: string;
  sub_type: string;
  qty: number;
  unit_price: number;
};

type ComponentRow = {
  id: number;
  documentId: string;
  description: string;
  make: string;
  model: string;
  qty: number;
  unit_price: number;
  selected: boolean;
};

type AvComponent = {
  id: number;
  description: string;
  make: string;
  model: string;
  unit_cost: number;
};

type Variant = {
  room_name: string;   // User-friendly room name
  room_type: string;   // Technical UID
  sub_type: string;
  components: ComponentRow[];
  total_cost: number;
};

export default function Variants() {
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [roomConfigurations, setRoomConfigurations] = useState<RoomConfiguration[]>([]);
  const [subTypes, setSubTypes] = useState<string[]>([]);
  const [selectedRoomName, setSelectedRoomName] = useState<string>('');
  const [selectedSubType, setSelectedSubType] = useState<string>('');
  const [components, setComponents] = useState<ComponentRow[]>([]);
  const [avComponents, setAvComponents] = useState<AvComponent[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentCurrency, setCurrentCurrency] = useState('USD');
  const [project, setProject] = useState<any>(null); // Add project state
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const pathname = usePathname();

  // Helper function to get room name from room_type UID
  const getRoomNameFromUID = (roomTypeUID: string) => {
    const roomType = roomTypes.find(rt => rt.room_type === roomTypeUID);
    return roomType ? roomType.name : roomTypeUID;
  };

  // Helper function to get display name for sub-types
  const getSubTypeDisplayName = (subType: string): string => {
    switch (subType) {
      case 'Standard': return 'Standard';
      case 'Premium': return 'Premium';
      case 'Executive': return 'Executive';
      case 'Codec-Based': return 'Codec-Based';
      case 'Direct-Connect': return 'Direct-Connect';
      default: return subType;
    }
  };

  // Helper function to get currency symbol
  const getCurrencySymbol = (currencyCode: string): string => {
    switch (currencyCode.toUpperCase()) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'AED': return 'AED ';
      case 'QAR': return 'QAR ';
      case 'INR': return '₹';
      case 'SGD': return 'S$';
      case 'CAD': return 'C$';
      case 'MXN': return 'MX$';
      default: return currencyCode + ' ';
    }
  };

  // Get unique regions
  const getUniqueRegions = (): string[] => {
    const regions = roomTypes.map(rt => rt.region || rt.attributes?.region).filter(Boolean);
    const uniqueRegions = [...new Set(regions)].sort();
    console.log('Available regions:', uniqueRegions);
    // Show all regions including NAMR
    return uniqueRegions.filter(region => 
      region === 'APACME' || region === 'EMESA' || region === 'NAMR'
    );
  };

  // Get room types for selected region
  const getRoomTypesForRegion = (): string[] => {
    if (!selectedRegion) return [];
    
    const filteredRoomTypes = roomTypes.filter(rt => {
      const region = rt.region || rt.attributes?.region;
      const name = rt.name.toLowerCase();
      const search = searchTerm.toLowerCase();
      
      return region === selectedRegion && 
             (searchTerm === '' || name.includes(search));
    });
    
    return [...new Set(filteredRoomTypes.map(rt => rt.name))].sort();
  };

  // Extract room name and region from the combined string
  const extractRoomNameAndRegion = (combinedName: string): { name: string; region: string; country: string } => {
    const match = combinedName.match(/^(.+?)\s*-\s*(.+?)\s*\((.+?)\)$/);
    if (match) {
      return {
        name: match[1].trim(),
        region: match[2].trim(),
        country: match[3].trim()
      };
    }
    
    // Fallback if no region/country info
    const fallbackMatch = combinedName.match(/^(.+?)\s*-\s*(.+)$/);
    if (fallbackMatch) {
      return {
        name: fallbackMatch[1].trim(),
        region: fallbackMatch[2].trim(),
        country: ''
      };
    }
    
    return {
      name: combinedName,
      region: 'Unknown',
      country: ''
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('=== DEBUG: Fetching data ===');
        
        // Get project ID from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const projectId = urlParams.get('projectId');
        console.log('Current project ID:', projectId);
        
        // Fetch all room types
        const roomTypesResp = await apiService.getRoomTypes({ 
          populate: ['project'],
          pagination: {
            page: 1,
            pageSize: 100 // Increase page size to get all room types
          }
        });
        
        let allRoomTypes = Array.isArray(roomTypesResp.data) ? roomTypesResp.data : (roomTypesResp.data?.data || []);
        
        // Check if we need to fetch more pages
        const totalPages = roomTypesResp.data?.meta?.pagination?.pageCount || 1;
        console.log('Total pages:', totalPages, 'Current page size:', allRoomTypes.length);
        
        if (totalPages > 1) {
          console.log('Fetching additional pages...');
          for (let page = 2; page <= totalPages; page++) {
            const nextPageResp = await apiService.getRoomTypes({ 
              populate: ['project'],
              pagination: {
                page: page,
                pageSize: 100
              }
            });
            const nextPageData = Array.isArray(nextPageResp.data) ? nextPageResp.data : (nextPageResp.data?.data || []);
            allRoomTypes = [...allRoomTypes, ...nextPageData];
            console.log(`Fetched page ${page}, total room types now:`, allRoomTypes.length);
          }
        }
        
        console.log('Fetched room types:', allRoomTypes);
        console.log('Total room types fetched:', allRoomTypes.length);
        
        // Check if APACME room types are in the response
        const apacRoomTypes = allRoomTypes.filter((rt: any) => (rt.region || rt.attributes?.region) === 'APACME');
        console.log('APACME room types in response:', apacRoomTypes.length);
        if (apacRoomTypes.length > 0) {
          console.log('Sample APACME room type:', apacRoomTypes[0]);
        }
        
        setRoomTypes(allRoomTypes);

        // Fetch all room configurations with pagination
        let configsResp = await apiService.getRoomConfigurations({ 
          pagination: {
            page: 1,
            pageSize: 100 // Increase page size to get more configurations
          }
        });
        let allConfigs = Array.isArray(configsResp.data) ? configsResp.data : (configsResp.data?.data || []);
        
        // Check if we need to fetch more pages for configurations
        const totalConfigPages = configsResp.data?.meta?.pagination?.pageCount || 1;
        console.log('Total config pages:', totalConfigPages, 'Current config page size:', allConfigs.length);
        
        if (totalConfigPages > 1) {
          console.log('Fetching additional config pages...');
          for (let page = 2; page <= totalConfigPages; page++) {
            const nextPageResp = await apiService.getRoomConfigurations({ 
              pagination: {
                page: page,
                pageSize: 100
              }
            });
            const nextPageData = Array.isArray(nextPageResp.data) ? nextPageResp.data : (nextPageResp.data?.data || []);
            allConfigs = [...allConfigs, ...nextPageData];
            console.log(`Fetched config page ${page}, total configurations now:`, allConfigs.length);
          }
        }
        
        console.log('Fetched room configurations:', allConfigs);
        console.log('Total room configurations fetched:', allConfigs.length);
        
        // Debug: Show sample room configurations
        if (allConfigs.length > 0) {
          console.log('Sample room configuration:', allConfigs[0]);
          console.log('Sample room_type field:', allConfigs[0].room_type);
          console.log('Sample sub_type field:', allConfigs[0].sub_type);
        }
        
        // Check if room configurations exist for APACME room types
        if (apacRoomTypes.length > 0) {
          const apacUIDs = apacRoomTypes.map((rt: any) => rt.room_type);
          const apacConfigs = allConfigs.filter((config: any) => apacUIDs.includes(config.room_type));
          console.log('🔍 APACME CONFIGURATIONS CHECK:');
          console.log('APACME room types found:', apacRoomTypes.length);
          console.log('APACME configurations found:', apacConfigs.length);
          console.log('APACME UIDs:', apacUIDs);
          
          if (apacConfigs.length === 0) {
            console.warn('⚠️ NO CONFIGURATIONS FOUND FOR APACME ROOM TYPES!');
            console.warn('This means the room configurations were not created properly.');
            console.warn('You may need to re-upload the Chennai Excel file.');
            
            // Debug: Check if any configurations exist at all
            console.log('🔍 DEBUG: Checking all room configurations...');
            console.log('All room_type values in configurations:', allConfigs.map((c: any) => c.room_type));
            console.log('All sub_type values in configurations:', allConfigs.map((c: any) => c.sub_type));
          } else {
            console.log('✅ APACME configurations found:', apacConfigs.length);
            apacConfigs.forEach((config: any, index: number) => {
              console.log(`Config ${index + 1}: ${config.room_type} - ${config.sub_type} - ${config.description}`);
            });
          }
        }
        
        setRoomConfigurations(allConfigs);

        // Debug ALL room configurations to see their structure
        console.log('=== ALL ROOM CONFIGURATIONS STRUCTURE ===');
        console.log('Total configurations:', allConfigs.length);
        allConfigs.forEach((config: any, index: number) => {
          console.log(`Config ${index + 1}:`, {
            room_type: config.room_type,
            sub_type: config.sub_type,
            description: config.description,
            make: config.make,
            model: config.model
          });
        });
        
        // Debug room type UIDs vs config UIDs
        const roomTypeUIDs = allRoomTypes.map((rt: any) => rt.room_type);
        const configUIDs = allConfigs.map((config: any) => config.room_type);
        console.log('=== UID MATCHING DEBUG ===');
        console.log('Room type UIDs:', roomTypeUIDs);
        console.log('Config UIDs:', configUIDs);
        console.log('Matching UIDs:', roomTypeUIDs.filter((uid: string) => configUIDs.includes(uid)));

        // Fetch all AV components
        const avComponentsResp = await apiService.getAVComponents();
        const allAvComponents = Array.isArray(avComponentsResp.data) ? avComponentsResp.data : (avComponentsResp.data?.data || []);
        console.log('Fetched AV components:', allAvComponents);
        setAvComponents(allAvComponents);

        // Fetch project details if projectId is available
        if (projectId) {
          try {
            const projectResp = await apiService.getProjects({ filters: { id: { $eq: projectId } } });
            const project = projectResp.data?.data?.[0];
            console.log('Fetched project:', project);
            setProject(project);
            
            // Set currency from project
            if (project?.currency) {
              setCurrentCurrency(project.currency);
            }
          } catch (err) {
            console.log('Failed to fetch project details:', err);
          }
        }

        console.log('=== DEBUG: Data fetching complete ===');
    } catch (err) {
        const errorMessage = (err as Error)?.message || 'Unknown error';
        setError('Failed to fetch data: ' + errorMessage);
        console.error('Fetch Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Clear room type selection when region changes
  useEffect(() => {
    setSelectedRoomName('');
    setSelectedSubType('');
    setSearchTerm('');
  }, [selectedRegion]);

  // Clear search term when room type is selected
  useEffect(() => {
    if (selectedRoomName) {
      setSearchTerm('');
    }
  }, [selectedRoomName]);

  // Update sub-types when room type changes
  useEffect(() => {
    if (selectedRoomName && selectedRegion) {
      const fetchSubTypes = async () => {
        try {
          // Find the selected room type by name and region
          const selectedRoomType = roomTypes.find(rt => {
            const rtName = rt.name;
            const rtRegion = rt.region || rt.attributes?.region;
            
            return rtName === selectedRoomName && rtRegion === selectedRegion;
          });
          
          if (!selectedRoomType) {
            console.log(`No room type found for: ${selectedRoomName} in ${selectedRegion}`);
            setSubTypes([]);
            setSelectedSubType('');
            return;
          }

          // Update currency based on selected room type
          console.log('Selected room type for currency:', selectedRoomType);
          const roomTypeCurrency = selectedRoomType.currency || 
                                 selectedRoomType.attributes?.currency || 
                                 selectedRoomType.attributes?.data?.currency;
          
          if (roomTypeCurrency && roomTypeCurrency !== currentCurrency) {
            console.log(`Updating currency to: ${roomTypeCurrency} for room type: ${selectedRoomName}`);
            setCurrentCurrency(roomTypeCurrency);
          } else if (!roomTypeCurrency && project?.currency) {
            // Fallback to project currency if room type doesn't have currency
            console.log(`Using project currency: ${project.currency} for room type: ${selectedRoomName}`);
            setCurrentCurrency(project.currency);
          }

          // Get all sub-types for the selected room type
          const subTypesForRoom = [...new Set(
            roomConfigurations
              .filter(config => config.room_type === selectedRoomType.room_type)
              .map(config => config.sub_type)
          )].sort();

          setSubTypes(subTypesForRoom);
          setSelectedSubType(subTypesForRoom[0] || '');
        } catch (err) {
            const errorMessage = (err as Error)?.message || 'Unknown error';
            setError('Failed to fetch data: ' + errorMessage);
            console.error('Fetch Error:', err);
          }          
      };
      fetchSubTypes();
    } else {
      setSubTypes([]);
      setSelectedSubType('');
    }
  }, [selectedRoomName, selectedRegion, roomTypes, roomConfigurations, currentCurrency, project]);

  // Update components when room type and variant change
useEffect(() => {
    if (!selectedRoomName || !selectedSubType || !selectedRegion) {
    setComponents([]);
    return;
  }

  const fetchComponents = async () => {
    try {
        // Find the selected room type by name and region
        const selectedRoomType = roomTypes.find(rt => {
          const rtName = rt.name;
          const rtRegion = rt.region || rt.attributes?.region;
          
          return rtName === selectedRoomName && rtRegion === selectedRegion;
        });
        
        if (!selectedRoomType) {
          setComponents([]);
          return;
        }

        // Get all configurations for the selected room type and variant
        const configsForRoomAndVariant = roomConfigurations.filter(config => 
          config.room_type === selectedRoomType.room_type && 
          config.sub_type === selectedSubType
        );

        const list = configsForRoomAndVariant.map(config => {
return {
            id:          config.id,
            documentId:  config.documentId,
            description: config.description,
            make:        config.make,
            model:       config.model,
            qty:         config.qty ?? 1,
            unit_price:  config.unit_price || 0,
            selected:    true
          };
      });

      setComponents(list);
    } catch (err) {
        const errorMessage = (err as Error)?.message || 'Unknown error';
        setError('Failed to fetch data: ' + errorMessage);
        console.error('Fetch Error:', err);
      }
    };
  fetchComponents();
  }, [selectedRoomName, selectedSubType, selectedRegion, roomTypes, roomConfigurations]);

  const toggleComponent = (id: number) => {
    setComponents(components.map(comp => comp.id === id ? { ...comp, selected: !comp.selected } : comp));
  };

  const totalCost = components
    .filter(comp => comp.selected)
    .reduce((sum, comp) => sum + (comp.qty * comp.unit_price), 0);

  const addVariant = () => {
    if (selectedRoomName && selectedSubType && selectedRegion && components.length > 0) {
      // Find the selected room type by name and region
      const selectedRoomType = roomTypes.find(rt => {
        const rtName = rt.name;
        const rtRegion = rt.region || rt.attributes?.region;
        
        return rtName === selectedRoomName && rtRegion === selectedRegion;
      });
      
      if (!selectedRoomType) return;

      setVariants([...variants, {
        room_name: selectedRoomType.name,
        room_type: selectedRoomType.room_type,
        sub_type: selectedSubType,
        components: components.map(comp => ({ ...comp })),
        total_cost: totalCost,
      }]);
    }
  };

  const resetVariants = () => {
    setVariants([]);
  };

const submitVariant = async () => {
  if (!selectedRoomName || !selectedSubType || !selectedRegion) {
    setError('Select a region, room type and variant first.');
    return;
  }

  try {
    // Find the selected room type by name and region
    const selectedRoomType = roomTypes.find(rt => {
      const rtName = rt.name;
      const rtRegion = rt.region || rt.attributes?.region;
      
      return rtName === selectedRoomName && rtRegion === selectedRegion;
    });
    
    if (!selectedRoomType) {
      setError('Selected room type not found.');
      return;
    }

    const ops = components
      .filter(r => r.selected)
      .map(r => 
        apiService.createRoomConfiguration({
          room_type:   selectedRoomType.room_type,
              sub_type:    selectedSubType,
              description: r.description,
              make:        r.make,
              model:       r.model,
              qty:         r.qty,
          unit_price:  r.unit_price
          })
        );

    await Promise.all(ops);
    setError(null);
    alert('Configuration updated!');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setError('Failed to update configuration: ' + msg);
    console.error(err);
  }
};

  return (
    <div className="container mx-auto p-6">
      {/* Navigation Tabs */}
      <div className="mb-8">
        <div className="flex space-x-2 border-b border-gray-200 overflow-x-auto">
          <Link href="/">
            <span
              className={`px-3 py-2 text-sm font-medium rounded-t-md whitespace-nowrap ${
                pathname === '/' ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-500' : 'text-gray-600 hover:text-blue-700'
              }`}
            >
              Configurator
            </span>
          </Link>
          <Link href="/summary">
            <span
              className={`px-4 py-2 text-sm font-medium rounded-t-md ${
                pathname === '/summary' ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-500' : 'text-gray-600 hover:text-blue-700'
              }`}
            >
              Project Data
            </span>
          </Link>



          <Link href="/room-configuration">
            <span
              className={`px-3 py-2 text-sm font-medium rounded-t-md whitespace-nowrap ${
                pathname === '/room-configuration' ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-500' : 'text-gray-600 hover:text-blue-700'
              }`}
            >
              Configuration
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
          {/* SRM temporarily hidden - will be integrated into project workflow */}
          {/* <Link href="/srm">
            <span
              className={`px-4 py-2 text-sm font-medium rounded-t-md ${
                pathname === '/srm' ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-500' : 'text-gray-600 hover:text-blue-700'
              }`}
            >
              Space Requirements
            </span>
          </Link> */}

          <Link href="/dashboard">
            <span
              className={`px-3 py-2 text-sm font-medium rounded-t-md whitespace-nowrap ${
                pathname === '/dashboard' ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-500' : 'text-gray-600 hover:text-blue-700'
              }`}
            >
              Dashboard
            </span>
          </Link>
        </div>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Room Variants Comparison</h1>
        {currentProjectId ? (
          <div>
            <p className="text-sm text-gray-600">Project ID: {currentProjectId} | Currency: {currentCurrency} ({getCurrencySymbol(currentCurrency)})</p>
            <p className="text-sm text-green-600 mt-1">✅ Using direct region-based filtering from room types</p>
          </div>
        ) : (
          <p className="text-sm text-blue-600">Showing all room types (no project filter applied) | Currency: {currentCurrency} ({getCurrencySymbol(currentCurrency)})</p>
        )}
        <p className="text-gray-600">Compare different room type variants and their components</p>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500 text-lg">Loading room variants...</p>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Failed to load data</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-2 text-sm text-red-600 hover:text-red-500 font-medium"
              >
                Try again →
              </button>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-end mb-4">
            <Link href="/configurator">
              <button className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
                Add Configuration
              </button>
            </Link>
          </div>

          {loading ? (
            <p className="text-gray-500 text-center py-8">Loading room types...</p>
          ) : roomTypes.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No room types found. Please create some room types first.</p>
          ) : (
            <>
              {/* Debug Information */}
              <div className="mb-4 p-4 bg-gray-100 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Debug Info:</h3>
                <p className="text-xs text-gray-600">Total room types loaded: {roomTypes.length}</p>
                <p className="text-xs text-gray-600">Regions found: {getUniqueRegions().join(', ')}</p>
                <p className="text-xs text-gray-600">Selected region: {selectedRegion || 'None'}</p>
                <p className="text-xs text-gray-600">Room types in selected region: {getRoomTypesForRegion().length}</p>
                <p className="text-xs text-gray-600">Total configurations: {roomConfigurations.length}</p>
                {!getUniqueRegions().includes('APACME') && (
                    <p className="text-xs text-red-600 mt-2">
                        ⚠️ APACME region not found. Chennai room types may need to be created or have different region names.
                    </p>
                )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
              <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                    <option value="">Select Region</option>
                    {getUniqueRegions().map((region) => (
                      <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>
            <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
                  {selectedRegion && (
                    <input
                      type="text"
                      placeholder="Search room types..."
                      value={searchTerm}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  )}
                  {selectedRegion && searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="text-sm text-blue-600 hover:text-blue-800 mb-2"
                    >
                      Clear search
                    </button>
                  )}
                  <select
                    value={selectedRoomName}
                    onChange={(e) => setSelectedRoomName(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!selectedRegion}
                  >
                    <option value="">Select Room Type</option>
                    {getRoomTypesForRegion().map((roomName) => {
                      // Find the room type to get variant count
                      const roomType = roomTypes.find(rt => rt.name === roomName && (rt.region || rt.attributes?.region) === selectedRegion);
                      
                      // Debug variant count calculation
                      if (roomType) {
                        const matchingConfigs = Array.isArray(roomConfigurations) ? roomConfigurations
                          .filter(c => c.room_type === roomType.room_type) : [];
                        const uniqueSubTypes = new Set(matchingConfigs.map(c => c.sub_type));
                        const variantCount = uniqueSubTypes.size;
                        
                        console.log(`🔍 Variant Count Debug for ${roomName}:`);
                        console.log(`  Room Type UID: ${roomType.room_type}`);
                        console.log(`  Matching configs: ${matchingConfigs.length}`);
                        console.log(`  Unique sub_types: ${Array.from(uniqueSubTypes)}`);
                        console.log(`  Variant count: ${variantCount}`);
                        
                        return (
                          <option key={roomName} value={roomName}>
                            {roomName} ({variantCount} variants)
                          </option>
                        );
                      } else {
                        console.log(`❌ No room type found for: ${roomName} in ${selectedRegion}`);
                        return (
                          <option key={roomName} value={roomName}>
                            {roomName} (0 variants)
                          </option>
                        );
                      }
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Variant</label>
              <select
                value={selectedSubType}
                onChange={(e) => setSelectedSubType(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!selectedRoomName}
                  >
                    <option value="">Select Variant</option>
                    {Array.isArray(subTypes) && subTypes.map((variant) => (
                      <option key={variant} value={variant}>{getSubTypeDisplayName(variant)}</option>
                ))}
              </select>
            </div>
          </div>

          {components.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4 text-blue-800">Bill of Materials</h2>
              <div className="overflow-x-auto shadow-md rounded-lg">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 border-b">Select</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 border-b">Description</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 border-b">Make</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 border-b">Model</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700 border-b">Qty</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700 border-b">Unit Cost ($)</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700 border-b">Total Cost ($)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {components.map((comp) => (
                      <tr key={comp.id} className="hover:bg-gray-100 transition-colors">
                        <td className="px-6 py-2 text-sm text-gray-600 border-b">
                          <input
                            type="checkbox"
                            checked={comp.selected}
                            onChange={() => toggleComponent(comp.id)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-2 text-sm text-gray-600 border-b">{comp.description}</td>
                        <td className="px-6 py-2 text-sm text-gray-600 border-b">{comp.make}</td>
                        <td className="px-6 py-2 text-sm text-gray-600 border-b">{comp.model}</td>
                        <td className="px-6 py-2 text-sm text-gray-600 text-right border-b">{comp.qty}</td>
                            <td className="px-6 py-2 text-sm text-gray-600 text-right border-b">{getCurrencySymbol(currentCurrency)}{comp.unit_price.toFixed(2)}</td>
                            <td className="px-6 py-2 text-sm text-gray-600 text-right border-b">{getCurrencySymbol(currentCurrency)}{(comp.qty * comp.unit_price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end mt-4">
                <div className="bg-gray-50 p-4 rounded-lg shadow-md">
                  <p className="text-lg font-semibold text-gray-800">
                        Total Cost: <span className="text-blue-600">{getCurrencySymbol(currentCurrency)}{totalCost.toFixed(2)}</span>
                  </p>
                </div>
              </div>
              <div className="flex justify-end mt-4 space-x-2">
                <button
                  onClick={addVariant}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add to Compare
                </button>
                <button
                  onClick={submitVariant}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Submit Variant
                </button>
              </div>
            </div>
          )}

          {variants.length > 0 && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-blue-800">Compare Variants</h2>
                <button
                  onClick={resetVariants}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Reset Comparator
                </button>
              </div>
              <div className="overflow-x-auto shadow-md rounded-lg">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 border-b">Variant</th>
                          {variants.map((variant, index) => {
                            // Find the room type to get region information
                            const roomType = roomTypes.find(rt => rt.room_type === variant.room_type);
                            const region = roomType?.region || roomType?.attributes?.region || '';
                            const country = roomType?.country || roomType?.attributes?.country || '';
                            const regionInfo = country ? `${region} (${country})` : region;
                            const displayName = regionInfo ? `${variant.room_name} - ${regionInfo} - ${getSubTypeDisplayName(variant.sub_type)}` : `${variant.room_name} - ${getSubTypeDisplayName(variant.sub_type)}`;
                            
                            return (
                        <th key={index} className="px-6 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                                {displayName}
                        </th>
                            );
                          })}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="hover:bg-gray-100 transition-colors">
                          <td className="px-6 py-2 text-sm text-gray-600 border-b font-semibold">Total Cost ({currentCurrency})</td>
                      {variants.map((variant, index) => (
                            <td key={index} className="px-6 py-2 text-sm text-gray-600 border-b">{getCurrencySymbol(currentCurrency)}{variant.total_cost.toFixed(2)}</td>
                      ))}
                    </tr>
                    {[...new Set(variants.flatMap(v => v.components.map(c => `${c.description}|${c.make}|${c.model}`)))].map(compKey => {
                      const [description, make, model] = compKey.split('|');
                      return (
                        <tr key={compKey} className="hover:bg-gray-100 transition-colors">
                          <td className="px-6 py-2 text-sm text-gray-600 border-b">{description} ({make}, {model})</td>
                          {variants.map((variant, index) => {
                            const comp = variant.components.find(c => c.description === description && c.make === make && c.model === model);
                            return (
                              <td key={index} className="px-6 py-2 text-sm text-gray-600 border-b">
                                    {comp && comp.selected ? `Qty: ${comp.qty}, ${getCurrencySymbol(currentCurrency)}${(comp.qty * comp.unit_price).toFixed(2)}` : '-'}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}