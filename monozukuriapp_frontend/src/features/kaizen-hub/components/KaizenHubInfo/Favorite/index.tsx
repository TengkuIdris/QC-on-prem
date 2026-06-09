import { TableType } from "@/enum";
import { App } from "@/enum/pathnames";
import PostInfo from "@/features/kaizen-hub/components/PostInfo";
import Table from "@/features/kaizen-hub/table";
import kaiZenHubService from "@/services/apis/kaizenhubService";
import eventEmitter from "@/utils/eventEmitter";
import { Box, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, Stack } from "@mui/material";
import React, { useState } from "react";

export interface Option {
  value: string | number;
  label: string;
}

export const option: Option[] = [
  {
    label: "投稿日",
    value: "PublishedDate",
  },
  {
    label: "いいね数",
    value: "Like",
  },
  {
    label: "閲覧数",
    value: "View",
  },
];

const Favorite = () => {
  const [value, setValue] = useState<number | string>("");

  const handleChange = (event: SelectChangeEvent) => {
    eventEmitter.emit(TableType.LIST_FAVORITE, {
      typeList: event.target.value,
    });
    setValue(event.target.value);
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
        data-testid="favorite-table"
        loadMore={(params) => kaiZenHubService.getListMyFavoriteImproments(params)}
        loadingFirst
        child={(item) => {
          return (
            <Box
              mt={4}
              key={item.id}
            >
              <Stack spacing={3}>
                <PostInfo
                  title={item.title}
                  postDate={item.createdAt}
                  desc={item.description}
                  id={item.id}
                  linkPath={App.KAIZEN_HUB_INFO}
                  isShow={false}
                />
              </Stack>
            </Box>
          );
        }}
        className="w-full"
        nameTriggerEventSearch={TableType.LIST_FAVORITE}
      />
    </>
  );
};

export default Favorite;
