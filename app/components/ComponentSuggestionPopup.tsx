'use client';

import React, { useState } from 'react';
import { ComponentSuggestion } from '../lib/componentSuggestions';

interface ComponentSuggestionPopupProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: ComponentSuggestion[];
  currentComponent: {
    make: string;
    model: string;
    description: string;
    unit_cost: number;
    currency: string;
  };
  onAcceptSuggestion: (suggestion: ComponentSuggestion) => void;
  onRejectSuggestion: (suggestionId: number) => void;
}

const ComponentSuggestionPopup: React.FC<ComponentSuggestionPopupProps> = ({
  isOpen,
  onClose,
  suggestions,
  currentComponent,
  onAcceptSuggestion,
  onRejectSuggestion,
}) => {
  const [selectedSuggestion] = useState<ComponentSuggestion | null>(null);

  if (!isOpen) return null;

  const getSuggestionTypeColor = (type: string) => {
    switch (type) {
      case 'upgrade':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'downgrade':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'alternative':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'regional':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSuggestionTypeIcon = (type: string) => {
    switch (type) {
      case 'upgrade':
        return '⬆️';
      case 'downgrade':
        return '⬇️';
      case 'alternative':
        return '🔄';
      case 'regional':
        return '🌍';
      default:
        return '💡';
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    });
    return formatter.format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">
              Component Suggestions
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Current: {currentComponent.make} {currentComponent.model} - {formatCurrency(currentComponent.unit_cost, currentComponent.currency)}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {suggestions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No suggestions available for this component.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                    selectedSuggestion?.id === suggestion.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  {/* Suggestion Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getSuggestionTypeIcon(suggestion.suggestion_type)}</span>
                      <div>
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${getSuggestionTypeColor(suggestion.suggestion_type)}`}>
                          {suggestion.suggestion_type.toUpperCase()}
                        </span>
                        <p className="text-sm text-gray-500 mt-1">
                          {suggestion.region} • {suggestion.country}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-800">
                        {formatCurrency(suggestion.unit_cost, suggestion.currency)}
                      </p>
                      <p className={`text-sm font-medium ${
                        suggestion.cost_difference > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {suggestion.cost_difference > 0 ? '+' : ''}{formatCurrency(suggestion.cost_difference, suggestion.currency)}
                        ({suggestion.cost_percentage_change > 0 ? '+' : ''}{suggestion.cost_percentage_change.toFixed(1)}%)
                      </p>
                    </div>
                  </div>

                  {/* Component Details */}
                  <div className="mb-3">
                    <h3 className="font-medium text-gray-800 mb-1">
                      {suggestion.make} {suggestion.model}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">{suggestion.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>Type: {suggestion.component_type}</span>
                      <span>Category: {suggestion.component_category}</span>
                      <span>Similarity: {suggestion.similarity_score}%</span>
                    </div>
                  </div>

                  {/* Feature Comparison */}
                  {suggestion.feature_comparison && (
                    <div className="mb-3 p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Feature Comparison:</span> {suggestion.feature_comparison}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => onRejectSuggestion(suggestion.id)}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => onAcceptSuggestion(suggestion)}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} available
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComponentSuggestionPopup; 