'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type AvMaterialItem = {
  id: number;
  documentId: string;
  room_type: string;
  description?: string;
  make?: string;
  model?: string;
  unit_cost: number;
  qty: number;
};

type RoomConfigurationItem = {
  id: number;
  documentId: string;
  room_type: string;
  sub_type: string;
  description: string;
  make: string;
  model: string;
  qty: number;
  unit_price: number;
};

type RoomConfig = {
  room_type: string;
  total_cost: number;
  qty: number;
  subtotal: number;
};

export default function RoomConfigurator() {
  const [roomConfigs, setRoomConfigs] = useState<RoomConfig[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [networkCost, setNetworkCost] = useState<number>(0);
  const [miscellaneous, setMiscellaneous] = useState<number>(0);
  const [approvedCapex, setApprovedCapex] = useState<number>(0);
  const pathname = usePathname();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        let allRoomConfigs: RoomConfigurationItem[] = [];
        let allBoMItems: AvMaterialItem[] = [];
        let page = 1;
        const pageSize = 100;

        // Fetch all room_configurations
        while (true) {
          const response = await axios.get<{
            data: RoomConfigurationItem[];
            meta: { pagination: { page: number; pageSize: number; pageCount: number; total: number } };
          }>(`http://localhost:1337/api/room-configurations?pagination[page]=${page}&pagination[pageSize]=${pageSize}`);
          allRoomConfigs = [...allRoomConfigs, ...response.data.data];
          const { pageCount } = response.data.meta.pagination;
          console.log(`Room Configs Page ${page}/${pageCount}, Total Items: ${allRoomConfigs.length}`);
          if (page >= pageCount) break;
          page++;
        }

        // Get unique room_types from room_configurations
        const roomConfigRoomTypes = new Set(allRoomConfigs.map(item => item.room_type));

        // Fetch av_bill_of_materials for room_types not in room_configurations
        page = 1;
        while (true) {
          const response = await axios.get<{
            data: AvMaterialItem[];
            meta: { pagination: { page: number; pageSize: number; pageCount: number; total: number } };
          }>(`http://localhost:1337/api/av-bill-of-materials?pagination[page]=${page}&pagination[pageSize]=${pageSize}`);
          const items = response.data.data.filter(item => !roomConfigRoomTypes.has(item.room_type));
          allBoMItems = [...allBoMItems, ...items];
          const { pageCount } = response.data.meta.pagination;
          console.log(`BoM Page ${page}/${pageCount}, Filtered Items: ${items.length}`);
          if (page >= pageCount) break;
          page++;
        }

        // Group room_configurations by room_type and component
        const groupedByRoom: Record<string, number> = {};
        const roomConfigGroups: Record<string, Record<string, { totalPrice: number; count: number; totalQty: number }>> = {};
        allRoomConfigs.forEach(item => {
          const key = `${item.description || ''}|${item.make || ''}|${item.model || ''}`;
          const price = typeof item.unit_price === 'number' ? item.unit_price : parseFloat(item.unit_price) || 0;
          const qty = typeof item.qty === 'number' ? item.qty : parseFloat(item.qty) || 0;

          if (!roomConfigGroups[item.room_type]) {
            roomConfigGroups[item.room_type] = {};
          }
          if (!roomConfigGroups[item.room_type][key]) {
            roomConfigGroups[item.room_type][key] = { totalPrice: 0, count: 0, totalQty: 0 };
          }

          roomConfigGroups[item.room_type][key].totalPrice += price;
          roomConfigGroups[item.room_type][key].count += 1;
          roomConfigGroups[item.room_type][key].totalQty += qty;
        });

        Object.entries(roomConfigGroups).forEach(([room_type, components]) => {
          let roomTotal = 0;
          Object.entries(components).forEach(([_, { totalPrice, count, totalQty }]) => {
            const avgUnitPrice = count > 0 ? totalPrice / count : 0;
            roomTotal += avgUnitPrice * totalQty;
          });
          groupedByRoom[room_type] = roomTotal;
        });

        // Group av_bill_of_materials by room_type and component
        const groupedBoM: Record<string, Record<string, AvMaterialItem>> = {};
        allBoMItems.forEach((item) => {
          const { room_type, description, make, model, id } = item;
          const componentKey = `${description || ''}|${make || ''}|${model || ''}`;

          if (!groupedBoM[room_type]) {
            groupedBoM[room_type] = {};
          }
          // Update only if new or has higher id (most recent)
          if (!groupedBoM[room_type][componentKey] || id > groupedBoM[room_type][componentKey].id) {
            groupedBoM[room_type][componentKey] = { ...item };
          }
        });

        Object.entries(groupedBoM).forEach(([room_type, components]) => {
          let roomTotal = 0;
          const componentGroups: Record<string, { totalCost: number; count: number; totalQty: number }> = {};

          Object.values(components).forEach((item) => {
            const key = `${item.description || ''}|${item.make || ''}|${item.model || ''}`;
            const cost = typeof item.unit_cost === 'number' ? item.unit_cost : parseFloat(item.unit_cost) || 0;
            const qty = typeof item.qty === 'number' ? item.qty : parseFloat(item.qty) || 0;

            if (!componentGroups[key]) {
              componentGroups[key] = { totalCost: 0, count: 0, totalQty: 0 };
            }

            componentGroups[key].totalCost += cost;
            componentGroups[key].count += 1;
            componentGroups[key].totalQty += qty;
          });

          Object.entries(componentGroups).forEach(([_, { totalCost, count, totalQty }]) => {
            const avgUnitCost = count > 0 ? totalCost / count : 0;
            roomTotal += avgUnitCost * totalQty;
          });

          groupedByRoom[room_type] = (groupedByRoom[room_type] || 0) + roomTotal;
        });

        // Apply 10% markup to total_cost for each room_type
        Object.keys(groupedByRoom).forEach(room_type => {
          groupedByRoom[room_type] *= 1.1;
        });

        // Format data for display
        const formatted: RoomConfig[] = Object.entries(groupedByRoom).map(([room_type, total_cost]) => ({
          room_type,
          total_cost,
          qty: 0,
          subtotal: 0,
        }));
        console.log('Formatted Data:', formatted);

        setRoomConfigs(formatted);
      } catch (err) {
        setError('Failed to fetch data. Please try again later.');
        console.error('Fetch Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleQtyChange = (index: number, value: string) => {
    const qty = parseInt(value) || 0;
    const updatedConfigs = [...roomConfigs];
    updatedConfigs[index] = {
      ...updatedConfigs[index],
      qty,
      subtotal: qty * updatedConfigs[index].total_cost,
    };
    setRoomConfigs(updatedConfigs);
  };

  const totalAVCost = roomConfigs.reduce((sum, config) => sum + config.subtotal, 0);
  const costVsBudget = approvedCapex - (totalAVCost + networkCost + miscellaneous);

  return (
    <div className="container mx-auto p-6">
      {/* Navigation Tabs */}
      <div className="mb-8">
        <div className="flex space-x-4 border-b border-gray-200">
          <Link href="/">
            <span
              className={`px-4 py-2 text-sm font-medium rounded-t-md ${
                pathname === '/' ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-500' : 'text-gray-600 hover:text-blue-700'
              }`}
            >
              Room Configurator
            </span>
          </Link>
          <Link href="/summary">
            <span
              className={`px-4 py-2 text-sm font-medium rounded-t-md ${
                pathname === '/summary' ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-500' : 'text-gray-600 hover:text-blue-700'
              }`}
            >
              Room Cost
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
        </div>
      </div>

      <h1 className="text-3xl font-bold mb-8 text-gray-800">Room Configurator</h1>

      {loading && <p className="text-gray-500 text-lg">Loading...</p>}
      {error && <p className="text-red-500 text-lg mb-4">{error}</p>}

      {!loading && !error && (
        <div className="mb-12">
          <div className="overflow-x-auto shadow-md rounded-lg">
            <table className="min-w-full bg-white border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 border-b">Room Type</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700 border-b">Total Cost ($)</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700 border-b">Quantity</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700 border-b">Subtotal ($)</th>
                </tr>
              </thead>
              <tbody>
                {roomConfigs.length > 0 ? (
                  roomConfigs.map((config, index) => (
                    <tr key={config.room_type} className="hover:bg-gray-100 transition-colors">
                      <td className="px-4 py-2 text-sm text-gray-600 border-b">{config.room_type || 'Unknown'}</td>
                      <td className="px-4 py-2 text-sm text-gray-600 text-right border-b">
                        ${config.total_cost.toFixed(2)}
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
                        ${config.subtotal.toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-center text-sm text-gray-500 border-b">
                      No data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mt-4">
            <div className="bg-gray-50 p-4 rounded-lg shadow-md">
              <p className="text-lg font-semibold text-gray-800">
                Total AV Cost: <span className="text-blue-600">${totalAVCost.toFixed(2)}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && roomConfigs.length > 0 && (
        <div className="mb-12">
          <div className="bg-gray-50 p-6 rounded-lg shadow-md">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Network Cost ($)</label>
                <input
                  type="number"
                  min="0"
                  value={networkCost}
                  onChange={(e) => setNetworkCost(parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Miscellaneous ($)</label>
                <input
                  type="number"
                  min="0"
                  value={miscellaneous}
                  onChange={(e) => setMiscellaneous(parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Approved Capex ($)</label>
                <input
                  type="number"
                  min="0"
                  value={approvedCapex}
                  onChange={(e) => setApprovedCapex(parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cost vs. Budget ($)</label>
                <p className="w-full bg-gray-100 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-600">
                  ${costVsBudget.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}