import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import locationService from '@/services/locationService'; // Corrected import
import { Location } from 'shared-types'; // Corrected import

interface LocationSelectorProps {
  value: string | null; // Changed to string
  onChange: (value: string | null) => void; // Changed to string
}

const LocationSelector: React.FC<LocationSelectorProps> = ({
  value,
  onChange,
}) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        // Changed to getActiveLocations
        const data = await locationService.getActiveLocations();
        setLocations(data);
      } catch (error) {
        console.error('Failed to fetch active locations', error);
      }
      setIsLoading(false);
    };

    fetchLocations();
  }, []);

  const options = locations.map((loc) => ({
    value: loc.id, // id is now string
    label: loc.name,
  }));

  const selectedOption = options.find((option) => option.value === value);

  return (
    <Select
      options={options}
      value={selectedOption}
      onChange={(option) => onChange(option ? option.value : null)}
      isLoading={isLoading}
      isClearable
      placeholder="輸入或選擇問題地點..."
      styles={{
        input: (base) => ({
          ...base,
          'input:focus': {
            boxShadow: 'none',
          },
        }),
      }}
    />
  );
};

export default LocationSelector;
