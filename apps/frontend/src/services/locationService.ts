import apiClient from '@/lib/apiClient';



export interface Location {
  id: number;
  name: string;
}

export const locationService = {
  async getAllLocations(): Promise<Location[]> {
    try {
      return await apiClient.get<Location[]>('/api/locations');
    } catch (error) {
      console.error('Error fetching locations:', error);
      throw error;
    }
  },
};
