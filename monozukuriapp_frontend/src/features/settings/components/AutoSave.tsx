import { Box, Button, Grid, MenuItem, Select } from "@mui/material";
import React from "react";
import { memo } from "react";
import HeaderTabs from "./HeaderTabs";
import { ControlGroup } from "../../pareto/components/ChartControls";

const AutoSave = () => {
  return (
    <Box>
      <HeaderTabs
        title="自動保存機能"
        content="自動保存機能情報を管理する"
      />
      <Grid
        item
        xs={12}
        md={12}
      >
        <ControlGroup
          label="自動保存機能"
          className="!font-bold"
        >
          <Select
            fullWidth
            defaultValue="off"
            className="xs:!w-[100%] md:!w-[60%]"
          >
            <MenuItem value="on">ON</MenuItem>
            <MenuItem value="off">OFF</MenuItem>
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

export default memo(AutoSave);
