'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { parseExcelFile, ExcelParseResult } from '../lib/excelParser';
import { apiService } from '../lib/api';

export default function DataInputPage() {
  const router = useRouter();
  
  // Form state
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('');
  const [projectName, setProjectName] = useState('');
  const [currency, setCurrency] = useState('');
  const [capex, setCapex] = useState('');
  const [networkCost, setNetworkCost] = useState('');
  const [labourCost, setLabourCost] = useState('');
  const [miscCost, setMiscCost] = useState('');
  const [inflation, setInflation] = useState('');
  const [boqFile, setBoqFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Region mapping (same as summary page)
  const regionMap: Record<string, string[]> = {
    'NAMR': ['United States', 'Canada', 'Mexico'],
    'EMESA': ['United Kingdom', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Poland', 'Czech Republic', 'Hungary', 'Romania', 'Bulgaria', 'Greece', 'Portugal', 'Ireland', 'South Africa', 'Nigeria', 'Kenya', 'Egypt', 'Morocco', 'Tunisia', 'Algeria', 'Ghana', 'Ethiopia', 'Uganda', 'Tanzania', 'Zimbabwe', 'Botswana', 'Namibia', 'Zambia', 'Malawi', 'Mozambique', 'Angola', 'Congo', 'Cameroon', 'Senegal', 'Ivory Coast', 'Mali', 'Burkina Faso', 'Niger', 'Chad', 'Sudan', 'South Sudan', 'Central African Republic', 'Gabon', 'Equatorial Guinea', 'Sao Tome and Principe', 'Cape Verde', 'Guinea-Bissau', 'Guinea', 'Sierra Leone', 'Liberia', 'Togo', 'Benin', 'Mauritania', 'Western Sahara', 'Djibouti', 'Eritrea', 'Somalia', 'Comoros', 'Seychelles', 'Mauritius', 'Madagascar', 'Reunion', 'Mayotte'],
    'APACME': ['China', 'Japan', 'South Korea', 'India', 'Australia', 'New Zealand', 'Singapore', 'Malaysia', 'Thailand', 'Vietnam', 'Philippines', 'Indonesia', 'Taiwan', 'Hong Kong', 'Macau', 'Pakistan', 'Bangladesh', 'Sri Lanka', 'Nepal', 'Bhutan', 'Maldives', 'Myanmar', 'Cambodia', 'Laos', 'Brunei', 'Papua New Guinea', 'Fiji', 'Vanuatu', 'Solomon Islands', 'New Caledonia', 'French Polynesia', 'Samoa', 'Tonga', 'Kiribati', 'Tuvalu', 'Nauru', 'Palau', 'Micronesia', 'Marshall Islands', 'Timor-Leste', 'Mongolia', 'Kazakhstan', 'Uzbekistan', 'Kyrgyzstan', 'Tajikistan', 'Turkmenistan', 'Afghanistan', 'Iran', 'Iraq', 'Saudi Arabia', 'United Arab Emirates', 'Qatar', 'Kuwait', 'Bahrain', 'Oman', 'Yemen', 'Jordan', 'Lebanon', 'Syria', 'Israel', 'Palestine', 'Cyprus', 'Turkey', 'Georgia', 'Armenia', 'Azerbaijan']
  };

  // Currency mapping (same as summary page)
  const countryCurrencyMap: Record<string, string> = {
    'United States': 'USD',
    'Canada': 'CAD',
    'United Kingdom': 'GBP',
    'Germany': 'EUR',
    'France': 'EUR',
    'Italy': 'EUR',
    'Spain': 'EUR',
    'Netherlands': 'EUR',
    'Belgium': 'EUR',
    'Switzerland': 'CHF',
    'Austria': 'EUR',
    'Sweden': 'SEK',
    'Norway': 'NOK',
    'Denmark': 'DKK',
    'Finland': 'EUR',
    'Poland': 'PLN',
    'Czech Republic': 'CZK',
    'Hungary': 'HUF',
    'Romania': 'RON',
    'Bulgaria': 'BGN',
    'Greece': 'EUR',
    'Portugal': 'EUR',
    'Ireland': 'EUR',
    'South Africa': 'ZAR',
    'Nigeria': 'NGN',
    'Kenya': 'KES',
    'Egypt': 'EGP',
    'Morocco': 'MAD',
    'Tunisia': 'TND',
    'Algeria': 'DZD',
    'Ghana': 'GHS',
    'Ethiopia': 'ETB',
    'Uganda': 'UGX',
    'Tanzania': 'TZS',
    'Zimbabwe': 'ZWL',
    'Botswana': 'BWP',
    'Namibia': 'NAD',
    'Zambia': 'ZMW',
    'Malawi': 'MWK',
    'Mozambique': 'MZN',
    'Angola': 'AOA',
    'Congo': 'CDF',
    'Cameroon': 'XAF',
    'Senegal': 'XOF',
    'Ivory Coast': 'XOF',
    'Mali': 'XOF',
    'Burkina Faso': 'XOF',
    'Niger': 'XOF',
    'Chad': 'XAF',
    'Sudan': 'SDG',
    'South Sudan': 'SSP',
    'Central African Republic': 'XAF',
    'Gabon': 'XAF',
    'Equatorial Guinea': 'XAF',
    'Sao Tome and Principe': 'STD',
    'Cape Verde': 'CVE',
    'Guinea-Bissau': 'XOF',
    'Guinea': 'GNF',
    'Sierra Leone': 'SLL',
    'Liberia': 'LRD',
    'Togo': 'XOF',
    'Benin': 'XOF',
    'Mauritania': 'MRU',
    'Western Sahara': 'MAD',
    'Djibouti': 'DJF',
    'Eritrea': 'ERN',
    'Somalia': 'SOS',
    'Comoros': 'KMF',
    'Seychelles': 'SCR',
    'Mauritius': 'MUR',
    'Madagascar': 'MGA',
    'Reunion': 'EUR',
    'Mayotte': 'EUR',
    'China': 'CNY',
    'Japan': 'JPY',
    'South Korea': 'KRW',
    'India': 'INR',
    'Australia': 'AUD',
    'New Zealand': 'NZD',
    'Singapore': 'SGD',
    'Malaysia': 'MYR',
    'Thailand': 'THB',
    'Vietnam': 'VND',
    'Philippines': 'PHP',
    'Indonesia': 'IDR',
    'Taiwan': 'TWD',
    'Hong Kong': 'HKD',
    'Macau': 'MOP',
    'Pakistan': 'PKR',
    'Bangladesh': 'BDT',
    'Sri Lanka': 'LKR',
    'Nepal': 'NPR',
    'Bhutan': 'BTN',
    'Maldives': 'MVR',
    'Myanmar': 'MMK',
    'Cambodia': 'KHR',
    'Laos': 'LAK',
    'Brunei': 'BND',
    'Papua New Guinea': 'PGK',
    'Fiji': 'FJD',
    'Vanuatu': 'VUV',
    'Solomon Islands': 'SBD',
    'New Caledonia': 'XPF',
    'French Polynesia': 'XPF',
    'Samoa': 'WST',
    'Tonga': 'TOP',
    'Kiribati': 'AUD',
    'Tuvalu': 'AUD',
    'Nauru': 'AUD',
    'Palau': 'USD',
    'Micronesia': 'USD',
    'Marshall Islands': 'USD',
    'Timor-Leste': 'USD',
    'Mongolia': 'MNT',
    'Kazakhstan': 'KZT',
    'Uzbekistan': 'UZS',
    'Kyrgyzstan': 'KGS',
    'Tajikistan': 'TJS',
    'Turkmenistan': 'TMT',
    'Afghanistan': 'AFN',
    'Iran': 'IRR',
    'Iraq': 'IQD',
    'Saudi Arabia': 'SAR',
    'United Arab Emirates': 'AED',
    'Qatar': 'QAR',
    'Kuwait': 'KWD',
    'Bahrain': 'BHD',
    'Oman': 'OMR',
    'Yemen': 'YER',
    'Jordan': 'JOD',
    'Lebanon': 'LBP',
    'Syria': 'SYP',
    'Israel': 'ILS',
    'Palestine': 'ILS',
    'Cyprus': 'EUR',
    'Turkey': 'TRY',
    'Georgia': 'GEL',
    'Armenia': 'AMD',
    'Azerbaijan': 'AZN',
    'Mexico': 'MXN'
  };

  const handleCountryChange = (val: string) => {
    setCountry(val);
    const newCurrency = countryCurrencyMap[val] || 'USD';
    setCurrency(newCurrency);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBoqFile(file);
      setError(null);
      setSuccess(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.includes('excel') || file.type.includes('spreadsheet') || file.name.match(/\.(xlsx|xls)$/i)) {
        setBoqFile(file);
        setError(null);
        setSuccess(null);
      } else {
        setError('Please upload a valid Excel file (.xlsx or .xls)');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!boqFile) {
      setError('Please upload a BOQ file');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Use the proper excelParser function
      const parseResult: ExcelParseResult = await parseExcelFile(boqFile, region, country, currency);
      
      console.log('BOQ parsing result:', parseResult);
      
      // Auto-populate costs from the parsed result
      if (parseResult.labourCost > 0) {
        setLabourCost(parseResult.labourCost.toString());
      }
      if (parseResult.miscellaneousCost > 0) {
        setMiscCost(parseResult.miscellaneousCost.toString());
      }
      
      // Check for existing projects to prevent duplicates
      console.log('Checking for existing projects...');
      const existingProjectsResponse = await apiService.getProjects({
        filters: {
          project_name: { $eq: projectName },
          region: { $eq: region },
          country: { $eq: country }
        }
      });
      
      const existingProjects = existingProjectsResponse.data.data || [];
      if (existingProjects.length > 0) {
        setError(`Project "${projectName}" already exists in ${region}/${country}. Please use a different project name.`);
        setLoading(false);
        return;
      }

      // Calculate total project cost for BOQ
      const totalHardwareCost = parseResult.roomTypes.reduce((sum: number, room: any) => sum + (room.total_cost || 0), 0);
      const totalCapex = totalHardwareCost + parseResult.labourCost + parseResult.miscellaneousCost;

      // Create project for BOQ (uses extracted costs)
      const projectData = {
        project_name: projectName,
        region,
        country,
        currency,
        capex_amount: parseFloat(capex) || 0, // Use manual input, not calculated total
        network_cost: parseFloat(networkCost) || 0,
        labour_cost: parseResult.labourCost > 0 ? parseResult.labourCost : parseFloat(labourCost) || 0,
        inflation: parseFloat(inflation) || 0,
        misc_cost: parseResult.miscellaneousCost > 0 ? parseResult.miscellaneousCost : parseFloat(miscCost) || 0,
        notes: `Project created from BOQ file. Total hardware cost: ${totalHardwareCost}, Labour: ${parseResult.labourCost}, Misc: ${parseResult.miscellaneousCost}`
      };

      console.log('Creating project with data:', projectData);
      const projectResponse = await apiService.createProject(projectData);
      const createdProject = projectResponse.data.data;

      console.log('Project created successfully:', createdProject);
      
      // Store project data
      const projectDataForStorage = {
        region,
        country,
        projectName,
        currency,
        capex,
        networkCost,
        labourCost: parseResult.labourCost > 0 ? parseResult.labourCost.toString() : labourCost,
        miscCost: parseResult.miscellaneousCost > 0 ? parseResult.miscellaneousCost.toString() : miscCost,
        inflation,
        boqFile: boqFile.name,
        components: parseResult.roomTypes.flatMap(room => room.components),
        roomTypes: parseResult.roomTypes,
        projectId: createdProject.id
      };
      
      // Store data in the format expected by room-types page
      sessionStorage.setItem('dataInputProjectData', JSON.stringify(projectDataForStorage));
      sessionStorage.setItem('excelParseResult', JSON.stringify(parseResult));
      
      console.log('Project data stored with BOQ parsing results');
      setSuccess('Project created successfully! Redirecting to room setup...');
      
      // Navigate to room types page with project ID
      setTimeout(() => {
        router.push(`/room-types?projectId=${createdProject.id}&projectName=${encodeURIComponent(projectName)}`);
      }, 2000);
      
    } catch (error) {
      console.error('Error processing BOQ file:', error);
      setError('Failed to process BOQ file: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Data Input - BOQ Upload</h1>
              <p className="text-gray-600 mt-2">Upload completed project BOQ to create room types and components</p>
            </div>
            <Link 
              href="/"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Completed Project Information</h2>
              <p className="text-gray-600">
                Enter details about the completed project and upload the BOQ file to create room types, AV components, and transactional records.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Project Details - Same as summary page */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                  >
                    <option value="">Select Region</option>
                    {Object.keys(regionMap).map((reg) => (
                      <option key={reg} value={reg}>{reg}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <select
                    value={country}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                    disabled={!region}
                  >
                    <option value="">Select Country</option>
                    {(regionMap[region] || []).map((ct: string) => (
                      <option key={ct} value={ct}>{ct}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                    placeholder="e.g., London Q1 Expansion"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Local Currency</label>
                  <input
                    type="text"
                    value={currency}
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Approved IT Capex Amount</label>
                  <input
                    type="number"
                    value={capex}
                    onChange={(e) => setCapex(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Network Cost</label>
                  <input
                    type="number"
                    value={networkCost}
                    onChange={(e) => setNetworkCost(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Labour Cost</label>
                  <input
                    type="number"
                    value={labourCost}
                    onChange={(e) => setLabourCost(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                    placeholder="Enter labour cost amount"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Miscellaneous Cost</label>
                  <input
                    type="number"
                    value={miscCost}
                    onChange={(e) => setMiscCost(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Inflation Rate (%)</label>
                  <input
                    type="number"
                    value={inflation}
                    onChange={(e) => setInflation(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                  />
                </div>
              </div>

              {/* BOQ File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  BOQ File Upload *
                </label>
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="boq-file-upload"
                  />
                  <label htmlFor="boq-file-upload" className="cursor-pointer">
                    <div className="space-y-2">
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium text-green-600 hover:text-green-500">
                          Click to upload
                        </span>{' '}
                        or drag and drop
                      </div>
                      <p className="text-xs text-gray-500">Excel files only (.xlsx, .xls)</p>
                    </div>
                  </label>
                </div>
                {boqFile && (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected file: {boqFile.name}
                  </p>
                )}
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Success Display */}
              {success && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <p className="text-sm text-green-600">{success}</p>
                  <div className="mt-3">
                    <button
                      onClick={() => {
                        const storedData = sessionStorage.getItem('dataInputProjectData');
                        if (storedData) {
                          const data = JSON.parse(storedData);
                          router.push(`/room-types?projectId=${data.projectId}&projectName=${encodeURIComponent(projectName)}`);
                        } else {
                          router.push('/room-types');
                        }
                      }}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                    >
                      Continue to Room Setup
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 pt-6 border-t">
                <Link
                  href="/"
                  className="px-6 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : 'Continue to Room Setup'}
                </button>
              </div>
            </form>
          </div>

          {/* Info Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="font-semibold text-blue-900">AV Components</h3>
              </div>
              <p className="text-sm text-blue-700">
                Create or update AV component catalog with make, model, and specifications from BOQ.
              </p>
            </div>

            <div className="bg-purple-50 p-6 rounded-lg">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="font-semibold text-purple-900">Room Types</h3>
              </div>
              <p className="text-sm text-purple-700">
                Define room types and their standard AV configurations from completed projects.
              </p>
            </div>

            <div className="bg-orange-50 p-6 rounded-lg">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-orange-900">Transactions</h3>
              </div>
              <p className="text-sm text-orange-700">
                Record room instances and AV-BOQ data for completed projects.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 