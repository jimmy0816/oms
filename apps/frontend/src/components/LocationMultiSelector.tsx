import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { locationService, Location } from '@/services/locationService';

interface LocationMultiSelectProps {
  value: number[];
  onChange: (selectedLocationIds: number[]) => void;
}

const LocationMultiSelector: React.FC<LocationMultiSelectProps> = ({
  value,
  onChange,
}) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const data = await locationService.getAllLocations();
        setLocations(data);
      } catch (error) {
        console.error('Failed to fetch locations', error);
      }
      setIsLoading(false);
    };

    fetchLocations();
  }, []);

  const options = locations.map((location) => ({
    value: location.id,
    label: location.name,
  }));

  const selectedOptions = options.filter((option) =>
    value.includes(option.value)
  );

  return (
    <Select
      isMulti
      options={options}
      value={selectedOptions}
      onChange={(selected) =>
        onChange(selected ? selected.map((item) => item.value) : [])
      }
      isLoading={isLoading}
      isClearable
      placeholder="選擇地點..."
      styles={{
        input: (base) => ({
          ...base,
          'input:focus': {
            boxShadow: 'none',
          },
        }),
        valueContainer: (base) => ({
          ...base,
          maxHeight: '100px', // 設定最大高度
          overflowY: 'auto', // 啟用垂直滾動條
        }),
      }}
    />
  );
};

export default LocationMultiSelector;
