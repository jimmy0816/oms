import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { reportService, Report } from '@/services/reportService';

interface ReportMultiSelectProps {
  value: string[];
  onChange: (selectedReportIds: string[]) => void;
}

const ReportMultiSelect: React.FC<ReportMultiSelectProps> = ({
  value,
  onChange,
}) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        // Fetch all reports (or a sufficiently large number) to populate the selector
        const data = await reportService.getAllReports(1, 1000);
        setReports(data.items);
      } catch (error) {
        console.error('Failed to fetch reports', error);
      }
      setIsLoading(false);
    };

    fetchReports();
  }, []);

  const options = reports.map((report) => ({
    value: report.id,
    label: `#${report.id} - ${report.title}`,
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
      placeholder="選擇相關聯的通報..."
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
