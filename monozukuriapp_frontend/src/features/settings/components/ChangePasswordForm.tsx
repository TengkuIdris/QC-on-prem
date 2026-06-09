import { Button, Grid, IconButton, InputAdornment, TextField } from "@mui/material";
import Box from "@mui/material/Box";
import React, { useState } from "react";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import { ControlGroup } from "../../pareto/components/ChartControls";
import { updatePassword, UpdatePasswordInput } from "aws-amplify/auth";
import { toast } from "react-toastify";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import axios from "axios";
import { logPasswordChanged } from "../../services/apis/authService";

const validationSchema = Yup.object().shape({
  oldPassword: Yup.string()
    .min(8, "Old Password must be at least 8 characters")
    .matches(/[a-z]/, "Old Password must contain at least one lowercase char")
    .matches(/[A-Z]/, "Old Password must contain at least one uppercase char")
    .matches(/[0-9]/, "Old Password must contain at least one number")
    .matches(/[^a-zA-Z0-9]/, "Old Password must contain at least one special char")
    .required("Old Password is required"),
  newPassword: Yup.string()
    .min(8, "New Password must be at least 8 characters")
    .matches(/[a-z]/, "New Password must contain at least one lowercase char")
    .matches(/[A-Z]/, "New Password must contain at least one uppercase char")
    .matches(/[0-9]/, "New Password must contain at least one number")
    .matches(/[^a-zA-Z0-9]/, "New Password must contain at least one special char")
    .required("New Password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("newPassword"), ""], "Passwords do not match")
    .min(8, "ConfirmNew Password must be at least 8 characters")
    .matches(/[a-z]/, "Confirm New Password must contain at least one lowercase char")
    .matches(/[A-Z]/, "ConfirmNew Password must contain at least one uppercase char")
    .matches(/[0-9]/, "Confirm New Password must contain at least one number")
    .matches(/[^a-zA-Z0-9]/, "Confirm New Password must contain at least one special char")
    .required("Confirm New Password is required"),
});

const ChangePasswordForm = () => {
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function handleUpdatePassword({ oldPassword, newPassword }: UpdatePasswordInput) {
    try {
      await updatePassword({ oldPassword, newPassword });
      // Gọi API auditlog qua service
      try {
        await logPasswordChanged("CURRENT_USER_ID"); // TODO: truyền userId thực tế
      } catch (e) {
        /* ignore */
      }
      toast.success(`Change password successfully`);
    } catch (err: any) {
      toast.error(err.message);
      console.log(err);
    }
  }

  const handleChangePassword = (data: any, { resetForm }: any) => {
    if (data.oldPassword && data.newPassword)
      handleUpdatePassword({ oldPassword: data.oldPassword, newPassword: data.newPassword })
        .then(() => {
          resetForm();
        })
        .catch((err) => {
          console.log(err);
        });
  };

  return (
    <Box>
      <Formik
        initialValues={{ newPassword: "", confirmPassword: "", oldPassword: "" }}
        validationSchema={validationSchema}
        onSubmit={handleChangePassword}
      >
        {({ errors, touched }) => (
          <Form>
            <Grid className="xs:!w-[100%] md:!w-[50%]">
              <Grid
                item
                xs={12}
                md={12}
              >
                <ControlGroup
                  label="パスワード"
                  className="!font-bold"
                >
                  <Field
                    as={TextField}
                    fullWidth
                    variant="outlined"
                    type={showOldPassword ? "text" : "password"}
                    name="oldPassword"
                    placeholder="パスワードを入力"
                    error={touched.oldPassword && Boolean(errors.oldPassword)}
                    helperText={touched.oldPassword && errors.oldPassword}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={() => setShowOldPassword(!showOldPassword)}
                            edge="end"
                          >
                            {showOldPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </ControlGroup>
              </Grid>
              <Grid
                item
                xs={12}
                md={12}
              >
                <ControlGroup
                  label="新しいパスワード"
                  className="!font-bold"
                >
                  <Field
                    as={TextField}
                    fullWidth
                    variant="outlined"
                    type={showNewPassword ? "text" : "password"}
                    name="newPassword"
                    placeholder="新しいパスワードを入力"
                    error={touched.newPassword && Boolean(errors.newPassword)}
                    helperText={touched.newPassword && errors.newPassword}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            edge="end"
                          >
                            {showNewPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </ControlGroup>
              </Grid>
              <Grid
                item
                xs={12}
                md={12}
              >
                <ControlGroup
                  label="パスワード確認"
                  className="!font-bold"
                >
                  <Field
                    as={TextField}
                    fullWidth
                    variant="outlined"
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="新しいパスワードを確認する"
                    error={touched.confirmPassword && Boolean(errors.confirmPassword)}
                    helperText={touched.confirmPassword && errors.confirmPassword}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            edge="end"
                          >
                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </ControlGroup>
              </Grid>
            </Grid>
            <Button
              variant="contained"
              className="!bg-[#a6c9ec] !text-[#000] float-right !py-[8px] !px-[40px] !text-[20px]"
              type="submit"
            >
              パスワードを変更する
            </Button>
          </Form>
        )}
      </Formik>
    </Box>
  );
};

export default ChangePasswordForm;
