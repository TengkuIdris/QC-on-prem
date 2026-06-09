import Box from "@mui/material/Box";
import { memo } from "react";
import HeaderTabs from "./HeaderTabs";
import React from "react";
import { ControlGroup } from "../../pareto/components/ChartControls";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Grid from "@mui/material/Grid";
import { Button } from "@mui/material";

const FontSelection = () => {
  return (
    <Box>
      <HeaderTabs
        title="フォント情報選択"
        content="フォント情報選択"
      />
      <Grid
        item
        xs={12}
        md={12}
      >
        <ControlGroup
          label="フォント情報選択"
          className="!font-bold"
        >
          <Select
            fullWidth
            className="xs:!w-[100%] md:!w-[60%]"
            defaultValue="jtc"
          >
            <MenuItem value="jtc">JTC</MenuItem>
            <MenuItem value="aaa">AAA</MenuItem>
            <MenuItem value="xxx">XXXX</MenuItem>
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

export default memo(FontSelection);
