'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
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
  createdAt?: string;
};

type ExcelRow = {
  room_type?: string;
  description?: string;
  make?: string;
  model?: string;
  qty?: number;
  unit_cost?: number;
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

type RoomCostData = {
  room_type: string;
  total_cost: number;
};

export default function SummaryPage() {
  const [summaryData, setSummaryData] = useState<RoomCostData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const pathname = usePathname();

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
        }>(`https://backend.sandyy.dev/api/room-configurations?pagination[page]=${page}&pagination[pageSize]=${pageSize}`);
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
        }>(`https://backend.sandyy.dev/api/av-bill-of-materials?pagination[page]=${page}&pagination[pageSize]=${pageSize}`);
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
        Object.entries(components).forEach(([, { totalPrice, count, totalQty }]) => {
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

        Object.entries(componentGroups).forEach(([, { totalCost, count, totalQty }]) => {
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
      const formatted: RoomCostData[] = Object.entries(groupedByRoom).map(([room_type, total_cost]) => ({
        room_type,
        total_cost,
      }));
      console.log('Formatted Data:', formatted);

      setSummaryData(formatted);
    } catch (err) {
      setError('Failed to fetch data. Please try again later.');
      console.error('Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setError(null);

      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData: ExcelRow[] = XLSX.utils.sheet_to_json<ExcelRow>(sheet);

        const transformedData = jsonData.map((row) => ({
          room_type: row['room_type'] || '',
          description: row['description'] || '',
          make: row['make'] || '',
          model: row['model'] || '',
          qty: row['qty'] || 0,
          unit_cost: row['unit_cost'] || 0,
        }));

        console.log('Transformed JSON:', transformedData);

        for (const item of transformedData) {
          await axios.post('https://backend.sandyy.dev/api/av-bill-of-materials', {
            data: item,
          });
        }

        await fetchData();
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      setError('Failed to upload file. Please try again.');
      console.error('File Upload Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
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
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Room Cost Summary</h1>

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
                </tr>
              </thead>
              <tbody>
                {summaryData.length > 0 ? (
                  summaryData.map((room) => (
                    <tr key={room.room_type} className="hover:bg-gray-100 transition-colors">
                      <td className="px-4 py-2 text-sm text-gray-600 border-b">{room.room_type || 'Unknown'}</td>
                      <td className="px-4 py-2 text-sm text-gray-600 text-right border-b">
                        ${room.total_cost.toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="px-4 py-2 text-center text-sm text-gray-500 border-b">
                      No data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && summaryData.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800">Cost Distribution by Room Type</h2>
          <div className="h-[400px] bg-white p-4 rounded-lg shadow-md">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summaryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="room_type" stroke="#374151" />
                <YAxis stroke="#374151" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                />
                <Legend />
                <Bar dataKey="total_cost" fill="#2563eb" name="Total Cost ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Upload AV BoQ Excel File (.xlsx)</label>
          <input
            type="file"
            accept=".xlsx"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
      )}
    </div>
  );
}