'use client';

import { useState, useEffect } from 'react';
import { 
  categorizeComponents, 
  addLearningFeedback, 
  getLearningStats,
  forceRetrainModel,
  clearLearningData,
  debugMLState
} from '../lib/mlService';

// Component for updating component categorization
const updateComponentCategorization = async (componentId: string, type: string, category: string) => {
  try {
    const response = await fetch(`https://backend.sandyy.dev/api/av-components/${componentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          component_type: type,
          component_category: category
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to update component: ${response.statusText}`);
    }

    console.log('✅ Component updated successfully:', componentId);
    return true;
  } catch (error) {
    console.error('❌ Error updating component:', error);
    throw error;
  }
};

// Component for manual categorization
const ManualCategorizationItem = ({ 
  item, 
  onCategorize 
}: { 
  item: any; 
  onCategorize: (componentId: string, type: string, category: string, region?: string) => void 
}) => {
  const [type, setType] = useState(item.currentType || '');
  const [category, setCategory] = useState(item.currentCategory || '');
  const [region, setRegion] = useState('India'); // Default region
  const [isSubmitting, setIsSubmitting] = useState(false);

  const componentTypes = [
    'Audio', 'Video', 'Control', 'Switcher', 'Cabling', 'Mounting', 
    'Network', 'Power', 'Lighting', 'Rack & Enclosures', 'Tools & Accessories',
    'Video Codec', 'PC', 'USB', 'VC', 'VC Unit', 'Radio'
  ];

  const getSubCategories = (selectedType: string) => {
    const subCategories: { [key: string]: string[] } = {
      'Audio': ['Speakers', 'Microphones', 'Amplifiers', 'Mixers', 'Processors', 'Accessories'],
      'Video': ['Displays', 'Projectors', 'Cameras', 'Recorders'],
      'Control': ['Controllers', 'Touch Panels', 'Software'],
      'Switcher': ['Video Switchers', 'Audio Switchers', 'Matrix Switchers', 'Distribution Amplifiers'],
      'Cabling': ['Video Cables', 'Audio Cables', 'Network Cables', 'Power Cables'],
      'Mounting': ['Wall Mounts', 'Ceiling Mounts', 'Floor Stands', 'Rack Mounts'],
      'Network': ['Switches', 'Routers', 'Wireless', 'Network Tools'],
      'Power': ['UPS Systems', 'Power Supplies', 'PDUs', 'Batteries'],
      'Lighting': ['LED Lights', 'Controls', 'Accessories'],
      'Rack & Enclosures': ['Racks', 'Enclosures', 'Accessories'],
      'Tools & Accessories': ['Adapters', 'Splitters', 'Extenders', 'Tools']
    };
    
    return subCategories[selectedType] || ['General'];
  };

  const handleSubmit = async () => {
    if (!type || !category) {
      alert('Please select both type and category');
      return;
    }

    setIsSubmitting(true);
    try {
      await onCategorize(item.componentId, type, category, region);
      setType('');
      setCategory('');
    } catch (error) {
      console.error('Error categorizing component:', error);
      alert('Failed to categorize component. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
      <div className="mb-3">
        <h4 className="font-medium text-gray-900">{item.description}</h4>
        <p className="text-sm text-gray-600">{item.make} {item.model}</p>
        <p className="text-xs text-gray-500">ID: {item.componentId}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select Type</option>
            {componentTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
            <option value="Custom">Custom</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select Category</option>
            {getSubCategories(type).map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
            <option value="Custom">Custom</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="India">India</option>
            <option value="US">United States</option>
            <option value="Europe">Europe</option>
            <option value="Korea">Korea</option>
            <option value="APAC">APAC</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Categorizing...' : 'Categorize'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function AdminPage() {
  const [components, setComponents] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [learningStats, setLearningStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [retraining, setRetraining] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'suggestions' | 'manual'>('overview');
  const [region, setRegion] = useState('India');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadComponents();
    loadLearningStats();
  }, []);

  const loadComponents = async () => {
    try {
      const response = await fetch('/api/av-components');
      const data = await response.json();
      setComponents(data.data || []);
    } catch (error) {
      console.error('Error loading components:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLearningStats = () => {
    const stats = getLearningStats();
    setLearningStats(stats);
  };

  const analyzeComponents = async () => {
    setAnalyzing(true);
    try {
      console.log('🎯 Starting component analysis...');
      const results = await categorizeComponents(components, region);
      setSuggestions(results);
      console.log('✅ Analysis completed:', results.length, 'suggestions');
    } catch (error) {
      console.error('❌ Analysis error:', error);
      alert('Failed to analyze components. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSuggestionAction = async (componentId: string, action: 'accept' | 'reject' | 'edit', newType?: string, newCategory?: string) => {
    try {
      const suggestion = suggestions.find(s => s.componentId === componentId);
      if (!suggestion) return;

      let finalType = suggestion.suggestedType;
      let finalCategory = suggestion.suggestedCategory;

      if (action === 'edit' && newType && newCategory) {
        finalType = newType;
        finalCategory = newCategory;
      } else if (action === 'reject') {
        // Keep current categorization
        finalType = suggestion.currentType;
        finalCategory = suggestion.currentCategory;
      }

      // Update component in database
      await updateComponentCategorization(componentId, finalType, finalCategory);

      // Store learning feedback
      const feedback = {
        componentId,
        originalSuggestion: {
          type: suggestion.suggestedType,
          category: suggestion.suggestedCategory,
          confidence: suggestion.confidence / 100
        },
        userCorrection: {
          type: finalType,
          category: finalCategory,
          action: action as 'accept' | 'reject' | 'edit'
        },
        componentData: {
          description: suggestion.description,
          make: suggestion.make,
          model: suggestion.model
        },
        region,
        timestamp: new Date()
      };

      addLearningFeedback(feedback);
      console.log('✅ Feedback stored for learning');

      // Remove from suggestions
      setSuggestions(prev => prev.filter(s => s.componentId !== componentId));
      
      // Reload learning stats
      loadLearningStats();
    } catch (error) {
      console.error('Error handling suggestion:', error);
      alert('Failed to process suggestion. Please try again.');
    }
  };

  const handleManualCategorization = async (componentId: string, type: string, category: string, region?: string) => {
    try {
      // Update component in database
      await updateComponentCategorization(componentId, type, category);

      // Find component data
      const component = components.find(c => (c.documentId || c.id) === componentId);
      if (component) {
        // Store learning feedback
        const feedback = {
          componentId,
          originalSuggestion: {
            type: 'Uncategorized',
            category: 'Uncategorized',
            confidence: 0
          },
          userCorrection: {
            type,
            category,
            action: 'edit' as const
          },
          componentData: {
            description: component.description || '',
            make: component.make || '',
            model: component.model || ''
          },
          region,
          timestamp: new Date()
        };

        addLearningFeedback(feedback);
        console.log('✅ Manual categorization feedback stored');
      }

      // Remove from components list (assuming it's now categorized)
      setComponents(prev => prev.filter(c => (c.documentId || c.id) !== componentId));
      
      // Reload learning stats
      loadLearningStats();
    } catch (error) {
      console.error('Error categorizing component:', error);
      throw error;
    }
  };

  const retrainModel = async () => {
    setRetraining(true);
    try {
      console.log('🔄 Retraining ML model...');
      forceRetrainModel();
      console.log('✅ Model retrained successfully');
      loadLearningStats();
    } catch (error) {
      console.error('❌ Retraining error:', error);
      alert('Failed to retrain model. Please try again.');
    } finally {
      setRetraining(false);
    }
  };

  const clearData = () => {
    if (confirm('Are you sure you want to clear all learning data? This cannot be undone.')) {
      clearLearningData();
      setSuggestions([]);
      loadLearningStats();
      alert('Learning data cleared successfully');
    }
  };

  const debugState = () => {
    debugMLState();
  };

  const getFilteredSuggestions = () => {
    return suggestions.filter(s => 
      s.description.toLowerCase().includes(filter.toLowerCase()) ||
      s.make.toLowerCase().includes(filter.toLowerCase()) ||
      s.model.toLowerCase().includes(filter.toLowerCase())
    );
  };

  const getUncategorizedComponents = () => {
    return components.filter(c => 
      !c.component_type || 
      c.component_type === 'Uncategorized' || 
      c.component_type === 'AV Equipment' ||
      !c.component_category ||
      c.component_category === 'Uncategorized' ||
      c.component_category === 'AV Equipment'
    ).filter(c =>
      c.description?.toLowerCase().includes(filter.toLowerCase()) ||
      c.make?.toLowerCase().includes(filter.toLowerCase()) ||
      c.model?.toLowerCase().includes(filter.toLowerCase())
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading components...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Smart Component Categorization</h1>
          <p className="text-gray-600">ML-powered component categorization with regional optimization</p>
        </div>

        {/* Control Panel */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Region</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="India">India</option>
                <option value="US">United States</option>
                <option value="Europe">Europe</option>
                <option value="Korea">Korea</option>
                <option value="APAC">APAC</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={analyzeComponents}
                disabled={analyzing}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {analyzing ? 'Analyzing...' : '🎯 Analyze Components'}
              </button>
            </div>

            <div className="flex items-end">
              <button
                onClick={retrainModel}
                disabled={retraining}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {retraining ? 'Retraining...' : '🔄 Retrain Model'}
              </button>
            </div>

            <div className="flex items-end space-x-2">
              <button
                onClick={debugState}
                className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
              >
                🐛 Debug
              </button>
              <button
                onClick={clearData}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
              >
                🗑️ Clear
              </button>
            </div>
          </div>

          {/* Learning Stats */}
          {learningStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{learningStats.totalFeedback}</div>
                <div className="text-sm text-gray-600">Total Feedback</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{learningStats.accepts}</div>
                <div className="text-sm text-gray-600">Accepted</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{learningStats.corrections}</div>
                <div className="text-sm text-gray-600">Corrected</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{learningStats.modelVersion?.split('.').length || 0}</div>
                <div className="text-sm text-gray-600">Model Version</div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📊 Overview
              </button>
              <button
                onClick={() => setActiveTab('suggestions')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'suggestions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🎯 ML Suggestions ({suggestions.length})
              </button>
              <button
                onClick={() => setActiveTab('manual')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'manual'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                ✏️ Manual Categorization ({getUncategorizedComponents().length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Filter */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="Filter by description, make, or model..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Component Analysis Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{components.length}</div>
                    <div className="text-sm text-gray-600">Total Components</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {components.filter(c => 
                        c.component_type && 
                        c.component_type !== 'Uncategorized' && 
                        c.component_type !== 'AV Equipment' &&
                        c.component_category && 
                        c.component_category !== 'Uncategorized' && 
                        c.component_category !== 'AV Equipment'
                      ).length}
                    </div>
                    <div className="text-sm text-gray-600">Categorized</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{getUncategorizedComponents().length}</div>
                    <div className="text-sm text-gray-600">Need Categorization</div>
                  </div>
                </div>
              </div>
            )}

            {/* Suggestions Tab */}
            {activeTab === 'suggestions' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">ML Suggestions</h3>
                {getFilteredSuggestions().length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No suggestions available. Run analysis to get ML suggestions.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {getFilteredSuggestions().map((suggestion) => (
                      <div key={suggestion.componentId} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{suggestion.description}</h4>
                            <p className="text-sm text-gray-600">{suggestion.make} {suggestion.model}</p>
                            <p className="text-xs text-gray-500">ID: {suggestion.componentId}</p>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-sm font-semibold text-green-600">{suggestion.confidence}%</div>
                            <div className="text-xs text-gray-500">Confidence</div>
                          </div>
                        </div>
                        
                        <div className="mb-3">
                          <div className="text-sm text-gray-700">
                            <span className="font-medium">Current:</span> {suggestion.currentType} → {suggestion.currentCategory}
                          </div>
                          <div className="text-sm text-blue-700">
                            <span className="font-medium">Suggested:</span> {suggestion.suggestedType} → {suggestion.suggestedCategory}
                          </div>
                          {suggestion.regionalOptimization && (
                            <div className="text-sm text-purple-700">
                              <span className="font-medium">Regional:</span> {suggestion.regionalOptimization.reason}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            <span className="font-medium">Reasoning:</span> {suggestion.reasoning.join(', ')}
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleSuggestionAction(suggestion.componentId, 'accept')}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                          >
                            ✅ Accept
                          </button>
                          <button
                            onClick={() => handleSuggestionAction(suggestion.componentId, 'reject')}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                          >
                            ❌ Reject
                          </button>
                          <button
                            onClick={() => {
                              const newType = prompt('Enter new type:', suggestion.suggestedType);
                              const newCategory = prompt('Enter new category:', suggestion.suggestedCategory);
                              if (newType && newCategory) {
                                handleSuggestionAction(suggestion.componentId, 'edit', newType, newCategory);
                              }
                            }}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                          >
                            ✏️ Edit
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Manual Categorization Tab */}
            {activeTab === 'manual' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Manual Categorization</h3>
                {getUncategorizedComponents().length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>All components are categorized! 🎉</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {getUncategorizedComponents().map((component) => (
                      <ManualCategorizationItem
                        key={component.documentId || component.id}
                        item={{
                          componentId: component.documentId || component.id,
                          description: component.description,
                          make: component.make,
                          model: component.model,
                          currentType: component.component_type,
                          currentCategory: component.component_category
                        }}
                        onCategorize={handleManualCategorization}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 