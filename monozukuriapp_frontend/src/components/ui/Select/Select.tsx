import React from "react";
import RSelect, { Theme, Props as RSelectProps } from "react-select";
import StateManagedSelect from "react-select/dist/declarations/src/stateManager";
interface SelectProps extends RSelectProps {
  placeholder?: string;
  isClearable?: boolean;
  className?: string;
  noOptionsMessage?: () => string;
  required?: boolean;
  filterOption?: (option: any, inputValue: string) => boolean;
}
const Select: React.FC<SelectProps> = ({
  placeholder = "",
  isClearable = true,
  value,
  className = "",
  noOptionsMessage = () => "データがない",
  required = true,
  filterOption,
  ...props
}) => {
  const error = props["aria-errormessage"];

  return (
    <>
      <RSelect
        className={`${className} ${error ? "error" : ""}`}
        placeholder={placeholder}
        value={value}
        classNamePrefix="select"
        noOptionsMessage={noOptionsMessage}
        theme={(theme: Theme) => ({
          ...theme,
          borderRadius: 8,
        })}
        {...props}
        filterOption={filterOption}
        isClearable={isClearable}
        components={isClearable ? undefined : { IndicatorsContainer: () => <></> }}
        options={props.options}
      />
      {error && required && <span className="error__message">{error}</span>}
    </>
  );
};

export default Select;
