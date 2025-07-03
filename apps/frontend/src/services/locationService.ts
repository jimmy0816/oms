import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface Location {
  id: string;
  name: string;
}

export const getLocations = async (): Promise<Location[]> => {
  const response = await axios.get(`${API_URL}/api/locations`);
  return response.data;
};
