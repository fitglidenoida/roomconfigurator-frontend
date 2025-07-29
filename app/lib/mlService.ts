// ML Service for Room Configurator
export interface MLComponentSuggestion {
  componentId: string;
  similarity: number;
  reason: string;
  costImpact: number;
  features: string[];
}

export interface CostPrediction {
  predictedCost: number;
  confidence: number;
  factors: string[];
  recommendations: string[];
}

export interface RoomClassification {
  category: string;
  confidence: number;
  suggestedComponents: string[];
}

class MLService {
  private componentEmbeddings: Map<string, number[]> = new Map();
  private costModels: Map<string, any> = new Map();

  // Initialize ML models
  async initialize() {
    console.log('Initializing ML Service...');
    // Load component embeddings and cost models
    await this.loadComponentEmbeddings();
    await this.loadCostModels();
  }

  // Load component embeddings for similarity matching
  private async loadComponentEmbeddings() {
    // In a real implementation, this would load from a trained model
    // For demo, we'll use simple heuristics
    console.log('Loading component embeddings...');
  }

  // Load cost prediction models
  private async loadCostModels() {
    // In a real implementation, this would load trained cost models
    // For demo, we'll use regression-based predictions
    console.log('Loading cost prediction models...');
  }

  // Find similar components based on features
  async findSimilarComponents(
    targetComponent: any,
    _roomType: string,
    _budget: number
  ): Promise<MLComponentSuggestion[]> {
    // const _suggestions: MLComponentSuggestion[] = [];
    
    // Simple similarity calculation based on component features
    // const _targetFeatures = this.extractFeatures(targetComponent);
    
    // Mock similar components for demo
    const mockSuggestions = [
      {
        componentId: 'similar-1',
        similarity: 0.85,
        reason: 'Similar specifications and features',
        costImpact: -1500,
        features: ['HDMI 2.1', '4K Support', 'Low Latency']
      },
      {
        componentId: 'similar-2',
        similarity: 0.72,
        reason: 'Alternative brand with better price',
        costImpact: -800,
        features: ['HDMI 2.0', '4K Support', 'Standard Latency']
      }
    ];

    return mockSuggestions;
  }

  // Predict room cost based on type and region
  async predictRoomCost(
    roomType: string,
    region: string,
    components: any[]
  ): Promise<CostPrediction> {
    // Simple cost prediction based on historical data
    const baseCost = this.getBaseCost(roomType, region);
    const componentCost = components.reduce((sum, comp) => sum + (comp.cost || 0), 0);
    const predictedCost = baseCost + componentCost;
    
    return {
      predictedCost,
      confidence: 0.78,
      factors: ['Room type', 'Region', 'Component count'],
      recommendations: [
        'Consider alternative components for 15% cost savings',
        'Regional pricing suggests 8% lower costs in nearby areas'
      ]
    };
  }

  // Classify room type from SRM data
  async classifyRoomType(roomData: any): Promise<RoomClassification> {
    const roomName = roomData.room_name?.toLowerCase() || '';
    
    // Simple classification logic
    let category = 'meeting-room';
    let confidence = 0.6;
    
    if (roomName.includes('conference') || roomName.includes('meeting')) {
      category = 'conference-room';
      confidence = 0.9;
    } else if (roomName.includes('office') || roomName.includes('cabin')) {
      category = 'office-space';
      confidence = 0.85;
    } else if (roomName.includes('training') || roomName.includes('classroom')) {
      category = 'training-room';
      confidence = 0.8;
    }

    return {
      category,
      confidence,
      suggestedComponents: this.getSuggestedComponents(category)
    };
  }

  // Extract features from component
  private extractFeatures(component: any): string[] {
    const features: string[] = [];
    
    if (component.specifications) {
      Object.keys(component.specifications).forEach(key => {
        features.push(`${key}:${component.specifications[key]}`);
      });
    }
    
    if (component.category) features.push(component.category);
    if (component.brand) features.push(component.brand);
    
    return features;
  }

  // Get base cost for room type and region
  private getBaseCost(roomType: string, region: string): number {
    const baseCosts: Record<string, Record<string, number>> = {
      'conference-room': {
        'US': 15000,
        'UK': 12000,
        'EU': 13000,
        'APAC': 10000
      },
      'meeting-room': {
        'US': 8000,
        'UK': 6500,
        'EU': 7000,
        'APAC': 5500
      },
      'office-space': {
        'US': 5000,
        'UK': 4000,
        'EU': 4500,
        'APAC': 3500
      }
    };
    
    return baseCosts[roomType]?.[region] || 10000;
  }

