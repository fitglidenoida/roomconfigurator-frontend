'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

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
  updatedAt?: string;
  publishedAt?: string;
};

type RoomCostData = {
  room_type: string;
  total_cost: number;
};

export default function SummaryPage() {
  const [summaryData, setSummaryData] = useState<RoomCostData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        let allItems: AvMaterialItem[] = [];
        let page = 1;
        const pageSize = 100;

        // Fetch all pages
        while (true) {
          const response = await axios.get<{
            data: AvMaterialItem[];
            meta: { pagination: { page: number; pageSize: number; pageCount: number; total: number } };
          }>(`http://localhost:1337/api/av-bill-of-materials?pagination[page]=${page}&pagination[pageSize]=${pageSize}`);
          console.log(`Page ${page} Response:`, response.data);

          allItems = [...allItems, ...response.data.data];
          const { pageCount, total } = response.data.meta.pagination;
          console.log(`Page ${page}/${pageCount}, Total Items: ${allItems.length}/${total}`);

          if (page >= pageCount) break;
          page++;
        }

        console.log('All Items:', allItems);

        const grouped: Record<string, number> = {};
        allItems.forEach((item, index) => {
          const { room_type, qty, unit_cost } = item;
          const cost = typeof unit_cost === 'number' ? unit_cost : parseFloat(unit_cost) || 0;
          const quantity = qty || 0;
          const total = quantity * cost;
          console.log(`Item ${index + 1}: Room: ${room_type}, Cost: ${cost}, Qty: ${quantity}, Total: ${total}`);
          grouped[room_type] = (grouped[room_type] || 0) + total;
        });

        const formatted: RoomCostData[] = Object.entries(grouped).map(([room_type, total_cost]) => ({
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

    fetchData();
  }, []);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Room Cost Summary</h1>

      {/* Table */}
      {loading && <p className="text-gray-500 text-lg">Loading...</p>}
      {error && <p className="text-red-500 text-lg mb-4">{error}</p>}

      {!loading && !error && (
        <div className="mb-12">
          <div className="overflow-x-auto shadow-md rounded-lg">
            <table className="min-w-full bg-white border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 border-b">Room Type</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700 border-b">Total Cost (₹)</th>
                </tr>
              </thead>
              <tbody>
                {summaryData.length > 0 ? (
                  summaryData.map((room) => (
                    <tr key={room.room_type} className="hover:bg-gray-100 transition-colors">
                      <td className="px-4 py-2 text-sm text-gray-600 border-b">{room.room_type || 'Unknown'}</td>
                      <td className="px-4 py-2 text-sm text-gray-600 text-right border-b">
                        ₹{room.total_cost.toFixed(2)}
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

      {/* Bar Chart */}
      {!loading && !error && summaryData.length > 0 && (
        <div>
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
                <Bar dataKey="total_cost" fill="#2563eb" name="Total Cost (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}