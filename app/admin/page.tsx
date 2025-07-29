'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchAllPages, apiService } from '../lib/api';
import { autoCategorizeComponents, analyzeComponentData, enhancedCategorizeComponents } from '../lib/mlService';

// API function to update component categorization
const updateComponentCategorization = async (componentId: string, type: string, category: string) => {
  try {
    console.log('Updating component:', { componentId, type, category });
    
    const result = await apiService.updateAVComponent(componentId, {
      component_type: type,
      component_category: category
    });
    
    console.log('Component updated successfully:', result);
    return result;
  } catch (error) {
    console.error('Error updating component:', error);
    console.error('Component ID used:', componentId);
    throw error;
  }
};

// Manual Review Item Component
const ManualReviewItem = ({ item, onCategorize }: { item: any; onCategorize: (componentId: string, type: string, category: string, confidence: number, notes?: string) => void }) => {
  const [selectedType, setSelectedType] = useState(item.suggested_type || 'Uncategorized');
  const [selectedCategory, setSelectedCategory] = useState(item.suggested_category || 'Uncategorized');
  const [confidence, setConfidence] = useState(80);
  const [notes, setNotes] = useState('');
  const [showForm, setShowForm] = useState(false);

  const types = [
    'Audio', 'Video', 'Control', 'Cabling', 'Mounting', 'Network', 'Power', 
    'Lighting', 'Rack & Enclosures', 'Tools & Accessories', 'Uncategorized'
  ];

  const getSubCategories = (type: string) => {
    const subCategoriesMap: { [key: string]: string[] } = {
      'Audio': ['Speakers', 'Microphones', 'Amplifiers', 'Mixers', 'Processors', 'Accessories'],
      'Video': ['Displays', 'Projectors', 'Cameras', 'Recorders'],
      'Control': ['Controllers', 'Switches', 'Touch Panels', 'Software'],
      'Cabling': ['Video Cables', 'Audio Cables', 'Network Cables', 'Power Cables'],
      'Mounting': ['Wall Mounts', 'Ceiling Mounts', 'Floor Stands', 'Rack Mounts'],
      'Network': ['Switches', 'Routers', 'Wireless', 'Network Tools'],
      'Power': ['UPS Systems', 'Power Supplies', 'PDUs', 'Batteries'],
      'Lighting': ['LED Lights', 'Controls', 'Accessories'],
      'Rack & Enclosures': ['Racks', 'Enclosures', 'Accessories'],
      'Tools & Accessories': ['Adapters', 'Splitters', 'Extenders', 'Tools'],
      'Uncategorized': ['Uncategorized']
    };
    return subCategoriesMap[type] || ['Uncategorized'];
  };

  const handleSubmit = () => {
    onCategorize(item.component_id, selectedType, selectedCategory, confidence, notes);
    setShowForm(false);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{item.description || 'No description'}</h4>
          <p className="text-sm text-gray-600 mt-1">
            {item.make} {item.model}
          </p>
          <div className="flex items-center space-x-4 mt-2">
            <span className="text-sm text-gray-500">Current: {item.current_type} / {item.current_category}</span>
            <span className="text-sm text-yellow-600 font-medium">Suggested: {item.suggested_type} / {item.suggested_category}</span>
            <span className="text-sm text-red-600 font-medium">Confidence: {item.confidence}%</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">{item.reasoning}</p>
        </div>
        <div className="flex space-x-2 ml-4">
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            {showForm ? 'Cancel' : 'Categorize'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="border-t pt-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type (Main Category)</label>
              <select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setSelectedCategory('Uncategorized'); // Reset sub-category when type changes
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {types.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category (Sub-Category)</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {getSubCategories(selectedType).map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confidence (%)</label>
              <input
                type="range"
                min="0"
                max="100"
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
                className="w-full"
              />
              <div className="text-sm text-gray-600 mt-1">{confidence}%</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
              <input
                type="text"
                placeholder="Research notes, reasoning..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Save Categorization
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function AdminPage() {
  const [componentAnalysis, setComponentAnalysis] = useState<any>(null);
  const [enhancedCategorization, setEnhancedCategorization] = useState<any>(null);
  const [mlTrainingResults, setMlTrainingResults] = useState<any>(null);
  const [mlTrainingLoading, setMlTrainingLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'analysis' | 'high-confidence' | 'manual-review'>('analysis');
  const [reviewedItems, setReviewedItems] = useState<Set<string>>(new Set());
  const [manualReviewFilter, setManualReviewFilter] = useState('');
  const [manualReviewCategory, setManualReviewCategory] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [editModal, setEditModal] = useState<{show: boolean, item: any, newType: string, newCategory: string} | null>(null);

  useEffect(() => {
    // Auto-run analysis on page load
    handleComponentAnalysis();
  }, []);

  // Comprehensive Component Analysis
  const handleComponentAnalysis = async () => {
    setAnalysisLoading(true);
    try {
      const avComponents = await fetchAllPages('/av-components');
      
      // Step 1: Analyze current data quality
      const analysis = await analyzeComponentData(avComponents);
      setComponentAnalysis(analysis);
      
      // Step 2: Enhanced categorization
      const categorization = await enhancedCategorizeComponents(avComponents);
      setEnhancedCategorization(categorization);
      
      console.log('Component analysis completed:', { analysis, categorization });
    } catch (error) {
      console.error('Component analysis error:', error);
      setError('Failed to analyze components. Please try again.');
    } finally {
      setAnalysisLoading(false);
      setLoading(false);
    }
  };

  // ML Training for uncategorized components
  const handleMLTraining = async () => {
    setMlTrainingLoading(true);
    try {
      const avComponents = await fetchAllPages('/av-components');
      const results = await autoCategorizeComponents(avComponents);
      setMlTrainingResults(results);
      console.log('ML Training completed:', results);
    } catch (error) {
      console.error('ML Training error:', error);
      setError('Failed to run ML training. Please try again.');
    } finally {
      setMlTrainingLoading(false);
    }
  };

  // Review functions
  const handleHighConfidenceReview = async (componentId: string, action: 'accept' | 'reject' | 'edit', newType?: string, newCategory?: string) => {
    try {
      if (action === 'accept') {
        // Find the component to get its suggested categorization
        const component = enhancedCategorization?.high_confidence_suggestions?.find((item: any) => item.component_id === componentId);
        if (component) {
          await updateComponentCategorization(componentId, component.suggested_type, component.suggested_category);
        }
      } else if (action === 'edit' && newType && newCategory) {
        await updateComponentCategorization(componentId, newType, newCategory);
      }
      // For 'reject', we don't update the database - just mark as reviewed
      
      setReviewedItems(prev => new Set([...prev, componentId]));
      console.log('High confidence review completed:', { componentId, action, newType, newCategory });
    } catch (error) {
      console.error('Error in high confidence review:', error);
      alert('Failed to update component. Please try again.');
    }
  };

  const handleManualReviewCategorization = async (componentId: string, type: string, category: string, confidence: number, notes?: string) => {
    try {
      await updateComponentCategorization(componentId, type, category);
      setReviewedItems(prev => new Set([...prev, componentId]));
      console.log('Manual review categorization completed:', { componentId, type, category, confidence, notes });
    } catch (error) {
      console.error('Error in manual review categorization:', error);
      alert('Failed to update component. Please try again.');
    }
  };

  const getFilteredManualReviewItems = () => {
    if (!enhancedCategorization?.needs_manual_review) return [];
    
    return enhancedCategorization.needs_manual_review.filter((item: any) => {
      const matchesFilter = !manualReviewFilter || 
        item.description?.toLowerCase().includes(manualReviewFilter.toLowerCase()) ||
        item.make?.toLowerCase().includes(manualReviewFilter.toLowerCase()) ||
        item.model?.toLowerCase().includes(manualReviewFilter.toLowerCase());
      
      const matchesCategory = !manualReviewCategory || item.suggested_type === manualReviewCategory;
      
      return matchesFilter && matchesCategory;
    });
  };

  const getSubCategories = (type: string) => {
    const subCategoriesMap: { [key: string]: string[] } = {
      'Audio': ['Speakers', 'Microphones', 'Amplifiers', 'Mixers', 'Processors', 'Accessories'],
      'Video': ['Displays', 'Projectors', 'Cameras', 'Recorders'],
      'Control': ['Controllers', 'Switches', 'Touch Panels', 'Software'],
      'Cabling': ['Video Cables', 'Audio Cables', 'Network Cables', 'Power Cables'],
      'Mounting': ['Wall Mounts', 'Ceiling Mounts', 'Floor Stands', 'Rack Mounts'],
      'Network': ['Switches', 'Routers', 'Wireless', 'Network Tools'],
      'Power': ['UPS Systems', 'Power Supplies', 'PDUs', 'Batteries'],
      'Lighting': ['LED Lights', 'Controls', 'Accessories'],
      'Rack & Enclosures': ['Racks', 'Enclosures', 'Accessories'],
      'Tools & Accessories': ['Adapters', 'Splitters', 'Extenders', 'Tools'],
      'Uncategorized': ['Uncategorized']
    };
    return subCategoriesMap[type] || ['Uncategorized'];
  };

  // Batch update function for efficiency
  const handleBatchUpdate = async (updates: Array<{componentId: string, type: string, category: string}>) => {
    setUpdating(true);
    setUpdateProgress(0);
    
    try {
      for (let i = 0; i < updates.length; i++) {
        const update = updates[i];
        await updateComponentCategorization(update.componentId, update.type, update.category);
        setUpdateProgress(((i + 1) / updates.length) * 100);
        
        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Refresh the analysis after batch update
      await handleComponentAnalysis();
      alert(`Successfully updated ${updates.length} components!`);
    } catch (error) {
      console.error('Batch update error:', error);
      alert('Some updates failed. Please check the console for details.');
    } finally {
      setUpdating(false);
      setUpdateProgress(0);
    }
  };

  // Refresh function to reload data
  const handleRefresh = async () => {
    setLoading(true);
    setReviewedItems(new Set());
    await handleComponentAnalysis();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">Component data management and analysis</p>
          </div>
          <Link href="/dashboard">
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </button>
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-600">Analyzing component data...</p>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-md mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('analysis')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'analysis'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Analysis Overview
              </button>
              {enhancedCategorization?.high_confidence_suggestions?.length > 0 && (
                <button
                  onClick={() => setActiveTab('high-confidence')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'high-confidence'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  High Confidence Review ({enhancedCategorization.high_confidence_suggestions.length})
                </button>
              )}
              {enhancedCategorization?.needs_manual_review?.length > 0 && (
                <button
                  onClick={() => setActiveTab('manual-review')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'manual-review'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Manual Review ({enhancedCategorization.needs_manual_review.length})
                </button>
              )}
            </nav>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Data Management Actions</h2>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Data
            </button>
          </div>
          
          {updating && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-800">Updating components...</span>
                <span className="text-sm text-blue-600">{Math.round(updateProgress)}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${updateProgress}%` }}></div>
              </div>
            </div>
          )}
          
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleComponentAnalysis}
              disabled={analysisLoading}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 shadow-lg transition-colors"
            >
              {analysisLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Re-analyze Components
                </>
              )}
            </button>

            <button
              onClick={handleMLTraining}
              disabled={mlTrainingLoading}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 shadow-lg transition-colors"
            >
              {mlTrainingLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Training...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Run ML Training
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'analysis' && componentAnalysis && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Data Quality Analysis</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">{componentAnalysis.total_components}</div>
                <div className="text-sm text-gray-600">Total Components</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">{componentAnalysis.data_quality_score.toFixed(1)}%</div>
                <div className="text-sm text-gray-600">Data Quality Score</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-3xl font-bold text-red-600">{componentAnalysis.uncategorized}</div>
                <div className="text-sm text-gray-600">Uncategorized</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-3xl font-bold text-orange-600">{componentAnalysis.missing_descriptions}</div>
                <div className="text-sm text-gray-600">Missing Descriptions</div>
              </div>
            </div>
            
            {componentAnalysis.recommendations.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-800 mb-3">Recommendations:</h4>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-2">
                  {componentAnalysis.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="bg-gray-50 p-2 rounded">{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analysis' && enhancedCategorization && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Enhanced Categorization Results</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">{enhancedCategorization.high_confidence_suggestions.length}</div>
                <div className="text-sm text-gray-600">High Confidence Suggestions</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-3xl font-bold text-yellow-600">{enhancedCategorization.needs_manual_review.length}</div>
                <div className="text-sm text-gray-600">Need Manual Review</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">{Object.keys(enhancedCategorization.categorization_summary).length}</div>
                <div className="text-sm text-gray-600">Categories Found</div>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <h4 className="font-semibold text-gray-800 mb-3">Type Breakdown:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {Object.entries(enhancedCategorization.categorization_summary.by_type)
                  .sort(([,a], [,b]) => Number(b) - Number(a))
                  .map(([type, count]: [string, any]) => (
                    <div key={type} className="bg-gray-50 p-3 rounded text-center">
                      <div className="font-semibold text-gray-800">{type}</div>
                      <div className="text-sm text-gray-600">{count} components</div>
                    </div>
                  ))}
              </div>
              
              <h4 className="font-semibold text-gray-800 mb-3">Sub-Category Breakdown:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(enhancedCategorization.categorization_summary.by_category)
                  .sort(([,a], [,b]) => Number(b) - Number(a))
                  .slice(0, 12) // Show top 12 sub-categories
                  .map(([category, count]: [string, any]) => (
                    <div key={category} className="bg-blue-50 p-3 rounded text-center">
                      <div className="font-semibold text-blue-800">{category}</div>
                      <div className="text-sm text-blue-600">{count} components</div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* High Confidence Review Tab */}
        {activeTab === 'high-confidence' && enhancedCategorization && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">High Confidence Suggestions Review</h3>
              <div className="text-sm text-gray-600">
                {reviewedItems.size} of {enhancedCategorization.high_confidence_suggestions.length} reviewed
              </div>
            </div>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {enhancedCategorization.high_confidence_suggestions
                .filter((item: any) => !reviewedItems.has(item.component_id))
                .map((item: any, index: number) => (
                  <div key={item.component_id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.description || 'No description'}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {item.make} {item.model}
                        </p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="text-sm text-gray-500">Current: {item.current_type} / {item.current_category}</span>
                          <span className="text-sm text-blue-600 font-medium">→ Suggested: {item.suggested_type} / {item.suggested_category}</span>
                          <span className="text-sm text-green-600 font-medium">Confidence: {item.confidence}%</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{item.reasoning}</p>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleHighConfidenceReview(item.component_id, 'accept')}
                          className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleHighConfidenceReview(item.component_id, 'reject')}
                          className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => {
                            setEditModal({
                              show: true,
                              item,
                              newType: item.suggested_type,
                              newCategory: item.suggested_category
                            });
                          }}
                          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              
              {enhancedCategorization.high_confidence_suggestions
                .filter((item: any) => reviewedItems.has(item.component_id)).length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-800 mb-3">Reviewed Items</h4>
                  <div className="space-y-2">
                    {enhancedCategorization.high_confidence_suggestions
                      .filter((item: any) => reviewedItems.has(item.component_id))
                      .map((item: any) => (
                        <div key={item.component_id} className="bg-gray-50 p-3 rounded text-sm">
                          <span className="font-medium">{item.description}</span>
                          <span className="text-gray-600 ml-2">→ {item.suggested_type}</span>
                          <span className="text-green-600 ml-2">✓ Reviewed</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Manual Review Tab */}
        {activeTab === 'manual-review' && enhancedCategorization && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">Manual Review Interface</h3>
              <div className="text-sm text-gray-600">
                {reviewedItems.size} of {enhancedCategorization.needs_manual_review.length} reviewed
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Search by description, make, or model..."
                  value={manualReviewFilter}
                  onChange={(e) => setManualReviewFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Suggested Category</label>
                <select
                  value={manualReviewCategory}
                  onChange={(e) => setManualReviewCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Categories</option>
                  {Array.from(new Set(enhancedCategorization.needs_manual_review.map((item: any) => item.suggested_type)) as Set<string>).map((category: string) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setManualReviewFilter('');
                    setManualReviewCategory('');
                  }}
                  className="px-4 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {getFilteredManualReviewItems()
                .filter((item: any) => !reviewedItems.has(item.component_id))
                .map((item: any, index: number) => (
                  <ManualReviewItem
                    key={item.component_id}
                    item={item}
                    onCategorize={handleManualReviewCategorization}
                  />
                ))}
            </div>
          </div>
        )}

        {/* ML Training Results */}
        {mlTrainingResults && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">ML Training Results</h3>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Summary</h4>
                <p className="text-blue-700">{mlTrainingResults.message}</p>
              </div>
              
              {mlTrainingResults.suggestions && mlTrainingResults.suggestions.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">High Confidence Suggestions ({mlTrainingResults.suggestions.length}):</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {mlTrainingResults.suggestions.map((suggestion: any, index: number) => (
                      <div key={index} className="bg-gray-50 p-3 rounded border-l-4 border-green-500">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-gray-800">
                              {suggestion.current_type} → {suggestion.suggested_type}
                            </div>
                            <div className="text-sm text-gray-600">{suggestion.description}</div>
                            <div className="text-xs text-gray-500">{suggestion.reasoning}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-green-600">{suggestion.confidence}%</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Edit Modal for High Confidence Items */}
        {editModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Edit Categorization</h3>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>{editModal.item.description}</strong><br/>
                  {editModal.item.make} {editModal.item.model}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type (Main Category)</label>
                  <select
                    value={editModal.newType}
                    onChange={(e) => {
                      setEditModal({
                        ...editModal,
                        newType: e.target.value,
                        newCategory: 'Uncategorized' // Reset sub-category when type changes
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Audio">Audio</option>
                    <option value="Video">Video</option>
                    <option value="Control">Control</option>
                    <option value="Cabling">Cabling</option>
                    <option value="Mounting">Mounting</option>
                    <option value="Network">Network</option>
                    <option value="Power">Power</option>
                    <option value="Lighting">Lighting</option>
                    <option value="Rack & Enclosures">Rack & Enclosures</option>
                    <option value="Tools & Accessories">Tools & Accessories</option>
                    <option value="Uncategorized">Uncategorized</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category (Sub-Category)</label>
                  <select
                    value={editModal.newCategory}
                    onChange={(e) => {
                      setEditModal({
                        ...editModal,
                        newCategory: e.target.value
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {getSubCategories(editModal.newType).map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setEditModal(null)}
                  className="px-4 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await handleHighConfidenceReview(
                      editModal.item.component_id, 
                      'edit', 
                      editModal.newType, 
                      editModal.newCategory
                    );
                    setEditModal(null);
                  }}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 