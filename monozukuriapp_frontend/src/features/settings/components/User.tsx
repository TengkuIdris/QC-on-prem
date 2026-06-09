import { Button, Grid, MenuItem, Select, TextField } from "@mui/material";
import Box from "@mui/material/Box";
import React, { memo } from "react";
import { ControlGroup } from "../../pareto/components/ChartControls";
import HeaderTabs from "./HeaderTabs";

const UserInfor = () => {
  return (
    <Box>
      <HeaderTabs
        title="ユーザー情報"
        content="ユーザー情報を管理する"
      />

      <Grid className="xs:!w-[100%] md:!w-[50%]">
        <Grid
          item
          xs={12}
          md={12}
        >
          <ControlGroup
            label="ユーザー名"
            className="!font-bold xs:!w-[100%]"
          >
            <TextField
              fullWidth
              variant="outlined"
              className="xs:!w-[120%] md:!w-[120%]"
              placeholder="ユーザー名を入力"
            />
          </ControlGroup>
        </Grid>

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
            />
          </ControlGroup>
        </Grid>

        <Grid
          item
          xs={12}
          md={12}
        >
          <ControlGroup
            label="パスワード"
            className="!font-bold"
          >
            <TextField
              fullWidth
              variant="outlined"
              className="xs:!w-[120%] md:!w-[120%]"
              placeholder="パスワードを入力"
            />
          </ControlGroup>
        </Grid>

        <Grid
          item
          xs={12}
          md={12}
        >
          <ControlGroup
            label="パスワード（確認）"
            className="!font-bold"
          >
            <TextField
              fullWidth
              variant="outlined"
              className="xs:!w-[120%] md:!w-[120%]"
              placeholder="パスワードを再入力"
            />
          </ControlGroup>
        </Grid>

        <Grid
          item
          xs={12}
          md={12}
        >
          <ControlGroup
            label="業種"
            className="!font-bold"
          >
            <Select
              fullWidth
              defaultValue="off"
              className="xs:!w-[120%] md:!w-[120%]"
            >
              <MenuItem value="manufacturing">製造業</MenuItem>
              <MenuItem value="serviceindustry">サービス業</MenuItem>
              <MenuItem value="retail">小売業</MenuItem>
              <MenuItem value="others">その他</MenuItem>
            </Select>
          </ControlGroup>
        </Grid>
      </Grid>
      <Button
        variant="contained"
        className="!bg-[#a6c9ec] !text-[#000] float-right !py-[8px] !px-[40px] !text-[20px]"
      >
        更新
      </Button>
    </Box>
  );
};

export default memo(UserInfor);
