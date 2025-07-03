// app/configurator/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Select from 'react-select';

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
        const [configRes, legacyRes] = await Promise.all([
          axios.get(
            `https://backend.sandyy.dev/api/default-room-configs?filters[sub_type][$eq]=${selectedSubType.value}&pagination[pageSize]=100`
          ),
          axios.get('https://backend.sandyy.dev/api/room-costs?pagination[pageSize]=100'),
        ]);

        const configs = configRes.data?.data || [];
        const legacies = legacyRes.data?.data || [];

        setRoomConfigs(configs);
        setLegacyCosts(legacies);
      } catch (err: unknown) {
        // eslint-disable-next-line no-console
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError('Failed to fetch data: ' + errorMessage);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Room Costs Summary</h1>

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
