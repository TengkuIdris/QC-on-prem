import { Box, Chip, FormControl } from "@mui/material";
import React, { ChangeEvent, FC, KeyboardEvent, memo, useState } from "react";
import Input from "../Input/Input";

interface MultipleInputProps {
  values: string[];
  setValues?: React.Dispatch<React.SetStateAction<string[]>>;
  setFieldError?: (field: string, message: string | undefined) => void;
  setErrorLabel?: React.Dispatch<React.SetStateAction<string | undefined>>;
}

const MultipleInput: FC<MultipleInputProps> = ({ values, setValues, setFieldError, setErrorLabel }) => {
  const [currValue, setCurrValue] = useState<string>("");

  const handleKeyUp = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (currValue.length > 100) {
        return;
      }
      if (setValues && currValue && !values.includes(currValue)) {
        setValues((oldState) => [...oldState, currValue]);
        setCurrValue("");
        setFieldError && setFieldError("labels", undefined);
        setErrorLabel && setErrorLabel(undefined);
      }
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.target.value.length > 100) {
      setErrorLabel && setErrorLabel("タグ100文字以内で入力してください");
    } else if (values.includes(e.target.value)) {
      setErrorLabel && setErrorLabel("このタグはすでに存在します");
    } else {
      if (e.target.value) {
        setErrorLabel && setErrorLabel("値を作成するにはEnterキーを押してください");
      } else {
        setErrorLabel && setErrorLabel(undefined);
      }
    }

    setCurrValue(e.target.value);
  };

  const handleDelete = (item: string, index: number) => {
    const arr = [...values];
    arr.splice(index, 1);
    setValues && setValues(arr);
  };

  return (
    <FormControl fullWidth>
      <Box
        mb={values.length > 0 ? 1 : 0}
        display="flex"
        flexWrap="wrap"
        gap={1}
      >
        {setValues &&
          values.length > 0 &&
          values.map((item, index) => (
            <Chip
              size="medium"
              key={index}
              onDelete={() => handleDelete(item, index)}
              label={item}
            />
          ))}
        {!setValues &&
          values.length > 0 &&
          values.map((item, index) => (
            <Chip
              size="medium"
              key={index}
              label={item}
            />
          ))}
      </Box>
      {setValues && (
        <Input
          value={currValue}
          onChange={handleChange}
          onKeyDown={handleKeyUp}
          className="flex-1 border-2 rounded-lg p-2 border-gray-300 border-solid outline-gray-400 bg-white w-1/3"
        />
      )}
    </FormControl>
  );
};

export default memo(MultipleInput);
