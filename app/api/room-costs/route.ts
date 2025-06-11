import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  let allItems: any[] = [];
  let page = 1;
  const pageSize = 100;

  while (true) {
    const response = await axios.get(`http://localhost:1337/api/av-bill-of-materials?pagination[page]=${page}&pagination[pageSize]=${pageSize}`);
    allItems = [...allItems, ...response.data.data];
    const { pageCount } = response.data.meta.pagination;
    if (page >= pageCount) break;
    page++;
  }

  const groupedByRoom: Record<string, Record<string, any>> = {};
  allItems.forEach((item) => {
    const { room_type, description, make, model, id } = item;
    const componentKey = `${description || ''}|${make || ''}|${model || ''}`;

    if (!groupedByRoom[room_type]) {
      groupedByRoom[room_type] = {};
    }
    if (!groupedByRoom[room_type][componentKey] || id > groupedByRoom[room_type][componentKey].id) {
      groupedByRoom[room_type][componentKey] = { ...item };
    }
  });

  const grouped: Record<string, number> = {};
  Object.entries(groupedByRoom).forEach(([room_type, components]) => {
    let roomTotal = 0;
    const componentGroups: Record<string, { totalCost: number; count: number; totalQty: number }> = {};

    Object.values(components).forEach((item: any) => {
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

    grouped[room_type] = roomTotal;
  });

  const summary = Object.entries(grouped).map(([room_type, total_cost]) => ({
    room_type,
    total_cost,
  }));

  return NextResponse.json(summary);
}
