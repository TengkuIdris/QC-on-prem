import React, { memo } from "react";
import { Typography, Grid, InputAdornment, IconButton, OutlinedInput, InputLabel } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { FormikTouched, FormikErrors, Field, FieldAttributes } from "formik";

interface FormFieldProps<T> extends FieldAttributes<any> {
  name: string;
  label?: string;
  type: "text" | "password";
  showPassword?: boolean;
  setShowPassword?: React.Dispatch<React.SetStateAction<boolean>>;
  touched: FormikTouched<T>;
  errors: FormikErrors<T>;
  component?: any;
  classNameInput?: string;
  placeholder?: string;
  children?: React.ReactNode;
  value?: string | number | boolean;
}

const FormField: React.FC<FormFieldProps<Record<string, any>>> = ({
  name,
  label,
  type,
  showPassword,
  setShowPassword,
  touched,
  errors,
  component: Component,
  classNameInput,
  placeholder,
  children,
  value,
  ...props
}) => {
  const hasError = touched[name] && errors[name];

  return (
    <Grid
      item
      xs={12}
    >
      {label && <InputLabel htmlFor={name}>{label}</InputLabel>}
      <Field
        as={Component || OutlinedInput}
        fullWidth
        className={classNameInput}
        id={name}
        name={name}
        error={hasError}
        type={type === "password" ? (showPassword ? "text" : "password") : type}
        sx={
          type === "password"
            ? {
                "& input::-ms-reveal": {
                  display: "none",
                },
                "& input::-ms-clear": {
                  display: "none",
                },
              }
            : undefined
        }
        endAdornment={
          type === "password" && (
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle password visibility"
                onClick={() => setShowPassword && setShowPassword((show) => !show)}
                onMouseDown={(e) => e.preventDefault()}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          )
        }
        placeholder={placeholder}
        children={children}
        value={value}
        {...props}
      />
      {hasError && (
        <Typography
          color="error.main"
          fontSize="0.75rem"
          mt="3px"
        >
          {errors[name]?.toString()}
        </Typography>
      )}
    </Grid>
  );
};

export default memo(FormField);
