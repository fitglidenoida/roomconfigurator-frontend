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
      component_id: component.documentId || component.id,
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
  
  // Get learning feedback to avoid re-suggesting corrected patterns
  const learningStats = getLearningStats();
  const correctedComponents = new Set();
  
  if (learningStats && learningStats.recentFeedback) {
    learningStats.recentFeedback.forEach((feedback: any) => {
      if (feedback.userCorrection.action === 'edit' || feedback.userCorrection.action === 'accept') {
        correctedComponents.add(feedback.componentId);
      }
    });
  }
  
  console.log(`Found ${correctedComponents.size} previously corrected components to skip`);
  
  // Get dynamic patterns from user feedback
  const dynamicPatterns = getDynamicPatterns();
  console.log('Dynamic patterns from user feedback:', dynamicPatterns);
  
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
      patterns: ['controller', 'processor', 'dsp', 'control', 'automation', 'crestron', 'amx', 'extron'],
      examples: ['Crestron Controller', 'Extron Matrix', 'AMX System'],
      subCategories: {
        'Controllers': ['controller', 'processor', 'automation', 'crestron', 'amx', 'extron'],
        'Touch Panels': ['touch', 'panel', 'interface', 'keypad'],
        'Software': ['software', 'platform', 'management', 'app']
      }
    },
    'Switcher': {
      patterns: ['switch', 'matrix', 'switcher', 'distribution', 'multiviewer', 'extron', 'crestron', 'kramer', 'atlona'],
      examples: ['Extron Matrix Switcher', 'Crestron Switcher', 'Kramer Switcher'],
      subCategories: {
        'Video Switchers': ['video switch', 'matrix', 'multiviewer', 'video matrix'],
        'Audio Switchers': ['audio switch', 'audio matrix', 'mixer'],
        'Matrix Switchers': ['matrix switcher', 'matrix switch', 'crosspoint'],
        'Distribution Amplifiers': ['distribution', 'da', 'splitter', 'amplifier']
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
    // Skip components that have already been corrected by the user
    if (correctedComponents.has(component.documentId || component.id)) {
      console.log(`Skipping previously corrected component: ${component.description}`);
      return {
        component_id: component.documentId || component.id,
        current_type: component.component_type || 'Uncategorized',
        current_category: component.component_category || 'Uncategorized',
        suggested_type: component.component_type || 'Uncategorized',
        suggested_category: component.component_category || 'Uncategorized',
        confidence: 100,
        description: component.description,
        make: component.make,
        model: component.model,
        reasoning: 'Previously corrected by user',
        needs_manual_review: false,
        skip_suggestion: true // Flag to indicate this should be skipped in suggestions
      };
    }
    
    // Skip components that are already properly categorized
    const currentType = component.component_type || 'Uncategorized';
    const currentCategory = component.component_category || 'Uncategorized';
    
    if (currentType !== 'Uncategorized' && currentType !== 'AV Equipment' && 
        currentCategory !== 'Uncategorized' && currentCategory !== 'AV Equipment') {
      console.log(`Skipping already categorized component: ${component.description} (${currentType}/${currentCategory})`);
      return {
        component_id: component.documentId || component.id,
        current_type: currentType,
        current_category: currentCategory,
        suggested_type: currentType,
        suggested_category: currentCategory,
        confidence: 100,
        description: component.description,
        make: component.make,
        model: component.model,
        reasoning: 'Already properly categorized',
        needs_manual_review: false,
        skip_suggestion: true
      };
    }
    
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
      
      // Apply dynamic patterns from user feedback
      if (dynamicPatterns && dynamicPatterns[mainType]) {
        const userPatterns = dynamicPatterns[mainType];
        
        // Check user-learned patterns
        if (userPatterns.newPatterns) {
          userPatterns.newPatterns.forEach((pattern: string) => {
            if (description.includes(pattern)) mainTypeScore += 3; // Higher weight for user-learned patterns
            if (make.includes(pattern)) mainTypeScore += 2;
            if (model.includes(pattern)) mainTypeScore += 2;
          });
        }
        
        // Check user-learned brand patterns
        if (userPatterns.brandPatterns) {
          userPatterns.brandPatterns.forEach((brand: string) => {
            if (make.includes(brand)) mainTypeScore += 4; // High weight for user-learned brands
          });
        }
        
        // Check user-learned sub-category patterns
        if (userPatterns.newSubCategories) {
          Object.entries(userPatterns.newSubCategories).forEach(([subCategory, patterns]) => {
            let subScore = 0;
            (patterns as string[]).forEach((pattern: string) => {
              if (description.includes(pattern)) subScore += 4; // Higher weight for user-learned patterns
              if (make.includes(pattern)) subScore += 3;
              if (model.includes(pattern)) subScore += 3;
            });
            subCategoryScores[subCategory] = (subCategoryScores[subCategory] || 0) + subScore;
          });
        }
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
        
        // Add user-learned patterns to reasoning
        if (dynamicPatterns && dynamicPatterns[mainType]) {
          const userPatterns = dynamicPatterns[mainType];
          const learnedPatterns: string[] = [];
          
          if (userPatterns.newPatterns) {
            userPatterns.newPatterns.forEach((pattern: string) => {
              if (description.includes(pattern) || make.includes(pattern) || model.includes(pattern)) {
                learnedPatterns.push(pattern);
              }
            });
          }
          
          if (learnedPatterns.length > 0) {
            reasoning += ` + learned patterns: ${learnedPatterns.join(', ')}`;
          }
        }
      }
    });

    return {
      component_id: component.documentId || component.id,
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

  // Filter high-confidence suggestions (both type and category), excluding skipped items
  const highConfidenceSuggestions = categorizationResults.filter(s => s.confidence >= 60 && !s.skip_suggestion);
  const needsManualReview = categorizationResults.filter(s => s.needs_manual_review && !s.skip_suggestion);

  console.log(`Enhanced categorization complete: ${highConfidenceSuggestions.length} high-confidence, ${needsManualReview.length} need manual review, ${categorizationResults.filter(r => r.skip_suggestion).length} already categorized`);

  return {
    total_components: components.length,
    categorization_results: categorizationResults,
    high_confidence_suggestions: highConfidenceSuggestions,
    needs_manual_review: needsManualReview,
    categorization_summary: {
      by_type: Object.fromEntries(
        Object.keys(enhancedPatterns).map(type => [
          type, 
          categorizationResults.filter(r => r.suggested_type === type && !r.skip_suggestion).length
        ])
      ),
      by_category: Object.fromEntries(
        Object.values(enhancedPatterns).flatMap(config => 
          Object.keys(config.subCategories)
        ).map(category => [
          category,
          categorizationResults.filter(r => r.suggested_category === category && !r.skip_suggestion).length
        ])
      )
    },
    skipped_components: categorizationResults.filter(r => r.skip_suggestion).length,
    corrected_components: correctedComponents.size
  };
}; 

