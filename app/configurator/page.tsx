'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
// import { apiService } from '../lib/api';
import { mlService } from '../lib/mlService';

// type AvMaterialItem = {
//   id: number;
//   documentId: string;
//   room_type: string;
//   description?: string;
//   make?: string;
//   model?: string;
//   unit_cost: number;
//   qty: number;
// };

// type RoomConfigurationItem = {
//   id: number;
//   documentId: string;
//   room_type: string;
//   sub_type: string;
//   description: string;
//   make: string;
//   model: string;
//   qty: number;
//   unit_price: number;
// };

type RoomConfig = {
  room_type: string;
  total_cost: number;
  qty: number;
  subtotal: number;
};

export default function RoomConfigurator() {
  const [roomConfigs, setRoomConfigs] = useState<RoomConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hardwareCost, setHardwareCost] = useState(0);
  const [networkCost, setNetworkCost] = useState(0);
  const [miscellaneous, setMiscellaneous] = useState(0);
  const [labourCost, setLabourCost] = useState(0);
  const [subtotalBeforeInflation, setSubtotalBeforeInflation] = useState(0);
  const [inflationAmount, setInflationAmount] = useState(0);
  const [totalProjectCost, setTotalProjectCost] = useState(0);
  const [approvedCapex, setApprovedCapex] = useState(0);
  const [costVsBudget, setCostVsBudget] = useState(0);
  const [inflation, setInflation] = useState<number>(0);
  const [projectCurrency, setProjectCurrency] = useState<string>('USD');
  const [showSuccessMessage, setShowSuccessMessage] = useState<boolean>(false);
  const [showAVBOQ, setShowAVBOQ] = useState<boolean>(false);
  const [projectData, setProjectData] = useState<any>({});
  const [billOfMaterials, setBillOfMaterials] = useState<any[]>([]);
  const [mlSuggestions, setMlSuggestions] = useState<any[]>([]);
  const [showMlSuggestions, setShowMlSuggestions] = useState<boolean>(false);
  const pathname = usePathname();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize ML service
        await mlService.initialize();
      } catch (error) {
        console.warn('ML service initialization failed:', error);
      }
    };

    initializeApp();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get all required data from sessionStorage
        const roomMappings = sessionStorage.getItem('roomMappings');
        const billOfMaterials = sessionStorage.getItem('billOfMaterials');
        const finalProjectCosts = sessionStorage.getItem('finalProjectCosts');
        const projectDataStr = sessionStorage.getItem('projectData');
        const srmData = sessionStorage.getItem('srmData');
        
        console.log('Configurator - SessionStorage check:', {
          roomMappings: !!roomMappings,
          billOfMaterials: !!billOfMaterials,
          finalProjectCosts: !!finalProjectCosts,
          projectData: !!projectDataStr,
          srmData: !!srmData
        });
        
        // Check for backup data if sessionStorage is empty
        if (!roomMappings || !projectDataStr) {
          const backupData = localStorage.getItem('roomConfigsBackup');
          const lastSaved = localStorage.getItem('lastSaved');
          
          if (backupData && lastSaved) {
            const lastSavedDate = new Date(lastSaved);
            const hoursSinceLastSave = (new Date().getTime() - lastSavedDate.getTime()) / (1000 * 60 * 60);
            
            if (hoursSinceLastSave < 24) { // Only restore if less than 24 hours old
              console.log('Restoring data from backup...');
              try {
                const restoredConfigs = JSON.parse(backupData);
                setRoomConfigs(restoredConfigs);
                setShowSuccessMessage(true);
                setLoading(false);
                return;
              } catch (error) {
                console.warn('Failed to restore backup data:', error);
              }
            }
          }
        }

        if (projectDataStr) {
          // Display success message
          setShowSuccessMessage(true);
          
          // Parse project data
          const parsedProjectData = JSON.parse(projectDataStr);
          
          // Set project data
          setProjectData(parsedProjectData);
          setProjectCurrency(parsedProjectData.currency || 'USD');
          setInflation(parseFloat(parsedProjectData.inflation) || 0);
          setApprovedCapex(parseFloat(parsedProjectData.capex) || 0);
          
          // Priority-based cost loading
          let totalRoomCost = 0;
          let labourCost = 0;
          let networkCostValue = 0;
          let miscellaneousCost = 0;
          
          // For SRM flow, prioritize manual input costs over BOQ extracted costs
          if (projectData) {
            // SRM flow - use manual input costs (priority for SRM)
            labourCost = parseFloat(parsedProjectData.labourCost) || 0;
            networkCostValue = parseFloat(parsedProjectData.networkCost) || 0;
            miscellaneousCost = parseFloat(parsedProjectData.miscCost) || 0;
            
            console.log('Using SRM manual costs (priority):', { labourCost, networkCostValue, miscellaneousCost });
          } else if (finalProjectCosts) {
            // BOQ flow - use extracted costs (fallback)
            const parsedFinalProjectCosts = JSON.parse(finalProjectCosts);
            totalRoomCost = parsedFinalProjectCosts.total_room_cost || 0;
            labourCost = parseFloat(parsedFinalProjectCosts.labour_cost) || 0;
            networkCostValue = parseFloat(parsedFinalProjectCosts.network_cost) || 0;
            miscellaneousCost = parseFloat(parsedFinalProjectCosts.miscellaneous_cost) || 0;
            
            console.log('Using BOQ extracted costs (fallback):', { totalRoomCost, labourCost, networkCostValue, miscellaneousCost });
          }
          
          // Set bill of materials if available
          if (billOfMaterials) {
            const parsedBillOfMaterials = JSON.parse(billOfMaterials);
            setBillOfMaterials(parsedBillOfMaterials);
          }
          
          // Debug: Log the actual values being used
          console.log('Configurator cost mapping:', {
            totalRoomCost,
            labourCost,
            networkCostValue,
            miscellaneousCost,
            costSource: finalProjectCosts ? 'BOQ Extracted' : 'SRM Manual'
          });
          
          // Set the calculated values
          setHardwareCost(totalRoomCost);
          setLabourCost(labourCost);
          setNetworkCost(networkCostValue);
          setMiscellaneous(miscellaneousCost);
          
          // Calculate subtotal before inflation
          const subtotal = totalRoomCost + labourCost + networkCostValue + miscellaneousCost;
          setSubtotalBeforeInflation(subtotal);
          
          // Calculate inflation amount
          const inflationAmount = subtotal * (inflation / 100);
          setInflationAmount(inflationAmount);
          
          // Calculate total project cost WITH inflation
          const totalProjectCostWithInflation = subtotal + inflationAmount;
          setTotalProjectCost(totalProjectCostWithInflation);
          
          // Calculate budget status
          const budgetDiff = approvedCapex - totalProjectCostWithInflation;
          setCostVsBudget(budgetDiff);
          
          // Get SRM data for correct quantities
          const parsedSrmData = srmData ? JSON.parse(srmData) : [];
          
          // Process room mappings if available
          if (roomMappings) {
            const parsedRoomMappings = JSON.parse(roomMappings);
            
            // Process only mapped rooms (exclude skipped rooms)
            const mappedRooms = parsedRoomMappings.filter((mapping: any) => 
              mapping.status === 'mapped' || mapping.status === 'new_room'
            );
            
            console.log('Processing mapped rooms:', mappedRooms.length);
            
            // Create room configurations from mapped rooms with actual costs
            const roomConfigurations: RoomConfig[] = mappedRooms.map((mapping: any) => {
              const srmRoom = parsedSrmData.find((room: any) => room.id === mapping.srm_room_id);
              const roomName = srmRoom ? srmRoom.room_name : mapping.room_name || 'Unknown Room';
              const roomCount = srmRoom ? srmRoom.count : 1;
              
              // Calculate cost per room type
              let costPerRoom = 0;
              
              // Try to get cost from bill of materials if available
              if (billOfMaterials) {
                const parsedBillOfMaterials = JSON.parse(billOfMaterials);
                console.log('Bill of materials structure:', parsedBillOfMaterials);
                
                const roomComponents = parsedBillOfMaterials.filter((item: any) => 
                  item.room_type === roomName || 
                  item.room_type === mapping.selected_room_type?.name ||
                  item.room_type === mapping.new_room_name
                );
                
                console.log(`Looking for room "${roomName}" in bill of materials:`, {
                  roomName,
                  selectedRoomType: mapping.selected_room_type?.name,
                  newRoomName: mapping.new_room_name,
                  foundComponents: roomComponents
                });
                
                costPerRoom = roomComponents.reduce((sum: number, comp: any) => {
                  return sum + (comp.unit_cost * comp.quantity_per_room);
                }, 0);
                
                console.log(`Room "${roomName}" - Found ${roomComponents.length} components, cost per room: ${costPerRoom}`);
              }
              
              // If no cost found in bill of materials, use a default calculation
              if (costPerRoom === 0) {
                // For SRM flow, we might not have detailed component costs
                // Use a rough estimate based on room type
                if (roomName.toLowerCase().includes('meeting') || roomName.toLowerCase().includes('conference')) {
                  costPerRoom = 50000; // $50k for meeting rooms
                } else if (roomName.toLowerCase().includes('office') || roomName.toLowerCase().includes('workstation')) {
                  costPerRoom = 15000; // $15k for individual spaces
                } else {
                  costPerRoom = 30000; // $30k default
                }
                console.log(`Room "${roomName}" - Using default cost per room: ${costPerRoom}`);
              }
              
              const subtotal = costPerRoom * roomCount;
              
              return {
                room_type: roomName,
                total_cost: costPerRoom,
                qty: roomCount,
                subtotal: subtotal
              };
            });
            
            console.log('Created room configurations with costs:', roomConfigurations);
            setRoomConfigs(roomConfigurations);
          }
        } else {
          setError('No project data found. Please complete the project setup first.');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load project data: ' + (error instanceof Error ? error.message : String(error)));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // Only run once on mount, don't re-run when costs change

  // Update cost summary when room configurations change
  useEffect(() => {
    if (roomConfigs.length > 0) {
      console.log('Configured rooms loaded, calculating project costs...');
      updateCostSummary(roomConfigs);
    }
  }, [roomConfigs, labourCost, networkCost, miscellaneous, inflation, approvedCapex]);

  // Additional useEffect to trigger cost calculation when room configs are first set
  useEffect(() => {
    if (roomConfigs.length > 0 && hardwareCost === 0) {
      console.log('Initial room configs loaded, triggering cost calculation...');
      updateCostSummary(roomConfigs);
    }
  }, [roomConfigs, hardwareCost]);

  const handleQtyChange = (index: number, value: string) => {
    const newQty = parseInt(value) || 0;
    
    setRoomConfigs(prev => {
      const updatedConfigs = prev.map((config, i) => 
        i === index 
          ? { ...config, qty: newQty, subtotal: config.total_cost * newQty }
          : config
      );
      
      // Update cost summary with new configurations
      updateCostSummary(updatedConfigs);
      
      return updatedConfigs;
    });
    
    // Update sessionStorage with new quantities for persistence
    const roomMappings = sessionStorage.getItem('roomMappings');
    const srmData = sessionStorage.getItem('srmData');
    
    if (roomMappings && srmData) {
      try {
        const parsedMappings = JSON.parse(roomMappings);
        const parsedSrmData = JSON.parse(srmData);
        const roomType = roomConfigs[index].room_type;
        
        // Find the corresponding mapping to get the SRM room ID
        const mapping = parsedMappings.find((m: any) => {
          const mappingRoomName = m.selected_room_type?.name || m.new_room_name;
          return mappingRoomName === roomType;
        });
        
        if (mapping) {
          // Update the SRM data with the new quantity
          const updatedSrmData = parsedSrmData.map((room: any) => {
            if (room.id === mapping.srm_room_id) {
              return {
                ...room,
                count: newQty
              };
            }
            return room;
          });
          
          sessionStorage.setItem('srmData', JSON.stringify(updatedSrmData));
        }
        
        // Save room instances for dashboard and other pages
        const roomInstances = roomConfigs.map((config, idx) => ({
          id: idx + 1,
          room_type: config.room_type,
          total_cost: config.total_cost,
          qty: config.qty,
          subtotal: config.subtotal,
          components: [] // Will be populated from bill of materials if needed
        }));
        
        sessionStorage.setItem('roomInstances', JSON.stringify(roomInstances));
        
      } catch (error) {
        console.warn('Error updating sessionStorage data:', error);
      }
    }
  };

  const updateCostSummary = (configs: RoomConfig[]) => {
    console.log('updateCostSummary called with configs:', configs);
    
    // Calculate total room cost from configurations
    const totalRoomCost = configs.reduce((sum, config) => {
      console.log(`Room "${config.room_type}": cost=${config.total_cost}, qty=${config.qty}, subtotal=${config.subtotal}`);
      return sum + config.subtotal;
    }, 0);
    
    console.log('Calculated total room cost:', totalRoomCost);
    
    // Update hardware cost
    setHardwareCost(totalRoomCost);
    
    // Recalculate subtotal and total project cost
    const subtotal = totalRoomCost + labourCost + networkCost + miscellaneous;
    setSubtotalBeforeInflation(subtotal);
    
    // Calculate inflation amount
    const inflationAmount = subtotal * (inflation / 100);
    setInflationAmount(inflationAmount);
    
    // Calculate total project cost WITH inflation
    const totalProjectCostWithInflation = subtotal + inflationAmount;
    setTotalProjectCost(totalProjectCostWithInflation);
    
    // Calculate budget status
    const budgetDiff = approvedCapex - totalProjectCostWithInflation;
    setCostVsBudget(budgetDiff);
    
    console.log('Updated cost summary:', {
      totalRoomCost,
      labourCost,
      networkCost,
      miscellaneous,
      subtotal,
      inflationAmount,
      totalProjectCostWithInflation,
      budgetDiff
    });
    
    // Save final cost data to sessionStorage for dashboard
    const finalProjectCosts = {
      total_room_cost: totalRoomCost,
      labour_cost: labourCost,
      network_cost: networkCost,
      miscellaneous_cost: miscellaneous,
      total_project_cost: totalProjectCostWithInflation,
      inflation_amount: inflationAmount,
      budget_variance: budgetDiff
    };
    
    sessionStorage.setItem('finalProjectCosts', JSON.stringify(finalProjectCosts));
    console.log('Saved final project costs to sessionStorage:', finalProjectCosts);
  };

  const formatCurrency = (amount: number) => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const projectDataStr = sessionStorage.getItem('projectData');
      if (projectDataStr) {
        const projectData = JSON.parse(projectDataStr);
        const currency = projectData.currency || 'USD';
        return new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(amount);
      }
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="container mx-auto p-6">
      {/* Navigation Tabs */}
      <div className="mb-8">
        <div className="flex space-x-2 border-b border-gray-200 overflow-x-auto">
          <Link href="/dashboard" className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${pathname === '/dashboard' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
            Dashboard
          </Link>
          <Link href="/project-data" className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${pathname === '/project-data' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
            Project Data
          </Link>
          <Link href="/room-mapping" className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${pathname === '/room-mapping' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
            Room Mapping
          </Link>
          <Link href="/room-configuration" className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${pathname === '/room-configuration' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
            Room Configuration
          </Link>
          <Link href="/variants" className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${pathname === '/variants' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
              Variants
          </Link>
          <Link href="/configurator" className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${pathname === '/configurator' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
            Configurator
          </Link>
        </div>
      </div>

      <h1 className="text-3xl font-bold mb-8 text-gray-800">Room Configurator</h1>

      {/* Success Message for Configuration Submission */}
      {showSuccessMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Configuration Submitted Successfully!</h3>
              <p className="text-sm text-green-700 mt-1">
                AV-BOQ entries have been created successfully. You can now view the detailed breakdown below.
              </p>
              <div className="flex space-x-2 mt-2">
                <button 
                  onClick={() => {
                    sessionStorage.removeItem('avBoqEntries');
                    window.location.reload();
                  }} 
                  className="text-sm text-green-600 hover:text-green-500 font-medium"
                >
                  Start New Configuration →
                </button>
                <button 
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const suggestions = await mlService.findSimilarComponents(
                        billOfMaterials[0], 
                        roomConfigs[0]?.room_type || 'meeting-room',
                        approvedCapex
                      );
                      setMlSuggestions(suggestions);
                      setShowMlSuggestions(true);
                    } catch (error) {
                      console.error('Failed to get ML suggestions:', error);
                    } finally {
                      setLoading(false);
                    }
                  }} 
                  className="text-sm text-purple-600 hover:text-purple-500 font-medium"
                >
                  🤖 Get ML Suggestions →
                </button>
                <button 
                  onClick={() => {
                    const exportData = {
                      roomConfigs,
                      projectData,
                      totalProjectCost,
                      hardwareCost,
                      labourCost,
                      networkCost,
                      miscellaneous,
                      inflationAmount,
                      approvedCapex,
                      costVsBudget,
                      exportDate: new Date().toISOString()
                    };
                    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `room-configuration-${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }} 
                  className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                >
                  Export Configuration →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500 text-lg">Loading room configurations...</p>
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
        <>
          {roomConfigs.length > 0 ? (
            <div className="space-y-6">
              {/* Back to Dashboard Button */}
              <div className="flex justify-end">
                <Link href="/dashboard">
                  <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Dashboard
                  </button>
                </Link>
              </div>

              {/* 1. Project Data Section */}
              <div className="bg-blue-50 p-6 rounded-lg shadow-md mb-6">
                <h3 className="text-lg font-semibold text-blue-800 mb-4">Project Data</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">Project Name</label>
                    <p className="w-full bg-white border border-blue-200 rounded-md px-3 py-2 text-sm font-semibold text-blue-800">
                      {projectData?.projectName || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">Country</label>
                    <p className="w-full bg-white border border-blue-200 rounded-md px-3 py-2 text-sm text-blue-800">
                      {projectData?.country || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">Region</label>
                    <p className="w-full bg-white border border-blue-200 rounded-md px-3 py-2 text-sm text-blue-800">
                      {projectData?.region || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">Currency</label>
                    <p className="w-full bg-white border border-blue-200 rounded-md px-3 py-2 text-sm font-semibold text-blue-800">
                      {projectCurrency}
                    </p>
                  </div>
                </div>
                {inflation > 0 && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-blue-700 mb-1">Inflation Rate</label>
                    <p className="w-full bg-white border border-blue-200 rounded-md px-3 py-2 text-sm font-semibold text-blue-800">
                      {inflation}%
                    </p>
                  </div>
                )}
              </div>
              
              {/* Debug Section - Remove in production */}
              {process.env.NODE_ENV === 'development' && (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-6">
                  <h4 className="text-sm font-semibold text-yellow-800 mb-2">🔍 Debug Info (Development Only)</h4>
                  <div className="text-xs text-yellow-700 space-y-1">
                    <div>Hardware Cost: {hardwareCost}</div>
                    <div>Labour Cost: {labourCost}</div>
                    <div>Network Cost: {networkCost}</div>
                    <div>Miscellaneous Cost: {miscellaneous}</div>
                    <div>Project Data Labour: {projectData?.labourCost}</div>
                    <div>Project Data Misc: {projectData?.miscCost}</div>
                  </div>
                </div>
              )}
              
              {/* 2. SRM Table Section */}
              <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Space Requirement Matrix (SRM)</h3>
          <div className="overflow-x-auto shadow-md rounded-lg">
            <table className="min-w-full bg-white border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 border-b">Room Type</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700 border-b">Total Cost ({projectCurrency})</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700 border-b">Quantity</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700 border-b">Subtotal ({projectCurrency})</th>
                </tr>
              </thead>
              <tbody>
                      {roomConfigs.map((config, index) => (
                    <tr key={config.room_type} className="hover:bg-gray-100 transition-colors">
                      <td className="px-4 py-2 text-sm text-gray-600 border-b">{config.room_type || 'Unknown'}</td>
                      <td className="px-4 py-2 text-sm text-gray-600 text-right border-b">
                            {formatCurrency(config.total_cost)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-b text-center">
                        <input
                          type="number"
                          min="0"
                          value={config.qty}
                          onChange={(e) => handleQtyChange(index, e.target.value)}
                          className="w-16 text-center border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600 text-right border-b">
                            {formatCurrency(config.subtotal)}
                      </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* 3. Project Cost Summary Section */}
              <div className="bg-gray-50 p-6 rounded-lg shadow-md mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Project Cost Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hardware Cost (AV)</label>
                    <p className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm font-semibold text-blue-600">
                      {formatCurrency(hardwareCost)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Network Cost</label>
                    <p className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-600">
                      {formatCurrency(networkCost)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Miscellaneous Cost</label>
                    <p className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-600">
                      {formatCurrency(miscellaneous)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Labour Cost {projectData?.labourCost ? '(Extracted)' : '(10%)'}
                    </label>
                    <p className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm font-semibold text-orange-600">
                      {formatCurrency(labourCost)}
                    </p>
                  </div>
                </div>
                
                <div className="border-t pt-4 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Subtotal (before inflation):</span>
                    <span className="text-sm font-semibold text-gray-800">{formatCurrency(subtotalBeforeInflation)}</span>
                  </div>
                  {inflation > 0 && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Inflation ({inflation}%):</span>
                      <span className="text-sm font-semibold text-gray-800">{formatCurrency(inflationAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center border-t pt-2">
                    <span className="text-lg font-semibold text-gray-800">Total Project Cost:</span>
                    <span className="text-lg font-bold text-green-600">{formatCurrency(totalProjectCost)}</span>
                  </div>
                </div>
                
                {approvedCapex > 0 && (
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Approved Capex:</span>
                      <span className="text-sm font-semibold text-gray-800">{formatCurrency(approvedCapex)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm font-medium text-gray-700">Budget Status:</span>
                      <span className={`text-sm font-semibold ${costVsBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {costVsBudget >= 0 ? 'Under Budget' : 'Over Budget'} ({formatCurrency(costVsBudget)})
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* 4. AV BOQ Section (Collapsible) */}
              <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">AV Bill of Materials (BOQ)</h3>
                  <button
                    onClick={() => setShowAVBOQ(!showAVBOQ)}
                    className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    {showAVBOQ ? 'Hide Details' : 'Show Details'}
                    <svg 
                      className={`ml-1 h-4 w-4 transform transition-transform ${showAVBOQ ? 'rotate-180' : ''}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                
                {showAVBOQ && (
                  <div className="space-y-4">
                    <div className="overflow-x-auto shadow-md rounded-lg">
                      <table className="min-w-full bg-white border border-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b">Room Type</th>
                            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b">Component</th>
                            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b">Make/Model</th>
                            <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700 border-b">Qty per Room</th>
                            <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700 border-b">Total Qty</th>
                            <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700 border-b">Unit Cost</th>
                            <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700 border-b">Total Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {billOfMaterials && billOfMaterials.length > 0 ? (
                            billOfMaterials.map((item: any, index: number) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-sm text-gray-600 border-b">{item.room_type}</td>
                                <td className="px-4 py-2 text-sm text-gray-600 border-b">{item.component_description}</td>
                                <td className="px-4 py-2 text-sm text-gray-600 border-b">{item.component_make} {item.component_model}</td>
                                <td className="px-4 py-2 text-sm text-gray-600 border-b text-center">{item.quantity_per_room}</td>
                                <td className="px-4 py-2 text-sm text-gray-600 border-b text-center">{item.total_quantity}</td>
                                <td className="px-4 py-2 text-sm text-gray-600 border-b text-right">{formatCurrency(item.unit_cost)}</td>
                                <td className="px-4 py-2 text-sm text-gray-600 border-b text-right">{formatCurrency(item.total_cost)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                  No bill of materials available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

                    <div className="flex justify-end">
                      <button 
                        onClick={() => {
                          const billOfMaterials = sessionStorage.getItem('billOfMaterials');
                          if (billOfMaterials) {
                            const data = JSON.parse(billOfMaterials);
                            
                            // Create proper Excel-compatible CSV with quotes and proper escaping
                            const csvContent = [
                              ['Room Type', 'Component', 'Make/Model', 'Qty per Room', 'Total Qty', 'Unit Cost', 'Total Cost'],
                              ...data.map((item: any) => [
                                `"${item.room_type || ''}"`,
                                `"${item.component_description || ''}"`,
                                `"${(item.component_make || '')} ${(item.component_model || '')}"`,
                                item.quantity_per_room || 0,
                                item.total_quantity || 0,
                                item.unit_cost || 0,
                                item.total_cost || 0
                              ])
                            ].map(row => row.join(',')).join('\n');
                            
                            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `av-boq-${new Date().toISOString().split('T')[0]}.csv`;
                            a.click();
                            window.URL.revokeObjectURL(url);
                          }
                        }}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                      >
                        📥 Download AV-BOQ Excel
                      </button>
          </div>
        </div>
      )}
              </div>
              </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <p className="text-lg font-medium">No SRM Configuration Found</p>
                <p className="text-sm">Complete the SRM workflow to see room configurations here</p>
                <div className="mt-4">
                  <Link href="/project-data" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                    Start SRM Project →
                  </Link>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ML Suggestions Modal */}
      {showMlSuggestions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-semibold text-gray-800">🤖 ML-Powered Component Suggestions</h3>
              <button
                onClick={() => setShowMlSuggestions(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {mlSuggestions.length > 0 ? (
                <div className="space-y-4">
                  {mlSuggestions.map((suggestion, index) => (
                    <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-800">
                          Component {suggestion.componentId}
                        </h4>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">
                            {Math.round(suggestion.similarity * 100)}% match
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            suggestion.costImpact < 0 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {suggestion.costImpact > 0 ? '+' : ''}{formatCurrency(suggestion.costImpact)}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{suggestion.reason}</p>
                      <div className="flex flex-wrap gap-1">
                        {suggestion.features.map((feature: string, idx: number) => (
                          <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <p>No ML suggestions available at the moment.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
