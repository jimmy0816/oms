import React, { useState, useEffect } from 'react';
import AsyncSelect from 'react-select/async';
import { reportService, Report } from '@/services/reportService';

interface ReportOption {
  value: string;
  label: string;
}

interface ReportMultiSelectProps {
  value: string[];
  onChange: (selectedReportIds: string[]) => void;
}

const ReportMultiSelect: React.FC<ReportMultiSelectProps> = ({
  value,
  onChange,
}) => {
  const [selectedOptions, setSelectedOptions] = useState<ReportOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchSelectedReports = async () => {
      if (value && value.length > 0) {
        setIsLoading(true);
        try {
          // This could be optimized in the future with a dedicated backend endpoint
          // for fetching multiple reports by ID.
          const reports = await Promise.all(
            value.map((id) => reportService.getReportById(id))
          );
          const options = reports.map((report) => ({
            value: report.id,
            label: `#${report.id} - ${report.title}`,
          }));
          setSelectedOptions(options);
        } catch (error) {
          console.error('Failed to fetch selected reports', error);
          // As a fallback, display IDs if fetching report details fails
          setSelectedOptions(
            value.map((id) => ({ value: id, label: `#${id}` }))
          );
        } finally {
          setIsLoading(false);
        }
      } else {
        setSelectedOptions([]);
      }
    };

    fetchSelectedReports();
  }, [value]);

  const loadOptions = async (inputValue: string): Promise<ReportOption[]> => {
    try {
      const data = await reportService.getAllReports(1, 30, {
        search: inputValue,
      });
      return data.items.map((report) => ({
        value: report.id,
        label: `#${report.id} - ${report.title}`,
      }));
    } catch (error) {
      console.error('Failed to fetch reports', error);
      return [];
    }
  };

  const handleChange = (selected: readonly ReportOption[] | null) => {
    onChange(selected ? selected.map((item) => item.value) : []);
  };

  return (
    <AsyncSelect
      isMulti
      cacheOptions
      loadOptions={loadOptions}
      defaultOptions
      value={selectedOptions}
      onChange={handleChange}
      isLoading={isLoading}
      isClearable
      placeholder="搜尋並選擇相關聯的通報..."
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

export default ReportMultiSelect;