// Supervised Learning System
interface LearningFeedback {
  componentId: string;
  originalSuggestion: {
    type: string;
    category: string;
    confidence: number;
  };
  userCorrection: {
    type: string;
    category: string;
    action: 'accept' | 'reject' | 'edit';
  };
  componentData: {
    description: string;
    make: string;
    model: string;
  };
  timestamp: Date;
}

// Store learning feedback in localStorage for persistence
const LEARNING_STORAGE_KEY = 'ml_learning_feedback';

// Store feedback for supervised learning
export const storeLearningFeedback = (feedback: LearningFeedback) => {
  try {
    const existingFeedback = localStorage.getItem(LEARNING_STORAGE_KEY);
    const feedbackArray: LearningFeedback[] = existingFeedback ? JSON.parse(existingFeedback) : [];
    
    // Add new feedback
    feedbackArray.push(feedback);
    
    // Keep only last 1000 feedback entries to prevent storage bloat
    if (feedbackArray.length > 1000) {
      feedbackArray.splice(0, feedbackArray.length - 1000);
    }
    
    localStorage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(feedbackArray));
    console.log('Learning feedback stored:', feedback);
    
    // Trigger pattern update
    updatePatternsFromFeedback();
  } catch (error) {
    console.error('Error storing learning feedback:', error);
  }
};

// Update patterns based on accumulated feedback
const updatePatternsFromFeedback = () => {
  try {
    const existingFeedback = localStorage.getItem(LEARNING_STORAGE_KEY);
    if (!existingFeedback) return;
    
    const feedbackArray: LearningFeedback[] = JSON.parse(existingFeedback);
    
    // Analyze feedback to improve patterns
    const patternImprovements = analyzeFeedbackForPatterns(feedbackArray);
    
    // Apply improvements to the enhanced patterns
    applyPatternImprovements(patternImprovements);
    
    console.log('Patterns updated based on feedback:', patternImprovements);
  } catch (error) {
    console.error('Error updating patterns from feedback:', error);
  }
};

// Analyze feedback to identify pattern improvements
const analyzeFeedbackForPatterns = (feedback: LearningFeedback[]) => {
  const improvements: {
    [type: string]: {
      newPatterns: string[];
      newSubCategories: { [key: string]: string[] };
      brandPatterns: string[];
    };
  } = {};
  
  feedback.forEach(feedbackItem => {
    const { originalSuggestion, userCorrection, componentData } = feedbackItem;
    
    // Only learn from corrections (not accepts)
    if (userCorrection.action === 'accept') return;
    
    const correctedType = userCorrection.type;
    const correctedCategory = userCorrection.category;
    const { description, make, model } = componentData;
    
    // Extract potential patterns from the corrected component
    const words = `${description} ${make} ${model}`.toLowerCase().split(/\s+/);
    
    if (!improvements[correctedType]) {
      improvements[correctedType] = {
        newPatterns: [],
        newSubCategories: {},
        brandPatterns: []
      };
    }
    
    // Add new patterns
    words.forEach(word => {
      if (word.length > 2 && !improvements[correctedType].newPatterns.includes(word)) {
        improvements[correctedType].newPatterns.push(word);
      }
    });
    
    // Add brand patterns
    if (make && make.length > 2) {
      improvements[correctedType].brandPatterns.push(make.toLowerCase());
    }
    
    // Add sub-category patterns
    if (!improvements[correctedType].newSubCategories[correctedCategory]) {
      improvements[correctedType].newSubCategories[correctedCategory] = [];
    }
    
    words.forEach(word => {
      if (word.length > 2 && !improvements[correctedType].newSubCategories[correctedCategory].includes(word)) {
        improvements[correctedType].newSubCategories[correctedCategory].push(word);
      }
    });
  });
  
  return improvements;
};

