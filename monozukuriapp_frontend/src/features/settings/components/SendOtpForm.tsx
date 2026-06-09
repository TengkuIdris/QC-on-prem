import { Button, Grid, TextField } from "@mui/material";
import Box from "@mui/material/Box";
import React, { useState } from "react";
import { ControlGroup } from "../../pareto/components/ChartControls";

const SendOtpForm = ({ onOtpSent }: any) => {
  const [email, setEmail] = useState("Email@gmail.com");

  const handleSendOtp = () => {
    // await sendOtpRequest(email);
    onOtpSent();
  };

  return (
    <Box>
      <Grid className="xs:!w-[100%] md:!w-[50%]">
        <Grid
          item
          xs={12}
          md={12}
        >
          <ControlGroup
            label="メールアドレス"
            className="!font-bold"
          >
            <TextField
              fullWidth
              variant="outlined"
              className="xs:!w-[120%] md:!w-[120%]"
              placeholder="メールアドレスを入力"
              value={email}
              disabled
              onChange={(e) => setEmail(e.target.value)}
            />
          </ControlGroup>
        </Grid>
      </Grid>
      <Button
        variant="contained"
        className="!bg-[#a6c9ec] !text-[#000] float-right !py-[8px] !px-[40px] !text-[20px]"
        onClick={handleSendOtp}
      >
        OTPトークンを送信する
      </Button>
    </Box>
  );
};

export default SendOtpForm;
