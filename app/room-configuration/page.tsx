'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { apiService, fetchAllPages } from '../lib/api';

interface ConfiguredRoom {
  id: string;
  room_name: string;
  room_type_id: number;
  room_type_name: string;
  room_type_string: string; // Add room type string for API queries
  count: number;
  space_type: 'i-space' | 'we-space';
  category: string;
  estimated_cost: number;
  components: RoomComponent[];
  status: 'pending' | 'configured' | 'approved';
}

interface RoomComponent {
  id: number;
  description: string;
  make: string;
  model: string;
  qty: number;
  unit_cost: number;
  total_cost: number;
  selected: boolean;
}

interface ProjectCosts {
  labour_cost: number;
  network_cost: number;
  miscellaneous_cost: number;
  total_room_cost: number;
  total_project_cost: number;
}

export default function RoomConfigurationPage() {
  const [configuredRooms, setConfiguredRooms] = useState<ConfiguredRoom[]>([]);
  const [projectCosts, setProjectCosts] = useState<ProjectCosts>({
    labour_cost: 0,
    network_cost: 0,
    miscellaneous_cost: 0,
    total_room_cost: 0,
    total_project_cost: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [configurationProgress, setConfigurationProgress] = useState(0);
  const [availableAVComponents, setAvailableAVComponents] = useState<RoomComponent[]>([]);
  const [showAddComponentModal, setShowAddComponentModal] = useState(false);
  const [projectCurrency, setProjectCurrency] = useState('USD'); // Add project currency state
  const pathname = usePathname();

  // Load mapped rooms from sessionStorage
  useEffect(() => {
    const loadMappedRooms = async () => {
      try {
        // Get SRM data and room mappings from sessionStorage
        const srmData = sessionStorage.getItem('srmData');
        const roomMappings = sessionStorage.getItem('roomMappings');
        const projectData = sessionStorage.getItem('projectData');
        
        console.log('SessionStorage data check:', {
          srmData: srmData ? 'Found' : 'Missing',
          roomMappings: roomMappings ? 'Found' : 'Missing', 
          projectData: projectData ? 'Found' : 'Missing'
        });
        
        if (!srmData || !roomMappings || !projectData) {
          console.log('Missing data in sessionStorage:', { srmData: !!srmData, roomMappings: !!roomMappings, projectData: !!projectData });
          setError('No room mapping data found. Please complete the room mapping step first.');
          setLoading(false);
          return;
        }

        const parsedSrmData = JSON.parse(srmData);
        const parsedRoomMappings = JSON.parse(roomMappings);
        const parsedProjectData = JSON.parse(projectData);
        
        console.log('Parsed data:', {
          srmData: parsedSrmData,
          roomMappings: parsedRoomMappings,
          projectData: parsedProjectData
        });
        
        // Set project currency to avoid hydration issues
        setProjectCurrency(parsedProjectData.currency || 'USD');
        
        console.log('Loaded data:', { srmData: parsedSrmData, roomMappings: parsedRoomMappings, projectData: parsedProjectData });

        // Convert room mappings to configured rooms
        const mappedRooms: ConfiguredRoom[] = parsedRoomMappings
          .filter((mapping: any) => mapping.status === 'mapped' || mapping.status === 'new_room')
          .map((mapping: any) => {
            const srmRoom = parsedSrmData.find((room: any) => room.id === mapping.srm_room_id);
            if (!srmRoom) {
              console.log(`No SRM room found for mapping: ${mapping.srm_room_id}`);
              return null;
            }

            return {
              id: mapping.srm_room_id,
              room_name: srmRoom.room_name,
              room_type_id: mapping.selected_room_type?.id || 0,
              room_type_name: mapping.selected_room_type?.name || mapping.new_room_name || 'Unknown',
              room_type_string: mapping.selected_room_type?.room_type || mapping.new_room_name || 'Unknown',
              count: srmRoom.count,
              space_type: srmRoom.space_type,
              category: srmRoom.category,
              estimated_cost: 0,
              components: [],
              status: 'pending' as const,
              // Currency conversion removed - using database data as-is
            } as ConfiguredRoom;
          })
          .filter((room: any): room is ConfiguredRoom => room !== null);

        console.log('Converted to configured rooms:', mappedRooms);
        
        setConfiguredRooms(mappedRooms);
        
        // Load room type components for each mapped room
        await loadRoomTypeComponents(mappedRooms);
        
        calculateProjectCosts(mappedRooms);
        setLoading(false);
        
      } catch (error) {
        console.error('Error loading mapped rooms:', error);
        setError('Failed to load room mapping data. Please try again.');
        setLoading(false);
      }
    };

    loadMappedRooms();
  }, []);

  const loadRoomTypeComponents = async (rooms: ConfiguredRoom[]) => {
    try {
      // Load components for each room type from the backend
      const updatedRooms = await Promise.all(
        rooms.map(async (room) => {
          if (room.room_type_id === 0) {
            // New room type - use default components
            return {
              ...room,
              components: getDefaultComponents(room.space_type)
            };
          }

          try {
                        // Get the room type string from the room data
            const roomTypeString = room.room_type_string;
            console.log(`Looking for room config with room_type: ${roomTypeString}`);
            
            // Fetch room configurations (which are actually the components)
            const roomConfigsResponse = await apiService.getRoomConfigurations({
              filters: {
                room_type: {
                  $eq: roomTypeString
                }
              },
              populate: '*'
            });
            
            console.log(`Room configs for room type ${roomTypeString}:`, roomConfigsResponse.data);
            
            if (!roomConfigsResponse.data.data || roomConfigsResponse.data.data.length === 0) {
              console.warn(`No room configuration found for room type ${roomTypeString}, using defaults`);
              return {
                ...room,
                components: getDefaultComponents(room.space_type)
              };
            }

            // Convert room configurations directly to components
            const components = roomConfigsResponse.data.data.map((config: any) => {
              // Use the cost directly from the database - no conversion needed
              const unitCost = config.unit_cost || config.unit_price || 0;
              
              return {
                id: config.id,
                description: config.description || 'Component',
                make: config.make || 'Unknown',
                model: config.model || 'Unknown',
                qty: config.qty || 1,
                unit_cost: unitCost,
                total_cost: (config.qty || 1) * unitCost,
                selected: true // Pre-select all components
              };
            });

            console.log(`Found ${components.length} components for room type ${roomTypeString}`);
            console.log('Converted components:', components);
            
            // Calculate room estimated cost (per room, not multiplied by count yet)
            const roomEstimatedCost = components.reduce((sum: number, comp: any) => sum + comp.total_cost, 0);
            
            return {
              ...room,
              components: components,
              estimated_cost: roomEstimatedCost,
              status: components.length > 0 ? 'configured' as const : 'pending' as const
            };
          } catch (error) {
            console.error(`Error loading components for room type ${room.room_type_string}:`, error);
            return {
              ...room,
              components: getDefaultComponents(room.space_type)
            };
          }
        })
      );

      setConfiguredRooms(updatedRooms);
      calculateProjectCosts(updatedRooms);
      updateProgress(updatedRooms);
      
    } catch (error) {
      console.error('Error loading room type components:', error);
      // Fallback to default components
      const roomsWithDefaults = rooms.map(room => ({
        ...room,
        components: getDefaultComponents(room.space_type)
      }));
      setConfiguredRooms(roomsWithDefaults);
      calculateProjectCosts(roomsWithDefaults);
      updateProgress(roomsWithDefaults);
    }
  };

  const getDefaultComponents = (spaceType: 'i-space' | 'we-space'): RoomComponent[] => {
    if (spaceType === 'i-space') {
      return [
        {
          id: 1,
          description: 'Workstation Display',
          make: 'Dell',
          model: 'P2419H',
          qty: 1,
          unit_cost: 200,
          total_cost: 200,
          selected: true
        },
        {
          id: 2,
          description: 'Docking Station',
          make: 'Dell',
          model: 'WD19',
          qty: 1,
          unit_cost: 150,
          total_cost: 150,
          selected: true
        }
      ];
    } else {
      return [
        {
          id: 3,
          description: 'Display Screen - 65" 4K',
          make: 'Samsung',
          model: 'QN65Q80T',
          qty: 1,
          unit_cost: 1200,
          total_cost: 1200,
          selected: true
        },
        {
          id: 4,
          description: 'Video Conference Camera',
          make: 'Logitech',
          model: 'BRIO 4K',
          qty: 1,
          unit_cost: 200,
          total_cost: 200,
          selected: true
        },
        {
          id: 5,
          description: 'Conference Phone',
          make: 'Poly',
          model: 'Studio P15',
          qty: 1,
          unit_cost: 150,
          total_cost: 150,
          selected: true
        }
      ];
    }
  };



  const calculateProjectCosts = (rooms: ConfiguredRoom[]) => {
    // Get project data from sessionStorage
    let projectData = null;
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        const projectDataStr = sessionStorage.getItem('projectData');
        if (projectDataStr) {
          projectData = JSON.parse(projectDataStr);
        }
      } catch (error) {
        console.warn('Error reading project data from sessionStorage:', error);
      }
    }
    
    console.log('Project data in calculateProjectCosts:', projectData);
    
    const totalRoomCost = rooms.reduce((sum, room) => sum + (room.estimated_cost * room.count), 0);
    
    // Use actual project data instead of percentages
    const networkCost = parseFloat(projectData?.networkCost) || 0;
    const miscellaneousCost = parseFloat(projectData?.miscCost) || 0;
    const extractedLabourCost = parseFloat(projectData?.labourCost) || 0;
    
    console.log('Calculated costs:', {
      totalRoomCost,
      networkCost,
      miscellaneousCost,
      extractedLabourCost,
      networkCostRaw: projectData?.networkCost,
      miscCostRaw: projectData?.miscCost,
      labourCostRaw: projectData?.labourCost
    });
    
    // Use extracted labour cost if available, otherwise calculate as 10% of room costs
    const labourCost = extractedLabourCost > 0 ? extractedLabourCost : (totalRoomCost * 0.1);
    
    // Total project cost = Room costs + Labour + Network + Miscellaneous
    const totalProjectCost = totalRoomCost + labourCost + networkCost + miscellaneousCost;
    
    console.log('Labour cost calculation:', {
      totalRoomCost,
      networkCost,
      miscellaneousCost,
      extractedLabourCost,
      labourCost,
      labourCostPercentage: (labourCost / totalRoomCost) * 100,
      expectedLabourCost: totalRoomCost * 0.1,
      totalProjectCost,
      usingExtractedCost: extractedLabourCost > 0
    });

    setProjectCosts({
      labour_cost: labourCost,
      network_cost: networkCost,
      miscellaneous_cost: miscellaneousCost,
      total_room_cost: totalRoomCost,
      total_project_cost: totalProjectCost
    });
  };

  const handleComponentToggle = (roomId: string, componentId: number) => {
    setConfiguredRooms(prev => {
      const updatedRooms = prev.map(room => {
        if (room.id === roomId) {
          const updatedComponents = room.components.map(comp => 
            comp.id === componentId 
              ? { ...comp, selected: !comp.selected }
              : comp
          );
          
          const totalCost = updatedComponents
            .filter(comp => comp.selected)
            .reduce((sum, comp) => sum + comp.total_cost, 0);

          return {
            ...room,
            components: updatedComponents,
            estimated_cost: totalCost,
            status: updatedComponents.some(comp => comp.selected) ? 'configured' as const : 'pending' as const
          };
        }
        return room;
      });
      
      // Calculate project costs with the updated rooms
      calculateProjectCosts(updatedRooms);
      updateProgress(updatedRooms);
      
      return updatedRooms;
    });
  };

  const handleAddComponent = (component: RoomComponent) => {
    if (!selectedRoom) return;
    
    setConfiguredRooms(prev => prev.map(room => {
      if (room.id === selectedRoom) {
        // Check if component already exists
        const existingComponent = room.components.find(c => 
          c.description === component.description && 
          c.make === component.make && 
          c.model === component.model
        );
        
        if (existingComponent) {
          // If exists, just mark as selected
          const updatedComponents = room.components.map(comp => 
            comp.id === existingComponent.id 
              ? { ...comp, selected: true }
              : comp
          );
          
          const totalCost = updatedComponents
            .filter(comp => comp.selected)
            .reduce((sum, comp) => sum + comp.total_cost, 0);

          return {
            ...room,
            components: updatedComponents,
            estimated_cost: totalCost,
            status: 'configured' as const
          };
        } else {
          // Add new component
          const newComponent = {
            ...component,
            id: Date.now(), // Generate unique ID
            selected: true
          };
          
          const updatedComponents = [...room.components, newComponent];
          const totalCost = updatedComponents
            .filter(comp => comp.selected)
            .reduce((sum, comp) => sum + comp.total_cost, 0);

          return {
            ...room,
            components: updatedComponents,
            estimated_cost: totalCost,
            status: 'configured' as const
          };
        }
      }
      return room;
    }));
    
    setShowAddComponentModal(false);
  };

  const updateProgress = (rooms: ConfiguredRoom[]) => {
    const configuredCount = rooms.filter(r => r.status === 'configured').length;
    const totalCount = rooms.length;
    const progress = totalCount > 0 ? (configuredCount / totalCount) * 100 : 0;
    setConfigurationProgress(progress);
  };

  // Update progress whenever configuredRooms changes
  useEffect(() => {
    updateProgress(configuredRooms);
  }, [configuredRooms]);

  // Load available AV components
  useEffect(() => {
    const loadAvailableAVComponents = async () => {
      try {
        // Fetch all room configurations to get available components
        const response = await apiService.getRoomConfigurations({
          populate: '*'
        });
        
        if (response.data.data) {
          // Convert to unique components (remove duplicates)
          const uniqueComponents = new Map();
          response.data.data.forEach((config: any) => {
            const key = `${config.description}-${config.make}-${config.model}`;
            if (!uniqueComponents.has(key)) {
              uniqueComponents.set(key, {
                id: config.id,
                description: config.description,
                make: config.make,
                model: config.model,
                qty: config.qty || 1,
                unit_cost: config.unit_price || 0,
                total_cost: (config.qty || 1) * (config.unit_price || 0),
                selected: false
              });
            }
          });
          
          setAvailableAVComponents(Array.from(uniqueComponents.values()));
        }
      } catch (error) {
        console.error('Error loading available AV components:', error);
      }
    };

    loadAvailableAVComponents();
  }, []);

  const handleSubmitConfiguration = async () => {
    setSubmitting(true);
    try {
      console.log('Submitting room configuration:', configuredRooms);
      
      // Get project data from sessionStorage
      const projectData = sessionStorage.getItem('projectData');
      const parsedProjectData = projectData ? JSON.parse(projectData) : {};
      
      console.log('Project data from sessionStorage:', parsedProjectData);
      
      // First, save/update project data in database
      let projectId = parsedProjectData.projectId;
      
      // Debug: Log the actual values being used
      console.log('Values being used for project creation:', {
        projectName: parsedProjectData.projectName,
        country: parsedProjectData.country,
        region: parsedProjectData.region,
        currency: parsedProjectData.currency,
        capex: parsedProjectData.capex,
        networkCost: parsedProjectData.networkCost,
        miscCost: parsedProjectData.miscCost
      });
      
      if (!projectId) {
        // Create new project (without status field - not in schema)
        const projectPayload = {
          project_name: parsedProjectData.projectName || 'New Project',
          country: parsedProjectData.country || 'Unknown',
          region: parsedProjectData.region || 'Unknown',
          currency: parsedProjectData.currency || 'USD',
          capex_amount: parseFloat(parsedProjectData.capex) || 0,
          network_cost: parseFloat(parsedProjectData.networkCost) || 0,
          misc_cost: parseFloat(parsedProjectData.miscCost) || 0,
          labour_cost: projectCosts.labour_cost || 0
        };
        
        console.log('Project payload being sent to API:', projectPayload);
        
        try {
          const projectResponse = await apiService.createProject(projectPayload);
          projectId = projectResponse.data.data?.id || projectResponse.data.id;
          console.log('Created new project:', projectResponse.data);
        } catch (error: any) {
          console.error('Error creating project:', error);
          console.error('Error response:', error.response?.data);
          console.error('Error details:', error.response?.data?.error);
          console.error('Validation errors:', error.response?.data?.error?.details);
          throw new Error('Failed to create project');
        }
      } else {
        // Update existing project (without status field - not in schema)
        const projectPayload = {
          capex_amount: parseFloat(parsedProjectData.capex) || 0,
          network_cost: parseFloat(parsedProjectData.networkCost) || 0,
          misc_cost: parseFloat(parsedProjectData.miscCost) || 0,
          labour_cost: projectCosts.labour_cost || 0
        };
        
        try {
          await apiService.updateProject(projectId, projectPayload);
          console.log('Updated project:', projectId);
        } catch (error: any) {
          console.error('Error updating project:', error);
          console.error('Error response:', error.response?.data);
          console.error('Error details:', error.response?.data?.error);
          console.error('Validation errors:', error.response?.data?.error?.details);
          throw new Error('Failed to update project');
        }
      }
      
      // Prepare av-boq entries for each room type
      const avBoqEntries = configuredRooms.flatMap(room => {
        const selectedComponents = room.components.filter(comp => comp.selected);
        if (selectedComponents.length === 0) return [];
        
        return selectedComponents.map(comp => ({
          country: parsedProjectData.country || 'Unknown',
          region: parsedProjectData.region || 'Unknown',
          currency: parsedProjectData.currency || 'USD',
          room_qty: parseInt(room.count.toString()),
          pax: parseInt(room.count.toString()), // Assuming 1 person per room
          make: comp.make || 'Unknown',
          model: comp.model || 'Unknown',
          desciption: comp.description || 'Component', // Note: typo in schema
          qty: parseInt((comp.qty * room.count).toString()), // Total quantity across all rooms
          unitcost: parseFloat(comp.unit_cost.toString()),
          subtotal: parseFloat((comp.total_cost * room.count).toString()),
          grandtotal: parseFloat((comp.total_cost * room.count).toString()),
          // project: projectId, // Temporarily comment out project relation - not working
          is_estimate: true,
          exchange_rate: parseFloat('1.0') // Add exchange rate field
        }));
      });
      
      console.log('AV-BOQ entries to create:', avBoqEntries);
      
      // Save av-boq entries to database
      try {
        console.log('Creating AV-BOQ entries with data:', avBoqEntries);
        
        const avBoqPromises = avBoqEntries.map(async (entry, index) => {
          try {
            console.log(`Creating AV-BOQ entry ${index + 1}:`, entry);
            const response = await apiService.createAVBOQ(entry);
            console.log(`Successfully created AV-BOQ entry ${index + 1}:`, response);
            return response;
          } catch (error: any) {
            console.error(`Error creating AV-BOQ entry ${index + 1}:`, error);
            console.error('Error response:', error.response?.data);
            console.error('Error details:', error.response?.data?.error);
            throw error;
          }
        });
        
        await Promise.all(avBoqPromises);
        console.log('Created AV-BOQ entries successfully');
      } catch (error) {
        console.error('Error creating AV-BOQ entries:', error);
        throw new Error('Failed to create AV-BOQ entries');
      }
      
      // Update project with final costs (using projectCosts from state)
      const finalProjectUpdate = {
        labour_cost: projectCosts.labour_cost,
        capex_amount: projectCosts.total_project_cost
      };
      
      try {
        await apiService.updateProject(projectId, finalProjectUpdate);
        console.log('Updated project with final costs');
      } catch (error) {
        console.error('Error updating project with final costs:', error);
      }
      
      // Store data in sessionStorage for immediate display
      // Create simple room instances for display
      const displayRoomInstances = configuredRooms.flatMap(room => {
        const selectedComponents = room.components.filter(comp => comp.selected);
        if (selectedComponents.length === 0) return [];
        
        return Array.from({ length: room.count }, (_, index) => ({
          room_name: `${room.room_type_name} ${index + 1}`,
          room_type: room.room_type_name,
          total_cost: selectedComponents.reduce((sum, comp) => sum + comp.total_cost, 0),
          project_id: projectId
        }));
      });
      
      // Create simple bill of materials for display
      const displayBillOfMaterials = configuredRooms.flatMap(room => {
        const selectedComponents = room.components.filter(comp => comp.selected);
        return selectedComponents.map(comp => ({
          room_type: room.room_type_name,
          room_count: room.count,
          component_description: comp.description,
          component_make: comp.make,
          component_model: comp.model,
          quantity_per_room: comp.qty,
          total_quantity: comp.qty * room.count,
          unit_cost: comp.unit_cost,
          total_cost: comp.total_cost * room.count
        }));
      });
      
      sessionStorage.setItem('roomInstances', JSON.stringify(displayRoomInstances));
      sessionStorage.setItem('billOfMaterials', JSON.stringify(displayBillOfMaterials));
      sessionStorage.setItem('finalProjectCosts', JSON.stringify(projectCosts));
      
      // Navigate to configurator page
      window.location.href = '/configurator';
    } catch (err) {
      console.error('Error submitting configuration:', err);
      setError('Failed to submit configuration: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
    }
  };



  const formatCurrency = (amount: number) => {
    // Use project currency from state to avoid hydration issues
    const currency = projectCurrency;
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
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
                  href="/room-configuration" 
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    pathname === '/room-configuration' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Room Configuration
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
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Room Configuration</h2>
          <p className="text-gray-600">
            Configure your room types with the appropriate components and review the cost estimation.
          </p>
          
          {/* 5-Minute Workflow Progress */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-blue-800">5-Minute Cost Estimation Workflow</h3>
              <span className="text-sm text-blue-600 font-medium">Step 3 of 4</span>
            </div>
            <div className="flex space-x-2">
              <div className="flex-1 bg-blue-600 rounded-full h-2"></div>
              <div className="flex-1 bg-blue-600 rounded-full h-2"></div>
              <div className="flex-1 bg-blue-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full w-1/2"></div>
              </div>
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
              Configuration Progress: {Math.round(configurationProgress)}%
            </span>
            <span className="text-sm text-gray-500">
              {configuredRooms.filter(r => r.status === 'configured').length} of {configuredRooms.length} rooms configured
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${configurationProgress}%` }}
            ></div>
          </div>
        </div>

        {/* Project Cost Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Cost Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(projectCosts.total_room_cost)}
                </div>
              <div className="text-sm text-gray-600">Room Costs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(projectCosts.labour_cost)}
              </div>
              <div className="text-sm text-gray-600">Labour</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(projectCosts.network_cost)}
              </div>
              <div className="text-sm text-gray-600">Network</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(projectCosts.miscellaneous_cost)}
              </div>
              <div className="text-sm text-gray-600">Miscellaneous</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(projectCosts.total_project_cost)}
              </div>
              <div className="text-sm text-gray-600">Total Project</div>
            </div>
          </div>
        </div>

        {/* Room Configuration Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Side - Room List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Room Types</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Select a room to configure its components
                </p>
              </div>
              <div className="p-6 space-y-3 max-h-96 overflow-y-auto">
                {configuredRooms.length > 0 ? (
                  configuredRooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoom(room.id)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedRoom === room.id
                        ? 'border-blue-500 bg-blue-50'
                        : room.status === 'configured'
                        ? 'border-green-200 bg-green-50'
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{room.room_name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{room.room_type_name}</p>
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
                        <div className="mt-2">
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(room.estimated_cost)}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        {room.status === 'configured' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Configured
                          </span>
                        )}
                        {room.status === 'pending' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            ⏳ Pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Rooms to Configure</h3>
                  <p className="text-gray-600 mb-4">Complete room mapping in the previous step to configure room components.</p>
                  <Link
                    href="/room-mapping"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    ← Back to Room Mapping
                  </Link>
                </div>
              )}
              </div>
            </div>
          </div>

          {/* Right Side - Component Selection */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedRoom 
                        ? `Configure: ${configuredRooms.find(r => r.id === selectedRoom)?.room_name}`
                        : 'Select a room to configure'
                      }
                    </h3>
                    {selectedRoom && (
                      <p className="text-sm text-gray-600 mt-1">
                        Select the components needed for this room type
                      </p>
                    )}
                  </div>
                  {selectedRoom && (
                    <button
                      onClick={() => setShowAddComponentModal(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      + Add Component
                    </button>
                  )}
                </div>
              </div>
              <div className="p-6">
                {!selectedRoom ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">🏢</div>
                    <p className="text-gray-500">Select a room type from the list to configure its components</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(() => {
                      const selectedRoomData = configuredRooms.find(r => r.id === selectedRoom);
                      if (!selectedRoomData?.components) {
                        return <div className="text-center py-8 text-gray-500">No components found for this room type</div>;
                      }
                      return selectedRoomData.components.map((component) => {
                        const isSelected = component.selected || false;
                      
                        return (
                          <div
                            key={component.id}
                            className={`p-4 border rounded-lg transition-all duration-200 ${
                              isSelected 
                                ? 'border-blue-500 bg-blue-50' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleComponentToggle(selectedRoom, component.id)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  />
                                  <div>
                                    <h4 className="font-medium text-gray-900">{component.description}</h4>
                                    <p className="text-sm text-gray-600">
                                      {component.make} {component.model}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                                              <div className="text-sm text-gray-500">
                                Qty: {component.qty} × {formatCurrency(component.unit_cost)}
                              </div>
                              <div className="font-medium text-gray-900">
                                {formatCurrency(component.total_cost)}
                              </div>
                              {selectedRoomData && (
                                <div className="text-xs text-gray-500">
                                  Total: {formatCurrency(component.total_cost * selectedRoomData.count)}
                                </div>
                              )}
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-between items-center">
          <Link
            href="/room-mapping"
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            ← Back to Room Mapping
          </Link>
          
          <button
            onClick={handleSubmitConfiguration}
            disabled={configurationProgress < 100 || submitting}
            className={`px-8 py-3 rounded-lg font-medium transition-colors ${
              configurationProgress < 100 || submitting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {submitting ? (
              <span className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting...
              </span>
            ) : (
              'Submit Configuration →'
            )}
          </button>
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-2">🎯 Configuration Guide</h3>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• Select room types from the left panel to configure their components</li>
            <li>• Check the components needed for each room type</li>
            <li>• Costs are automatically calculated based on room count and selected components</li>
            <li>• All rooms must be configured before submitting</li>
            <li>• Review the project cost summary before final submission</li>
          </ul>
        </div>

        {/* Add Component Modal */}
        {showAddComponentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Add Component</h3>
                <button
                  onClick={() => setShowAddComponentModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                {availableAVComponents.map((component) => (
                  <div
                    key={component.id}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors cursor-pointer"
                    onClick={() => handleAddComponent(component)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{component.description}</h4>
                        <p className="text-sm text-gray-600">
                          {component.make} {component.model}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">
                          Qty: {component.qty} × {formatCurrency(component.unit_cost)}
                        </div>
                        <div className="font-medium text-gray-900">
                          {formatCurrency(component.total_cost)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowAddComponentModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 