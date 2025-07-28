import axios from 'axios';

// Centralized API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend.sandyy.dev/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Add request interceptor for better error handling
apiClient.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Response Error:', error);
    
    // Check for CORS errors specifically
    if (error.message && error.message.includes('CORS')) {
      throw new Error('CORS error: Please check backend configuration. Contact administrator.');
    }
    
    // Provide user-friendly error messages
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    
    if (error.response?.status === 404) {
      throw new Error('Resource not found. Please check your data and try again.');
    }
    
    if (error.response?.status === 500) {
      throw new Error('Server error. Please try again later.');
    }
    
    if (!error.response) {
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    throw error;
  }
);

// API endpoints
export const API_ENDPOINTS = {
  // Room Types
  ROOM_TYPES: '/room-types',
  ROOM_TYPE: (id: string) => `/room-types/${id}`,
  
  // AV Components
  AV_COMPONENTS: '/av-components',
  AV_COMPONENT: (id: string) => `/av-components/${id}`,
  
  // Projects
  PROJECTS: '/projects',
  PROJECT: (id: string) => `/projects/${id}`,
  
  // Room Configurations
  ROOM_CONFIGURATIONS: '/room-configurations',
  ROOM_CONFIGURATION: (id: string) => `/room-configurations/${id}`,
  
  // Default Room Configs
  DEFAULT_ROOM_CONFIGS: '/default-room-configs',
  DEFAULT_ROOM_CONFIG: (id: string) => `/default-room-configs/${id}`,
  
  // AV Bill of Materials
  AV_BILL_OF_MATERIALS: '/av-bill-of-materials',
  AV_BILL_OF_MATERIAL: (id: string) => `/av-bill-of-materials/${id}`,
  
  // AV BOQ
  AV_BOQS: '/av-boqs',
  AV_BOQ: (id: string) => `/av-boqs/${id}`,
  
  // Room Instances
  ROOM_INSTANCES: '/room-instances',
  ROOM_INSTANCE: (id: string) => `/room-instances/${id}`,
  
  // BOQ Line Items
  BOQ_LINE_ITEMS: '/boq-line-items',
  BOQ_LINE_ITEM: (id: string) => `/boq-line-items/${id}`,
};

