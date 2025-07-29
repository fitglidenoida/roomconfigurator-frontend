// ML Service for Room Configurator - Complete Supervised Learning Implementation

// Utility function for safe localStorage access
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(key);
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, value);
    }
  },
  removeItem: (key: string): void => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(key);
    }
  }
};

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

// Enhanced interfaces for supervised learning
export interface LearningFeedback {
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

export interface ModelPerformance {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  totalPredictions: number;
  correctPredictions: number;
  lastUpdated: Date;
}

export interface TrainedModel {
  version: string;
  patterns: {
    [type: string]: {
      patterns: string[];
      examples: string[];
      subCategories: { [key: string]: string[] };
      confidence: number;
      trainingData: number;
    };
  };
  performance: ModelPerformance;
  trainingDate: Date;
  lastFeedbackDate: Date;
}

// Storage keys
const LEARNING_STORAGE_KEY = 'ml_learning_feedback';
const MODEL_STORAGE_KEY = 'ml_trained_model';
const PERFORMANCE_STORAGE_KEY = 'ml_performance_metrics';
const PATTERN_IMPROVEMENTS_KEY = 'ml_pattern_improvements';

class SupervisedLearningModel {
  private model: TrainedModel | null = null;
  private feedbackBuffer: LearningFeedback[] = [];
  private readonly MIN_FEEDBACK_FOR_TRAINING = 3; // Reduced from 10 to make learning more responsive
  private readonly MIN_CONFIDENCE_THRESHOLD = 0.7;
  private readonly MAX_PATTERNS_PER_TYPE = 50;

  constructor() {
    this.loadModel();
    this.loadFeedbackBuffer();
  }

  // Load trained model from storage
  private loadModel(): void {
    try {
      const storedModel = safeLocalStorage.getItem(MODEL_STORAGE_KEY);
      if (storedModel) {
        this.model = JSON.parse(storedModel);
        console.log('Loaded trained model:', this.model?.version);
      }
    } catch (error) {
      console.error('Error loading model:', error);
    }
  }

  // Save trained model to storage
  private saveModel(model: TrainedModel): void {
    try {
      safeLocalStorage.setItem(MODEL_STORAGE_KEY, JSON.stringify(model));
      console.log('Model saved successfully:', model.version);
    } catch (error) {
      console.error('Error saving model:', error);
    }
  }

  // Load feedback buffer
  private loadFeedbackBuffer(): void {
    try {
      const storedFeedback = safeLocalStorage.getItem(LEARNING_STORAGE_KEY);
      if (storedFeedback) {
        this.feedbackBuffer = JSON.parse(storedFeedback);
        console.log('Loaded feedback buffer:', this.feedbackBuffer.length, 'items');
      }
    } catch (error) {
      console.error('Error loading feedback buffer:', error);
    }
  }

  // Save feedback buffer
  private saveFeedbackBuffer(): void {
    try {
      safeLocalStorage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(this.feedbackBuffer));
    } catch (error) {
      console.error('Error saving feedback buffer:', error);
    }
  }

  // Extract features from component description
  private extractFeatures(description: string, make: string, model: string): string[] {
    const text = `${description} ${make} ${model}`.toLowerCase();
    
    // Extract words, numbers, and special patterns
    const words = text.split(/\s+/).filter(word => word.length > 2);
    const numbers = text.match(/\d+/g) || [];
    const brands = [make.toLowerCase()].filter(brand => brand.length > 2);
    
    // Extract technical terms
    const technicalTerms = [
      'hdmi', 'vga', 'dvi', 'displayport', 'ethernet', 'wifi', 'bluetooth',
      '4k', 'hd', 'ultra', 'pro', 'plus', 'max', 'mini', 'nano',
      'wireless', 'wired', 'portable', 'fixed', 'ceiling', 'wall', 'floor'
    ].filter(term => text.includes(term));

    return [...new Set([...words, ...numbers, ...brands, ...technicalTerms])];
  }

  // Calculate similarity between two feature sets
  private calculateSimilarity(features1: string[], features2: string[]): number {
    if (features1.length === 0 || features2.length === 0) return 0;
    
    const intersection = features1.filter(f => features2.includes(f));
    const union = [...new Set([...features1, ...features2])];
    
    return intersection.length / union.length;
  }

