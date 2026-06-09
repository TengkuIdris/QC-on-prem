import { TableType } from "@/enum";
import { App } from "@/enum/pathnames";
import Table from "@/features/kaizen-hub/table";
import kaiZenHubService from "@/services/apis/kaizenhubService";
import event from "@/utils/eventEmitter";
import { Box, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, Stack } from "@mui/material";
import React, { useState } from "react";
import PostInfo from "../../PostInfo";
import { option } from "../Favorite";

const PostHistory = () => {
  const [value, setValue] = useState<string>("");

  const handleChange = (e: SelectChangeEvent) => {
    event.emit(TableType.SEARCH_POST_HISTORY, {
      typeList: e.target.value,
    });
    setValue(e.target.value);
  };

  return (
    <>
      <FormControl
        sx={{ width: "160px" }}
        data-testid="sort-form-control"
      >
        <InputLabel id="demo-simple-select-label">並び替え</InputLabel>
        <Select
          labelId="demo-simple-select-label"
          id="demo-simple-select"
          value={`${value}`}
          label="並び替え"
          onChange={handleChange}
        >
          {option.map((item) => (
            <MenuItem
              value={item.value}
              key={item.value}
            >
              {item.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Table
        loadMore={(params) => kaiZenHubService.getMyImprovement(params)}
        loadingFirst
        child={(item) => {
          return (
            <Box
              mt={4}
              key={item.id}
            >
              <Stack spacing={3}>
                <PostInfo
                  id={item.id}
                  title={item.title}
                  postDate={item.createdAt}
                  desc={item.description}
                  // like={item._count.likes}
                  rating={item?.averageRating}
                  linkPath={App.KAIZEN_HUB_INFO}
                  isView={true}
                  // isShow
                  isRating
                />
              </Stack>
            </Box>
          );
        }}
        className="w-full"
        nameTriggerEventSearch={TableType.SEARCH_POST_HISTORY}
      />
    </>
  );
};

export default PostHistory;