// API service functions
export const apiService = {
  // Room Types
  getRoomTypes: (params?: any) => apiClient.get(API_ENDPOINTS.ROOM_TYPES, { params }),
  createRoomType: (data: any) => apiClient.post(API_ENDPOINTS.ROOM_TYPES, { data }),
  updateRoomType: (id: string, data: any) => apiClient.put(API_ENDPOINTS.ROOM_TYPE(id), { data }),
  deleteRoomType: (id: string) => apiClient.delete(API_ENDPOINTS.ROOM_TYPE(id)),
  
  // AV Components
  getAVComponents: (params?: any) => apiClient.get(API_ENDPOINTS.AV_COMPONENTS, { params }),
  getAVComponent: (id: string) => apiClient.get(API_ENDPOINTS.AV_COMPONENT(id)),
  createAVComponent: (data: any) => apiClient.post(API_ENDPOINTS.AV_COMPONENTS, { data }),
  updateAVComponent: (id: string, data: any) => apiClient.put(API_ENDPOINTS.AV_COMPONENT(id), { data }),
  deleteAVComponent: (id: string) => apiClient.delete(API_ENDPOINTS.AV_COMPONENT(id)),
  
  // Projects
  getProjects: (params?: any) => apiClient.get(API_ENDPOINTS.PROJECTS, { params }),
  createProject: (data: any) => apiClient.post(API_ENDPOINTS.PROJECTS, { data }),
  updateProject: (id: string, data: any) => apiClient.put(API_ENDPOINTS.PROJECT(id), { data }),
  deleteProject: (id: string) => apiClient.delete(API_ENDPOINTS.PROJECT(id)),
  
  // Room Configurations
  getRoomConfigurations: (params?: any) => apiClient.get(API_ENDPOINTS.ROOM_CONFIGURATIONS, { params }),
  createRoomConfiguration: (data: any) => apiClient.post(API_ENDPOINTS.ROOM_CONFIGURATIONS, { data }),
  updateRoomConfiguration: (id: string, data: any) => apiClient.put(API_ENDPOINTS.ROOM_CONFIGURATION(id), { data }),
  deleteRoomConfiguration: (id: string) => apiClient.delete(API_ENDPOINTS.ROOM_CONFIGURATION(id)),
  
  // Default Room Configs
  getDefaultRoomConfigs: (params?: any) => apiClient.get(API_ENDPOINTS.DEFAULT_ROOM_CONFIGS, { params }),
  createDefaultRoomConfig: (data: any) => apiClient.post(API_ENDPOINTS.DEFAULT_ROOM_CONFIGS, { data }),
  updateDefaultRoomConfig: (id: string, data: any) => apiClient.put(API_ENDPOINTS.DEFAULT_ROOM_CONFIG(id), { data }),
  deleteDefaultRoomConfig: (id: string) => apiClient.delete(API_ENDPOINTS.DEFAULT_ROOM_CONFIG(id)),
  
  // AV Bill of Materials
  getAVBillOfMaterials: (params?: any) => apiClient.get(API_ENDPOINTS.AV_BILL_OF_MATERIALS, { params }),
  createAVBillOfMaterial: (data: any) => apiClient.post(API_ENDPOINTS.AV_BILL_OF_MATERIALS, { data }),
  updateAVBillOfMaterial: (id: string, data: any) => apiClient.put(API_ENDPOINTS.AV_BILL_OF_MATERIAL(id), { data }),
  deleteAVBillOfMaterial: (id: string) => apiClient.delete(API_ENDPOINTS.AV_BILL_OF_MATERIAL(id)),
  
  // AV BOQ
  getAVBOQs: (params?: any) => apiClient.get(API_ENDPOINTS.AV_BOQS, { params }),
  createAVBOQ: (data: any) => apiClient.post(API_ENDPOINTS.AV_BOQS, { data }),
  updateAVBOQ: (id: string, data: any) => apiClient.put(API_ENDPOINTS.AV_BOQ(id), { data }),
  deleteAVBOQ: (id: string) => apiClient.delete(API_ENDPOINTS.AV_BOQ(id)),
  
  // Room Instances
  getRoomInstances: (params?: any) => apiClient.get(API_ENDPOINTS.ROOM_INSTANCES, { params }),
  createRoomInstance: (data: any) => apiClient.post(API_ENDPOINTS.ROOM_INSTANCES, { data }),
  updateRoomInstance: (id: string, data: any) => apiClient.put(API_ENDPOINTS.ROOM_INSTANCE(id), { data }),
  deleteRoomInstance: (id: string) => apiClient.delete(API_ENDPOINTS.ROOM_INSTANCE(id)),
  
  // BOQ Line Items
  getBOQLineItems: (params?: any) => apiClient.get(API_ENDPOINTS.BOQ_LINE_ITEMS, { params }),
  createBOQLineItem: (data: any) => apiClient.post(API_ENDPOINTS.BOQ_LINE_ITEMS, { data }),
  updateBOQLineItem: (id: string, data: any) => apiClient.put(API_ENDPOINTS.BOQ_LINE_ITEM(id), { data }),
  deleteBOQLineItem: (id: string) => apiClient.delete(API_ENDPOINTS.BOQ_LINE_ITEM(id)),
};

// Helper function to fetch all pages of data
export const fetchAllPages = async (endpoint: string, params: any = {}) => {
  let allData: any[] = [];
  let page = 1;
  const pageSize = 25; // Match Strapi's default page size

  console.log(`Fetching all pages for ${endpoint} with params:`, params);

  try {
    while (true) {
      const response = await apiClient.get(endpoint, {
        params: {
          ...params,
          'pagination[page]': page,
          'pagination[pageSize]': pageSize,
        },
      });

      const { data, meta } = response.data;
      console.log(`Page ${page}: Got ${data.length} items, total pages: ${meta.pagination.pageCount}, total: ${meta.pagination.total}`);
      
      allData = [...allData, ...data];

      const { pageCount } = meta.pagination;
      if (page >= pageCount) break;
      page++;
    }

    console.log(`Total items fetched for ${endpoint}: ${allData.length}`);
    return allData;
  } catch (error) {
    console.error(`Error fetching all pages for ${endpoint}:`, error);
    
    // Fallback: try to fetch without pagination
    console.log(`Trying fallback fetch without pagination for ${endpoint}`);
    try {
      const response = await apiClient.get(endpoint, { 
        params: {
          ...params,
          'pagination[pageSize]': 1000 // Try to get all in one request
        }
      });
      const { data } = response.data;
      console.log(`Fallback fetch for ${endpoint}: Got ${data.length} items`);
      return data;
    } catch (fallbackError) {
      console.error(`Fallback fetch also failed for ${endpoint}:`, fallbackError);
      return [];
    }
  }
};

export default apiClient; 