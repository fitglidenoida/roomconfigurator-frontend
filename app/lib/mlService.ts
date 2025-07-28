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