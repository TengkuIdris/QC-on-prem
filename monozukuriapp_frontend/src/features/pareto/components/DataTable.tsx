import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Checkbox,
  Popover,
  Button,
  Box,
  Typography,
} from "@mui/material";
import ColorLensIcon from "@mui/icons-material/ColorLens";
import { ProcessedDataItem, ParetoChartOptions, DataItem } from "../types";
import { useCopyTableController } from "../hooks/local/useCopyTableController";
import { FontFamily } from "./ParetoChart";
import { useAppSelector } from "@/core/hooks";
import { RootState } from "@/store/store";
import { colorToHex } from "@/utils/convertHSLtoHEX";

interface DataTableProps {
  data: ProcessedDataItem[];
  onColorChange: (index: number, color: string) => void;
  onLabelToggle: (index: number, showBarLabel: boolean, showLineLabel: boolean) => void;
  onBulkColorChange?: (color: string) => void;
  options: ParetoChartOptions;
  onOptionChange: (key: keyof ParetoChartOptions, value: any) => void;
  items: DataItem[];
}

const ColorPicker: React.FC<{
  initialColor: string;
  onColorChange: (color: string) => void;
  onClose: () => void;
}> = ({ initialColor, onColorChange, onClose }) => {
  const [color, setColor] = useState(initialColor);
  const presetColors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setColor(e.target.value);
  };

  const handleApply = () => {
    onColorChange(color);
    onClose();
  };

  return (
    <Box
      p={2}
      width={300}
    >
      <Typography
        variant="h6"
        gutterBottom
      >
        色を選択
      </Typography>
      <Box
        display="flex"
        justifyContent="space-between"
        mb={2}
      >
        <Box>
          <Typography
            variant="subtitle2"
            gutterBottom
          >
            現在の色
          </Typography>
          <Box
            width={120}
            height={40}
            bgcolor={initialColor}
            border="1px solid #000"
          />
        </Box>
        <Box>
          <Typography
            variant="subtitle2"
            gutterBottom
          >
            変更後の色
          </Typography>
          <Box
            width={120}
            height={40}
            bgcolor={color}
            border="1px solid #000"
          />
        </Box>
      </Box>
      <Typography
        variant="subtitle1"
        gutterBottom
      >
        新しい色を選択:
      </Typography>
      <input
        type="color"
        value={color}
        onChange={handleChange}
        className="w-full h-[40px] mb-[10px]"
      />
      <Typography
        variant="subtitle1"
        gutterBottom
      >
        プリセットカラー:
      </Typography>
      <Box
        display="flex"
        flexWrap="wrap"
        justifyContent="space-between"
        mb={2}
      >
        {presetColors.map((presetColor, index) => (
          <Box
            key={index}
            width={40}
            height={40}
            bgcolor={presetColor}
            mb={1}
            border="1px solid #000"
            className="cursor-pointer"
            onClick={() => setColor(presetColor)}
          />
        ))}
      </Box>
      <Box
        display="flex"
        justifyContent="space-between"
      >
        <Button
          variant="contained"
          color="primary"
          onClick={handleApply}
        >
          適用
        </Button>
        <Button
          variant="outlined"
          onClick={onClose}
        >
          キャンセル
        </Button>
      </Box>
    </Box>
  );
};

