'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { fetchAllPages } from '../lib/api';
import { autoCategorizeComponents } from '../lib/mlService';

import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

interface DashboardData {
  totalProjectCost: number;
  roomLevelCosts: any[];
  costBreakdown: any[];
  regionalComparison: any[];
  budgetStatus: {
    approved: number;
    actual: number;
    variance: number;
    percentage: number;
  };
  costOptimization: any[];
  recentProjects: any[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function PMDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalProjectCost: 0,
    roomLevelCosts: [],
    costBreakdown: [],
    regionalComparison: [],
    budgetStatus: { approved: 0, actual: 0, variance: 0, percentage: 0 },
    costOptimization: [],
    recentProjects: []
  });
  const [mlTrainingResults, setMlTrainingResults] = useState<any>(null);
  const [mlTrainingLoading, setMlTrainingLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProject] = useState<string>('');
  // const [projects] = useState<any[]>([]);
  const [showRoomCostModal, setShowRoomCostModal] = useState(false);
  const [showCostBreakdownModal, setShowCostBreakdownModal] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    fetchDashboardData();
  }, [selectedProject]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data
      const [roomConfigs, avComponents, projectsData] = await Promise.all([
        fetchAllPages('/room-configurations'),
        fetchAllPages('/av-components'),
        fetchAllPages('/projects')
      ]);

      console.log('Dashboard data fetch results:', {
        roomConfigs: roomConfigs.length,
        avComponents: avComponents.length,
        projectsData: projectsData.length
      });

      console.log('AV Components sample data:', avComponents.slice(0, 3));

      // setProjects(projectsData);

      // Calculate dashboard metrics - use actual project data from sessionStorage
      let totalProjectCost = 0;
      let roomLevelCosts: any[] = [];
      let budgetStatus = {
        approved: 0,
        actual: 0,
        variance: 0,
        percentage: 0
      };
      let costBreakdown: any[] = []; // Initialize at top level
      let regionalComparison: any[] = []; // Initialize at top level
      
      // Get actual project data from sessionStorage
      if (typeof window !== 'undefined') {
        const finalProjectCosts = sessionStorage.getItem('finalProjectCosts');
        const billOfMaterials = sessionStorage.getItem('billOfMaterials');
        const projectData = sessionStorage.getItem('projectData');
        const roomMappings = sessionStorage.getItem('roomMappings');
        const srmData = sessionStorage.getItem('srmData');
        
        console.log('Dashboard - SessionStorage check:', {
          finalProjectCosts: !!finalProjectCosts,
          billOfMaterials: !!billOfMaterials,
          projectData: !!projectData,
          roomMappings: !!roomMappings,
          srmData: !!srmData
        });
        
        if (projectData || finalProjectCosts) {
          try {
            const parsedProjectData = projectData ? JSON.parse(projectData) : {};
            const parsedFinalProjectCosts = finalProjectCosts ? JSON.parse(finalProjectCosts) : {};
            const parsedBillOfMaterials = billOfMaterials ? JSON.parse(billOfMaterials) : [];
            const parsedRoomMappings = roomMappings ? JSON.parse(roomMappings) : [];
            const parsedSrmData = srmData ? JSON.parse(srmData) : [];
            
            // Use the same cost calculation logic as configurator page
            let totalRoomCost = 0;
            let labourCost = 0;
            let networkCost = 0;
            let miscellaneousCost = 0;
            
            // Priority: projectData (manual input) over finalProjectCosts (BOQ extracted)
            if (projectData) {
              // SRM flow - use manual input costs
              labourCost = parseFloat(parsedProjectData.labourCost) || 0;
              networkCost = parseFloat(parsedProjectData.networkCost) || 0;
              miscellaneousCost = parseFloat(parsedProjectData.miscCost) || 0;
              
              console.log('Dashboard using SRM manual costs:', { labourCost, networkCost, miscellaneousCost });
            } else if (finalProjectCosts) {
              // BOQ flow - use extracted costs
              totalRoomCost = parsedFinalProjectCosts.total_room_cost || 0;
              labourCost = parseFloat(parsedFinalProjectCosts.labour_cost) || 0;
              networkCost = parseFloat(parsedFinalProjectCosts.network_cost) || 0;
              miscellaneousCost = parseFloat(parsedFinalProjectCosts.miscellaneous_cost) || 0;
              
              console.log('Dashboard using BOQ extracted costs:', { totalRoomCost, labourCost, networkCost, miscellaneousCost });
            }
            
            // Calculate room costs from room configurations if available
            if (parsedRoomMappings.length > 0 && parsedSrmData.length > 0) {
              const mappedRooms = parsedRoomMappings.filter((mapping: any) => 
                mapping.status === 'mapped' || mapping.status === 'new_room'
              );
              
              totalRoomCost = mappedRooms.reduce((sum: number, mapping: any) => {
                const srmRoom = parsedSrmData.find((room: any) => room.id === mapping.srm_room_id);
                const roomCount = srmRoom ? srmRoom.count : 1;
                
                // Calculate cost per room type (same logic as configurator)
                let costPerRoom = 0;
                
                // Try to get cost from bill of materials
                if (parsedBillOfMaterials.length > 0) {
                  const roomName = srmRoom ? srmRoom.room_name : mapping.room_name || 'Unknown Room';
                  const roomComponents = parsedBillOfMaterials.filter((item: any) => 
                    item.room_type === roomName || 
                    item.room_type === mapping.selected_room_type?.name ||
                    item.room_type === mapping.new_room_name
                  );
                  
                  costPerRoom = roomComponents.reduce((sum: number, comp: any) => {
                    return sum + (comp.unit_cost * comp.quantity_per_room);
                  }, 0);
                }
                
                // Use default costs if no bill of materials
                if (costPerRoom === 0) {
                  const roomName = srmRoom ? srmRoom.room_name : mapping.room_name || 'Unknown Room';
                  if (roomName.toLowerCase().includes('meeting') || roomName.toLowerCase().includes('conference')) {
                    costPerRoom = 50000;
                  } else if (roomName.toLowerCase().includes('office') || roomName.toLowerCase().includes('workstation')) {
                    costPerRoom = 15000;
                  } else {
                    costPerRoom = 30000;
                  }
                }
                
                return sum + (costPerRoom * roomCount);
              }, 0);
              
              console.log('Dashboard calculated total room cost:', totalRoomCost);
            }
            
            const inflation = parseFloat(parsedProjectData.inflation) || 0;
            
            // Calculate subtotal and inflation
            const subtotal = totalRoomCost + labourCost + networkCost + miscellaneousCost;
            const inflationAmount = subtotal * (inflation / 100);
            totalProjectCost = subtotal + inflationAmount;
            
            console.log('Dashboard final cost calculation:', {
              totalRoomCost,
              labourCost,
              networkCost,
              miscellaneousCost,
              subtotal,
              inflationAmount,
              totalProjectCost
            });
            
            // Calculate room level costs from SRM data for consistency
            const roomCostMap = new Map();
            
            // Use SRM data as the source of truth for room types
            if (parsedSrmData.length > 0) {
              console.log('Processing SRM data for room level costs:', parsedSrmData);
              parsedSrmData.forEach((srmRoom: any) => {
                // Find corresponding mapping for this SRM room
                const mapping = parsedRoomMappings.find((m: any) => m.srm_room_id === srmRoom.id);
                
                if (mapping && (mapping.status === 'mapped' || mapping.status === 'new_room')) {
                  // Use SRM room name for consistency - check all possible field names
                  const roomType = srmRoom.room_name || srmRoom.name || srmRoom.room_type || 'Unknown Room';
                  const roomCount = srmRoom.count || 1;
                  
                  // Calculate cost per room from bill of materials
                  const roomComponents = parsedBillOfMaterials.filter((item: any) => {
                    const mappingRoomName = mapping.selected_room_type?.name || mapping.new_room_name;
                    return item.room_type === mappingRoomName;
                  });
                  
                  const costPerRoom = roomComponents.reduce((sum: number, comp: any) => {
                    return sum + (comp.unit_cost * comp.quantity_per_room);
                  }, 0);
                  
                  // Store cost per room (not total cost for all rooms)
                  const costPerRoomValue = costPerRoom;
                  
                  if (roomCostMap.has(roomType)) {
                    // If room type already exists, use the higher cost per room (for comparison)
                    const existingCost = roomCostMap.get(roomType);
                    roomCostMap.set(roomType, Math.max(existingCost, costPerRoomValue));
                  } else {
                    roomCostMap.set(roomType, costPerRoomValue);
                  }
                }
              });
            }
            
            roomLevelCosts = Array.from(roomCostMap.entries()).map(([roomType, cost]) => ({
              room_type: roomType,
              cost: cost as number,
              count: 1
            }));
            
            console.log('Room level costs calculated:', roomLevelCosts);
            
            // Calculate budget status - use raw values without conversion
            const approvedBudget = parseFloat(parsedProjectData.capex) || 0;
            budgetStatus = {
              approved: approvedBudget,
              actual: totalProjectCost,
              variance: approvedBudget - totalProjectCost,
              percentage: approvedBudget > 0 ? ((totalProjectCost / approvedBudget) * 100) : 0
            };

            // Generate cost optimization suggestions based on real data
            const costOptimization = generateCostOptimizationSuggestions(avComponents, roomLevelCosts, totalProjectCost);

            setDashboardData({
              totalProjectCost,
              roomLevelCosts,
              costBreakdown,
              regionalComparison,
              budgetStatus,
              costOptimization,
              recentProjects: projectsData.slice(0, 5)
            });

          } catch (error) {
            console.warn('Error reading project data from sessionStorage:', error);
          }
        }
      }
      
      // Cost breakdown by component type - show categorization of all AV components (ALWAYS run)
      console.log('Raw AV Components data sample:', avComponents.slice(0, 5).map((comp: any) => ({
        id: comp.id,
        description: comp.description,
        component_type: comp.component_type,
        component_category: comp.component_category,
        make: comp.make,
        model: comp.model
      })));
      
      costBreakdown = avComponents.reduce((acc: any[], component: any) => {
        // Try multiple fields for categorization
        let type = component.component_type || 
                  component.component_category || 
                  'Uncategorized';
        
        // If all components have the same type, categorize by description patterns
        if (type === 'Uncategorized' || type === 'AV Equipment' || type === '') {
          const description = (component.description || '').toLowerCase();
          
          if (description.includes('display') || description.includes('tv') || description.includes('monitor') || description.includes('screen')) {
            type = 'Displays';
          } else if (description.includes('speaker') || description.includes('audio') || description.includes('sound') || description.includes('mic')) {
            type = 'Audio';
          } else if (description.includes('cable') || description.includes('wire') || description.includes('connector') || description.includes('hdmi')) {
            type = 'Cabling';
          } else if (description.includes('mount') || description.includes('bracket') || description.includes('stand')) {
            type = 'Mounting';
          } else if (description.includes('switch') || description.includes('matrix') || description.includes('controller')) {
            type = 'Control Systems';
          } else if (description.includes('projector') || description.includes('lens')) {
            type = 'Projection';
          } else if (description.includes('camera') || description.includes('video')) {
            type = 'Video';
          } else if (description.includes('light') || description.includes('led')) {
            type = 'Lighting';
          } else if (description.includes('processor') || description.includes('dsp') || description.includes('amplifier')) {
            type = 'Processing';
          } else if (description.includes('rack') || description.includes('cabinet') || description.includes('enclosure')) {
            type = 'Rack & Enclosures';
          } else {
            type = 'Uncategorized';
          }
        }
        
        const existing = acc.find((item: any) => item.type === type);
        if (existing) {
          existing.cost += component.unit_cost || 0;
          existing.count += 1;
        } else {
          acc.push({
            type,
            cost: component.unit_cost || 0,
            count: 1
          });
        }
        return acc;
      }, [] as any[]);

      console.log('AV Components categorization:', {
        totalComponents: avComponents.length,
        categorized: costBreakdown.filter(item => item.type !== 'Uncategorized').reduce((sum, item) => sum + item.count, 0),
        uncategorized: costBreakdown.find(item => item.type === 'Uncategorized')?.count || 0,
        breakdown: costBreakdown,
        uniqueTypes: costBreakdown.map(item => item.type)
      });
      
      // Regional comparison (ALWAYS run)
      regionalComparison = avComponents.reduce((acc: any[], component: any) => {
        const region = component.region || 'Unknown';
        const existing = acc.find((item: any) => item.region === region);
        if (existing) {
          existing.cost += component.unit_cost;
          existing.count += 1;
        } else {
          acc.push({
            region,
            cost: component.unit_cost,
            count: 1
          });
        }
        return acc;
      }, [] as any[]);
      
      // Fallback to database calculation if no sessionStorage data
      if (totalProjectCost === 0) {
        totalProjectCost = roomConfigs.reduce((sum: number, config: any) => {
          return sum + (config.qty * config.unit_price);
        }, 0);
        console.log('Using fallback database calculation:', totalProjectCost);
        
                   // Fallback room level costs from database
           roomLevelCosts = roomConfigs.reduce((acc: any[], config: any) => {
             const existing = acc.find((item: any) => item.room_type === config.room_type);
             if (existing) {
               existing.cost += config.qty * config.unit_price;
               existing.count += 1;
             } else {
               acc.push({
                 room_type: config.room_type,
                 cost: config.qty * config.unit_price,
                 count: 1
               });
             }
             return acc;
           }, [] as any[]);
      }

      // Update budget status with current total project cost if not already set
      if (budgetStatus.approved > 0) {
        budgetStatus = {
          ...budgetStatus,
          actual: totalProjectCost,
          variance: budgetStatus.approved - totalProjectCost,
          percentage: budgetStatus.approved > 0 ? ((totalProjectCost / budgetStatus.approved) * 100) : 0
        };
      }

      // Generate cost optimization suggestions based on real data
      const costOptimization = generateCostOptimizationSuggestions(avComponents, roomLevelCosts, totalProjectCost);

      // Final dashboard data update with all calculations
      setDashboardData({
        totalProjectCost,
        roomLevelCosts,
        costBreakdown,
        regionalComparison,
        budgetStatus,
        costOptimization,
        recentProjects: projectsData.slice(0, 5)
      });

      // ML Training for uncategorized components (if any)
      const uncategorizedCount = costBreakdown.find(item => item.type === 'Uncategorized')?.count || 0;
      if (uncategorizedCount > 0) {
        console.log(`Found ${uncategorizedCount} uncategorized components - ML training available`);
      }

    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  };

  // Get project currency from sessionStorage
  const getProjectCurrency = () => {
    if (typeof window === 'undefined') return 'USD';
    
    try {
      const projectData = sessionStorage.getItem('projectData');
      if (projectData) {
        const project = JSON.parse(projectData);
        return project.currency || 'USD';
      }
    } catch (error) {
      console.warn('Error reading project currency:', error);
    }
    return 'USD';
  };

  // Currency conversion function (same as room-configuration page)
  // const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string) => {
  //   // Simple conversion rates (in real app, these would come from an API)
  //   const rates: { [key: string]: number } = {
  //     'GBP': 1,
  //     'USD': 1.27,
  //     'EUR': 1.17,
  //     'INR': 115,
  //     'AED': 4.67,
  //     'SAR': 4.77
  //   };
  //   
  //   if (fromCurrency === toCurrency) return amount;
  //   
  //   // Convert to GBP first (base currency)
  //   const gbpAmount = fromCurrency === 'GBP' ? amount : amount / rates[fromCurrency];
  //   
  //   // Convert from GBP to target currency
  //   const convertedAmount = toCurrency === 'GBP' ? gbpAmount : gbpAmount * rates[toCurrency];
  //   
  //   return convertedAmount;
  // };

  // Format currency with project currency and conversion
  const formatProjectCurrency = (amount: number) => {
    const projectCurrency = getProjectCurrency();
    return formatCurrency(amount, projectCurrency);
  };

  // ML Training for uncategorized components
  const handleMLTraining = async () => {
    setMlTrainingLoading(true);
    try {
      const avComponents = await fetchAllPages('/av-components');
      const results = await autoCategorizeComponents(avComponents);
      setMlTrainingResults(results);
      console.log('ML Training completed:', results);
    } catch (error) {
      console.error('ML Training error:', error);
    } finally {
      setMlTrainingLoading(false);
    }
  };

  // Generate cost optimization suggestions based on current project's heavy-spend components
  const generateCostOptimizationSuggestions = (avComponents: any[], roomConfigs: any[], totalProjectCost: number) => {
    const suggestions: any[] = [];
    
    // Only show suggestions if we have current project data
    if (typeof window === 'undefined') {
      return [];
    }
    
    const roomInstances = sessionStorage.getItem('roomInstances');
    const projectData = sessionStorage.getItem('projectData');
    
    if (!roomInstances || !projectData) {
      return [];
    }
    
    try {
      const instances = JSON.parse(roomInstances);
      const project = JSON.parse(projectData);
      
      // Get project currency
      const projectCurrency = project.currency || 'USD';
      
      // Analyze components used in current project and their costs
      const componentSpend = new Map<string, number>();
      
      instances.forEach((instance: any) => {
        if (instance.components) {
          instance.components.forEach((comp: any) => {
            const key = `${comp.component_description || comp.make} ${comp.component_model || comp.model}`;
            const totalCost = (comp.unit_cost || 0) * (comp.quantity_per_room || 1);
            
            if (componentSpend.has(key)) {
              componentSpend.set(key, componentSpend.get(key)! + totalCost);
            } else {
              componentSpend.set(key, totalCost);
            }
          });
        }
      });
      
      // Sort by spend (highest first) and take top 5 heavy-spend components
      const sortedComponents = Array.from(componentSpend.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
      
      // Create suggestions for heavy-spend components
      sortedComponents.forEach(([componentName, totalSpend]) => {
        suggestions.push({
          component_name: componentName,
          current_cost: totalSpend,
          total_spend_percentage: (totalSpend / totalProjectCost) * 100,
          currency: projectCurrency,
          recommendation: totalSpend > totalProjectCost * 0.1 ? 'High Impact Component' : 'Standard Component'
        });
      });
      
    } catch (error) {
      console.warn('Error generating cost optimization suggestions:', error);
    }

    return suggestions;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-gray-600">Loading dashboard...</p>
            <p className="text-sm text-gray-400 mt-2">Connecting to production backend...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

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
          <Link href="/" className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${pathname === '/' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
            Configurator
          </Link>
        </div>
      </div>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">PM Dashboard</h1>
          <div className="flex items-center mt-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Demo Mode - Connected to Production Backend
            </span>
          </div>
        </div>
        <Link href="/summary">
          <button className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 shadow-lg">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Quick Cost Estimation
          </button>
        </Link>
      </div>
      
      {/* Quick Stats Banner */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg shadow-lg mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Get Project Cost in 5 Minutes</h2>
            <p className="text-blue-100">Upload SRM → Map Rooms → Get BOM & Cost Summary</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">⚡</div>
            <div className="text-sm text-blue-100">Fast Track</div>
          </div>
        </div>
      </div>

      {dashboardData && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
            <div className="bg-white p-4 rounded-lg shadow-md">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Total Project Cost</h3>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600 break-words">
                {formatProjectCurrency(dashboardData.totalProjectCost)}
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-md">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Approved Budget</h3>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600 break-words">
                {formatProjectCurrency(dashboardData.budgetStatus.approved)}
              </p>
              <p className="text-xs text-gray-600">
                {dashboardData.budgetStatus.approved > 0 ? 'Budget Set' : 'No Budget Set'}
              </p>
            </div>
            
            {dashboardData.budgetStatus.approved > 0 && (
              <div className="bg-white p-4 rounded-lg shadow-md">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Budget Status</h3>
                <p className={`text-lg sm:text-xl lg:text-2xl font-bold ${
                  dashboardData.budgetStatus.percentage > 100 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {dashboardData.budgetStatus.percentage.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-600 break-words">
                  {formatProjectCurrency(dashboardData.budgetStatus.variance)} variance
                </p>
              </div>
            )}
            
            <div className="bg-white p-4 rounded-lg shadow-md">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Room Types</h3>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-600">
                {dashboardData.roomLevelCosts.length}
              </p>
              <p className="text-xs text-gray-600">Active configurations</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-md">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Components</h3>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-600">
                {dashboardData.costBreakdown.reduce((sum, item) => sum + item.count, 0)}
              </p>
              <p className="text-xs text-gray-600">Total components</p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 mb-8">
            {/* Room Level Costs */}
            <div className="bg-white p-4 lg:p-6 rounded-lg shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base lg:text-lg font-semibold text-gray-800">Cost Per Room Type</h3>
                <button 
                  onClick={() => setShowRoomCostModal(true)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                  View Larger
                </button>
              </div>
              <div 
                className="h-64 lg:h-80 cursor-pointer hover:bg-gray-50 transition-colors rounded"
                onClick={() => setShowRoomCostModal(true)}
                title="Click to view larger chart"
              >
                {dashboardData.roomLevelCosts.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardData.roomLevelCosts}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="room_type" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip 
                        formatter={(value) => formatProjectCurrency(Number(value))}
                        labelFormatter={(label) => `${label} (per room)`}
                      />
                      <Bar dataKey="cost" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-500">
                      <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <p className="text-sm">No room cost data available</p>
                      <p className="text-xs">Complete a room configuration to see cost per room</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="bg-white p-4 lg:p-6 rounded-lg shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base lg:text-lg font-semibold text-gray-800">Cost Breakdown by Type</h3>
                <button 
                  onClick={() => setShowCostBreakdownModal(true)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                  View Larger
                </button>
              </div>
              <div 
                className="h-64 lg:h-80 cursor-pointer hover:bg-gray-50 transition-colors rounded"
                onClick={() => setShowCostBreakdownModal(true)}
                title="Click to view larger chart"
              >
                {dashboardData.costBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dashboardData.costBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="cost"
                      >
                        {dashboardData.costBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatProjectCurrency(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-500">
                      <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                      </svg>
                      <p className="text-sm">No cost breakdown data</p>
                      <p className="text-xs">Complete a project to see cost analysis</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Regional Comparison - Hidden for now */}
          {/* <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Regional Cost Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboardData.regionalComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="region" />
                <YAxis />
                <Tooltip formatter={(value) => formatProjectCurrency(Number(value))} />
                <Bar dataKey="cost" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div> */}



          {/* Cost Optimization Suggestions - Show heavy-spend components from current project */}
          {dashboardData.costOptimization.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Project Cost Analysis</h3>
              <p className="text-sm text-gray-600 mb-4">
                Top components by spend in your current project
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Component</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Total Spend</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">% of Project</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Impact Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.costOptimization.map((suggestion, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-4 py-2 text-sm text-gray-800">
                          {suggestion.component_name}
                        </td>
                        <td className="px-4 py-2 text-sm font-semibold text-gray-600">
                          {formatCurrency(suggestion.current_cost, suggestion.currency)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {suggestion.total_spend_percentage.toFixed(1)}%
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            suggestion.recommendation === 'High Impact Component' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {suggestion.recommendation}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent Cost Estimations */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Recent Cost Estimations</h3>
              <Link href="/project-data">
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  View All →
                </button>
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Project Name</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Region</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Total Cost</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Room Count</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Show current project data from sessionStorage
                    if (typeof window !== 'undefined') {
                      const projectData = sessionStorage.getItem('projectData');
                      const roomMappings = sessionStorage.getItem('roomMappings');
                      const srmData = sessionStorage.getItem('srmData');
                      
                      if (projectData && roomMappings && srmData) {
                        try {
                          const parsedProjectData = JSON.parse(projectData);
                          // const parsedRoomMappings = JSON.parse(roomMappings);
                          const parsedSrmData = JSON.parse(srmData);
                          
                                                     // Count total rooms from SRM data (user's state) - not just mapped ones
                           const totalRoomCount = parsedSrmData.reduce((total: number, srmRoom: any) => {
                             return total + (srmRoom.count || 1);
                           }, 0);
                           
                           // Debug: Log SRM data to see what we're working with
                           console.log('SRM Data for dashboard:', parsedSrmData);
                           console.log('Total room count:', totalRoomCount);
                          
                          // Get project cost from dashboard data
                          const projectCost = dashboardData.totalProjectCost;
                          
                          return (
                            <tr className="border-t">
                              <td className="px-4 py-2 text-sm text-gray-800">
                                {parsedProjectData.project_name || 'Current Project'}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                {parsedProjectData.region || 'N/A'}
                              </td>
                              <td className="px-4 py-2 text-sm font-semibold text-green-600">
                                {formatProjectCurrency(projectCost)}
                              </td>
                                                             <td className="px-4 py-2 text-sm text-gray-600">
                                 {totalRoomCount}
                               </td>
                              <td className="px-4 py-2 text-sm">
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                  In Progress
                                </span>
                              </td>
                              <td className="px-4 py-2 text-sm">
                                <Link href="/configurator">
                                  <button className="text-blue-600 hover:text-blue-700 font-medium">
                                    View Details
                                  </button>
                                </Link>
                              </td>
                            </tr>
                          );
                        } catch (error) {
                          console.warn('Error parsing sessionStorage data:', error);
                        }
                      }
                    }
                    
                    // Show empty state
                    return (
                      <tr className="border-t">
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          <div>
                            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-lg font-medium">No cost estimations yet</p>
                            <p className="text-sm">Start your first cost estimation to see results here</p>
                          </div>
                        </td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Historical Projects - Hidden for now */}
          {/* 
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Historical Projects</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Project Name</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Region</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Country</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Budget</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.recentProjects.map((project, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-4 py-2 text-sm text-gray-800">{project.project_name}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{project.region}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{project.country}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {formatCurrency(project.capex_amount, project.currency)}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          project.capex_amount > dashboardData.totalProjectCost 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {project.capex_amount > dashboardData.totalProjectCost ? 'On Budget' : 'Over Budget'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          */}
        </>
      )}

      {/* Room Level Costs Modal */}
      {showRoomCostModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-semibold text-gray-800">Cost Per Room Type - Detailed View</h3>
              <button
                onClick={() => setShowRoomCostModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData?.roomLevelCosts || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="room_type" 
                      angle={-45} 
                      textAnchor="end" 
                      height={100}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value) => formatProjectCurrency(Number(value))}
                      labelFormatter={(label) => `${label} (per room)`}
                    />
                    <Bar dataKey="cost" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cost Breakdown Modal */}
      {showCostBreakdownModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-semibold text-gray-800">Cost Breakdown by Type - Detailed View</h3>
              <button
                onClick={() => setShowCostBreakdownModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dashboardData?.costBreakdown || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="cost"
                    >
                      {(dashboardData?.costBreakdown || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatProjectCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 