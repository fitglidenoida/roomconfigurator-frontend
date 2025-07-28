'use client';

import React, { useState, useEffect } from 'react';

interface SpaceRequirement {
  room_type: string;
  room_name: string;
  sub_type: string;
  min_area: number;
  max_area: number;
  recommended_area: number;
  ceiling_height: number;
  floor_load: number;
  power_requirements: number;
  cooling_requirements: number;
  network_requirements: string;
  notes?: string;
}

interface SpaceRequirementMatrixProps {
  roomTypes: string[];
  selectedRoomType?: string;
  selectedSubType?: string;
  onRequirementSelect?: (requirement: SpaceRequirement) => void;
}

const defaultSpaceRequirements: SpaceRequirement[] = [
  {
    room_type: 'meeting_room',
    room_name: 'Meeting Room',
    sub_type: 'Standard',
    min_area: 15,
    max_area: 25,
    recommended_area: 20,
    ceiling_height: 2.7,
    floor_load: 500,
    power_requirements: 2.5,
    cooling_requirements: 0.8,
    network_requirements: '1Gbps Ethernet + WiFi 6',
    notes: 'Standard meeting room with basic AV equipment'
  },
  {
    room_type: 'meeting_room',
    room_name: 'Meeting Room',
    sub_type: 'Premium',
    min_area: 20,
    max_area: 35,
    recommended_area: 28,
    ceiling_height: 3.0,
    floor_load: 750,
    power_requirements: 4.0,
    cooling_requirements: 1.2,
    network_requirements: '2.5Gbps Ethernet + WiFi 6E',
    notes: 'Premium meeting room with advanced AV and collaboration tools'
  },
  {
    room_type: 'conference_room',
    room_name: 'Conference Room',
    sub_type: 'Standard',
    min_area: 30,
    max_area: 50,
    recommended_area: 40,
    ceiling_height: 3.2,
    floor_load: 1000,
    power_requirements: 6.0,
    cooling_requirements: 1.8,
    network_requirements: '2.5Gbps Ethernet + WiFi 6E',
    notes: 'Conference room for larger meetings and presentations'
  },
  {
    room_type: 'conference_room',
    room_name: 'Conference Room',
    sub_type: 'Executive',
    min_area: 40,
    max_area: 70,
    recommended_area: 55,
    ceiling_height: 3.5,
    floor_load: 1200,
    power_requirements: 8.0,
    cooling_requirements: 2.4,
    network_requirements: '10Gbps Ethernet + WiFi 6E',
    notes: 'Executive conference room with premium AV and acoustic treatment'
  },
  {
    room_type: 'training_room',
    room_name: 'Training Room',
    sub_type: 'Standard',
    min_area: 50,
    max_area: 80,
    recommended_area: 65,
    ceiling_height: 3.0,
    floor_load: 800,
    power_requirements: 5.0,
    cooling_requirements: 1.5,
    network_requirements: '1Gbps Ethernet + WiFi 6',
    notes: 'Training room with flexible seating and presentation capabilities'
  },
  {
    room_type: 'huddle_room',
    room_name: 'Huddle Room',
    sub_type: 'Standard',
    min_area: 8,
    max_area: 15,
    recommended_area: 12,
    ceiling_height: 2.7,
    floor_load: 400,
    power_requirements: 1.5,
    cooling_requirements: 0.5,
    network_requirements: '1Gbps Ethernet + WiFi 6',
    notes: 'Small collaboration space for quick meetings'
  },
  {
    room_type: 'video_conference_room',
    room_name: 'Video Conference Room',
    sub_type: 'Codec-Based',
    min_area: 25,
    max_area: 40,
    recommended_area: 32,
    ceiling_height: 3.2,
    floor_load: 900,
    power_requirements: 4.5,
    cooling_requirements: 1.4,
    network_requirements: '2.5Gbps Ethernet + QoS',
    notes: 'Dedicated video conferencing room with codec-based system'
  },
  {
    room_type: 'video_conference_room',
    room_name: 'Video Conference Room',
    sub_type: 'Direct-Connect',
    min_area: 20,
    max_area: 35,
    recommended_area: 28,
    ceiling_height: 3.0,
    floor_load: 800,
    power_requirements: 3.5,
    cooling_requirements: 1.1,
    network_requirements: '1Gbps Ethernet + QoS',
    notes: 'Video conferencing room with direct-connect system'
  }
];

