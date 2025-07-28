// app/configurator/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Select from 'react-select';
import Link from 'next/link';
import { fetchAllPages } from '../lib/api';

interface DefaultRoomConfig {
  id: number;
  room_type: string;
  sub_type: string;
  make: string;
  model: string;
  description: string;
  qty: number;
  unit_cost: number;
}

interface LegacyRoomCost {
  id: number;
  room_type: string;
  total_cost: number;
}

interface SubTypeOption {
  value: string;
  label: string;
}

const subTypeOptions: SubTypeOption[] = [
  { value: 'Simplified', label: 'Simplified' },
  { value: 'Hybrid', label: 'Hybrid' },
  { value: 'Hybrid-optimized', label: 'Hybrid-optimized' },
  { value: 'Hybrid-allin', label: 'Hybrid-allin' },
];

export default function RoomCostPage() {
  const [roomConfigs, setRoomConfigs] = useState<DefaultRoomConfig[]>([]);
  const [legacyCosts, setLegacyCosts] = useState<LegacyRoomCost[]>([]);
  const [selectedSubType, setSelectedSubType] = useState<SubTypeOption>(subTypeOptions[0]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [configs, legacies] = await Promise.all([
          fetchAllPages('/default-room-configs', {
            'filters[sub_type][$eq]': selectedSubType.value
          }),
          fetchAllPages('/room-costs')
        ]);

        setRoomConfigs(configs);
        setLegacyCosts(legacies);
      } catch (err: unknown) {
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError('Failed to fetch data: ' + errorMessage);
      }
    };

    fetchData();
  }, [selectedSubType]);

  const getRoomTypes = (): string[] => {
    const types = new Set(
      [
        ...roomConfigs.map((r) => r.room_type),
        ...legacyCosts.map((l) => l.room_type),
      ]
    );
    return Array.from(types);
  };

  const calculateRoomCost = (roomType: string): number => {
    const filteredConfigs = roomConfigs.filter((r) => r.room_type === roomType);
    if (filteredConfigs.length > 0) {
      return filteredConfigs.reduce((sum, item) => sum + item.qty * item.unit_cost, 0);
    }
    const legacy = legacyCosts.find((l) => l.room_type === roomType);
    return legacy ? legacy.total_cost : 0;
  };

  return (
    <div className="container mx-auto p-6">
      {/* Navigation Tabs */}
      <div className="mb-8">
        <div className="flex space-x-4 border-b border-gray-200">
                  <Link href="/" className="px-4 py-2 text-sm font-medium rounded-t-md text-gray-600 hover:text-blue-700">
          Room Configurator
        </Link>
          <a href="/summary" className="px-4 py-2 text-sm font-medium rounded-t-md text-gray-600 hover:text-blue-700">
            Room Cost
          </a>
          <a href="/variants" className="px-4 py-2 text-sm font-medium rounded-t-md text-gray-600 hover:text-blue-700">
            Variants
          </a>
          <a href="/room-types" className="px-4 py-2 text-sm font-medium rounded-t-md text-gray-600 hover:text-blue-700">
            Room Types
          </a>
          <a href="/dashboard" className="px-4 py-2 text-sm font-medium rounded-t-md text-gray-600 hover:text-blue-700">
            Dashboard
          </a>
        </div>
      </div>

      <h1 className="text-3xl font-bold mb-8 text-gray-800">Room Costs Summary</h1>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">Select Room Sub-Type</label>
        <Select
          options={subTypeOptions}
          value={selectedSubType}
          onChange={(val) => val && setSelectedSubType(val)}
        />
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <table className="w-full border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-left">Room Type</th>
            <th className="border p-2 text-right">Total Cost (INR)</th>
          </tr>
        </thead>
        <tbody>
          {getRoomTypes().map((room) => (
            <tr key={room}>
              <td className="border p-2">{room}</td>
              <td className="border p-2 text-right">₹ {calculateRoomCost(room).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
