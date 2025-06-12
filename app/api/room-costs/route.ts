import { NextResponse } from 'next/server';
import axios from 'axios';

type AvBOMItem = {
  id: number;
  room_type: string;
  description: string;
  make: string;
  model: string;
  unit_cost: number | string;
  qty: number | string;
};

export async function GET() {
  const allItems: AvBOMItem[] = [];
  let page = 1;
  const pageSize = 100;

  while (true) {
    const response = await axios.get<{ data: AvBOMItem[]; meta: { pagination: { pageCount: number } } }>(
      `http://localhost:1337/api/av-bill-of-materials?pagination[page]=${page}&pagination[pageSize]=${pageSize}`
    );
    allItems.push(...response.data.data);
    const { pageCount } = response.data.meta.pagination;
    if (page >= pageCount) break;
    page++;
  }

  const groupedByRoom: Record<string, Record<string, AvBOMItem>> = {};
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

  for (const [room_type, components] of Object.entries(groupedByRoom)) {
    let roomTotal = 0;

    const componentGroups: Record<string, { totalCost: number; count: number; totalQty: number }> = {};

    for (const item of Object.values(components)) {
      const key = `${item.description || ''}|${item.make || ''}|${item.model || ''}`;
      const cost = typeof item.unit_cost === 'number' ? item.unit_cost : parseFloat(item.unit_cost) || 0;
      const qty = typeof item.qty === 'number' ? item.qty : parseFloat(item.qty) || 0;

      if (!componentGroups[key]) {
        componentGroups[key] = { totalCost: 0, count: 0, totalQty: 0 };
      }

      componentGroups[key].totalCost += cost;
      componentGroups[key].count += 1;
      componentGroups[key].totalQty += qty;
    }

    for (const { totalCost, count, totalQty } of Object.values(componentGroups)) {
      const avgUnitCost = count > 0 ? totalCost / count : 0;
      roomTotal += avgUnitCost * totalQty;
    }

    grouped[room_type] = roomTotal;
  }

  const summary = Object.entries(grouped).map(([room_type, total_cost]) => ({
    room_type,
    total_cost,
  }));

  return NextResponse.json(summary);
}
