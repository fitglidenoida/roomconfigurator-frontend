import { fetchAllPages } from './api';

export interface ComponentSuggestion {
  id: number;
  make: string;
  model: string;
  description: string;
  unit_cost: number;
  currency: string;
  region: string;
  country: string;
  component_type: string;
  component_category: string;
  similarity_score: number;
  suggestion_type: 'upgrade' | 'downgrade' | 'alternative' | 'regional';
  cost_difference: number;
  cost_percentage_change: number;
  feature_comparison?: string;
}

export interface ComponentData {
  id: number;
  make: string;
  model: string;
  description: string;
  unit_cost: number;
  currency: string;
  region: string;
  country: string;
  component_type: string;
  component_category: string;
}

// Calculate similarity score between two components
const calculateSimilarity = (comp1: ComponentData, comp2: ComponentData): number => {
  let score = 0;
  
  // Exact make match (high weight)
  if (comp1.make.toLowerCase() === comp2.make.toLowerCase()) {
    score += 40;
  }
  
  // Exact model match (high weight)
  if (comp1.model.toLowerCase() === comp2.model.toLowerCase()) {
    score += 30;
  }
  
  // Description similarity (medium weight)
  const desc1 = comp1.description.toLowerCase();
  const desc2 = comp2.description.toLowerCase();
  const descWords1 = desc1.split(/\s+/);
  const descWords2 = desc2.split(/\s+/);
  const commonWords = descWords1.filter(word => descWords2.includes(word));
  const similarity = commonWords.length / Math.max(descWords1.length, descWords2.length);
  score += similarity * 20;
  
  // Component type match (medium weight)
  if (comp1.component_type === comp2.component_type) {
    score += 10;
  }
  
  // Component category match (low weight)
  if (comp1.component_category === comp2.component_category) {
    score += 5;
  }
  
  return Math.min(score, 100);
};