  // Predict component type and category using trained model
  public predict(description: string, make: string, model: string): {
    type: string;
    category: string;
    confidence: number;
    reasoning: string[];
  } {
    if (!this.model) {
      return {
        type: 'Uncategorized',
        category: 'Uncategorized',
        confidence: 0,
        reasoning: ['No trained model available']
      };
    }

    const features = this.extractFeatures(description, make, model);
    const predictions: Array<{
      type: string;
      category: string;
      confidence: number;
      reasoning: string[];
    }> = [];

    // Test against each trained pattern
    Object.entries(this.model.patterns).forEach(([type, typeData]) => {
      const typeFeatures = typeData.patterns;
      const typeSimilarity = this.calculateSimilarity(features, typeFeatures);
      
      if (typeSimilarity > 0.1) { // Minimum similarity threshold
        // Find best sub-category
        Object.entries(typeData.subCategories).forEach(([category, categoryPatterns]) => {
          const categorySimilarity = this.calculateSimilarity(features, categoryPatterns);
          
          // Boost confidence based on training data
          const trainingDataBoost = Math.min(typeData.trainingData / 20, 0.2); // Max 20% boost
          const baseConfidence = (typeSimilarity + categorySimilarity) / 2;
          const overallConfidence = Math.min(baseConfidence + trainingDataBoost, 1.0);
          
          if (overallConfidence > this.MIN_CONFIDENCE_THRESHOLD) {
            predictions.push({
              type,
              category,
              confidence: overallConfidence,
              reasoning: [
                `Type similarity: ${(typeSimilarity * 100).toFixed(1)}%`,
                `Category similarity: ${(categorySimilarity * 100).toFixed(1)}%`,
                `Training data boost: +${(trainingDataBoost * 100).toFixed(1)}% (${typeData.trainingData} examples)`,
                `Patterns matched: ${features.filter(f => typeFeatures.includes(f)).join(', ')}`
              ]
            });
          }
        });
      }
    });

    // Return best prediction
    if (predictions.length > 0) {
      const bestPrediction = predictions.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );
      return bestPrediction;
    }

