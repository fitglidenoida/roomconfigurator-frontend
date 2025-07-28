'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SpaceRequirementMatrix from '../components/SpaceRequirementMatrix';

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

export default function SRMPage() {
  const [roomTypes, setRoomTypes] = useState<string[]>([]);
  const [selectedRoomType, setSelectedRoomType] = useState<string>('');
  const [selectedSubType, setSelectedSubType] = useState<string>('');
  const [selectedRequirement, setSelectedRequirement] = useState<SpaceRequirement | null>(null);
  const pathname = usePathname();

  // Mock room types - in a real app, these would come from your API
  useEffect(() => {
    setRoomTypes([
      'Meeting Room',
      'Conference Room',
      'Training Room',
      'Huddle Room',
      'Video Conference Room',
      'Executive Suite',
      'Board Room',
      'Presentation Room'
    ]);
  }, []);

  const handleRequirementSelect = (requirement: SpaceRequirement) => {
    setSelectedRequirement(requirement);
    console.log('Selected requirement:', requirement);
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
                  Summary
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
                <Link 
                  href="/srm" 
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    pathname === '/srm' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Space Requirements
                </Link>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <SpaceRequirementMatrix
          roomTypes={roomTypes}
          selectedRoomType={selectedRoomType}
          selectedSubType={selectedSubType}
          onRequirementSelect={handleRequirementSelect}
        />
      </div>
    </div>
  );
} 