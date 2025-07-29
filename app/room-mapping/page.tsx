'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { apiService, fetchAllPages } from '../lib/api';

interface SRMRoom {
  id: string;
  room_name: string;
  space_type: 'i-space' | 'we-space';
  count: number;
  category: string;
  description?: string;
}

interface ExistingRoomType {
  id: number;
  room_type: string;
  name: string;
  region: string;
  country: string;
  category: string;
  sub_type: string;
  default_pax: number;
  is_configurable: boolean;
}

interface RoomMapping {
  srm_room_id: string;
  existing_room_type_id?: number;
  status: 'unmapped' | 'mapped' | 'new_room' | 'skipped';
  suggested_room_types: ExistingRoomType[];
  selected_room_type?: ExistingRoomType;
  new_room_name?: string;
  skip_reason?: string;
}

export default function RoomMappingPage() {
  const [srmRooms, setSrmRooms] = useState<SRMRoom[]>([]);
  const [existingRoomTypes, setExistingRoomTypes] = useState<ExistingRoomType[]>([]);
  const [roomMappings, setRoomMappings] = useState<RoomMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showOtherRegions, setShowOtherRegions] = useState(false);
  const [mappingProgress, setMappingProgress] = useState(0);
  const [projectCurrency, setProjectCurrency] = useState<string>('USD');
  const [selectedRoomsForComparison, setSelectedRoomsForComparison] = useState<string[]>([]);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const pathname = usePathname();

  // Load SRM data and project details from sessionStorage
  useEffect(() => {
    const srmDataString = sessionStorage.getItem('srmData');
    const projectDataString = sessionStorage.getItem('projectData');
    
    console.log('Room mapping - SessionStorage check:', {
      srmData: srmDataString ? 'Found' : 'Missing',
      projectData: projectDataString ? 'Found' : 'Missing'
    });
    
    if (srmDataString) {
      try {
        const srmData = JSON.parse(srmDataString);
        setSrmRooms(srmData);
        initializeMappings(srmData);
        console.log('Loaded SRM data:', srmData);
      } catch (error) {
        console.error('Error parsing SRM data:', error);
        setError('Failed to load SRM data');
      }
    } else {
      console.log('No SRM data found in sessionStorage');
    }
    
    // Load project details for auto-population
    if (projectDataString) {
      try {
        const projectData = JSON.parse(projectDataString);
        console.log('Loaded project data for auto-population:', projectData);
        console.log('Setting region/country:', { region: projectData.region, country: projectData.country });
        
        setSelectedRegion(projectData.region || '');
        setSelectedCountry(projectData.country || '');
        setProjectCurrency(projectData.currency || 'USD');
        
        console.log('Auto-set region/country:', { 
          region: projectData.region, 
          country: projectData.country,
          selectedRegion: projectData.region || '',
          selectedCountry: projectData.country || ''
        });
      } catch (error) {
        console.error('Error parsing project data:', error);
      }
    } else {
      console.log('No project data found in sessionStorage');
      console.log('Available sessionStorage keys:', Object.keys(sessionStorage));
    }
    

  }, []);

  const initializeMappings = (rooms: SRMRoom[]) => {
    const mappings: RoomMapping[] = rooms.map(room => ({
      srm_room_id: room.id,
      status: 'unmapped',
      suggested_room_types: []
    }));
    setRoomMappings(mappings);
  };

  useEffect(() => {
    fetchExistingRoomTypes();
  }, [selectedRegion, selectedCountry, showOtherRegions, searchTerm]);

  // Additional useEffect to trigger fetch when country/region is auto-set
  useEffect(() => {
    if (selectedCountry || selectedRegion) {
      console.log('Country/Region changed, triggering room type fetch:', { selectedCountry, selectedRegion });
      fetchExistingRoomTypes();
    }
  }, [selectedCountry, selectedRegion]);

  const fetchExistingRoomTypes = async () => {
    try {
      setLoading(true);
      console.log('Fetching room types with criteria:', { selectedCountry, selectedRegion, showOtherRegions, searchTerm });
      
      const roomTypes = await fetchAllPages('/room-types');
      console.log(`Fetched ${roomTypes.length} total room types`);
      
      let filteredRoomTypes = roomTypes;
      
      // Smart filtering based on priority: Country -> Region -> Other Regions
      if (selectedCountry) {
        console.log(`Filtering by country: ${selectedCountry}`);
        // First, show room types from the selected country
        const countryRoomTypes = roomTypes.filter((rt: any) => 
          rt.country === selectedCountry || rt.attributes?.country === selectedCountry
        );
        
        console.log(`Found ${countryRoomTypes.length} room types for country: ${selectedCountry}`);
        
        if (countryRoomTypes.length > 0) {
          filteredRoomTypes = countryRoomTypes;
          console.log('Using country-specific room types');
        } else if (selectedRegion) {
          console.log(`No country matches, filtering by region: ${selectedRegion}`);
          // If no country matches, show room types from the selected region
          filteredRoomTypes = roomTypes.filter((rt: any) => 
            rt.region === selectedRegion || rt.attributes?.region === selectedRegion
          );
          console.log(`Found ${filteredRoomTypes.length} room types for region: ${selectedRegion}`);
        }
      } else if (selectedRegion) {
        console.log(`No country selected, filtering by region: ${selectedRegion}`);
        // If no country selected, show room types from the selected region
        filteredRoomTypes = roomTypes.filter((rt: any) => 
          rt.region === selectedRegion || rt.attributes?.region === selectedRegion
        );
        console.log(`Found ${filteredRoomTypes.length} room types for region: ${selectedRegion}`);
      }
      
      // If "Show Other Regions" is enabled, show all room types
      if (showOtherRegions) {
        console.log('Show Other Regions enabled - showing all room types');
        filteredRoomTypes = roomTypes;
      }

      // Filter by search term
      if (searchTerm) {
        console.log(`Filtering by search term: ${searchTerm}`);
        filteredRoomTypes = filteredRoomTypes.filter((rt: any) => 
          rt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          rt.room_type.toLowerCase().includes(searchTerm.toLowerCase())
        );
        console.log(`Found ${filteredRoomTypes.length} room types after search filter`);
      }

      console.log(`Final filtered room types: ${filteredRoomTypes.length} out of ${roomTypes.length} total`);
      console.log('Filter criteria:', { selectedCountry, selectedRegion, showOtherRegions, searchTerm });
      
      setExistingRoomTypes(filteredRoomTypes);
      
      // Update suggestions for unmapped rooms
      updateSuggestions(filteredRoomTypes);
      
    } catch (err) {
      console.error('Error fetching room types:', err);
      setError('Failed to load existing room types');
    } finally {
      setLoading(false);
    }
  };

  const updateSuggestions = (roomTypes: ExistingRoomType[]) => {
    setRoomMappings(prev => prev.map(mapping => {
      if (mapping.status === 'unmapped') {
        const srmRoom = srmRooms.find(r => r.id === mapping.srm_room_id);
        if (!srmRoom) return mapping;

        // Find similar room types based on name and category
        const suggestions = roomTypes.filter(rt => {
          const nameMatch = rt.name.toLowerCase().includes(srmRoom.room_name.toLowerCase()) ||
                           srmRoom.room_name.toLowerCase().includes(rt.name.toLowerCase());
          const categoryMatch = rt.category.toLowerCase().includes(srmRoom.category.toLowerCase());
          return nameMatch || categoryMatch;
        }).slice(0, 5); // Top 5 suggestions

        return { ...mapping, suggested_room_types: suggestions };
      }
      return mapping;
    }));
  };

  const handleRoomMapping = (srmRoomId: string, existingRoomType: ExistingRoomType) => {
    setRoomMappings(prev => prev.map(mapping => 
      mapping.srm_room_id === srmRoomId 
        ? { 
            ...mapping, 
            status: 'mapped', 
            selected_room_type: existingRoomType
          }
        : mapping
    ));
  };

  const handleCreateNewRoom = (srmRoomId: string, newRoomName: string) => {
    setRoomMappings(prev => prev.map(mapping => 
      mapping.srm_room_id === srmRoomId 
        ? { ...mapping, status: 'new_room', new_room_name: newRoomName }
        : mapping
    ));
  };

  const updateProgress = () => {
    const unmappedCount = roomMappings.filter(m => m.status === 'unmapped').length;
    const totalCount = roomMappings.length;
    
    // If no unmapped rooms, we're done!
    if (unmappedCount === 0) {
      setMappingProgress(100);
      return;
    }
    
    // Otherwise calculate percentage
    const processedCount = totalCount - unmappedCount;
    const progress = (processedCount / totalCount) * 100;
    setMappingProgress(progress);
  };

  const getUniqueRegions = () => {
    const regions = new Set(existingRoomTypes.map(rt => rt.region).filter(Boolean));
    return Array.from(regions).sort();
  };

  const getUniqueCountries = () => {
    const countries = new Set(existingRoomTypes.map(rt => rt.country).filter(Boolean));
    return Array.from(countries).sort();
  };

  // Auto-update progress whenever roomMappings changes
  useEffect(() => {
    updateProgress();
  }, [roomMappings]);



  // Format currency - no conversion needed
  const formatCurrency = (amount: number, currency: string): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const handleSkipRoom = (srmRoomId: string, reason: string) => {
    setRoomMappings(prev => prev.map(mapping => 
      mapping.srm_room_id === srmRoomId 
        ? { ...mapping, status: 'skipped' as const, skip_reason: reason }
        : mapping
    ));
  };

  const handleUnmapRoom = (srmRoomId: string) => {
    setRoomMappings(prev => prev.map(mapping => 
      mapping.srm_room_id === srmRoomId 
        ? { 
            ...mapping, 
            status: 'unmapped', 
            selected_room_type: undefined,
            new_room_name: undefined,
            skip_reason: undefined
          }
        : mapping
    ));
  };

  const handleContinue = () => {
    // Save room mappings to sessionStorage before navigating
    sessionStorage.setItem('roomMappings', JSON.stringify(roomMappings));
    console.log('Saved room mappings to sessionStorage:', roomMappings);
    
    // Navigate to room configuration page
    window.location.href = '/room-configuration';
  };

  // Room comparison functions
  const handleRoomSelectionForComparison = (srmRoomId: string) => {
    setSelectedRoomsForComparison(prev => {
      if (prev.includes(srmRoomId)) {
        return prev.filter(id => id !== srmRoomId);
      } else if (prev.length < 3) {
        return [...prev, srmRoomId];
      }
      return prev;
    });
  };

  const clearRoomSelection = () => {
    setSelectedRoomsForComparison([]);
  };

  const getSelectedRoomsData = () => {
    return selectedRoomsForComparison.map(srmRoomId => {
      const srmRoom = srmRooms.find(room => room.id === srmRoomId);
      const mapping = roomMappings.find(m => m.srm_room_id === srmRoomId);
      return {
        srmRoom,
        mapping,
        selectedRoomType: mapping?.selected_room_type
      };
    }).filter(data => data.srmRoom);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold text-gray-900">Room Configurator</h1>
              
              {/* Navigation Tabs */}
              <nav className="flex space-x-1">
                <Link 
                  href="/" 
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    pathname === '/' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Configurator
                </Link>
                <Link 
                  href="/summary" 
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    pathname === '/summary' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Project Data
                </Link>
                <Link 
                  href="/room-mapping" 
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    pathname === '/room-mapping' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Room Mapping
                </Link>
                <Link 
                  href="/variants" 
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    pathname === '/variants' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Variants
                </Link>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Room Type Mapping</h2>
          <p className="text-gray-600">
            Map your SRM room types to existing room types in our system. 
            We'll help you find the best matches based on your region and country.
          </p>
          
          {/* 5-Minute Workflow Progress */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-blue-800">5-Minute Cost Estimation Workflow</h3>
              <span className="text-sm text-blue-600 font-medium">Step 2 of 4</span>
            </div>
            <div className="flex space-x-2">
              <div className="flex-1 bg-blue-600 rounded-full h-2"></div>
              <div className="flex-1 bg-blue-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full w-1/2"></div>
              </div>
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

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Mapping Progress: {Math.round(mappingProgress)}%
            </span>
            <span className="text-sm text-gray-500">
              {roomMappings.filter(m => m.status !== 'unmapped').length} of {roomMappings.length} rooms processed (mapped + skipped)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${mappingProgress}%` }}
            ></div>
          </div>
          
          {/* Debug: Room Status Summary */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs">
            <p className="font-medium text-gray-700 mb-2">Room Status Summary:</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-green-600">✓ Mapped: </span>
                <span>{roomMappings.filter(m => m.status === 'mapped').length}</span>
              </div>
              <div>
                <span className="text-blue-600">✨ New Room: </span>
                <span>{roomMappings.filter(m => m.status === 'new_room').length}</span>
              </div>
              <div>
                <span className="text-gray-600">⏭️ Skipped: </span>
                <span>{roomMappings.filter(m => m.status === 'skipped').length}</span>
              </div>
              <div>
                <span className="text-yellow-600">⏳ Unmapped: </span>
                <span>{roomMappings.filter(m => m.status === 'unmapped').length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Search & Filter Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Regions</option>
                {getUniqueRegions().map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
              {selectedRegion && (
                <p className="text-xs text-blue-600 mt-1">Auto-populated from project</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Countries</option>
                {getUniqueCountries().map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
              {selectedCountry && (
                <p className="text-xs text-blue-600 mt-1">Auto-populated from project</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search room types..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setShowOtherRegions(!showOtherRegions)}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                {showOtherRegions ? 'Hide' : 'Show'} Other Regions
              </button>
            </div>
          </div>
          
          {/* Currency Conversion Notice */}
          {showOtherRegions && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
              <div className="flex items-start justify-between">
                <div className="flex items-start">
                  <svg className="h-5 w-5 text-orange-400 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-orange-800">
                      Currency Conversion Notice
                    </p>
                    <p className="text-sm text-orange-700 mt-1">
                      Room types from other regions will show costs in their original currency.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* Room Mapping Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side - SRM Rooms */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Your SRM Room Types</h3>
              <p className="text-sm text-gray-600 mt-1">
                Room types from your Space Requirement Matrix
              </p>
            </div>
            <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
              {srmRooms.length > 0 ? (
                srmRooms.map((room) => {
                  const mapping = roomMappings.find(m => m.srm_room_id === room.id);
                  const status = mapping?.status || 'unmapped';
                  
                  return (
                    <div
                      key={room.id}
                      className={`p-4 border rounded-lg transition-all duration-200 ${
                        status === 'mapped' 
                          ? 'border-green-200 bg-green-50' 
                          : status === 'new_room'
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={selectedRoomsForComparison.includes(room.id)}
                              onChange={() => handleRoomSelectionForComparison(room.id)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              disabled={selectedRoomsForComparison.length >= 3 && !selectedRoomsForComparison.includes(room.id)}
                            />
                            <h4 className="font-medium text-gray-900">{room.room_name}</h4>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{room.description}</p>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              room.space_type === 'i-space' 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {room.space_type}
                            </span>
                            <span className="text-sm text-gray-500">
                              Count: {room.count}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          {status === 'mapped' && (
                            <div className="space-y-1">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                ✓ Mapped
                              </span>
                              <div className="text-xs text-gray-600">
                                → {mapping?.selected_room_type?.name || 'Unknown Room Type'}
                              </div>
                              <button
                                onClick={() => handleUnmapRoom(room.id)}
                                className="block w-full px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                              >
                                Unmap
                              </button>
                            </div>
                          )}
                          {status === 'new_room' && (
                            <div className="space-y-1">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                ✨ New Room
                              </span>
                              <div className="text-xs text-gray-600">
                                → {mapping?.new_room_name || 'New Room Type'}
                              </div>
                              <button
                                onClick={() => handleUnmapRoom(room.id)}
                                className="block w-full px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                              >
                                Unmap
                              </button>
                            </div>
                          )}
                          {status === 'skipped' && (
                            <div className="space-y-1">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                ⏭️ Skipped
                              </span>
                              <div className="text-xs text-gray-600">
                                → {mapping?.skip_reason || 'No AV required'}
                              </div>
                              <button
                                onClick={() => handleUnmapRoom(room.id)}
                                className="block w-full px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                              >
                                Unskip
                              </button>
                            </div>
                          )}
                          {status === 'unmapped' && (
                            <div className="space-y-1">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                ⏳ Unmapped
                              </span>
                              <button
                                onClick={() => handleSkipRoom(room.id, 'No AV required')}
                                className="block w-full px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                              >
                                Skip (No AV)
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No SRM Data Available</h3>
                  <p className="text-gray-600 mb-4">Upload your Space Requirement Matrix (SRM) in the Project Data section first.</p>
                  <Link
                    href="/summary"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    ← Back to Project Data
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Existing Room Types & Mapping */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Available Room Types</h3>
              <p className="text-sm text-gray-600 mt-1">
                {loading ? 'Loading...' : `${existingRoomTypes.length} room types found`}
                {!loading && (
                  <span className="ml-2 text-xs text-gray-500">
                    (Country: {selectedCountry || 'Any'}, Region: {selectedRegion || 'Any'}, Other Regions: {showOtherRegions ? 'Yes' : 'No'})
                  </span>
                )}
              </p>
            </div>
            <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading room types...</p>
                </div>
              ) : existingRoomTypes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No room types found. Try adjusting your filters.</p>
                  <div className="mt-4 text-xs text-gray-400">
                    <p>Debug Info:</p>
                    <p>Selected Country: {selectedCountry || 'None'}</p>
                    <p>Selected Region: {selectedRegion || 'None'}</p>
                    <p>Show Other Regions: {showOtherRegions ? 'Yes' : 'No'}</p>
                    <p>Search Term: {searchTerm || 'None'}</p>
                  </div>
                </div>
              ) : (
                existingRoomTypes.map((roomType) => (
                  <div
                    key={roomType.id}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{roomType.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Type: {roomType.room_type} • {roomType.sub_type}
                        </p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="text-sm text-gray-500">
                            {roomType.region}, {roomType.country}
                            {roomType.region !== selectedRegion && (
                              <span className="ml-1 text-orange-600">(Other Region)</span>
                            )}
                          </span>
                          <span className="text-sm text-gray-500">
                            {roomType.default_pax} pax
                          </span>
                          {/* Show currency conversion notice only for cross-region selections with different currencies */}
                          {(() => {
                            const regionCurrencyMap: { [key: string]: string } = {
                              'APACME': 'INR',
                              'EMESA': 'EUR', 
                              'NAMR': 'USD'
                            };
                            const sourceCurrency = regionCurrencyMap[roomType.region] || 'USD';
                            const targetCurrency = regionCurrencyMap[selectedRegion] || 'USD';
                            const needsConversion = roomType.region !== selectedRegion && sourceCurrency !== targetCurrency;
                            
                            return needsConversion ? (
                              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                💱 Currency conversion: {sourceCurrency} → {targetCurrency}
                              </span>
                            ) : roomType.region !== selectedRegion ? (
                              <span className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                                🌍 Cross-region (Same currency)
                              </span>
                            ) : null;
                          })()}
                        </div>
                      </div>
                      <div className="ml-4 space-y-2">
                        {srmRooms.map((srmRoom) => {
                          const mapping = roomMappings.find(m => m.srm_room_id === srmRoom.id);
                          if (mapping?.status === 'unmapped') {
                            return (
                              <div key={srmRoom.id} className="space-y-1">
                                <button
                                  onClick={() => handleRoomMapping(srmRoom.id, roomType)}
                                  className="block w-full px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                >
                                  Map to "{srmRoom.room_name}"
                                </button>
                                <button
                                  onClick={() => handleSkipRoom(srmRoom.id, 'No AV required')}
                                  className="block w-full px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                                >
                                  Skip (No AV)
                                </button>
                              </div>
                            );
                          } else if (mapping?.status === 'mapped' && mapping.selected_room_type?.id === roomType.id) {
                            return (
                              <div key={srmRoom.id} className="space-y-1">
                                <div className="text-xs text-green-600 font-medium">
                                  ✓ Mapped to "{srmRoom.room_name}"
                                </div>
                                <button
                                  onClick={() => handleUnmapRoom(srmRoom.id)}
                                  className="block w-full px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                                >
                                  Unmap
                                </button>
                              </div>
                            );
                          } else if (mapping?.status === 'skipped') {
                            return (
                              <div key={srmRoom.id} className="space-y-1">
                                <div className="text-xs text-gray-600 font-medium">
                                  ⏭️ Skipped "{srmRoom.room_name}"
                                </div>
                                <button
                                  onClick={() => handleUnmapRoom(srmRoom.id)}
                                  className="block w-full px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                                >
                                  Unskip
                                </button>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-between items-center">
          <Link
            href="/summary"
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            ← Back to Project Data
          </Link>
          
          <button
            onClick={handleContinue}
            disabled={mappingProgress < 100}
            className={`px-8 py-3 rounded-lg font-medium transition-colors ${
              mappingProgress < 100
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Continue to Room Configuration →
            {mappingProgress < 100 && (
              <span className="block text-xs mt-1">
                ({roomMappings.filter(m => m.status === 'unmapped').length} rooms still need action)
              </span>
            )}
          </button>
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">💡 Mapping Tips</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>I-spaces</strong> are individual work areas (open workstations, partner cabins)</li>
            <li>• <strong>We-spaces</strong> are collaborative areas (meeting rooms, case team rooms)</li>
            <li>• Use the filters to find room types from your specific region and country</li>
            <li>• If no exact match is found, you can create a new room type</li>
            <li>• All rooms must be mapped before proceeding to the next step</li>
          </ul>
        </div>

        {/* Room Comparison Controls */}
        {selectedRoomsForComparison.length > 0 && (
          <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-green-900">
                  Room Comparison ({selectedRoomsForComparison.length}/3 selected)
                </h3>
                <p className="text-sm text-green-700 mt-1">
                  Compare selected rooms to see detailed breakdowns and configurations
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={clearRoomSelection}
                  className="px-4 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  Clear Selection
                </button>
                <button
                  onClick={() => setShowComparisonModal(true)}
                  className="px-6 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  Compare Selected
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Room Comparison Modal */}
        {showComparisonModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b">
                <h3 className="text-xl font-semibold text-gray-800">Room Type Comparison</h3>
                <button
                  onClick={() => setShowComparisonModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {getSelectedRoomsData().map((roomData, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-3">{roomData.srmRoom?.room_name}</h4>
                      
                      {/* SRM Room Details */}
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">SRM Details</h5>
                        <div className="space-y-1 text-sm text-gray-600">
                          <div>Type: {roomData.srmRoom?.space_type}</div>
                          <div>Count: {roomData.srmRoom?.count} units</div>
                          <div>Category: {roomData.srmRoom?.category}</div>
                          {roomData.srmRoom?.description && (
                            <div>Description: {roomData.srmRoom.description}</div>
                          )}
                        </div>
                      </div>

                      {/* Mapping Status */}
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Mapping Status</h5>
                        <div className="text-sm">
                          {roomData.mapping?.status === 'mapped' ? (
                            <div className="text-green-600">
                              ✓ Mapped to: {roomData.selectedRoomType?.name}
                            </div>
                          ) : roomData.mapping?.status === 'new_room' ? (
                            <div className="text-blue-600">
                              ✨ New Room: {roomData.mapping?.new_room_name}
                            </div>
                          ) : roomData.mapping?.status === 'skipped' ? (
                            <div className="text-gray-600">
                              ⏭️ Skipped: {roomData.mapping?.skip_reason}
                            </div>
                          ) : (
                            <div className="text-yellow-600">
                              ⏳ Unmapped
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Selected Room Type Details */}
                      {roomData.selectedRoomType && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Selected Room Type</h5>
                          <div className="space-y-1 text-sm text-gray-600">
                            <div>Name: {roomData.selectedRoomType.name}</div>
                            <div>Type: {roomData.selectedRoomType.room_type}</div>
                            <div>Sub-type: {roomData.selectedRoomType.sub_type}</div>
                            <div>Region: {roomData.selectedRoomType.region}</div>
                            <div>Country: {roomData.selectedRoomType.country}</div>
                            <div>Default PAX: {roomData.selectedRoomType.default_pax}</div>
                            <div>Configurable: {roomData.selectedRoomType.is_configurable ? 'Yes' : 'No'}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Comparison Summary */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Comparison Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-blue-800">Total Rooms</div>
                      <div className="text-blue-600">{getSelectedRoomsData().length}</div>
                    </div>
                    <div>
                      <div className="font-medium text-blue-800">Mapped</div>
                      <div className="text-green-600">
                        {getSelectedRoomsData().filter(r => r.mapping?.status === 'mapped').length}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-blue-800">New Rooms</div>
                      <div className="text-blue-600">
                        {getSelectedRoomsData().filter(r => r.mapping?.status === 'new_room').length}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-blue-800">Unmapped</div>
                      <div className="text-yellow-600">
                        {getSelectedRoomsData().filter(r => r.mapping?.status === 'unmapped').length}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}