  // Get suggested components for room category
  private getSuggestedComponents(category: string): string[] {
    const suggestions: Record<string, string[]> = {
      'conference-room': ['projector', 'screen', 'audio-system', 'video-conference'],
      'meeting-room': ['display', 'audio-system', 'video-conference'],
      'office-space': ['display', 'audio-system'],
      'training-room': ['projector', 'screen', 'audio-system', 'interactive-display']
    };
    
    return suggestions[category] || [];
  }

  // Optimize component selection for budget
  async optimizeForBudget(
    components: any[],
    targetBudget: number,
    roomType: string
  ): Promise<any[]> {
    const optimized = [...components];
    
    // Simple optimization: replace expensive components with alternatives
    for (let i = 0; i < optimized.length; i++) {
      const component = optimized[i];
      if (component.cost > targetBudget * 0.3) { // If component is >30% of budget
        // Find cheaper alternative
        const alternatives = await this.findSimilarComponents(component, roomType, targetBudget);
        if (alternatives.length > 0 && alternatives[0].costImpact < 0) {
          // Replace with cheaper alternative
          optimized[i] = { ...component, ...alternatives[0] };
        }
      }
    }
    
    return optimized;
  }
}

// Export singleton instance
export const mlService = new MLService(); 

// ML Training for Uncategorized Components
export const trainOnUncategorizedComponents = async (uncategorizedComponents: any[]) => {
  console.log('Starting ML training on uncategorized components:', uncategorizedComponents.length);
  
  // Simple pattern-based training
  const trainingPatterns = {
    'Displays': ['display', 'tv', 'monitor', 'screen', 'panel', 'lcd', 'oled', 'led', 'projection'],
    'Audio': ['speaker', 'audio', 'sound', 'mic', 'microphone', 'amplifier', 'mixer', 'processor'],
    'Cabling': ['cable', 'wire', 'connector', 'hdmi', 'vga', 'dvi', 'displayport', 'ethernet', 'fiber'],
    'Mounting': ['mount', 'bracket', 'stand', 'support', 'holder', 'clamp', 'rail'],
    'Control Systems': ['switch', 'matrix', 'controller', 'processor', 'dsp', 'control', 'automation'],
    'Projection': ['projector', 'lens', 'screen', 'throw', 'distance'],
    'Video': ['camera', 'video', 'streaming', 'recording', 'capture'],
    'Lighting': ['light', 'led', 'lamp', 'illumination', 'ambient'],
    'Processing': ['processor', 'dsp', 'amplifier', 'mixer', 'equalizer', 'crossover'],
    'Rack & Enclosures': ['rack', 'cabinet', 'enclosure', 'housing', 'case', 'chassis'],
    'Network': ['switch', 'router', 'ethernet', 'wifi', 'network', 'poe'],
    'Power': ['power', 'supply', 'ups', 'battery', 'adapter', 'transformer']
  };

  const suggestions = uncategorizedComponents.map(component => {
    const description = (component.description || '').toLowerCase();
    let bestMatch = 'Uncategorized';
    let bestScore = 0;

    // Find the best matching category
    Object.entries(trainingPatterns).forEach(([category, patterns]) => {
      const score = patterns.reduce((total, pattern) => {
        return total + (description.includes(pattern) ? 1 : 0);
      }, 0);
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = category;
      }
    });

    return {
      component_id: component.id,
      current_type: component.component_type,
      suggested_type: bestMatch,
      confidence: bestScore > 0 ? Math.min(bestScore * 20, 100) : 0,
      description: component.description,
      reasoning: bestScore > 0 ? `Matched ${bestScore} pattern(s) for ${bestMatch}` : 'No clear pattern match'
    };
  });

  console.log('ML training results:', suggestions);
  
  // Filter high-confidence suggestions
  const highConfidenceSuggestions = suggestions.filter(s => s.confidence >= 60);
  console.log('High confidence suggestions:', highConfidenceSuggestions.length);

  return {
    total_components: uncategorizedComponents.length,
    suggestions,
    high_confidence_suggestions: highConfidenceSuggestions,
    training_patterns: Object.keys(trainingPatterns)
  };
};

