import React from 'react';
import Select, { OnChangeValue } from 'react-select';
import { User } from 'shared-types';

interface UserOption {
  value: string;
  label: string;
}

interface UserSelectorProps {
  users: User[];
  selectedUserId: string | null | undefined;
  onChange: (selectedUserId: string | null) => void;
  isDisabled?: boolean;
}

const UserSelector: React.FC<UserSelectorProps> = ({
  users,
  selectedUserId,
  onChange,
  isDisabled = false,
}) => {
  const options: UserOption[] = users.map(user => ({
    value: user.id,
    label: user.name,
  }));

  const selectedOption = options.find(option => option.value === selectedUserId) || null;

  const handleChange = (selected: OnChangeValue<UserOption, false>) => {
    onChange(selected ? selected.value : null);
  };

  return (
    <Select
      options={options}
      value={selectedOption}
      onChange={handleChange}
      isDisabled={isDisabled}
      isClearable
      placeholder={isDisabled ? '此角色尚無人員' : '搜尋並選擇指派人員...'}
      noOptionsMessage={() => '沒有可選的人員'}
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

export default UserSelector;
