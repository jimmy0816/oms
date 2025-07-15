import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { getLocations, Location } from '@/services/locationService';

interface LocationSelectorProps {
  value: number | null;
  onChange: (value: number | null) => void;
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
        const data = await getLocations();
        setLocations(data);
      } catch (error) {
        console.error('Failed to fetch locations', error);
      }
      setIsLoading(false);
    };

    fetchLocations();
  }, []);

  const options = locations.map((loc) => ({
    value: loc.id,
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
