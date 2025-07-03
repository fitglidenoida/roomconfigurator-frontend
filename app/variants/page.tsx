'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type DefaultRoomConfig = {
  id: number;          // internal numeric
  documentId: string;  // UID (primary key)
  room_type: string;
  sub_type: string;
  description: string;
  make: string;
  model: string;
  tech_space_guidelines: boolean | null;
  qty: number;
};


type AvComponent = {
  id: number;
  description: string;
  make: string;
  model: string;
  unit_cost: number;
};

type ComponentRow = {
  id: number;          // numeric template id (good for React key)
  documentId: string;  // UID used for DELETE / PUT
  description: string;
  make: string;
  model: string;
  qty: number;
  unit_cost: number;
  selected: boolean;
};

type Variant = {
  room_type: string;
  sub_type: string;
  components: ComponentRow[];
  total_cost: number;
};



export default function Variants() {
  const [roomTypes, setRoomTypes] = useState<string[]>([]);
  const [subTypes, setSubTypes] = useState<string[]>([]);
  const [selectedRoomType, setSelectedRoomType] = useState<string>('');
  const [selectedSubType, setSelectedSubType] = useState<string>('');
  const [components, setComponents] = useState<ComponentRow[]>([]);
  const [avComponents, setAvComponents] = useState<AvComponent[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const pathname = usePathname();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        let allConfigs: DefaultRoomConfig[] = [];
        let allAvComponents: AvComponent[] = [];
        let page = 1;
        const pageSize = 100;

        // Fetch all default room configs
        while (true) {
          const response = await axios.get(`https://backend.sandyy.dev/api/default-room-configs?pagination[page]=${page.toString()}&pagination[pageSize]=${pageSize}`);
          allConfigs = [...allConfigs, ...(response.data.data || [])];
          const { pageCount } = response.data.meta.pagination || { pageCount: 1 };
          if (page >= pageCount) break;
          page++;
        }

        // Fetch all AV components
        page = 1;
        while (true) {
          const response = await axios.get(`https://backend.sandyy.dev/api/av-components?pagination[page]=${page.toString()}&pagination[pageSize]=${pageSize}`);
          allAvComponents = [...allAvComponents, ...(response.data.data || [])];
          const { pageCount } = response.data.meta.pagination || { pageCount: 1 };
          if (page >= pageCount) break;
          page++;
        }

        // Extract unique room types
        const uniqueRoomTypes = [...new Set(allConfigs.map(config => config.room_type))].sort();
        setRoomTypes(uniqueRoomTypes);

        // Map AV components for cost lookup
        setAvComponents(allAvComponents.map(comp => ({
          id: comp.id,
          description: comp.description,
          make: comp.make,
          model: comp.model,
          unit_cost: comp.unit_cost || 0,
        })));

        setLoading(false);
    } catch (err) {
        setError('Failed to fetch data: ' + ((err as Error)?.message || 'Unknown error'));
        console.error('Fetch Error:', err);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Update sub-types when room type changes
  useEffect(() => {
    if (selectedRoomType) {
      const fetchSubTypes = async () => {
        try {
          let allConfigs: DefaultRoomConfig[] = [];
          let page = 1;
          const pageSize = 100;

          while (true) {
            const response = await axios.get(`https://backend.sandyy.dev/api/default-room-configs?filters[room_type][$eq]=${encodeURIComponent(selectedRoomType)}&pagination[page]=${page.toString()}&pagination[pageSize]=${pageSize}`);
            allConfigs = [...allConfigs, ...(response.data.data || [])];
            const { pageCount } = response.data.meta.pagination || { pageCount: 1 };
            if (page >= pageCount) break;
            page++;
          }

          const uniqueSubTypes = [...new Set(allConfigs.map(config => config.sub_type))].sort();
          setSubTypes(uniqueSubTypes);
          setSelectedSubType(uniqueSubTypes[0] || '');
        } catch (err) {
            const errorMessage = (err as Error)?.message || 'Unknown error';
            setError('Failed to fetch data: ' + errorMessage);
            console.error('Fetch Error:', err);
          }          
      };
      fetchSubTypes();
    } else {
      setSubTypes([]);
      setSelectedSubType('');
    }
  }, [selectedRoomType]);

  // Update components when room type and sub-type change
useEffect(() => {
  if (!selectedRoomType || !selectedSubType) {
    setComponents([]);
    return;
  }

  const pageSize = 100;

  const fetchComponents = async () => {
    try {
      // pull only the records that ACTUALLY exist in the collection
      let rows: DefaultRoomConfig[] = [];
      let page = 1;
      while (true) {
        const res = await axios.get(
          `https://backend.sandyy.dev/api/default-room-configs` +
            `?filters[room_type][$eq]=${encodeURIComponent(selectedRoomType)}` +
            `&filters[sub_type][$eq]=${encodeURIComponent(selectedSubType)}` +
            `&pagination[page]=${page}&pagination[pageSize]=${pageSize}`
        );
        rows = rows.concat(res.data.data || []);
        if (page >= (res.data.meta.pagination?.pageCount || 1)) break;
        page++;
      }

      const list = rows.map(def => {
        const av = avComponents.find(
          ac =>
            ac.description === def.description &&
            ac.make === def.make &&
            ac.model === def.model
        );
return {
  id:          def.id,
  documentId:  def.documentId,
  description: def.description,
  make:        def.make,
  model:       def.model,
  qty:         def.qty ?? 1,
  unit_cost:   av?.unit_cost || 0,
  selected:    true,
};


      });

      setComponents(list);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError('Failed to load components: ' + msg);
      console.error(err);
    }
  };

  fetchComponents();
  }, [selectedRoomType, selectedSubType, avComponents]);

  const toggleComponent = (id: number) => {
    setComponents(components.map(comp => comp.id === id ? { ...comp, selected: !comp.selected } : comp));
  };

  const totalCost = components
    .filter(comp => comp.selected)
    .reduce((sum, comp) => sum + (comp.qty * comp.unit_cost), 0) * 1.1;

  const addVariant = () => {
    if (selectedRoomType && selectedSubType && components.length > 0) {
      setVariants([...variants, {
        room_type: selectedRoomType,
        sub_type: selectedSubType,
        components: components.map(comp => ({ ...comp })),
        total_cost: totalCost,
      }]);
    }
  };

  const resetVariants = () => {
    setVariants([]);
  };

const submitVariant = async () => {
  if (!selectedRoomType || !selectedSubType) {
    setError('Select a room type and sub-type first.');
    return;
  }

  try {
    setError(null);

    /* what the user left checked / unchecked */
    const toKeep   = components.filter(c => c.selected);
    const toDelete = components.filter(c => !c.selected);

    const ops: Promise<unknown>[] = [];

    /* 1️⃣ DELETE every unchecked row – Strapi v5 wants the *documentId*  */
    toDelete.forEach(row => {
      if (row.documentId) {
        ops.push(
          axios.delete(
            `https://backend.sandyy.dev/api/default-room-configs/${row.documentId}`
          )
        );
      }
    });

    /* 2️⃣ POST any newly-checked row that still has no documentId */
    toKeep
      .filter(r => !r.documentId)          // brand-new – not in DB yet
      .forEach(r => {
        ops.push(
          axios.post('https://backend.sandyy.dev/api/default-room-configs', {
            data: {
              room_type:   selectedRoomType,
              sub_type:    selectedSubType,
              description: r.description,
              make:        r.make,
              model:       r.model,
              qty:         r.qty,
            },
          })
        );
      });

    await Promise.all(ops);

    alert('Template updated!');

    /* 3️⃣ refresh the table so UI matches the DB */
    setSelectedSubType(selectedSubType);   // retriggers fetchComponents
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(err);
    setError('Failed to update template: ' + msg);
  }
};

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

      <h1 className="text-3xl font-bold mb-8 text-blue-800">Room Variants Configurator</h1>

      {loading && <p className="text-gray-500 text-lg">Loading...</p>}
      {error && <p className="text-red-500 text-lg mb-4">{error}</p>}

      {!loading && !error && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-end mb-4">
            <Link href="/configurator">
              <button className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
                Add Configuration
              </button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
              <select
                value={selectedRoomType}
                onChange={(e) => setSelectedRoomType(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Room Type</option>
                {roomTypes.map((rt) => (
                  <option key={rt} value={rt}>{rt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sub Type</label>
              <select
                value={selectedSubType}
                onChange={(e) => setSelectedSubType(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!selectedRoomType}
              >
                <option value="">Select Sub Type</option>
                {subTypes.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
          </div>

          {components.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4 text-blue-800">Bill of Materials</h2>
              <div className="overflow-x-auto shadow-md rounded-lg">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 border-b">Select</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 border-b">Description</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 border-b">Make</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 border-b">Model</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700 border-b">Qty</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700 border-b">Unit Cost ($)</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700 border-b">Total Cost ($)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {components.map((comp) => (
                      <tr key={comp.id} className="hover:bg-gray-100 transition-colors">
                        <td className="px-6 py-2 text-sm text-gray-600 border-b">
                          <input
                            type="checkbox"
                            checked={comp.selected}
                            onChange={() => toggleComponent(comp.id)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-2 text-sm text-gray-600 border-b">{comp.description}</td>
                        <td className="px-6 py-2 text-sm text-gray-600 border-b">{comp.make}</td>
                        <td className="px-6 py-2 text-sm text-gray-600 border-b">{comp.model}</td>
                        <td className="px-6 py-2 text-sm text-gray-600 text-right border-b">{comp.qty}</td>
                        <td className="px-6 py-2 text-sm text-gray-600 text-right border-b">${comp.unit_cost.toFixed(2)}</td>
                        <td className="px-6 py-2 text-sm text-gray-600 text-right border-b">${(comp.qty * comp.unit_cost).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end mt-4">
                <div className="bg-gray-50 p-4 rounded-lg shadow-md">
                  <p className="text-lg font-semibold text-gray-800">
                    Total Cost (with 10% markup): <span className="text-blue-600">${totalCost.toFixed(2)}</span>
                  </p>
                </div>
              </div>
              <div className="flex justify-end mt-4 space-x-2">
                <button
                  onClick={addVariant}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add to Compare
                </button>
                <button
                  onClick={submitVariant}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Submit Variant
                </button>
              </div>
            </div>
          )}

          {variants.length > 0 && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-blue-800">Compare Variants</h2>
                <button
                  onClick={resetVariants}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Reset Comparator
                </button>
              </div>
              <div className="overflow-x-auto shadow-md rounded-lg">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 border-b">Variant</th>
                      {variants.map((variant, index) => (
                        <th key={index} className="px-6 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                          {variant.room_type} - {variant.sub_type}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="hover:bg-gray-100 transition-colors">
                      <td className="px-6 py-2 text-sm text-gray-600 border-b font-semibold">Total Cost ($)</td>
                      {variants.map((variant, index) => (
                        <td key={index} className="px-6 py-2 text-sm text-gray-600 border-b">${variant.total_cost.toFixed(2)}</td>
                      ))}
                    </tr>
                    {[...new Set(variants.flatMap(v => v.components.map(c => `${c.description}|${c.make}|${c.model}`)))].map(compKey => {
                      const [description, make, model] = compKey.split('|');
                      return (
                        <tr key={compKey} className="hover:bg-gray-100 transition-colors">
                          <td className="px-6 py-2 text-sm text-gray-600 border-b">{description} ({make}, {model})</td>
                          {variants.map((variant, index) => {
                            const comp = variant.components.find(c => c.description === description && c.make === make && c.model === model);
                            return (
                              <td key={index} className="px-6 py-2 text-sm text-gray-600 border-b">
                                {comp && comp.selected ? `Qty: ${comp.qty}, $${(comp.qty * comp.unit_cost).toFixed(2)}` : '-'}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}