export default function SpaceRequirementMatrix({
  roomTypes: _roomTypes,
  selectedRoomType,
  selectedSubType,
  onRequirementSelect
}: SpaceRequirementMatrixProps) {
  const [requirements] = useState<SpaceRequirement[]>(defaultSpaceRequirements);
  const [filteredRequirements, setFilteredRequirements] = useState<SpaceRequirement[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequirement, setSelectedRequirement] = useState<SpaceRequirement | null>(null);

  useEffect(() => {
    let filtered = requirements;

    // Filter by room type if selected
    if (selectedRoomType) {
      filtered = filtered.filter(req => 
        req.room_type.toLowerCase().includes(selectedRoomType.toLowerCase()) ||
        req.room_name.toLowerCase().includes(selectedRoomType.toLowerCase())
      );
    }

    // Filter by sub type if selected
    if (selectedSubType) {
      filtered = filtered.filter(req => 
        req.sub_type.toLowerCase().includes(selectedSubType.toLowerCase())
      );
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(req =>
        req.room_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.sub_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredRequirements(filtered);
  }, [requirements, selectedRoomType, selectedSubType, searchTerm]);

  const handleRequirementClick = (requirement: SpaceRequirement) => {
    setSelectedRequirement(requirement);
    onRequirementSelect?.(requirement);
  };

  const formatArea = (area: number) => `${area} m²`;
  const formatHeight = (height: number) => `${height} m`;
  const formatLoad = (load: number) => `${load} kg/m²`;
  const formatPower = (power: number) => `${power} kW`;
  const formatCooling = (cooling: number) => `${cooling} kW`;

  return (
    <div className="space-requirement-matrix">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Space Requirement Matrix</h2>
        <p className="text-gray-600">
          View space requirements for different room types and configurations
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search room types, sub-types, or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="text-sm text-gray-500">
          {filteredRequirements.length} of {requirements.length} requirements
        </div>
      </div>

      {/* Requirements Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredRequirements.map((requirement, index) => (
          <div
            key={index}
            onClick={() => handleRequirementClick(requirement)}
            className={`bg-white border rounded-lg p-6 cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-blue-300 ${
              selectedRequirement?.room_type === requirement.room_type &&
              selectedRequirement?.sub_type === requirement.sub_type
                ? 'border-blue-500 shadow-lg'
                : 'border-gray-200'
            }`}
          >
            {/* Header */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {requirement.room_name}
              </h3>
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                {requirement.sub_type}
              </span>
            </div>

            {/* Space Requirements */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Area:</span>
                <span className="text-sm font-medium">
                  {formatArea(requirement.recommended_area)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Ceiling Height:</span>
                <span className="text-sm font-medium">
                  {formatHeight(requirement.ceiling_height)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Floor Load:</span>
                <span className="text-sm font-medium">
                  {formatLoad(requirement.floor_load)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Power:</span>
                <span className="text-sm font-medium">
                  {formatPower(requirement.power_requirements)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Cooling:</span>
                <span className="text-sm font-medium">
                  {formatCooling(requirement.cooling_requirements)}
                </span>
              </div>
            </div>

            {/* Network Requirements */}
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="text-sm text-gray-600 mb-1">Network:</div>
              <div className="text-sm font-medium text-gray-900">
                {requirement.network_requirements}
              </div>
            </div>

            {/* Notes */}
            {requirement.notes && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="text-sm text-gray-600 mb-1">Notes:</div>
                <div className="text-sm text-gray-700">
                  {requirement.notes}
                </div>
              </div>
            )}

            {/* Area Range */}
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="text-sm text-gray-600 mb-1">Area Range:</div>
              <div className="text-sm font-medium text-gray-900">
                {formatArea(requirement.min_area)} - {formatArea(requirement.max_area)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* No Results */}
      {filteredRequirements.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-2">No space requirements found</div>
          <div className="text-gray-500 text-sm">
            Try adjusting your search terms or filters
          </div>
        </div>
      )}

      {/* Selected Requirement Details */}
      {selectedRequirement && (
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Selected: {selectedRequirement.room_name} - {selectedRequirement.sub_type}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Recommended Area</div>
              <div className="text-lg font-bold text-blue-600">
                {formatArea(selectedRequirement.recommended_area)}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Ceiling Height</div>
              <div className="text-lg font-bold text-blue-600">
                {formatHeight(selectedRequirement.ceiling_height)}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Floor Load</div>
              <div className="text-lg font-bold text-blue-600">
                {formatLoad(selectedRequirement.floor_load)}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Power Requirements</div>
              <div className="text-lg font-bold text-blue-600">
                {formatPower(selectedRequirement.power_requirements)}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Cooling Requirements</div>
              <div className="text-lg font-bold text-blue-600">
                {formatCooling(selectedRequirement.cooling_requirements)}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Network</div>
              <div className="text-lg font-bold text-blue-600">
                {selectedRequirement.network_requirements}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 