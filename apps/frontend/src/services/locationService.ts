import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface Location {
  id: number;
  name: string;
}

export const locationService = {
  async getAllLocations(): Promise<Location[]> {
    const response = await axios.get(`${API_URL}/api/locations`);
    return response.data.data;
  },
};
