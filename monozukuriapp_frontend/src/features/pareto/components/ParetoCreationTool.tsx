import { memo } from "react";
import { Box, Grid, Typography } from "@mui/material";
import React from "react";
import { useNavigate } from "react-router-dom";

const ParetoCreationTool = () => {
  const navigate = useNavigate();

  return (
    <div className="w-[80%] m-auto">
      <Grid
        container
        spacing={2}
        sx={{ display: "flex", justifyContent: "space-between" }}
      >
        <Grid
          item
          xs={12}
          lg={5}
        >
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            sx={{
              border: "1px solid #ccc",
              padding: "18px 26px",
              backgroundColor: "#4472c4",
              borderRadius: "8px",
            }}
          >
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              sx={{
                border: "1px solid #ccc",
                padding: "0 10px 20px",
                backgroundColor: "white",
                flexGrow: 1,
                paddingTop: "20%",
                width: "100%",
                height: {
                  xs: "240px",
                  sm: "320px",
                  md: "240px",
                },
                cursor: "pointer",
              }}
              onClick={() => navigate("/pareto/mode")}
            >
              <Box
                display="flex"
                flexDirection="column"
                justifyContent="center"
                alignItems="center"
              >
                <Typography
                  variant="h4"
                  gutterBottom
                  sx={{
                    padding: "6px 10px",
                    fontSize: { xs: "22px", sm: "28px" },
                    fontWeight: "bold",
                  }}
                >
                  新規作成
                </Typography>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{
                    border: "1px solid #ccc",
                    padding: "6px 18px",
                    fontSize: { xs: "14px", sm: "17px" },
                    textWrap: {
                      xl: "nowrap",
                    },
                    cursor: "pointer",
                  }}
                >
                  新しくパレート図を作成します。
                </Typography>
              </Box>
            </Box>
          </Box>
        </Grid>
        <Grid
          item
          xs={12}
          lg={5}
        >
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            sx={{
              border: "1px solid #ccc",
              padding: "18px 26px",
              backgroundColor: "#4472c4",
              borderRadius: "8px",
            }}
          >
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              sx={{
                border: "1px solid #ccc",
                padding: "0 10px 20px",
                backgroundColor: "white",
                flexGrow: 1,
                paddingTop: "20%",
                width: "100%",
                height: {
                  xs: "240px",
                  sm: "320px",
                  md: "240px",
                },
                cursor: "pointer",
              }}
              onClick={() => navigate("/pareto/datafromcloud")}
            >
              <Box
                display="flex"
                flexDirection="column"
                justifyContent="center"
                alignItems="center"
              >
                <Typography
                  variant="h4"
                  gutterBottom
                  sx={{
                    padding: "6px 10px",
                    fontSize: { xs: "22px", sm: "28px" },
                    fontWeight: "bold",
                  }}
                >
                  つづきから
                </Typography>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{
                    border: "1px solid #ccc",
                    padding: "6px 25px",
                    fontSize: { xs: "14px", sm: "18px" },
                    cursor: "pointer",
                    textWrap: {
                      lg: "pretty",
                      xl: "nowrap",
                    },
                  }}
                >
                  過去のデータから再開します
                </Typography>
              </Box>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </div>
  );
};

export default memo(ParetoCreationTool);
