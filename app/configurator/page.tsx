'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// adjust the path if needed
const Select = dynamic(() => import('react-select'), { ssr: false });

type RoomType = {
  id: number;
  name: string;
};

type AvComponent = {
  id: number;
  description: string;
  make: string;
  model: string;
};

type ConfigLine = {
  room_type: number;
  sub_type: string;
  make: number;
  description: string;
  model: string;
  tech_space_guidelines: boolean;
};

type SelectOption = {
  value: number;
  label: string;
  make: string;
  model: string;
};

type StrapiItem<T> = {
  id: number;
  attributes: T;
};



export default function ConfiguratorForm() {
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [avComponents, setAvComponents] = useState<AvComponent[]>([]);
  const [configLines, setConfigLines] = useState<ConfigLine[]>([{
    room_type: 0,
    sub_type: 'Simplified',
    make: 0,
    description: '',
    model: '',
    tech_space_guidelines: true,
  }]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const fetchPaginated = async <T,>(url: string): Promise<StrapiItem<T>[]> => {
        const all: StrapiItem<T>[] = [];
        let page = 1;
        let pageCount = 1;
      
        do {
          const res = await axios.get(`${url}?pagination[page]=${page}&pagination[pageSize]=100`);
          const data: StrapiItem<T>[] = res.data?.data || [];
          all.push(...data);
      
          pageCount = res.data?.meta?.pagination?.pageCount || 1;
          page++;
        } while (page <= pageCount);
      
        return all;
      };
      
      try {
        const roomData = await fetchPaginated<RoomType>('http://localhost:1337/api/room-types');
        setRoomTypes(roomData.map((r) => ({
          id: r.id,
          name: r.attributes.name
        })));
        
  
        const avData = await fetchPaginated<AvComponent>('http://localhost:1337/api/av-components');
        setAvComponents(avData.map((c) => ({
          id: c.id,
          description: c.attributes.description,
          make: c.attributes.make,
          model: c.attributes.model
        })));
        
      } catch (err) {
        if (err instanceof Error) {
          setError('Failed to fetch data: ' + err.message);
        } else {
          setError('Failed to fetch data.');
        }
      }
    };
  
    fetchData();
  }, []);
    
  const addLine = () => {
    setConfigLines([...configLines, {
      room_type: 0,
      sub_type: 'Simplified',
      make: 0,
      description: '',
      model: '',
      tech_space_guidelines: true,
    }]);
  };

  const removeLine = (index: number) => {
    if (configLines.length > 1) {
      const updated = configLines.filter((_, i) => i !== index);
      setConfigLines(updated);
    }
  };

  const updateLine = (index: number, field: keyof ConfigLine, value: string | number | boolean) => {
    const updated = [...configLines];
    updated[index] = { ...updated[index], [field]: value };
    setConfigLines(updated);
  };

  const handleComponentSelect = (index: number, selected: SelectOption | null) => {
    const updated = [...configLines];

    if (selected === null) {
      updated[index].make = 0;
      updated[index].description = '';
      updated[index].model = '';
    } else {
      updated[index].make = selected.value;
      updated[index].description = selected.label;
      updated[index].model = selected.model;
    }

    setConfigLines(updated);
  };

  const saveLine = async (index: number) => {
    const line = configLines[index];
    const selectedRoom = roomTypes.find(rt => rt.id === line.room_type);
    const selectedComponent = avComponents.find(c => c.id === line.make);

    if (!selectedRoom || !selectedComponent) {
      setError('Room type and AV component are required.');
      return;
    }

    try {
      await axios.post('http://localhost:1337/api/default-room-configs', {
        data: {
          room_type: selectedRoom.name,
          sub_type: line.sub_type,
          description: selectedComponent.description,
          make: selectedComponent.make,
          model: selectedComponent.model,
          tech_space_guidelines: line.tech_space_guidelines,
        }
      });

      setSuccess('Configuration saved!');
      setError(null);
} catch (err: unknown) {
  if (err instanceof Error) {
    console.error('POST error:', err.message);
    setError('Failed to save: ' + err.message);
  } else {
    setError('Failed to save.');
  }
  setSuccess(null);
}

  };

  const getComponentOptions = () => {
    return avComponents.map((comp) => ({
      value: comp.id,
      label: comp.description,
      make: comp.make,
      model: comp.model,
    }));
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="sticky top-0 z-10 bg-white shadow-md pb-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Add Default Room Configuration</h1>
          <Link href="/variants">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Back to Variants
            </button>
          </Link>
        </div>
        {error && <p className="text-red-600 mb-4">{error}</p>}
        {success && <p className="text-green-600 mb-4">{success}</p>}
      </div>

      <div className="pt-4">
        {configLines.map((line, idx) => (
          <div key={idx} className="mb-6 border-b pb-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Room Type */}
              <div>
                <label className="block text-sm font-medium mb-1">Room Type</label>
                <select
                  value={line.room_type}
                  onChange={(e) => updateLine(idx, 'room_type', parseInt(e.target.value))}
                  className="w-full border px-3 py-2 rounded"
                >
                  <option value={0}>Select Room Type</option>
                  {roomTypes.map(rt => (
                    <option key={rt.id} value={rt.id}>{rt.name}</option>
                  ))}
                </select>
              </div>

              {/* Sub Type */}
              <div>
                <label className="block text-sm font-medium mb-1">Sub Type</label>
                <select
                  value={line.sub_type}
                  onChange={(e) => updateLine(idx, 'sub_type', e.target.value)}
                  className="w-full border px-3 py-2 rounded"
                >
                  <option value="Simplified">Simplified</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Hybrid-optimized">Hybrid-optimized</option>
                  <option value="Hybrid-allin">Hybrid-allin</option>
                </select>
              </div>

              {/* Searchable AV Component */}
              <div>
                <label className="block text-sm font-medium mb-1">Component (Search)</label>
                <Select
                  options={getComponentOptions()}
                  onChange={(selected) => handleComponentSelect(idx, selected as SelectOption | null)}
                  value={getComponentOptions().find(opt => opt.value === line.make) || null}
                  placeholder="Search component..."
                  isClearable
                />
              </div>

              {/* Make */}
              <div>
                <label className="block text-sm font-medium mb-1">Make</label>
                <input
                  type="text"
                  value={avComponents.find(c => c.id === line.make)?.make || ''}
                  readOnly
                  className="w-full border px-3 py-2 bg-gray-100 rounded"
                />
              </div>

              {/* Model */}
              <div>
                <label className="block text-sm font-medium mb-1">Model</label>
                <input
                  type="text"
                  value={line.model}
                  readOnly
                  className="w-full border px-3 py-2 bg-gray-100 rounded"
                />
              </div>
            </div>

            <div className="flex items-center mt-6">
              <input
                type="checkbox"
                checked={line.tech_space_guidelines}
                onChange={(e) => updateLine(idx, 'tech_space_guidelines', e.target.checked)}
                className="mr-2"
              />
              <label className="text-sm font-medium">Within Tech Space Guidelines</label>
            </div>

            <div className="mt-3 flex gap-2">
              <button onClick={() => saveLine(idx)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                Save
              </button>
              <button onClick={addLine} className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700">
                +
              </button>
              <button
                onClick={() => removeLine(idx)}
                disabled={configLines.length === 1}
                className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 disabled:bg-gray-400"
              >
                -
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}