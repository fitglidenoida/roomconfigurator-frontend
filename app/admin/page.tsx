'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchAllPages } from '../lib/api';
import { 
  analyzeComponentData, 
  enhancedCategorizeComponentsWithLearning, 
  recategorizeWithLearning, 
  storeLearningFeedback, 
  getLearningStats,
  mlModel,
  debugMLState
} from '../lib/mlService';

// Update component categorization in database
const updateComponentCategorization = async (componentId: string, type: string, category: string) => {
  try {
    // Use the Strapi backend API directly
    const response = await fetch(`https://backend.sandyy.dev/api/av-components/${componentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
          body: JSON.stringify({
      data: {
        component_type: type,        // Main category (Audio, Video, Control, etc.)
        component_category: category // Sub-category (Speakers, Microphones, etc.)
      }
    })
    });

    if (!response.ok) {
      throw new Error(`Failed to update component: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating component:', error);
    throw error;
  }
};

// Manual review item component
const ManualReviewItem = ({ item, onCategorize }: { 
  item: any; 
  onCategorize: (componentId: string, type: string, category: string, confidence: number, notes?: string) => void 
}) => {
  const [selectedType, setSelectedType] = useState(item.component_type || 'Uncategorized');
  const [selectedCategory, setSelectedCategory] = useState(item.component_category || 'Uncategorized');
  const [customType, setCustomType] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [notes, setNotes] = useState('');

  const getSubCategories = (type: string) => {
    const subCategories: { [key: string]: string[] } = {
      'Audio': ['Speakers', 'Microphones', 'Amplifiers', 'Mixers', 'Processors', 'Audio Interfaces', 'Headphones', 'Audio Cables', 'Audio Converters'],
      'Video': ['Displays', 'Cameras', 'Projectors', 'Switchers', 'Processors', 'Video Cables', 'Scalers', 'Video Interfaces', 'Video Converters'],
      'Control': ['Touch Panels', 'Keypads', 'Controllers', 'Software', 'Control Systems', 'Programming Tools', 'Control Interfaces'],
      'Switcher': ['Matrix Switchers', 'Distribution Amplifiers', 'Scalers', 'Video Switchers', 'Audio Switchers', 'HDMI Switchers'],
      'Cabling': ['Cables', 'Connectors', 'Adapters', 'Patch Panels', 'Cable Management', 'Termination Tools', 'Cable Testers'],
      'Mounting': ['Mounts', 'Brackets', 'Hardware', 'Tools', 'Ceiling Mounts', 'Wall Mounts', 'Rack Mounts', 'Floor Stands'],
      'Network': ['Switches', 'Routers', 'Access Points', 'Cables', 'Network Cards', 'Network Tools', 'Network Converters'],
      'Power': ['Power Supplies', 'UPS', 'Distribution', 'Cables', 'Power Strips', 'Power Management', 'Power Converters'],
      'Lighting': ['Fixtures', 'Controllers', 'Dimmers', 'Cables', 'LED Systems', 'Lighting Control', 'Lighting Accessories'],
      'Rack & Enclosures': ['Racks', 'Enclosures', 'Shelves', 'Hardware', 'Rack Accessories', 'Cable Management', 'Rack Cooling'],
      'Tools & Accessories': ['Tools', 'Test Equipment', 'Accessories', 'Installation Tools', 'Maintenance Tools', 'Calibration Tools'],
      'Uncategorized': ['Uncategorized'],
      'Custom': ['Custom']
    };
    return subCategories[type] || ['Uncategorized'];
  };

  const handleSubmit = () => {
    const finalType = selectedType === 'Custom' ? customType : selectedType;
    const finalCategory = selectedCategory === 'Custom' ? customCategory : selectedCategory;
    
    if (!finalType || !finalCategory) {
      alert('Please select or enter both type and category');
      return;
    }
    
    onCategorize(item.documentId || item.id, finalType, finalCategory, 100, notes);
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{item.description}</h4>
          <p className="text-sm text-gray-600">{item.make} {item.model}</p>
          <p className="text-xs text-gray-500">ID: {item.documentId || item.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type (Main Category)</label>
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setSelectedCategory('Uncategorized');
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="Audio">Audio</option>
            <option value="Video">Video</option>
            <option value="Control">Control</option>
            <option value="Switcher">Switcher</option>
            <option value="Cabling">Cabling</option>
            <option value="Mounting">Mounting</option>
            <option value="Network">Network</option>
            <option value="Power">Power</option>
            <option value="Lighting">Lighting</option>
            <option value="Rack & Enclosures">Rack & Enclosures</option>
            <option value="Tools & Accessories">Tools & Accessories</option>
            <option value="Uncategorized">Uncategorized</option>
            <option value="Custom">Custom</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category (Sub-Category)</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {getSubCategories(selectedType).map((category: string) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedType === 'Custom' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Custom Type</label>
          <input
            type="text"
            value={customType}
            onChange={(e) => setCustomType(e.target.value)}
            placeholder="Enter custom type..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}

      {selectedCategory === 'Custom' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Custom Category</label>
          <input
            type="text"
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            placeholder="Enter custom category..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}

      {/* Direct Text Input for Type (Alternative to dropdown) */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Type (Main Category) - Or enter custom text
        </label>
        <input
          type="text"
          placeholder="Enter type or select from dropdown above..."
          value={selectedType === 'Custom' ? customType : selectedType}
          onChange={(e) => {
            const value = e.target.value;
            setSelectedType('Custom');
            setCustomType(value);
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Direct Text Input for Category (Alternative to dropdown) */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Category (Sub-Category) - Or enter custom text
        </label>
        <input
          type="text"
          placeholder="Enter category or select from dropdown above..."
          value={selectedCategory === 'Custom' ? customCategory : selectedCategory}
          onChange={(e) => {
            const value = e.target.value;
            setSelectedCategory('Custom');
            setCustomCategory(value);
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any notes about this categorization..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={2}
        />
      </div>

      <button
        onClick={handleSubmit}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
      >
        Categorize Component
      </button>
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
  const [learningStats, setLearningStats] = useState<any>(null);
  const [recategorizationResults, setRecategorizationResults] = useState<any>(null);
  const [recategorizing, setRecategorizing] = useState(false);

  useEffect(() => {
    // Auto-run analysis on page load
    handleComponentAnalysis();
    
    // Load learning stats
    const stats = getLearningStats();
    setLearningStats(stats);
  }, []);

  // Comprehensive Component Analysis
  const handleComponentAnalysis = async () => {
    setAnalysisLoading(true);
    try {
      const avComponents = await fetchAllPages('/av-components');
      
      // Step 1: Analyze current data quality
      const analysis = await analyzeComponentData(avComponents);
      setComponentAnalysis(analysis);
      
      // Step 2: Enhanced categorization with learning feedback
      const categorization = await enhancedCategorizeComponentsWithLearning(avComponents);
      setEnhancedCategorization(categorization);
      
      // Update learning stats
      const stats = getLearningStats();
      setLearningStats(stats);
      
      console.log('Component analysis completed:', { analysis, categorization, learningStats: stats });
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
      const results = await enhancedCategorizeComponentsWithLearning(avComponents);
      
      // Force retrain the model with accumulated feedback
      mlModel.forceRetrain();
      
      // Get updated learning stats
      const updatedStats = getLearningStats();
      
      setMlTrainingResults({
        ...results,
        modelInfo: mlModel.getModelInfo(),
        learningStats: updatedStats
      });
      console.log('ML Training completed:', results);
    } catch (error) {
      console.error('ML Training error:', error);
      setError('Failed to run ML training. Please try again.');
    } finally {
      setMlTrainingLoading(false);
    }
  };

  // Re-categorize with learned patterns
  const handleRecategorizeWithLearning = async () => {
    setRecategorizing(true);
    try {
      const avComponents = await fetchAllPages('/av-components');
      const results = await recategorizeWithLearning(avComponents);
      setRecategorizationResults(results);
      console.log('Re-categorization with learning completed:', results);
      
      // Show success message
      if (results.recategorized_count > 0) {
        alert(`Successfully generated ${results.recategorized_count} new suggestions using learned patterns!`);
      } else {
        alert('No new suggestions generated. Try providing more feedback first.');
      }
    } catch (error) {
      console.error('Re-categorization error:', error);
      setError('Failed to re-categorize with learning. Please try again.');
    } finally {
      setRecategorizing(false);
    }
  };

  // Review functions
  const handleHighConfidenceReview = async (componentId: string, action: 'accept' | 'reject' | 'edit', newType?: string, newCategory?: string) => {
    try {
      // Find the component to get its suggested categorization and data
      const component = enhancedCategorization?.high_confidence_suggestions?.find((item: any) => item.component_id === componentId);
      
      if (action === 'accept') {
        if (component) {
          // Use the component_id which should be the documentId from the ML service
          await updateComponentCategorization(componentId, component.suggested_type, component.suggested_category);
        }
      } else if (action === 'edit' && newType && newCategory) {
        await updateComponentCategorization(componentId, newType, newCategory);
      }
      // For 'reject', we don't update the database - just mark as reviewed
      
      // Store learning feedback for ML improvement
      if (component) {
        const feedback = {
          componentId,
          originalSuggestion: {
            type: component.suggested_type,
            category: component.suggested_category,
            confidence: component.confidence
          },
          userCorrection: {
            type: action === 'accept' ? component.suggested_type : (newType || 'rejected'),
            category: action === 'accept' ? component.suggested_category : (newCategory || 'rejected'),
            action: action as 'accept' | 'reject' | 'edit'
          },
          componentData: {
            description: component.description || '',
            make: component.make || '',
            model: component.model || ''
          },
          timestamp: new Date()
        };
        
        storeLearningFeedback(feedback);
      }
      
      setReviewedItems(prev => new Set([...prev, componentId]));
      console.log('High confidence review completed:', { componentId, action, newType, newCategory });
    } catch (error) {
      console.error('Error in high confidence review:', error);
      alert('Failed to update component. Please try again.');
    }
  };

  const handleManualReviewCategorization = async (componentId: string, type: string, category: string, confidence: number, notes?: string) => {
    try {
      // Ensure we're using the documentId for the update
      await updateComponentCategorization(componentId, type, category);
      
      // Find the component data for feedback
      const component = enhancedCategorization?.needs_manual_review?.find((item: any) => (item.documentId || item.id) === componentId);
      
      // Store learning feedback with actual component data
      const feedback = {
        componentId,
        originalSuggestion: {
          type: component?.component_type || 'Uncategorized',
          category: component?.component_category || 'Uncategorized',
          confidence: 0
        },
        userCorrection: {
          type,
          category,
          action: 'edit' as const
        },
        componentData: {
          description: component?.description || '',
          make: component?.make || '',
          model: component?.model || ''
        },
        timestamp: new Date()
      };
      
      storeLearningFeedback(feedback);
      
      // Remove from manual review list
      setEnhancedCategorization((prev: any) => ({
        ...prev,
        needs_manual_review: prev.needs_manual_review.filter((item: any) => (item.documentId || item.id) !== componentId)
      }));
      
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
      
      const matchesCategory = !manualReviewCategory || 
        item.component_type === manualReviewCategory;
      
      return matchesFilter && matchesCategory;
    });
  };

  const getSubCategories = (type: string) => {
    const subCategories: { [key: string]: string[] } = {
      'Audio': ['Speakers', 'Microphones', 'Amplifiers', 'Mixers', 'Processors'],
      'Video': ['Displays', 'Cameras', 'Projectors', 'Switchers', 'Processors'],
      'Control': ['Touch Panels', 'Keypads', 'Controllers', 'Software'],
      'Switcher': ['Matrix Switchers', 'Distribution Amplifiers', 'Scalers'],
      'Cabling': ['Cables', 'Connectors', 'Adapters', 'Patch Panels'],
      'Mounting': ['Mounts', 'Brackets', 'Hardware', 'Tools'],
      'Network': ['Switches', 'Routers', 'Access Points', 'Cables'],
      'Power': ['Power Supplies', 'UPS', 'Distribution', 'Cables'],
      'Lighting': ['Fixtures', 'Controllers', 'Dimmers', 'Cables'],
      'Rack & Enclosures': ['Racks', 'Enclosures', 'Shelves', 'Hardware'],
      'Tools & Accessories': ['Tools', 'Test Equipment', 'Accessories'],
      'Uncategorized': ['Uncategorized'],
      'Custom': ['Custom']
    };
    return subCategories[type] || ['Uncategorized'];
  };

  const handleBatchUpdate = async (updates: Array<{componentId: string, type: string, category: string}>) => {
    setUpdating(true);
    setUpdateProgress(0);
    
    try {
      for (let i = 0; i < updates.length; i++) {
        const update = updates[i];
        await updateComponentCategorization(update.componentId, update.type, update.category);
        setUpdateProgress(((i + 1) / updates.length) * 100);
      }
      
      // Refresh data after batch update
      await handleComponentAnalysis();
      alert(`Successfully updated ${updates.length} components!`);
    } catch (error) {
      console.error('Batch update error:', error);
      setError('Failed to update some components. Please try again.');
    } finally {
      setUpdating(false);
      setUpdateProgress(0);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
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
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={handleComponentAnalysis}
              disabled={analysisLoading}
              className="flex flex-col items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:bg-gray-100"
            >
              <svg className="w-8 h-8 text-blue-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="font-medium text-gray-900">Analyze Data</span>
              <span className="text-sm text-gray-500">Quality & patterns</span>
            </button>

            <button
              onClick={handleMLTraining}
              disabled={mlTrainingLoading}
              className="flex flex-col items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:bg-gray-100"
            >
              <svg className="w-8 h-8 text-green-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="font-medium text-gray-900">ML Training</span>
              <span className="text-sm text-gray-500">Learn & improve</span>
            </button>

            <button
              onClick={handleRecategorizeWithLearning}
              disabled={recategorizing}
              className="flex flex-col items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:bg-gray-100"
            >
              <svg className="w-8 h-8 text-purple-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="font-medium text-gray-900">Apply Learning</span>
              <span className="text-sm text-gray-500">Re-categorize</span>
            </button>

            <button
              onClick={() => debugMLState()}
              className="flex flex-col items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <svg className="w-8 h-8 text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium text-gray-900">Debug ML</span>
              <span className="text-sm text-gray-500">Check state</span>
            </button>
          </div>
        </div>

        {/* ML Training Results */}
        {mlTrainingResults && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4">ML Training Results</h3>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Summary</h4>
                <p className="text-blue-700">
                  {mlTrainingResults.message || 
                   `Processed ${mlTrainingResults.categorized_components || 0} components with ML categorization.`}
                </p>
              </div>
              
              {/* Model Performance Metrics */}
              {mlTrainingResults.modelInfo && mlTrainingResults.modelInfo.performance && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-3">Model Performance</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                    <div>
                      <span className="text-sm text-gray-600">Accuracy</span>
                      <p className="text-lg font-semibold text-gray-900">{mlTrainingResults.modelInfo.performance.accuracy || 0}%</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Precision</span>
                      <p className="text-lg font-semibold text-gray-900">{mlTrainingResults.modelInfo.performance.precision || 0}%</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Recall</span>
                      <p className="text-lg font-semibold text-gray-900">{mlTrainingResults.modelInfo.performance.recall || 0}%</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">F1 Score</span>
                      <p className="text-lg font-semibold text-gray-900">{mlTrainingResults.modelInfo.performance.f1Score || 0}%</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>Model Version: {mlTrainingResults.modelInfo.version || 'N/A'}</p>
                    <p>Last Training: {mlTrainingResults.modelInfo.trainingDate ? new Date(mlTrainingResults.modelInfo.trainingDate).toLocaleDateString() : 'N/A'}</p>
                    <p>Total Predictions: {mlTrainingResults.modelInfo.performance.totalPredictions || 0}</p>
                    <p>Correct Predictions: {mlTrainingResults.modelInfo.performance.correctPredictions || 0}</p>
                  </div>
                </div>
              )}
              
              {/* Learning Statistics */}
              {mlTrainingResults.learningStats && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-3">Learning Statistics</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <span className="text-sm text-blue-600">Total Feedback</span>
                      <p className="text-lg font-semibold text-blue-900">{mlTrainingResults.learningStats.totalFeedback || 0}</p>
                    </div>
                    <div>
                      <span className="text-sm text-blue-600">Accepted</span>
                      <p className="text-lg font-semibold text-blue-900">{mlTrainingResults.learningStats.accepts || 0}</p>
                    </div>
                    <div>
                      <span className="text-sm text-blue-600">Corrections</span>
                      <p className="text-lg font-semibold text-blue-900">{mlTrainingResults.learningStats.corrections || 0}</p>
                    </div>
                    <div>
                      <span className="text-sm text-blue-600">Model Version</span>
                      <p className="text-lg font-semibold text-blue-900">{mlTrainingResults.learningStats.modelVersion || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {(mlTrainingResults.high_confidence_suggestions || mlTrainingResults.suggestions) && 
               (mlTrainingResults.high_confidence_suggestions?.length > 0 || mlTrainingResults.suggestions?.length > 0) && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">
                    High Confidence Suggestions ({(mlTrainingResults.high_confidence_suggestions || mlTrainingResults.suggestions || []).length}):
                  </h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {(mlTrainingResults.high_confidence_suggestions || mlTrainingResults.suggestions || []).map((suggestion: any, index: number) => (
                      <div key={index} className="bg-gray-50 p-3 rounded border-l-4 border-green-500">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-gray-800">
                              {suggestion.current_type || 'Unknown'} → {suggestion.suggested_type || 'Unknown'}
                            </div>
                            <div className="text-sm text-gray-600">{suggestion.description || 'No description'}</div>
                            <div className="text-xs text-gray-500">
                              {Array.isArray(suggestion.reasoning) ? suggestion.reasoning.join(', ') : suggestion.reasoning || 'No reasoning provided'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-green-600">{suggestion.confidence || 0}%</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* No suggestions message */}
              {(!mlTrainingResults.high_confidence_suggestions || mlTrainingResults.high_confidence_suggestions.length === 0) && 
               (!mlTrainingResults.suggestions || mlTrainingResults.suggestions.length === 0) && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 mb-2">No High Confidence Suggestions</h4>
                  <p className="text-yellow-700">
                    No high confidence suggestions were generated. This could be because:
                  </p>
                  <ul className="text-yellow-600 text-sm mt-2 list-disc list-inside">
                    <li>All components are already properly categorized</li>
                    <li>The model needs more training data</li>
                    <li>Components have low confidence scores</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {recategorizationResults && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Learning-Based Re-categorization Results</h3>
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">Summary</h4>
                <p className="text-green-700">
                  Generated {recategorizationResults.recategorized_count} new suggestions using learned patterns from your feedback!
                </p>
                <p className="text-green-600 text-sm mt-1">
                  These suggestions are based on patterns learned from your previous corrections.
                </p>
              </div>
              
              {recategorizationResults.new_suggestions && recategorizationResults.new_suggestions.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">New Suggestions Using Learned Patterns ({recategorizationResults.new_suggestions.length}):</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {recategorizationResults.new_suggestions.map((suggestion: any, index: number) => (
                      <div key={index} className="bg-gray-50 p-3 rounded border-l-4 border-green-500">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-gray-800">
                              {suggestion.current_type} → {suggestion.suggested_type}
                            </div>
                            <div className="text-sm text-gray-600">{suggestion.description}</div>
                            <div className="text-xs text-gray-500">{suggestion.reasoning}</div>
                            {suggestion.reasoning.includes('learned patterns') && (
                              <div className="text-xs text-green-600 font-medium">✨ Using learned patterns</div>
                            )}
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

        {/* Component Analysis Results */}
        {componentAnalysis && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Component Data Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Data Quality</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Components</span>
                    <span className="font-medium">{componentAnalysis.total_components}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Categorized</span>
                    <span className="font-medium text-green-600">{componentAnalysis.categorized_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Uncategorized</span>
                    <span className="font-medium text-red-600">{componentAnalysis.uncategorized_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Categorization Rate</span>
                    <span className="font-medium">{componentAnalysis.categorization_rate}%</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Cost Analysis</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Cost</span>
                    <span className="font-medium">${componentAnalysis.cost_analysis.total_cost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Average Cost</span>
                    <span className="font-medium">${componentAnalysis.cost_analysis.average_cost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Cost Range</span>
                    <span className="font-medium">${componentAnalysis.cost_analysis.cost_range.min} - ${componentAnalysis.cost_analysis.cost_range.max}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Top Categories</h4>
                <div className="space-y-2">
                  {Object.entries(componentAnalysis.category_distribution)
                    .sort(([,a], [,b]) => (b as number) - (a as number))
                    .slice(0, 5)
                    .map(([category, count]) => (
                      <div key={category} className="flex justify-between">
                        <span className="text-sm text-gray-600">{category}</span>
                        <span className="font-medium">{count as number}</span>
                      </div>
                    ))}
                </div>
              </div>
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

        {/* Tab Content */}
        {activeTab === 'analysis' && (
          <>
            {/* Component Analysis Results */}
            {componentAnalysis && (
              <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Component Data Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3">Data Quality</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Components</span>
                        <span className="font-medium">{componentAnalysis.total_components}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Categorized</span>
                        <span className="font-medium text-green-600">{componentAnalysis.categorized_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Uncategorized</span>
                        <span className="font-medium text-red-600">{componentAnalysis.uncategorized_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Categorization Rate</span>
                        <span className="font-medium">{componentAnalysis.categorization_rate}%</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3">Cost Analysis</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Cost</span>
                        <span className="font-medium">${componentAnalysis.cost_analysis.total_cost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Average Cost</span>
                        <span className="font-medium">${componentAnalysis.cost_analysis.average_cost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Cost Range</span>
                        <span className="font-medium">${componentAnalysis.cost_analysis.cost_range.min} - ${componentAnalysis.cost_analysis.cost_range.max}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3">Top Categories</h4>
                    <div className="space-y-2">
                      {Object.entries(componentAnalysis.category_distribution)
                        .sort(([,a], [,b]) => (b as number) - (a as number))
                        .slice(0, 5)
                        .map(([category, count]) => (
                          <div key={category} className="flex justify-between">
                            <span className="text-sm text-gray-600">{category}</span>
                            <span className="font-medium">{count as number}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Learning Statistics */}
            {learningStats && (
              <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Learning Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{learningStats.totalFeedback || 0}</div>
                    <div className="text-sm text-gray-600">Total Feedback</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{learningStats.accepts || 0}</div>
                    <div className="text-sm text-gray-600">Accepted</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{learningStats.corrections || 0}</div>
                    <div className="text-sm text-gray-600">Corrections</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600 break-all max-w-full">
                      {learningStats.modelVersion ? 
                        learningStats.modelVersion.length > 20 ? 
                          `${learningStats.modelVersion.substring(0, 20)}...` : 
                          learningStats.modelVersion 
                        : 'N/A'
                      }
                    </div>
                    <div className="text-sm text-gray-600">Model Version</div>
                    {learningStats.modelVersion && learningStats.modelVersion.length > 20 && (
                      <div className="text-xs text-gray-500 mt-1 cursor-pointer hover:text-gray-700" 
                           title={learningStats.modelVersion}
                           onClick={() => alert(`Full Model Version: ${learningStats.modelVersion}`)}>
                        Click to see full version
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* High Confidence Review Tab */}
        {activeTab === 'high-confidence' && enhancedCategorization?.high_confidence_suggestions && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                High Confidence Suggestions ({enhancedCategorization.high_confidence_suggestions.length})
              </h3>
              <div className="text-sm text-gray-600">
                Review and provide feedback on ML suggestions
              </div>
            </div>
            
            <div className="space-y-4">
              {enhancedCategorization.high_confidence_suggestions
                .filter((item: any) => !reviewedItems.has(item.component_id))
                .map((item: any, index: number) => (
                  <div key={item.component_id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.description}</h4>
                        <p className="text-sm text-gray-600">{item.make} {item.model}</p>
                        <p className="text-xs text-gray-500">ID: {item.component_id}</p>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-sm font-semibold text-green-600">{item.confidence}%</div>
                        <div className="text-xs text-gray-500">Confidence</div>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <div className="text-sm text-gray-700">
                        <span className="font-medium">Current:</span> {item.current_type} → {item.current_category}
                      </div>
                      <div className="text-sm text-blue-700">
                        <span className="font-medium">Suggested:</span> {item.suggested_type} → {item.suggested_category}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        <span className="font-medium">Reasoning:</span> {Array.isArray(item.reasoning) ? item.reasoning.join(', ') : item.reasoning}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleHighConfidenceReview(item.component_id, 'accept')}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleHighConfidenceReview(item.component_id, 'reject')}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => {
                          // For edit, we'll implement a simple inline edit
                          const newType = prompt('Enter new type:', item.suggested_type);
                          const newCategory = prompt('Enter new category:', item.suggested_category);
                          if (newType && newCategory) {
                            handleHighConfidenceReview(item.component_id, 'edit', newType, newCategory);
                          }
                        }}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              
              {enhancedCategorization.high_confidence_suggestions.filter((item: any) => !reviewedItems.has(item.component_id)).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>All high confidence suggestions have been reviewed!</p>
                  <p className="text-sm mt-2">Run ML Training again to get new suggestions.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Manual Review Tab */}
        {activeTab === 'manual-review' && enhancedCategorization?.needs_manual_review && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                Manual Review ({enhancedCategorization.needs_manual_review.length})
              </h3>
              <div className="flex space-x-4">
                <input
                  type="text"
                  placeholder="Filter by description, make, or model..."
                  value={manualReviewFilter}
                  onChange={(e) => setManualReviewFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <select
                  value={manualReviewCategory}
                  onChange={(e) => setManualReviewCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">All Categories</option>
                  <option value="Audio">Audio</option>
                  <option value="Video">Video</option>
                  <option value="Control">Control</option>
                  <option value="Switcher">Switcher</option>
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
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {getFilteredManualReviewItems().map((item: any) => (
                <ManualReviewItem
                  key={item.documentId || item.id}
                  item={item}
                  onCategorize={handleManualReviewCategorization}
                />
              ))}
            </div>
            
            {getFilteredManualReviewItems().length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No components match your filter criteria.</p>
                <p className="text-sm mt-2">Try adjusting your search or category filter.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 