import Box from "@mui/material/Box";
import React from "react";
import { memo } from "react";
import HeaderTabs from "./HeaderTabs";
import { ControlGroup } from "../../pareto/components/ChartControls";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Grid from "@mui/material/Grid";
import { Button } from "@mui/material";

const LangSelection = () => {
  return (
    <Box>
      <HeaderTabs
        title="言語情報選択"
        content="言語選択情報を管理する"
      />
      <Grid
        item
        xs={12}
        md={12}
      >
        <ControlGroup
          label="言語情報選択"
          className="!font-bold"
        >
          <Select
            fullWidth
            className="xs:!w-[100%] md:!w-[60%]"
            defaultValue="jp"
          >
            <MenuItem value="jp">日本語</MenuItem>
            <MenuItem value="eng">英語</MenuItem>
            <MenuItem value="vn">ベトナム語</MenuItem>
          </Select>
        </ControlGroup>
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

export default memo(LangSelection);
