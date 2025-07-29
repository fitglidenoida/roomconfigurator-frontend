// Smart Component Categorization ML Service
// Focus: Categorize components, learn regional preferences, enable BOQ optimization

export interface ComponentSuggestion {
  componentId: string;
  currentType: string;
  currentCategory: string;
  suggestedType: string;
  suggestedCategory: string;
  confidence: number;
  description: string;
  make: string;
  model: string;
  reasoning: string[];
  regionalOptimization?: {
    suggestedBrand: string;
    region: string;
    reason: string;
  };
}

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
  region?: string;
  timestamp: Date;
}

export interface ModelPerformance {
  totalComponents: number;
  categorizedComponents: number;
  uncategorizedComponents: number;
  accuracy: number;
  regionalAccuracy: { [region: string]: number };
  lastUpdated: Date;
}

export interface TrainedModel {
  version: string;
  patterns: {
    [type: string]: {
      patterns: string[];
      examples: string[];
      subCategories: { [category: string]: string[] };
      regionalPreferences: { [region: string]: string[] };
      confidence: number;
      trainingData: number;
    };
  };
  performance: ModelPerformance;
  trainingDate: Date;
}

class SmartCategorizationModel {
  private model: TrainedModel | null = null;
  private feedbackBuffer: LearningFeedback[] = [];
  private readonly MIN_FEEDBACK_FOR_TRAINING = 3;
  private readonly MIN_CONFIDENCE_THRESHOLD = 0.6;
  private readonly MAX_PATTERNS_PER_TYPE = 50;

  constructor() {
    this.loadModel();
    this.loadFeedbackBuffer();
  }

