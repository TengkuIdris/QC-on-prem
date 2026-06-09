import React, { useState } from "react";
import "./Dropdown.module.css";

interface DropdownProps {
  options: string[];
  onSelect: (option: string) => void;
}

const Dropdown: React.FC<DropdownProps> = ({ options, onSelect }) => {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (option: string) => {
    setSelected(option);
    onSelect(option);
  };

  return (
    <div className="dropdown">
      <button className="dropdown-button">{selected || "Select an option"}</button>
      <div className="dropdown-content">
        {options.map((option) => (
          <div
            key={option}
            className="dropdown-item"
            onClick={() => handleSelect(option)}
          >
            {option}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dropdown;
export type { DropdownProps };