// Auto-categorize uncategorized components
export const autoCategorizeComponents = async (components: any[]) => {
  const uncategorized = components.filter(comp => 
    !comp.component_type || 
    comp.component_type === 'AV Equipment' || 
    comp.component_type === 'Uncategorized'
  );

  if (uncategorized.length === 0) {
    return { message: 'No uncategorized components found' };
  }

  const trainingResults = await trainOnUncategorizedComponents(uncategorized);
  
  // Return suggestions for manual review
  return {
    message: `Found ${uncategorized.length} uncategorized components`,
    suggestions: trainingResults.high_confidence_suggestions,
    total_suggestions: trainingResults.suggestions.length
  };
}; 

// Comprehensive Component Analysis
export const analyzeComponentData = async (components: any[]) => {
  console.log('Starting comprehensive component analysis...');
  
  const analysis = {
    total_components: components.length,
    missing_descriptions: 0,
    missing_names: 0,
    uncategorized: 0,
    poorly_categorized: 0,
    categorization_breakdown: {} as Record<string, number>,
    data_quality_score: 0,
    recommendations: [] as string[]
  };

  // Analyze each component
  components.forEach(component => {
    // Check for missing data
    if (!component.description || component.description === 'undefined') {
      analysis.missing_descriptions++;
    }
    if (!component.make || !component.model) {
      analysis.missing_names++;
    }
    
    // Check categorization
    const type = component.component_type || component.component_category || 'Uncategorized';
    if (type === 'Uncategorized' || type === 'AV Equipment' || type === '') {
      analysis.uncategorized++;
    } else if (type === 'AV Equipment') {
      analysis.poorly_categorized++;
    }
    
    // Build categorization breakdown
    analysis.categorization_breakdown[type] = (analysis.categorization_breakdown[type] || 0) + 1;
  });

  // Calculate data quality score
  const totalIssues = analysis.missing_descriptions + analysis.missing_names + analysis.uncategorized + analysis.poorly_categorized;
  analysis.data_quality_score = Math.max(0, 100 - (totalIssues / components.length) * 100);

  // Generate recommendations
  if (analysis.missing_descriptions > 0) {
    analysis.recommendations.push(`Add descriptions for ${analysis.missing_descriptions} components`);
  }
  if (analysis.missing_names > 0) {
    analysis.recommendations.push(`Add make/model for ${analysis.missing_names} components`);
  }
  if (analysis.uncategorized > 0) {
    analysis.recommendations.push(`Categorize ${analysis.uncategorized} uncategorized components`);
  }
  if (analysis.poorly_categorized > 0) {
    analysis.recommendations.push(`Improve categorization for ${analysis.poorly_categorized} components`);
  }

  console.log('Component analysis results:', analysis);
  return analysis;
};