  // Load trained model from storage
  private loadModel(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const storedModel = localStorage.getItem('smart_categorization_model');
        if (storedModel) {
          this.model = JSON.parse(storedModel);
          console.log('✅ Loaded trained model:', this.model?.version);
        }
      }
    } catch (error) {
      console.error('❌ Error loading model:', error);
    }
  }

  // Save trained model to storage
  private saveModel(model: TrainedModel): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('smart_categorization_model', JSON.stringify(model));
        console.log('✅ Model saved successfully:', model.version);
      }
    } catch (error) {
      console.error('❌ Error saving model:', error);
    }
  }

  // Load feedback buffer
  private loadFeedbackBuffer(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const storedFeedback = localStorage.getItem('smart_categorization_feedback');
        if (storedFeedback) {
          this.feedbackBuffer = JSON.parse(storedFeedback);
          console.log('✅ Loaded feedback buffer:', this.feedbackBuffer.length, 'items');
        }
      }
    } catch (error) {
      console.error('❌ Error loading feedback buffer:', error);
    }
  }

  // Save feedback buffer
  private saveFeedbackBuffer(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('smart_categorization_feedback', JSON.stringify(this.feedbackBuffer));
      }
    } catch (error) {
      console.error('❌ Error saving feedback buffer:', error);
    }
  }

  // Extract features from component description
  private extractFeatures(description: string, make: string, model: string): string[] {
    const text = `${description} ${make} ${model}`.toLowerCase();
    
    // Extract words, numbers, and technical terms
    const words = text.split(/\s+/).filter(word => word.length > 2);
    const numbers = text.match(/\d+/g) || [];
    const brands = [make.toLowerCase()].filter(brand => brand.length > 2);
    
    // Extract technical terms
    const technicalTerms = [
      'hdmi', 'vga', 'dvi', 'displayport', 'ethernet', 'wifi', 'bluetooth',
      '4k', 'hd', 'ultra', 'pro', 'plus', 'max', 'mini', 'nano',
      'wireless', 'wired', 'portable', 'fixed', 'ceiling', 'wall', 'floor',
      'speaker', 'microphone', 'amplifier', 'mixer', 'processor', 'dsp',
      'camera', 'display', 'tv', 'monitor', 'projector', 'controller',
      'switch', 'matrix', 'cable', 'mount', 'rack', 'power', 'ups'
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

  // Get regional brand preferences
  private getRegionalPreferences(type: string, category: string, region?: string): string[] {
    if (!region || !this.model?.patterns[type]?.regionalPreferences[region]) {
      return [];
    }
    return this.model.patterns[type].regionalPreferences[region];
  }

  // Predict component type and category
  public predict(description: string, make: string, model: string, region?: string): {
    type: string;
    category: string;
    confidence: number;
    reasoning: string[];
    regionalOptimization?: {
      suggestedBrand: string;
      region: string;
      reason: string;
    };
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
      
      if (typeSimilarity > 0.1) {
        // Find best sub-category
        Object.entries(typeData.subCategories).forEach(([category, categoryPatterns]) => {
          const categorySimilarity = this.calculateSimilarity(features, categoryPatterns);
          
          // Boost confidence based on training data
          const trainingDataBoost = Math.min(typeData.trainingData / 20, 0.2);
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

    // Return best prediction with regional optimization
    if (predictions.length > 0) {
      const bestPrediction = predictions.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );

      // Add regional optimization if region is provided
      let regionalOptimization;
      if (region) {
        const regionalBrands = this.getRegionalPreferences(bestPrediction.type, bestPrediction.category, region);
        if (regionalBrands.length > 0 && !regionalBrands.includes(make.toLowerCase())) {
          regionalOptimization = {
            suggestedBrand: regionalBrands[0],
            region,
            reason: `Preferred brand in ${region} for ${bestPrediction.type}/${bestPrediction.category}`
          };
        }
      }

      return {
        ...bestPrediction,
        regionalOptimization
      };
    }

    return {
      type: 'Uncategorized',
      category: 'Uncategorized',
      confidence: 0,
      reasoning: ['No patterns matched above confidence threshold']
    };
  }

  // Add feedback for learning
  public addFeedback(feedback: LearningFeedback): void {
    this.feedbackBuffer.push(feedback);
    this.saveFeedbackBuffer();
    
    // Retrain if we have enough feedback
    if (this.feedbackBuffer.length >= this.MIN_FEEDBACK_FOR_TRAINING) {
      this.retrainModel();
    }
  }

  // Retrain model with accumulated feedback
  private retrainModel(): void {
    console.log('🔄 Retraining model with', this.feedbackBuffer.length, 'feedback items');
    
    const newPatterns: { [type: string]: any } = {};
    const corrections = this.feedbackBuffer.filter(f => f.userCorrection.action !== 'accept');
    const accepts = this.feedbackBuffer.filter(f => f.userCorrection.action === 'accept');
    
    console.log(`📊 Processing ${corrections.length} corrections and ${accepts.length} accepts`);
    
    // Process all feedback
    [...corrections, ...accepts].forEach(feedback => {
      try {
        const { userCorrection, componentData, region } = feedback;
        
        if (!userCorrection || !componentData) {
          console.warn('⚠️ Skipping invalid feedback item:', feedback);
          return;
        }
        
        const type = userCorrection.type || 'Uncategorized';
        const category = userCorrection.category || 'Uncategorized';
        
        const features = this.extractFeatures(
          componentData.description || '',
          componentData.make || '',
          componentData.model || ''
        );

        if (!newPatterns[type]) {
          newPatterns[type] = {
            patterns: [],
            examples: [],
            subCategories: {},
            regionalPreferences: {},
            confidence: 0,
            trainingData: 0
          };
        }

        // Add features as patterns
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

        // Add regional preferences
        if (region && componentData.make) {
          if (!newPatterns[type].regionalPreferences[region]) {
            newPatterns[type].regionalPreferences[region] = [];
          }
          if (!newPatterns[type].regionalPreferences[region].includes(componentData.make.toLowerCase())) {
            newPatterns[type].regionalPreferences[region].push(componentData.make.toLowerCase());
          }
        }

        // Add example
        const example = `${componentData.make || ''} ${componentData.model || ''}`.trim();
        if (example && !newPatterns[type].examples.includes(example)) {
          newPatterns[type].examples.push(example);
        }

        newPatterns[type].trainingData++;
      } catch (error) {
        console.error('❌ Error processing feedback:', error, feedback);
      }
    });

    // Merge with existing patterns if model exists
    if (this.model) {
      Object.entries(this.model.patterns).forEach(([type, typeData]) => {
        if (!newPatterns[type]) {
          newPatterns[type] = {
            patterns: [...typeData.patterns],
            examples: [...typeData.examples],
            subCategories: { ...typeData.subCategories },
            regionalPreferences: { ...typeData.regionalPreferences },
            confidence: typeData.confidence,
            trainingData: typeData.trainingData
          };
        } else {
          // Merge patterns
          typeData.patterns.forEach(pattern => {
            if (!newPatterns[type].patterns.includes(pattern)) {
              newPatterns[type].patterns.push(pattern);
            }
          });
          
          // Merge examples
          typeData.examples.forEach(example => {
            if (!newPatterns[type].examples.includes(example)) {
              newPatterns[type].examples.push(example);
            }
          });
          
          // Merge sub-categories
          Object.entries(typeData.subCategories).forEach(([category, patterns]) => {
            if (!newPatterns[type].subCategories[category]) {
              newPatterns[type].subCategories[category] = [...patterns];
            } else {
              patterns.forEach(pattern => {
                if (!newPatterns[type].subCategories[category].includes(pattern)) {
                  newPatterns[type].subCategories[category].push(pattern);
                }
              });
            }
          });

          // Merge regional preferences
          Object.entries(typeData.regionalPreferences).forEach(([region, brands]) => {
            if (!newPatterns[type].regionalPreferences[region]) {
              newPatterns[type].regionalPreferences[region] = [...brands];
            } else {
              brands.forEach(brand => {
                if (!newPatterns[type].regionalPreferences[region].includes(brand)) {
                  newPatterns[type].regionalPreferences[region].push(brand);
                }
              });
            }
          });
          
          // Update training data count
          newPatterns[type].trainingData += typeData.trainingData;
        }
      });
    }

    // Limit patterns per type to prevent bloat
    Object.keys(newPatterns).forEach(type => {
      if (newPatterns[type].patterns.length > this.MAX_PATTERNS_PER_TYPE) {
        newPatterns[type].patterns = newPatterns[type].patterns.slice(0, this.MAX_PATTERNS_PER_TYPE);
      }
    });

    // Create new model
    const newModel: TrainedModel = {
      version: this.model ? `${this.model.version}.${Date.now()}` : '1.0.0',
      patterns: newPatterns,
      performance: this.calculatePerformance(),
      trainingDate: new Date()
    };

    // Save new model
    this.model = newModel;
    this.saveModel(newModel);
    
    console.log('✅ Model retrained successfully:', newModel.version);
    console.log('📊 New patterns learned:', Object.keys(newPatterns));
  }

  // Calculate performance metrics
  private calculatePerformance(): ModelPerformance {
    const totalComponents = this.feedbackBuffer.length;
    const categorizedComponents = this.feedbackBuffer.filter(f => 
      f.userCorrection.type !== 'Uncategorized' && f.userCorrection.category !== 'Uncategorized'
    ).length;
    
    const accuracy = totalComponents > 0 ? categorizedComponents / totalComponents : 0;
    
    // Calculate regional accuracy
    const regionalAccuracy: { [region: string]: number } = {};
    const regionalFeedback = this.feedbackBuffer.filter(f => f.region);
    
    regionalFeedback.forEach(feedback => {
      if (feedback.region) {
        if (!regionalAccuracy[feedback.region]) {
          regionalAccuracy[feedback.region] = 0;
        }
        if (feedback.userCorrection.type !== 'Uncategorized' && feedback.userCorrection.category !== 'Uncategorized') {
          regionalAccuracy[feedback.region]++;
        }
      }
    });

    // Convert to percentages
    Object.keys(regionalAccuracy).forEach(region => {
      const regionTotal = regionalFeedback.filter(f => f.region === region).length;
      regionalAccuracy[region] = regionTotal > 0 ? regionalAccuracy[region] / regionTotal : 0;
    });

    return {
      totalComponents,
      categorizedComponents,
      uncategorizedComponents: totalComponents - categorizedComponents,
      accuracy,
      regionalAccuracy,
      lastUpdated: new Date()
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
    return {
      totalFeedback: this.feedbackBuffer.length,
      accepts: this.feedbackBuffer.filter(f => f.userCorrection.action === 'accept').length,
      corrections: this.feedbackBuffer.filter(f => f.userCorrection.action !== 'accept').length,
      modelVersion: this.model?.version || null,
      performance: this.model?.performance || null
    };
  }

  // Force retrain model
  public forceRetrain(): void {
    if (this.feedbackBuffer.length > 0) {
      console.log('🔄 Force retraining model...');
      this.retrainModel();
    } else {
      console.log('⚠️ No feedback available for retraining');
    }
  }

  // Clear all learning data
  public clearLearningData(): void {
    this.feedbackBuffer = [];
    this.model = null;
    this.saveFeedbackBuffer();
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('smart_categorization_model');
    }
    console.log('🗑️ Learning data cleared');
  }

  // Debug function
  public debugState(): void {
    console.log('=== Smart Categorization ML State ===');
    console.log('📊 Feedback buffer length:', this.feedbackBuffer.length);
    console.log('🧠 Model exists:', !!this.model);
    if (this.model) {
      console.log('📈 Model version:', this.model.version);
      console.log('🎯 Model patterns:', Object.keys(this.model.patterns));
      console.log('📊 Training data counts:', Object.entries(this.model.patterns).map(([type, data]) => 
        `${type}: ${data.trainingData} examples`
      ));
      
      // Show regional preferences
      Object.entries(this.model.patterns).forEach(([type, data]) => {
        if (Object.keys(data.regionalPreferences).length > 0) {
          console.log(`🌍 ${type} regional preferences:`, data.regionalPreferences);
        }
      });
    }
    console.log('📝 Recent feedback:', this.feedbackBuffer.slice(-5).map(f => ({
      action: f.userCorrection.action,
      type: f.userCorrection.type,
      category: f.userCorrection.category,
      region: f.region,
      component: `${f.componentData.make} ${f.componentData.model}`
    })));
    console.log('=====================================');
  }
}

// Initialize the smart categorization model
const smartModel = new SmartCategorizationModel();

// Export functions for external use
export const categorizeComponents = async (components: any[], region?: string): Promise<ComponentSuggestion[]> => {
  console.log('🎯 Categorizing components with smart ML...');
  
  const suggestions = components.map(component => {
    const prediction = smartModel.predict(
      component.description || '',
      component.make || '',
      component.model || '',
      region
    );
    
    return {
      componentId: component.documentId || component.id,
      currentType: component.component_type || 'Uncategorized',
      currentCategory: component.component_category || 'Uncategorized',
      suggestedType: prediction.type,
      suggestedCategory: prediction.category,
      confidence: Math.round(prediction.confidence * 100),
      description: component.description,
      make: component.make,
      model: component.model,
      reasoning: prediction.reasoning,
      regionalOptimization: prediction.regionalOptimization
    };
  });
  
  return suggestions;
};

export const addLearningFeedback = (feedback: LearningFeedback): void => {
  smartModel.addFeedback(feedback);
};

export const getLearningStats = (): any => {
  return smartModel.getLearningStats();
};

export const forceRetrainModel = (): void => {
  smartModel.forceRetrain();
};

export const clearLearningData = (): void => {
  smartModel.clearLearningData();
};

export const debugMLState = (): void => {
  smartModel.debugState();
};

// Legacy exports for backward compatibility
export const enhancedCategorizeComponents = categorizeComponents;
export const enhancedCategorizeComponentsWithLearning = categorizeComponents;
export const storeLearningFeedback = addLearningFeedback;
export const retrainFromScratch = forceRetrainModel;
export const cleanInvalidFeedback = () => {
  console.log('🧹 No invalid feedback to clean in new system');
}; 