const DataTable: React.FC<DataTableProps> = ({ data, onColorChange, onLabelToggle, onBulkColorChange, options }) => {
  const [localData, setLocalData] = useState(data);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [bulkColorAnchorEl, setBulkColorAnchorEl] = useState<HTMLElement | null>(null);
  const [mainColor, setMainColer] = useState<string>("#d3d3d3");
  const { tableRef, copyToClipboard } = useCopyTableController();

  useEffect(() => {
    setLocalData(data);
    const allSameColor = data?.every((item: any) => item?.color === data[0]?.color);
    if ((allSameColor && data[0]?.color) || (data.length === 1 && data[0].color)) {
      setMainColer(data[0].color);
    } else {
      setMainColer("#d3d3d3");
    }
  }, [data]);

  const handleColorClick = (event: React.MouseEvent<HTMLElement>, index: number) => {
    setAnchorEl(event.currentTarget);
    setSelectedIndex(index);
  };

  const handleColorClose = () => {
    setAnchorEl(null);
    setSelectedIndex(null);
  };

  const handleColorChange = (color: string) => {
    if (selectedIndex !== null) {
      onColorChange(selectedIndex, color);
      setLocalData((prevData) => prevData.map((item, index) => (index === selectedIndex ? { ...item, color } : item)));
    }
  };

  const handleBulkColorClick = (event: React.MouseEvent<HTMLElement>) => {
    setBulkColorAnchorEl(event.currentTarget);
  };

  const handleBulkColorClose = () => {
    setBulkColorAnchorEl(null);
  };

  const handleBulkColorChange = (color: string) => {
    setMainColer(color);
    setLocalData((prevData) =>
      prevData.map((item) => {
        return { ...item, color };
      }),
    );
    if (typeof onBulkColorChange === "function") {
      onBulkColorChange(color);
    } else {
      console.warn("onBulkColorChange is not a function. Updating local state only.");
    }
    handleBulkColorClose();
  };

  const open = Boolean(anchorEl);
  const bulkColorOpen = Boolean(bulkColorAnchorEl);
  const userRole = useAppSelector((state: RootState) => state.auth.user.role);
  const chose_color = userRole?.PARENTO_CHOOSE_COLOR_TEXT;
  return (
    <TableContainer component={Paper}>
      <Box
        display="flex"
        justifyContent="space-between"
        p={2}
      >
        <Button
          variant="contained"
          color="primary"
          className="focus:outline-none"
          onClick={() => {
           // Prepare tabular data for copy (TSV)
            const headers = ["項目名", "数量", "累積数量", "累積比率", "色", "データラベル", "線ラベル"];
            const rows = localData.map((row) => [
              row.name,
              row.quantity,
              row.cumulativeQuantity,
              `${row.cumulativePercentage.toFixed(1)}%`,
              colorToHex(row.color || options.otherColor),
              row.showBarLabel ? "true" : "false",
              row.showLineLabel ? "true" : "false",
            ]);
            const tsv = [headers, ...rows].map((r) => r.join("\t")).join("\n");
            copyToClipboard(tsv)
          }}
        >
          表をクリップボードにコピーする
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleBulkColorClick}
          startIcon={<ColorLensIcon />}
          className="focus:outline-none !ml-3"
          disabled={!chose_color}
        >
          色の一括変更
        </Button>
      </Box>
      <Table
        sx={{ minWidth: 650 }}
        aria-label="パレート図データ表"
        ref={tableRef}
      >
        <TableHead>
          <TableRow>
            <TableCell
              sx={{
                fontFamily: `${FontFamily[options.fontFamily]} !important`,
              }}
            >
              項目名
            </TableCell>
            <TableCell
              align="right"
              sx={{
                fontFamily: `${FontFamily[options.fontFamily]} !important`,
              }}
            >
              数量
            </TableCell>
            <TableCell
              align="right"
              sx={{
                fontFamily: `${FontFamily[options.fontFamily]} !important`,
              }}
            >
              累積数量
            </TableCell>
            <TableCell
              align="right"
              sx={{
                fontFamily: `${FontFamily[options.fontFamily]} !important`,
              }}
            >
              累積比率
            </TableCell>
            <TableCell
              align="center"
              sx={{
                fontFamily: `${FontFamily[options.fontFamily]} !important`,
              }}
            >
              色
            </TableCell>
            <TableCell
              align="center"
              sx={{
                fontFamily: `${FontFamily[options.fontFamily]} !important`,
              }}
            >
              データラベル
            </TableCell>
            <TableCell
              align="center"
              sx={{
                fontFamily: `${FontFamily[options.fontFamily]} !important`,
              }}
            >
              線ラベル
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {localData.map((row, index) => (
            <TableRow key={index}>
              <TableCell
                component="th"
                scope="row"
                sx={{
                  fontFamily: `${FontFamily[options.fontFamily]} !important`,
                }}
              >
                {row.name}
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontFamily: `${FontFamily[options.fontFamily]} !important`,
                }}
              >
                {row.quantity}
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontFamily: `${FontFamily[options.fontFamily]} !important`,
                }}
              >
                {row.cumulativeQuantity}
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontFamily: `${FontFamily[options.fontFamily]} !important`,
                }}
              >{`${row.cumulativePercentage.toFixed(1)}%`}</TableCell>
              <TableCell align="center">
                <IconButton
                  onClick={(e) => chose_color && handleColorClick(e, index)}
                  className={!chose_color ? "!cursor-not-allowed  !bg-[#edecec]" : "!cursor-pointer !bg-[#edecec]"}
                >
                  <ColorLensIcon style={{ color: row.color || options.otherColor }} />
                </IconButton>
              </TableCell>
              <TableCell align="center">
                <Checkbox
                  checked={row.showBarLabel}
                  onChange={(e) => {
                    onLabelToggle(index, e.target.checked, row.showLineLabel);
                    e.stopPropagation();
                  }}
                />
              </TableCell>
              <TableCell align="center">
                <Checkbox
                  checked={row.showLineLabel}
                  onChange={(e) => {
                    onLabelToggle(index, row.showBarLabel, e.target.checked);
                    e.stopPropagation();
                  }}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleColorClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
      >
        {selectedIndex !== null && (
          <ColorPicker
            initialColor={localData[selectedIndex].color || options.otherColor}
            onColorChange={handleColorChange}
            onClose={handleColorClose}
          />
        )}
      </Popover>
      <Popover
        open={bulkColorOpen}
        anchorEl={bulkColorAnchorEl}
        onClose={handleBulkColorClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
      >
        <ColorPicker
          initialColor={mainColor}
          onColorChange={handleBulkColorChange}
          onClose={handleBulkColorClose}
        />
      </Popover>
    </TableContainer>
  );
};

export default DataTable;
