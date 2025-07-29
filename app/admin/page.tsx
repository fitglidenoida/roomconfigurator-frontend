'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchAllPages } from '../lib/api';
import { autoCategorizeComponents, analyzeComponentData, enhancedCategorizeComponents } from '../lib/mlService';

export default function AdminPage() {
  const [componentAnalysis, setComponentAnalysis] = useState<any>(null);
  const [enhancedCategorization, setEnhancedCategorization] = useState<any>(null);
  const [mlTrainingResults, setMlTrainingResults] = useState<any>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [mlTrainingLoading, setMlTrainingLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          <h2 className="text-xl font-bold text-gray-800 mb-4">Data Management Actions</h2>
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

        {/* Analysis Results */}
        {componentAnalysis && (
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

        {/* Enhanced Categorization Results */}
        {enhancedCategorization && (
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
              <h4 className="font-semibold text-gray-800 mb-3">Category Breakdown:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(enhancedCategorization.categorization_summary)
                  .sort(([,a], [,b]) => Number(b) - Number(a))
                  .map(([category, count]: [string, any]) => (
                    <div key={category} className="bg-gray-50 p-3 rounded text-center">
                      <div className="font-semibold text-gray-800">{category}</div>
                      <div className="text-sm text-gray-600">{count} components</div>
                    </div>
                  ))}
              </div>
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
      </div>
    </div>
  );
} 