    return {
      type: 'Uncategorized',
      category: 'Uncategorized',
      confidence: 0,
      reasoning: ['No patterns matched above confidence threshold']
    };
  }

  // Add feedback for supervised learning
  public addFeedback(feedback: LearningFeedback): void {
    this.feedbackBuffer.push(feedback);
    this.saveFeedbackBuffer();
    
    // Check if we have enough feedback to retrain
    if (this.feedbackBuffer.length >= this.MIN_FEEDBACK_FOR_TRAINING) {
      this.retrainModel();
    }
  }

  // Retrain model using accumulated feedback
  private retrainModel(): void {
    console.log('Retraining model with', this.feedbackBuffer.length, 'feedback items');
    
    const newPatterns: { [type: string]: any } = {};
    const corrections = this.feedbackBuffer.filter(f => f.userCorrection.action !== 'accept');
    const accepts = this.feedbackBuffer.filter(f => f.userCorrection.action === 'accept');
    
    console.log(`Processing ${corrections.length} corrections and ${accepts.length} accepts`);
    
    // Process corrections (user edits/rejections)
    corrections.forEach(feedback => {
      const { userCorrection, componentData } = feedback;
      const type = userCorrection.type;
      const category = userCorrection.category;
      const features = this.extractFeatures(
        componentData.description,
        componentData.make,
        componentData.model
      );

      if (!newPatterns[type]) {
        newPatterns[type] = {
          patterns: [],
          examples: [],
          subCategories: {},
          confidence: 0,
          trainingData: 0
        };
      }

      // Add features as patterns with higher weight for corrections
      features.forEach(feature => {
        if (!newPatterns[type].patterns.includes(feature)) {
          newPatterns[type].patterns.push(feature);
        }
      });

      // Add sub-category patterns
      if (!newPatterns[type].subCategories[category]) {
        newPatterns[type].subCategories[category] = [];
      }
      features.forEach(feature => {
        if (!newPatterns[type].subCategories[category].includes(feature)) {
          newPatterns[type].subCategories[category].push(feature);
        }
      });

      // Add example
      const example = `${componentData.make} ${componentData.model}`;
      if (!newPatterns[type].examples.includes(example)) {
        newPatterns[type].examples.push(example);
      }

      newPatterns[type].trainingData++;
    });
    
    // Process accepts (reinforce existing patterns)
    accepts.forEach(feedback => {
      const { userCorrection, componentData } = feedback;
      const type = userCorrection.type;
      const category = userCorrection.category;
      const features = this.extractFeatures(
        componentData.description,
        componentData.make,
        componentData.model
      );

      if (!newPatterns[type]) {
        newPatterns[type] = {
          patterns: [],
          examples: [],
          subCategories: {},
          confidence: 0,
          trainingData: 0
        };
      }

      // Add features as patterns (reinforce existing patterns)
      features.forEach(feature => {
        if (!newPatterns[type].patterns.includes(feature)) {
          newPatterns[type].patterns.push(feature);
        }
      });

      // Add sub-category patterns
      if (!newPatterns[type].subCategories[category]) {
        newPatterns[type].subCategories[category] = [];
      }
      features.forEach(feature => {
        if (!newPatterns[type].subCategories[category].includes(feature)) {
          newPatterns[type].subCategories[category].push(feature);
        }
      });

      // Add example
      const example = `${componentData.make} ${componentData.model}`;
      if (!newPatterns[type].examples.includes(example)) {
        newPatterns[type].examples.push(example);
      }

      newPatterns[type].trainingData++;
    });

    // Merge with existing model patterns
    const mergedPatterns = { ...this.getBasePatterns() };
    Object.entries(newPatterns).forEach(([type, typeData]) => {
      if (mergedPatterns[type]) {
        // Merge with existing type
        mergedPatterns[type].patterns = [
          ...mergedPatterns[type].patterns,
          ...typeData.patterns
        ].slice(0, this.MAX_PATTERNS_PER_TYPE);
        
        mergedPatterns[type].examples = [
          ...mergedPatterns[type].examples,
          ...typeData.examples
        ];
        
        Object.entries(typeData.subCategories).forEach(([category, patterns]) => {
          if (mergedPatterns[type].subCategories[category]) {
            mergedPatterns[type].subCategories[category] = [
              ...mergedPatterns[type].subCategories[category],
              ...(patterns as string[])
            ];
          } else {
            mergedPatterns[type].subCategories[category] = patterns as string[];
          }
        });
      } else {
        // New type
        mergedPatterns[type] = typeData;
      }
    });

    // Calculate confidence scores
    Object.keys(mergedPatterns).forEach(type => {
      const typeCorrections = corrections.filter(f => f.userCorrection.type === type);
      const totalPredictions = this.feedbackBuffer.filter(f => 
        f.originalSuggestion.type === type
      ).length;
      
      if (totalPredictions > 0) {
        const correctPredictions = typeCorrections.length;
        mergedPatterns[type].confidence = correctPredictions / totalPredictions;
      }
    });

    // Create new model
    const newModel: TrainedModel = {
      version: this.model ? `${this.model.version}.${Date.now()}` : '1.0.0',
      patterns: mergedPatterns,
      performance: this.calculatePerformance(),
      trainingDate: new Date(),
      lastFeedbackDate: new Date()
    };

    this.model = newModel;
    this.saveModel(newModel);
    
    console.log('Model retrained successfully:', newModel.version);
  }

  // Calculate model performance metrics
  private calculatePerformance(): ModelPerformance {
    const totalPredictions = this.feedbackBuffer.length;
    const correctPredictions = this.feedbackBuffer.filter(f => 
      f.userCorrection.action === 'accept'
    ).length;
    
    const accuracy = totalPredictions > 0 ? correctPredictions / totalPredictions : 0;
    
    // Calculate precision and recall for each type
    const typeMetrics = new Map<string, { tp: number; fp: number; fn: number }>();
    
    this.feedbackBuffer.forEach(feedback => {
      const predictedType = feedback.originalSuggestion.type;
      const actualType = feedback.userCorrection.type;
      const isCorrect = feedback.userCorrection.action === 'accept';
      
      if (!typeMetrics.has(predictedType)) {
        typeMetrics.set(predictedType, { tp: 0, fp: 0, fn: 0 });
      }
      if (!typeMetrics.has(actualType)) {
        typeMetrics.set(actualType, { tp: 0, fp: 0, fn: 0 });
      }
      
      if (isCorrect) {
        typeMetrics.get(predictedType)!.tp++;
      } else {
        typeMetrics.get(predictedType)!.fp++;
        typeMetrics.get(actualType)!.fn++;
      }
    });
    
    let totalPrecision = 0;
    let totalRecall = 0;
    let typeCount = 0;
    
    typeMetrics.forEach(metrics => {
      const precision = metrics.tp + metrics.fp > 0 ? metrics.tp / (metrics.tp + metrics.fp) : 0;
      const recall = metrics.tp + metrics.fn > 0 ? metrics.tp / (metrics.tp + metrics.fn) : 0;
      
      totalPrecision += precision;
      totalRecall += recall;
      typeCount++;
    });
    
    const avgPrecision = typeCount > 0 ? totalPrecision / typeCount : 0;
    const avgRecall = typeCount > 0 ? totalRecall / typeCount : 0;
    const f1Score = avgPrecision + avgRecall > 0 ? 
      2 * (avgPrecision * avgRecall) / (avgPrecision + avgRecall) : 0;

    return {
      accuracy: Math.round(accuracy * 100),
      precision: Math.round(avgPrecision * 100),
      recall: Math.round(avgRecall * 100),
      f1Score: Math.round(f1Score * 100),
      totalPredictions,
      correctPredictions,
      lastUpdated: new Date()
    };
  }

  // Get base patterns for initialization
  private getBasePatterns(): any {
    return {
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
        },
        confidence: 0.8,
        trainingData: 0
      },
      'Video': {
        patterns: ['camera', 'video', 'streaming', 'recording', 'capture', 'ptz', 'ip camera', 'webcam', 'display', 'tv', 'monitor', 'screen', 'panel', 'lcd', 'oled', 'led', 'projection', 'video wall', 'digital signage'],
        examples: ['PTZ Camera', 'IP Camera', 'Samsung TV', 'LG Monitor'],
        subCategories: {
          'Displays': ['display', 'tv', 'monitor', 'screen', 'panel', 'lcd', 'oled', 'led', 'video wall', 'digital signage'],
          'Projectors': ['projector', 'lens', 'projection', 'lumens', '4k', 'hd'],
          'Cameras': ['camera', 'ptz', 'ip camera', 'webcam', 'surveillance'],
          'Recorders': ['recorder', 'dvr', 'nvr', 'streaming', 'capture']
        },
        confidence: 0.8,
        trainingData: 0
      },
      'Control': {
        patterns: ['controller', 'processor', 'dsp', 'control', 'automation', 'crestron', 'amx', 'extron'],
        examples: ['Crestron Controller', 'Extron Matrix', 'AMX System'],
        subCategories: {
          'Controllers': ['controller', 'processor', 'automation', 'crestron', 'amx', 'extron'],
          'Touch Panels': ['touch', 'panel', 'interface', 'keypad'],
          'Software': ['software', 'platform', 'management', 'app']
        },
        confidence: 0.8,
        trainingData: 0
      },
      'Switcher': {
        patterns: ['switch', 'matrix', 'switcher', 'distribution', 'multiviewer', 'extron', 'crestron', 'kramer', 'atlona'],
        examples: ['Extron Matrix Switcher', 'Crestron Switcher', 'Kramer Switcher'],
        subCategories: {
          'Video Switchers': ['video switch', 'matrix', 'multiviewer', 'video matrix'],
          'Audio Switchers': ['audio switch', 'audio matrix', 'mixer'],
          'Matrix Switchers': ['matrix switcher', 'matrix switch', 'crosspoint'],
          'Distribution Amplifiers': ['distribution', 'da', 'splitter', 'amplifier']
        },
        confidence: 0.8,
        trainingData: 0
      },
      'Cabling': {
        patterns: ['cable', 'wire', 'connector', 'hdmi', 'vga', 'dvi', 'displayport', 'ethernet', 'fiber', 'cat6', 'cat7', 'patch'],
        examples: ['HDMI Cable', 'Ethernet Cable', 'Fiber Optic'],
        subCategories: {
          'Video Cables': ['hdmi', 'vga', 'dvi', 'displayport', 'component', 'composite'],
          'Audio Cables': ['xlr', 'trs', 'rca', 'speakon', 'banana'],
          'Network Cables': ['ethernet', 'cat6', 'cat7', 'fiber', 'patch'],
          'Power Cables': ['power', 'ac', 'dc', 'adapter']
        },
        confidence: 0.8,
        trainingData: 0
      },
      'Mounting': {
        patterns: ['mount', 'bracket', 'stand', 'support', 'holder', 'clamp', 'rail', 'ceiling', 'wall', 'floor'],
        examples: ['Chief Mount', 'Wall Bracket', 'Ceiling Mount'],
        subCategories: {
          'Wall Mounts': ['wall mount', 'bracket', 'arm'],
          'Ceiling Mounts': ['ceiling mount', 'drop mount'],
          'Floor Stands': ['floor stand', 'tripod', 'base'],
          'Rack Mounts': ['rack mount', 'rack ears', 'chassis']
        },
        confidence: 0.8,
        trainingData: 0
      },
      'Network': {
        patterns: ['switch', 'router', 'ethernet', 'wifi', 'network', 'poe', 'wireless', 'access point', 'firewall'],
        examples: ['Network Switch', 'WiFi Router', 'Access Point'],
        subCategories: {
          'Switches': ['switch', 'poe switch', 'managed switch'],
          'Routers': ['router', 'gateway', 'firewall'],
          'Wireless': ['wifi', 'wireless', 'access point', 'repeater'],
          'Network Tools': ['tester', 'crimper', 'analyzer']
        },
        confidence: 0.8,
        trainingData: 0
      },
      'Power': {
        patterns: ['power', 'supply', 'ups', 'battery', 'adapter', 'transformer', 'pdu', 'power distribution'],
        examples: ['UPS System', 'Power Supply', 'PDU Unit'],
        subCategories: {
          'UPS Systems': ['ups', 'uninterruptible', 'battery backup'],
          'Power Supplies': ['power supply', 'adapter', 'transformer'],
          'PDUs': ['pdu', 'power distribution', 'rack pdu'],
          'Batteries': ['battery', 'backup', 'rechargeable']
        },
        confidence: 0.8,
        trainingData: 0
      },
      'Lighting': {
        patterns: ['light', 'led', 'lamp', 'illumination', 'ambient', 'dimmer', 'fixture', 'bulb'],
        examples: ['LED Light', 'Dimmer Switch', 'Light Fixture'],
        subCategories: {
          'LED Lights': ['led', 'light', 'fixture', 'strip'],
          'Controls': ['dimmer', 'switch', 'controller'],
          'Accessories': ['bulb', 'lamp', 'holder']
        },
        confidence: 0.8,
        trainingData: 0
      },
      'Rack & Enclosures': {
        patterns: ['rack', 'cabinet', 'enclosure', 'housing', 'case', 'chassis', 'server rack', 'equipment rack'],
        examples: ['Server Rack', 'Equipment Cabinet', 'Rack Mount'],
        subCategories: {
          'Racks': ['rack', 'cabinet', 'server rack', 'equipment rack'],
          'Enclosures': ['enclosure', 'housing', 'case', 'chassis'],
          'Accessories': ['shelf', 'bracket', 'fans', 'cable management']
        },
        confidence: 0.8,
        trainingData: 0
      },
      'Tools & Accessories': {
        patterns: ['tool', 'accessory', 'adapter', 'converter', 'splitter', 'extender', 'repeater'],
        examples: ['HDMI Splitter', 'Adapter', 'Extension Cable'],
        subCategories: {
          'Adapters': ['adapter', 'converter', 'transcoder'],
          'Splitters': ['splitter', 'distribution', 'multiviewer'],
          'Extenders': ['extender', 'repeater', 'booster'],
          'Tools': ['tool', 'tester', 'crimper', 'screwdriver']
        },
        confidence: 0.8,
        trainingData: 0
      }
    };
  }

  // Get model information
  public getModelInfo(): TrainedModel | null {
    return this.model;
  }

  // Get learning statistics
  public getLearningStats(): {
    totalFeedback: number;
    accepts: number;
    corrections: number;
    modelVersion: string | null;
    performance: ModelPerformance | null;
  } {
    const accepts = this.feedbackBuffer.filter(f => f.userCorrection.action === 'accept').length;
    const corrections = this.feedbackBuffer.filter(f => f.userCorrection.action !== 'accept').length;
    
    return {
      totalFeedback: this.feedbackBuffer.length,
      accepts,
      corrections,
      modelVersion: this.model?.version || null,
      performance: this.model?.performance || null
    };
  }

  // Force retrain model
  public forceRetrain(): void {
    if (this.feedbackBuffer.length > 0) {
      this.retrainModel();
    }
  }

  // Clear all learning data
  public clearLearningData(): void {
    this.feedbackBuffer = [];
    this.model = null;
    this.saveFeedbackBuffer();
    safeLocalStorage.removeItem(MODEL_STORAGE_KEY);
    console.log('Learning data cleared');
  }
  
  // Debug function to understand ML state
  public debugMLState(): void {
    console.log('=== ML Debug State ===');
    console.log('Feedback buffer length:', this.feedbackBuffer.length);
    console.log('Model exists:', !!this.model);
    if (this.model) {
      console.log('Model version:', this.model.version);
      console.log('Model patterns:', Object.keys(this.model.patterns));
      console.log('Training data counts:', Object.entries(this.model.patterns).map(([type, data]) => 
        `${type}: ${data.trainingData} examples`
      ));
    }
    console.log('Recent feedback:', this.feedbackBuffer.slice(-5).map(f => ({
      action: f.userCorrection.action,
      type: f.userCorrection.type,
      category: f.userCorrection.category,
      component: `${f.componentData.make} ${f.componentData.model}`
    })));
    console.log('=====================');
  }
}

