'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';

const subTypes = ['Simplified', 'Hybrid', 'Hybrid-optimized', 'Hybrid-allin'];

interface RoomType {
  id: number;
  name: string;
}

interface DefaultRoomConfig {
  id: number;
  description: string;
  model: string;
  make: string;
  room_type: string;
  sub_type: string;
  qty: number;
  unit_cost?: number;
}

export default function RoomCost() {
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [selectedSubTypes, setSelectedSubTypes] = useState<{ [room: string]: string }>({});
  const [roomCosts, setRoomCosts] = useState<{ [room: string]: number | null }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await axios.get('https://backend.sandyy.dev/api/room-types?pagination[pageSize]=100');
        const data = res.data?.data || [];
        setRoomTypes(data.map((r: any) => ({ id: r.id, name: r.name })));

        const defaultSubs: { [room: string]: string } = {};
        const defaultCosts: { [room: string]: number | null } = {};

        for (const r of data) {
          defaultSubs[r.name] = 'Simplified';
          defaultCosts[r.name] = null;
        }

        setSelectedSubTypes(defaultSubs);
        setRoomCosts(defaultCosts);
      } catch (err) {
        setError('Failed to load room types');
      }
    };

    fetchRooms();
  }, []);

  useEffect(() => {
    const fetchCosts = async () => {
      setLoading(true);
      try {
        const updatedCosts: { [room: string]: number | null } = { ...roomCosts };

        await Promise.all(
          roomTypes.map(async (room) => {
            const sub = selectedSubTypes[room.name] || 'Simplified';

            const res = await axios.get('https://backend.sandyy.dev/api/default-room-configs', {
              params: {
                filters: {
                  room_type: { $eq: room.name },
                  sub_type: { $eq: sub },
                },
                pagination: { pageSize: 100 },
              },
            });

            const components: DefaultRoomConfig[] = res.data?.data || [];
            if (components.length) {
              const totalCost = components.reduce(
                (acc, item) => acc + (item.unit_cost || 0) * (item.qty || 1),
                0
              );
              updatedCosts[room.name] = totalCost;
            } else {
              updatedCosts[room.name] = null; // fallback can go here if needed
            }
          })
        );

        setRoomCosts(updatedCosts);
      } catch (err) {
        setError('Failed to fetch room costs');
      } finally {
        setLoading(false);
      }
    };

    if (roomTypes.length) fetchCosts();
  }, [selectedSubTypes, roomTypes]);

  const handleSubTypeChange = (room: string, sub: string) => {
    setSelectedSubTypes((prev) => ({ ...prev, [room]: sub }));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Room Cost Summary</h1>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      {loading && <p className="text-gray-600">Loading costs...</p>}
      <table className="w-full border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Room Type</th>
            <th className="p-2 text-left">Sub Type</th>
            <th className="p-2 text-left">Total Cost</th>
          </tr>
        </thead>
        <tbody>
          {roomTypes.map((room) => (
            <tr key={room.id} className="border-t">
              <td className="p-2 font-medium">{room.name}</td>
              <td className="p-2">
                <select
                  value={selectedSubTypes[room.name] || 'Simplified'}
                  onChange={(e) => handleSubTypeChange(room.name, e.target.value)}
                  className="border px-2 py-1 rounded"
                >
                  {subTypes.map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </td>
              <td className="p-2">₹ {roomCosts[room.name]?.toLocaleString() || 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