// Enhanced categorization with proper hierarchy (component_type + component_category)
export const enhancedCategorizeComponents = async (components: any[]) => {
  console.log('Starting enhanced component categorization with hierarchy...');
  
  // Enhanced categorization patterns with main types and sub-categories
  const enhancedPatterns = {
    'Audio': {
      patterns: ['speaker', 'audio', 'sound', 'mic', 'microphone', 'amplifier', 'mixer', 'processor', 'dsp', 'equalizer', 'crossover'],
      examples: ['JBL Speaker', 'Shure Microphone', 'Crown Amplifier'],
      subCategories: {
        'Speakers': ['speaker', 'loudspeaker', 'monitor', 'subwoofer', 'tweeter', 'woofer'],
        'Microphones': ['mic', 'microphone', 'wireless mic', 'lavalier', 'headset mic'],
        'Amplifiers': ['amplifier', 'amp', 'power amp', 'crown', 'qsc'],
        'Mixers': ['mixer', 'audio mixer', 'digital mixer', 'analog mixer'],
        'Processors': ['dsp', 'processor', 'equalizer', 'crossover', 'compressor', 'limiter'],
        'Accessories': ['cable', 'connector', 'adapter', 'stand', 'mount']
      }
    },
    'Video': {
      patterns: ['camera', 'video', 'streaming', 'recording', 'capture', 'ptz', 'ip camera', 'webcam', 'display', 'tv', 'monitor', 'screen', 'panel', 'lcd', 'oled', 'led', 'projection', 'video wall', 'digital signage'],
      examples: ['PTZ Camera', 'IP Camera', 'Samsung TV', 'LG Monitor'],
      subCategories: {
        'Displays': ['display', 'tv', 'monitor', 'screen', 'panel', 'lcd', 'oled', 'led', 'video wall', 'digital signage'],
        'Projectors': ['projector', 'lens', 'projection', 'lumens', '4k', 'hd'],
        'Cameras': ['camera', 'ptz', 'ip camera', 'webcam', 'surveillance'],
        'Recorders': ['recorder', 'dvr', 'nvr', 'streaming', 'capture']
      }
    },
    'Control': {
      patterns: ['switch', 'matrix', 'controller', 'processor', 'dsp', 'control', 'automation', 'crestron', 'amx', 'extron'],
      examples: ['Crestron Controller', 'Extron Matrix', 'AMX System'],
      subCategories: {
        'Controllers': ['controller', 'processor', 'automation', 'crestron', 'amx', 'extron'],
        'Switches': ['switch', 'matrix', 'video switch', 'audio switch'],
        'Touch Panels': ['touch', 'panel', 'interface', 'keypad'],
        'Software': ['software', 'platform', 'management', 'app']
      }
    },
    'Cabling': {
      patterns: ['cable', 'wire', 'connector', 'hdmi', 'vga', 'dvi', 'displayport', 'ethernet', 'fiber', 'cat6', 'cat7', 'patch'],
      examples: ['HDMI Cable', 'Ethernet Cable', 'Fiber Optic'],
      subCategories: {
        'Video Cables': ['hdmi', 'vga', 'dvi', 'displayport', 'component', 'composite'],
        'Audio Cables': ['xlr', 'trs', 'rca', 'speakon', 'banana'],
        'Network Cables': ['ethernet', 'cat6', 'cat7', 'fiber', 'patch'],
        'Power Cables': ['power', 'ac', 'dc', 'adapter']
      }
    },
    'Mounting': {
      patterns: ['mount', 'bracket', 'stand', 'support', 'holder', 'clamp', 'rail', 'ceiling', 'wall', 'floor'],
      examples: ['Chief Mount', 'Wall Bracket', 'Ceiling Mount'],
      subCategories: {
        'Wall Mounts': ['wall mount', 'bracket', 'arm'],
        'Ceiling Mounts': ['ceiling mount', 'drop mount'],
        'Floor Stands': ['floor stand', 'tripod', 'base'],
        'Rack Mounts': ['rack mount', 'rack ears', 'chassis']
      }
    },
    'Network': {
      patterns: ['switch', 'router', 'ethernet', 'wifi', 'network', 'poe', 'wireless', 'access point', 'firewall'],
      examples: ['Network Switch', 'WiFi Router', 'Access Point'],
      subCategories: {
        'Switches': ['switch', 'poe switch', 'managed switch'],
        'Routers': ['router', 'gateway', 'firewall'],
        'Wireless': ['wifi', 'wireless', 'access point', 'repeater'],
        'Network Tools': ['tester', 'crimper', 'analyzer']
      }
    },
    'Power': {
      patterns: ['power', 'supply', 'ups', 'battery', 'adapter', 'transformer', 'pdu', 'power distribution'],
      examples: ['UPS System', 'Power Supply', 'PDU Unit'],
      subCategories: {
        'UPS Systems': ['ups', 'uninterruptible', 'battery backup'],
        'Power Supplies': ['power supply', 'adapter', 'transformer'],
        'PDUs': ['pdu', 'power distribution', 'rack pdu'],
        'Batteries': ['battery', 'backup', 'rechargeable']
      }
    },
    'Lighting': {
      patterns: ['light', 'led', 'lamp', 'illumination', 'ambient', 'dimmer', 'fixture', 'bulb'],
      examples: ['LED Light', 'Dimmer Switch', 'Light Fixture'],
      subCategories: {
        'LED Lights': ['led', 'light', 'fixture', 'strip'],
        'Controls': ['dimmer', 'switch', 'controller'],
        'Accessories': ['bulb', 'lamp', 'holder']
      }
    },
    'Rack & Enclosures': {
      patterns: ['rack', 'cabinet', 'enclosure', 'housing', 'case', 'chassis', 'server rack', 'equipment rack'],
      examples: ['Server Rack', 'Equipment Cabinet', 'Rack Mount'],
      subCategories: {
        'Racks': ['rack', 'cabinet', 'server rack', 'equipment rack'],
        'Enclosures': ['enclosure', 'housing', 'case', 'chassis'],
        'Accessories': ['shelf', 'bracket', 'fans', 'cable management']
      }
    },
    'Tools & Accessories': {
      patterns: ['tool', 'accessory', 'adapter', 'converter', 'splitter', 'extender', 'repeater'],
      examples: ['HDMI Splitter', 'Adapter', 'Extension Cable'],
      subCategories: {
        'Adapters': ['adapter', 'converter', 'transcoder'],
        'Splitters': ['splitter', 'distribution', 'multiviewer'],
        'Extenders': ['extender', 'repeater', 'booster'],
        'Tools': ['tool', 'tester', 'crimper', 'screwdriver']
      }
    }
  };

  const categorizationResults = components.map(component => {
    const description = (component.description || '').toLowerCase();
    const make = (component.make || '').toLowerCase();
    const model = (component.model || '').toLowerCase();
    
    let bestMainType = 'Uncategorized';
    let bestSubCategory = 'Uncategorized';
    let bestScore = 0;
    let reasoning = '';

    // Enhanced matching using multiple fields
    Object.entries(enhancedPatterns).forEach(([mainType, config]) => {
      let mainTypeScore = 0;
      let subCategoryScores: { [key: string]: number } = {};
      
      // Check main type patterns
      config.patterns.forEach(pattern => {
        if (description.includes(pattern)) mainTypeScore += 2;
        if (make.includes(pattern)) mainTypeScore += 1;
        if (model.includes(pattern)) mainTypeScore += 1;
      });
      
      // Check sub-category patterns
      Object.entries(config.subCategories).forEach(([subCategory, patterns]) => {
        let subScore = 0;
        patterns.forEach(pattern => {
          if (description.includes(pattern)) subScore += 3;
          if (make.includes(pattern)) subScore += 2;
          if (model.includes(pattern)) subScore += 2;
        });
        subCategoryScores[subCategory] = subScore;
      });
      
      // Check for brand-specific patterns
      if (mainType === 'Control' && (make.includes('crestron') || make.includes('amx') || make.includes('extron'))) {
        mainTypeScore += 5;
      }
      if (mainType === 'Mounting' && (make.includes('chief') || make.includes('peerless'))) {
        mainTypeScore += 3;
      }
      if (mainType === 'Audio' && (make.includes('jbl') || make.includes('shure') || make.includes('crown'))) {
        mainTypeScore += 3;
      }
      
      if (mainTypeScore > bestScore) {
        bestScore = mainTypeScore;
        bestMainType = mainType;
        
        // Find best sub-category
        const bestSub = Object.entries(subCategoryScores).reduce((best, [sub, score]) => 
          score > best.score ? { sub, score } : best, { sub: 'Uncategorized', score: 0 }
        );
        bestSubCategory = bestSub.sub;
        
        reasoning = `Matched ${config.patterns.filter(p => 
          description.includes(p) || make.includes(p) || model.includes(p)
        ).join(', ')}`;
      }
    });

    return {
      component_id: component.id,
      current_type: component.component_type || 'Uncategorized',
      current_category: component.component_category || 'Uncategorized',
      suggested_type: bestMainType,
      suggested_category: bestSubCategory,
      confidence: Math.min(bestScore * 8, 100),
      description: component.description,
      make: component.make,
      model: component.model,
      reasoning: bestScore > 0 ? reasoning : 'No clear pattern match',
      needs_manual_review: bestScore < 3
    };
  });

  // Filter high-confidence suggestions (both type and category)
  const highConfidenceSuggestions = categorizationResults.filter(s => s.confidence >= 60);
  const needsManualReview = categorizationResults.filter(s => s.needs_manual_review);

  console.log(`Enhanced categorization complete: ${highConfidenceSuggestions.length} high-confidence, ${needsManualReview.length} need manual review`);

  return {
    total_components: components.length,
    categorization_results: categorizationResults,
    high_confidence_suggestions: highConfidenceSuggestions,
    needs_manual_review: needsManualReview,
    categorization_summary: {
      by_type: Object.fromEntries(
        Object.keys(enhancedPatterns).map(type => [
          type, 
          categorizationResults.filter(r => r.suggested_type === type).length
        ])
      ),
      by_category: Object.fromEntries(
        Object.values(enhancedPatterns).flatMap(config => 
          Object.keys(config.subCategories)
        ).map(category => [
          category,
          categorizationResults.filter(r => r.suggested_category === category).length
        ])
      )
    }
  };
}; 