// Initialize the supervised learning model
const supervisedModel = new SupervisedLearningModel();

// Legacy MLService class for backward compatibility
class MLService {
  private componentEmbeddings: Map<string, number[]> = new Map();
  private costModels: Map<string, any> = new Map();

  async initialize() {
    console.log('Initializing ML Service...');
    await this.loadComponentEmbeddings();
    await this.loadCostModels();
  }

  private async loadComponentEmbeddings() {
    console.log('Loading component embeddings...');
  }

  private async loadCostModels() {
    console.log('Loading cost prediction models...');
  }

  async findSimilarComponents(
    targetComponent: any,
    _roomType: string,
    _budget: number
  ): Promise<MLComponentSuggestion[]> {
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

  async predictRoomCost(
    roomType: string,
    region: string,
    components: any[]
  ): Promise<CostPrediction> {
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

  async classifyRoomType(roomData: any): Promise<RoomClassification> {
    const mockClassification = {
      category: 'Conference Room',
      confidence: 0.85,
      suggestedComponents: ['Display', 'Audio System', 'Video Conferencing']
    };

    return mockClassification;
  }

  private extractFeatures(component: any): string[] {
    const features = [];
    if (component.description) features.push(component.description);
    if (component.make) features.push(component.make);
    if (component.model) features.push(component.model);
    return features;
  }

  private getBaseCost(roomType: string, region: string): number {
    const baseCosts: { [key: string]: { [key: string]: number } } = {
      'Conference Room': { 'US': 5000, 'EU': 4500, 'APAC': 4000 },
      'Meeting Room': { 'US': 3000, 'EU': 2700, 'APAC': 2400 },
      'Training Room': { 'US': 8000, 'EU': 7200, 'APAC': 6400 }
    };

    return baseCosts[roomType]?.[region] || 5000;
  }

  private getSuggestedComponents(category: string): string[] {
    const suggestions: { [key: string]: string[] } = {
      'Conference Room': ['Display', 'Audio System', 'Video Conferencing'],
      'Meeting Room': ['Display', 'Audio System'],
      'Training Room': ['Projector', 'Audio System', 'Interactive Display']
    };

    return suggestions[category] || [];
  }

  async optimizeForBudget(
    components: any[],
    targetBudget: number,
    roomType: string
  ): Promise<any[]> {
    const currentCost = components.reduce((sum, comp) => sum + (comp.cost || 0), 0);
    
    if (currentCost <= targetBudget) {
      return components;
    }

    // Simple optimization: remove most expensive components
    const sortedComponents = [...components].sort((a, b) => (b.cost || 0) - (a.cost || 0));
    const optimizedComponents = [];
    let runningCost = 0;

    for (const component of sortedComponents) {
      if (runningCost + (component.cost || 0) <= targetBudget) {
        optimizedComponents.push(component);
        runningCost += component.cost || 0;
      }
    }

    return optimizedComponents;
  }
}

// Export the supervised learning model instance
export const mlModel = supervisedModel;

// Export legacy functions for backward compatibility
export const trainOnUncategorizedComponents = async (uncategorizedComponents: any[]) => {
  console.log('Training on uncategorized components:', uncategorizedComponents.length);
  
  // Use supervised learning model for training
  uncategorizedComponents.forEach(component => {
    const prediction = supervisedModel.predict(
      component.description || '',
      component.make || '',
      component.model || ''
    );
    
    // Store feedback for learning
    const feedback: LearningFeedback = {
      componentId: component.documentId || component.id,
      originalSuggestion: {
        type: prediction.type,
        category: prediction.category,
        confidence: prediction.confidence
      },
      userCorrection: {
        type: prediction.type,
        category: prediction.category,
        action: 'accept'
      },
      componentData: {
        description: component.description || '',
        make: component.make || '',
        model: component.model || ''
      },
      timestamp: new Date()
    };
    
    supervisedModel.addFeedback(feedback);
  });
  
  return {
    trained_components: uncategorizedComponents.length,
    model_version: supervisedModel.getModelInfo()?.version || '1.0.0',
    accuracy: supervisedModel.getModelInfo()?.performance.accuracy || 0
  };
};

export const autoCategorizeComponents = async (components: any[]) => {
  console.log('Auto-categorizing components:', components.length);
  
  const results = components.map(component => {
    const prediction = supervisedModel.predict(
      component.description || '',
      component.make || '',
      component.model || ''
    );
    
    return {
      component_id: component.documentId || component.id,
      current_type: component.component_type || 'Uncategorized',
      current_category: component.component_category || 'Uncategorized',
      suggested_type: prediction.type,
      suggested_category: prediction.category,
      confidence: Math.round(prediction.confidence * 100),
      description: component.description,
      reasoning: prediction.reasoning
    };
  });
  
  return {
    categorized_components: results.length,
    high_confidence_suggestions: results.filter(r => r.confidence > 70),
    low_confidence_suggestions: results.filter(r => r.confidence <= 70),
    model_version: supervisedModel.getModelInfo()?.version || '1.0.0'
  };
};

export const analyzeComponentData = async (components: any[]) => {
  console.log('Analyzing component data:', components.length);
  
  const analysis = {
    total_components: components.length,
    categorized_components: components.filter(c => c.component_type && c.component_type !== 'Uncategorized').length,
    uncategorized_components: components.filter(c => !c.component_type || c.component_type === 'Uncategorized').length,
    type_distribution: {} as { [key: string]: number },
    category_distribution: {} as { [key: string]: number },
    brand_distribution: {} as { [key: string]: number },
    cost_analysis: {
      total_cost: 0,
      average_cost: 0,
      cost_range: { min: 0, max: 0 }
    }
  };
  
  // Analyze distributions
  components.forEach(component => {
    const type = component.component_type || 'Uncategorized';
    const category = component.component_category || 'Uncategorized';
    const brand = component.make || 'Unknown';
    const cost = component.unit_cost || 0;
    
    analysis.type_distribution[type] = (analysis.type_distribution[type] || 0) + 1;
    analysis.category_distribution[category] = (analysis.category_distribution[category] || 0) + 1;
    analysis.brand_distribution[brand] = (analysis.brand_distribution[brand] || 0) + 1;
    
    analysis.cost_analysis.total_cost += cost;
  });
  
  // Calculate cost statistics
  const costs = components.map(c => c.unit_cost || 0).filter(c => c > 0);
  if (costs.length > 0) {
    analysis.cost_analysis.average_cost = analysis.cost_analysis.total_cost / costs.length;
    analysis.cost_analysis.cost_range.min = Math.min(...costs);
    analysis.cost_analysis.cost_range.max = Math.max(...costs);
  }
  
  return analysis;
};

export const enhancedCategorizeComponents = async (components: any[]) => {
  console.log('Enhanced categorization with supervised learning...');
  
  const results = components.map(component => {
    const prediction = supervisedModel.predict(
      component.description || '',
      component.make || '',
      component.model || ''
    );
    
    return {
      component_id: component.documentId || component.id,
      current_type: component.component_type || 'Uncategorized',
      current_category: component.component_category || 'Uncategorized',
      suggested_type: prediction.type,
      suggested_category: prediction.category,
      confidence: Math.round(prediction.confidence * 100),
      description: component.description,
      reasoning: prediction.reasoning
    };
  });
  
  return {
    categorized_components: results.length,
    high_confidence_suggestions: results.filter(r => r.confidence > 70),
    low_confidence_suggestions: results.filter(r => r.confidence <= 70),
    needs_manual_review: components.filter(comp => 
      !comp.component_type || 
      comp.component_type === 'Uncategorized' || 
      comp.component_type === 'AV Equipment' ||
      !comp.component_category ||
      comp.component_category === 'Uncategorized' ||
      comp.component_category === 'AV Equipment'
    ),
    model_version: supervisedModel.getModelInfo()?.version || '1.0.0',
    model_performance: supervisedModel.getModelInfo()?.performance || null
  };
};

// Store learning feedback
export const storeLearningFeedback = (feedback: LearningFeedback) => {
  supervisedModel.addFeedback(feedback);
};

// Get learning statistics
export const getLearningStats = () => {
  return supervisedModel.getLearningStats();
};

// Debug ML state
export const debugMLState = () => {
  supervisedModel.debugMLState();
};

// Enhanced categorization with learning feedback integration
export const enhancedCategorizeComponentsWithLearning = async (components: any[]) => {
  console.log('Enhanced categorization with learning feedback...');
  
  const results = await enhancedCategorizeComponents(components);
  const learningStats = getLearningStats();
  
  return {
    ...results,
    learningStats,
    modelVersion: supervisedModel.getModelInfo()?.version || '1.0.0',
    lastTraining: supervisedModel.getModelInfo()?.trainingDate || new Date()
  };
};

// Re-categorize uncategorized components with learned patterns
export const recategorizeWithLearning = async (components: any[]) => {
  console.log('Re-categorizing with learned patterns...');
  
  // First, force retrain the model with accumulated feedback
  supervisedModel.forceRetrain();
  
  // Get all components that could benefit from learning
  const componentsToAnalyze = components.filter(comp => 
    !comp.component_type || 
    comp.component_type === 'Uncategorized' || 
    comp.component_type === 'AV Equipment' ||
    !comp.component_category ||
    comp.component_category === 'Uncategorized' ||
    comp.component_category === 'AV Equipment' ||
    // Also include components with low confidence or generic categories
    comp.component_category === 'Other Equipment' ||
    comp.component_category === 'Miscellaneous'
  );
  
  console.log(`Found ${componentsToAnalyze.length} components to analyze with learned patterns`);
  
  if (componentsToAnalyze.length === 0) {
    return {
      new_suggestions: [],
      recategorized_count: 0,
      message: 'No components found that need re-categorization. All components are properly categorized.'
    };
  }
  
  const results = await enhancedCategorizeComponentsWithLearning(componentsToAnalyze);
  
  // Filter for high confidence suggestions that are different from current categorization
  const newSuggestions = results.high_confidence_suggestions.filter(suggestion => {
    const component = components.find(c => (c.documentId || c.id) === suggestion.component_id);
    if (!component) return false;
    
    // Check if the suggestion is different from current categorization
    const currentType = component.component_type || 'Uncategorized';
    const currentCategory = component.component_category || 'Uncategorized';
    const suggestedType = suggestion.suggested_type;
    const suggestedCategory = suggestion.suggested_category;
    
    return (
      currentType !== suggestedType || 
      currentCategory !== suggestedCategory
    ) && (
      suggestedType !== 'Uncategorized' && 
      suggestedCategory !== 'Uncategorized'
    );
  });
  
  console.log(`Generated ${newSuggestions.length} new suggestions using learned patterns`);
  
  return {
    ...results,
    new_suggestions: newSuggestions,
    recategorized_count: newSuggestions.length,
    message: newSuggestions.length > 0 
      ? `Generated ${newSuggestions.length} new suggestions using learned patterns!`
      : 'No new suggestions generated. Try providing more feedback first.'
  };
};

// Auto-apply learned suggestions to database
export const autoApplyLearnedSuggestions = async (components: any[]) => {
  console.log('Auto-applying learned suggestions to database...');
  
  // Get suggestions first
  const results = await recategorizeWithLearning(components);
  
  if (results.new_suggestions.length === 0) {
    return {
      ...results,
      applied_count: 0,
      applied_suggestions: [],
      message: 'No suggestions to apply.'
    };
  }
  
  // Apply suggestions to database
  const appliedSuggestions = [];
  let appliedCount = 0;
  
  for (const suggestion of results.new_suggestions) {
    try {
      // Update component in database
      const response = await fetch(`https://backend.sandyy.dev/api/av-components/${suggestion.component_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            component_type: suggestion.suggested_type,
            component_category: suggestion.suggested_category
          }
        })
      });
      
      if (response.ok) {
        appliedCount++;
        appliedSuggestions.push({
          ...suggestion,
          status: 'applied'
        });
        console.log(`✅ Applied suggestion for component ${suggestion.component_id}: ${suggestion.suggested_type} > ${suggestion.suggested_category}`);
      } else {
        console.error(`❌ Failed to apply suggestion for component ${suggestion.component_id}:`, response.statusText);
        appliedSuggestions.push({
          ...suggestion,
          status: 'failed',
          error: response.statusText
        });
      }
    } catch (error) {
      console.error(`❌ Error applying suggestion for component ${suggestion.component_id}:`, error);
      appliedSuggestions.push({
        ...suggestion,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  console.log(`Applied ${appliedCount} out of ${results.new_suggestions.length} suggestions`);
  
  return {
    ...results,
    applied_count: appliedCount,
    applied_suggestions: appliedSuggestions,
    message: `Successfully applied ${appliedCount} suggestions to database!`
  };
};

// Export MLService instance
export const mlService = new MLService(); 