// Apply pattern improvements to the enhanced patterns
const applyPatternImprovements = (improvements: any) => {
  console.log('Pattern improvements to apply:', improvements);
  
  // Store improvements in localStorage for dynamic application
  try {
    localStorage.setItem('ml_pattern_improvements', JSON.stringify(improvements));
    console.log('Pattern improvements stored for dynamic application');
  } catch (error) {
    console.error('Error storing pattern improvements:', error);
  }
};

// Get dynamic patterns that include user feedback
const getDynamicPatterns = () => {
  try {
    const storedImprovements = localStorage.getItem('ml_pattern_improvements');
    if (!storedImprovements) return null;
    
    return JSON.parse(storedImprovements);
  } catch (error) {
    console.error('Error loading dynamic patterns:', error);
    return null;
  }
};

// Get learning statistics
export const getLearningStats = () => {
  try {
    const existingFeedback = localStorage.getItem(LEARNING_STORAGE_KEY);
    if (!existingFeedback) return null;
    
    const feedbackArray: LearningFeedback[] = JSON.parse(existingFeedback);
    
    const stats = {
      totalFeedback: feedbackArray.length,
      accepts: feedbackArray.filter(f => f.userCorrection.action === 'accept').length,
      corrections: feedbackArray.filter(f => f.userCorrection.action !== 'accept').length,
      accuracyImprovement: calculateAccuracyImprovement(feedbackArray),
      recentFeedback: feedbackArray.slice(-10) // Last 10 feedback items
    };
    
    return stats;
  } catch (error) {
    console.error('Error getting learning stats:', error);
    return null;
  }
};

// Calculate accuracy improvement over time
const calculateAccuracyImprovement = (feedback: LearningFeedback[]) => {
  if (feedback.length < 10) return null;
  
  // Split feedback into early and recent periods
  const earlyPeriod = feedback.slice(0, Math.floor(feedback.length / 2));
  const recentPeriod = feedback.slice(Math.floor(feedback.length / 2));
  
  const earlyAccuracy = earlyPeriod.filter(f => f.userCorrection.action === 'accept').length / earlyPeriod.length;
  const recentAccuracy = recentPeriod.filter(f => f.userCorrection.action === 'accept').length / recentPeriod.length;
  
  return {
    earlyAccuracy: Math.round(earlyAccuracy * 100),
    recentAccuracy: Math.round(recentAccuracy * 100),
    improvement: Math.round((recentAccuracy - earlyAccuracy) * 100)
  };
};

// Enhanced categorization with learning feedback integration
export const enhancedCategorizeComponentsWithLearning = async (components: any[]) => {
  console.log('Starting enhanced component categorization with learning feedback...');
  
  // Get learning feedback to improve patterns
  const learningStats = getLearningStats();
  console.log('Learning stats:', learningStats);
  
  // Use the existing enhanced categorization
  const results = await enhancedCategorizeComponents(components);
  
  // Add learning context to results
  return {
    ...results,
    learningStats,
    modelVersion: '1.1', // Increment version when patterns are updated
    lastTraining: new Date().toISOString()
  };
};

// Re-categorize uncategorized components with learned patterns
export const recategorizeWithLearning = async (components: any[]) => {
  console.log('Re-categorizing uncategorized components with learned patterns...');
  
  // Get only uncategorized components
  const uncategorizedComponents = components.filter(comp => 
    !comp.component_type || 
    comp.component_type === 'Uncategorized' || 
    comp.component_type === 'AV Equipment' ||
    !comp.component_category ||
    comp.component_category === 'Uncategorized' ||
    comp.component_category === 'AV Equipment'
  );
  
  console.log(`Found ${uncategorizedComponents.length} uncategorized components to re-categorize`);
  
  // Apply enhanced categorization with learning
  const results = await enhancedCategorizeComponentsWithLearning(uncategorizedComponents);
  
  // Filter for new high-confidence suggestions
  const newSuggestions = results.high_confidence_suggestions.filter(suggestion => {
    const component = components.find(c => (c.documentId || c.id) === suggestion.component_id);
    return component && (
      !component.component_type || 
      component.component_type === 'Uncategorized' || 
      component.component_type === 'AV Equipment'
    );
  });
  
  console.log(`Generated ${newSuggestions.length} new suggestions using learned patterns`);
  
  return {
    ...results,
    new_suggestions: newSuggestions,
    recategorized_count: newSuggestions.length
  };
}; 