// Extract key features from component description
const extractFeatures = (description: string): string[] => {
  const features = [];
  const desc = description.toLowerCase();
  
  // Display features
  if (desc.includes('4k') || desc.includes('uhd')) features.push('4K Resolution');
  if (desc.includes('1080p') || desc.includes('full hd')) features.push('Full HD');
  if (desc.includes('wireless')) features.push('Wireless');
  if (desc.includes('bluetooth')) features.push('Bluetooth');
  if (desc.includes('hdmi')) features.push('HDMI');
  if (desc.includes('usb')) features.push('USB');
  if (desc.includes('ceiling')) features.push('Ceiling Mount');
  if (desc.includes('wall')) features.push('Wall Mount');
  if (desc.includes('professional')) features.push('Professional Grade');
  if (desc.includes('smart')) features.push('Smart Features');
  
  // Audio features
  if (desc.includes('speaker')) features.push('Speaker');
  if (desc.includes('microphone')) features.push('Microphone');
  if (desc.includes('amplifier')) features.push('Amplifier');
  if (desc.includes('mixer')) features.push('Mixer');
  
  // Size features
  if (desc.includes('inch') || desc.includes('"')) {
    const sizeMatch = desc.match(/(\d+(?:\.\d+)?)\s*(?:inch|")/);
    if (sizeMatch) features.push(`${sizeMatch[1]}" Size`);
  }
  
  return features;
};

// Compare features between two components
const compareFeatures = (comp1: ComponentData, comp2: ComponentData): string => {
  const features1 = extractFeatures(comp1.description);
  const features2 = extractFeatures(comp2.description);
  
  const uniqueTo2 = features2.filter(f => !features1.includes(f));
  const uniqueTo1 = features1.filter(f => !features2.includes(f));
  
  let comparison = '';
  
  if (uniqueTo2.length > 0) {
    comparison += `Adds: ${uniqueTo2.join(', ')}. `;
  }
  
  if (uniqueTo1.length > 0) {
    comparison += `Removes: ${uniqueTo1.join(', ')}. `;
  }
  
  if (uniqueTo2.length === 0 && uniqueTo1.length === 0) {
    comparison = 'Similar features';
  }
  
  return comparison.trim();
};

// Get component suggestions
export const getComponentSuggestions = async (
  currentComponent: ComponentData,
  maxSuggestions: number = 5
): Promise<ComponentSuggestion[]> => {
  try {
    // Fetch all components
    const allComponents = await fetchAllPages('/av-components');
    
    // Calculate similarity scores and filter
    const suggestions: ComponentSuggestion[] = [];
    
    allComponents.forEach((comp: any) => {
      // Skip the same component
      if (comp.id === currentComponent.id) return;
      
      const similarity = calculateSimilarity(currentComponent, comp);
      
      // Only include if similarity is above threshold
      if (similarity >= 30) {
        const costDiff = comp.unit_cost - currentComponent.unit_cost;
        const costPercentage = (costDiff / currentComponent.unit_cost) * 100;
        
        let suggestionType: 'upgrade' | 'downgrade' | 'alternative' | 'regional';
        
        if (comp.make === currentComponent.make && comp.model === currentComponent.model) {
          // Same component, different region/price
          suggestionType = 'regional';
        } else if (costDiff > 0) {
          suggestionType = 'upgrade';
        } else if (costDiff < 0) {
          suggestionType = 'downgrade';
        } else {
          suggestionType = 'alternative';
        }
        
        suggestions.push({
          id: comp.id,
          make: comp.make,
          model: comp.model,
          description: comp.description,
          unit_cost: comp.unit_cost,
          currency: comp.currency,
          region: comp.region,
          country: comp.country,
          component_type: comp.component_type,
          component_category: comp.component_category,
          similarity_score: similarity,
          suggestion_type: suggestionType,
          cost_difference: costDiff,
          cost_percentage_change: costPercentage,
          feature_comparison: compareFeatures(currentComponent, comp)
        });
      }
    });
    
    // Sort by similarity score and suggestion type priority
    suggestions.sort((a, b) => {
      // Priority: regional > upgrade > alternative > downgrade
      const typePriority = { regional: 4, upgrade: 3, alternative: 2, downgrade: 1 };
      const aPriority = typePriority[a.suggestion_type];
      const bPriority = typePriority[b.suggestion_type];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      // Then by similarity score
      return b.similarity_score - a.similarity_score;
    });
    
    return suggestions.slice(0, maxSuggestions);
  } catch (error) {
    console.error('Error fetching component suggestions:', error);
    return [];
  }
};

// Get cost optimization suggestions
export const getCostOptimizationSuggestions = async (
  roomComponents: ComponentData[],
  _targetCostReduction: number = 0.1 // 10% reduction target
): Promise<ComponentSuggestion[]> => {
  try {
    const allComponents = await fetchAllPages('/av-components');
    const suggestions: ComponentSuggestion[] = [];
    
    roomComponents.forEach((currentComp: any) => {
      // Find cheaper alternatives
      const alternatives = allComponents.filter((comp: any) => {
        if (comp.id === currentComp.id) return false;
        
        const similarity = calculateSimilarity(currentComp, comp);
        return similarity >= 40 && comp.unit_cost < currentComp.unit_cost;
      });
      
      alternatives.forEach((alt: any) => {
        const costDiff = alt.unit_cost - currentComp.unit_cost;
        const costPercentage = (costDiff / currentComp.unit_cost) * 100;
        
        suggestions.push({
          id: alt.id,
          make: alt.make,
          model: alt.model,
          description: alt.description,
          unit_cost: alt.unit_cost,
          currency: alt.currency,
          region: alt.region,
          country: alt.country,
          component_type: alt.component_type,
          component_category: alt.component_category,
          similarity_score: calculateSimilarity(currentComp, alt),
          suggestion_type: 'downgrade',
          cost_difference: costDiff,
          cost_percentage_change: costPercentage,
          feature_comparison: compareFeatures(currentComp, alt)
        });
      });
    });
    
    // Sort by cost savings (highest first)
    suggestions.sort((a, b) => Math.abs(a.cost_difference) - Math.abs(b.cost_difference));
    
    return suggestions.slice(0, 10);
  } catch (error) {
    console.error('Error fetching cost optimization suggestions:', error);
    return [];
  }
};

// Get regional pricing insights
export const getRegionalPricingInsights = async (
  component: ComponentData
): Promise<{ region: string; avg_cost: number; cost_variance: number }[]> => {
  try {
    const allComponents = await fetchAllPages('/av-components');
    
    // Group by region
    const regionalData: Record<string, number[]> = {};
    
    allComponents.forEach((comp: any) => {
      if (comp.make === component.make && comp.model === component.model) {
        if (!regionalData[comp.region]) {
          regionalData[comp.region] = [];
        }
        regionalData[comp.region].push(comp.unit_cost);
      }
    });
    
    // Calculate regional statistics
    const insights = Object.entries(regionalData).map(([region, costs]) => {
      const avg_cost = costs.reduce((sum, cost) => sum + cost, 0) / costs.length;
      const variance = costs.reduce((sum, cost) => sum + Math.pow(cost - avg_cost, 2), 0) / costs.length;
      
      return {
        region,
        avg_cost,
        cost_variance: Math.sqrt(variance)
      };
    });
    
    return insights.sort((a, b) => a.avg_cost - b.avg_cost);
  } catch (error) {
    console.error('Error fetching regional pricing insights:', error);
    return [];
  }
}; 