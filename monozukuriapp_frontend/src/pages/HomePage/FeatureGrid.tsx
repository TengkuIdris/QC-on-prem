import React, { memo } from "react";
import { Typography, Box, Grid, Card, CardContent, CardMedia, Button, Chip, IconButton, Tooltip } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { motion } from "framer-motion";
import { Help, Add, Visibility } from "@mui/icons-material";

const MotionCard = motion(Card);

interface Feature {
  name: string;
  description: string;
  cardPath: string;
  createPath: string;
  icon: React.ComponentType;
  color: string;
  gradient: string;
  status: string;
  statusColor: string;
  statusTextColor: string;
  buttonType: "create" | "feedback";
  buttonText: string;
}

interface FeatureGridProps {
  features: Feature[];
  onCardClick: (path: string) => void;
}

export const FeatureGrid = memo(function FeatureGrid({ features, onCardClick }: FeatureGridProps) {
  return (
    <Grid
      container
      spacing={2.5}
      sx={{ mt: 1 }}
    >
      {features.map((feature, index) => (
        <Grid
          item
          xs={12}
          sm={6}
          lg={3}
          key={feature.name}
        >
          <MotionCard
            whileHover={{
              scale: 1.02,
              boxShadow: "0 12px 24px rgba(42,64,115,0.15)",
              y: -4,
            }}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.6 }}
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              borderRadius: "12px",
              background: "var(--color-bg-surface)",
              border: "1px solid var(--color-border)",
              boxShadow: "0 4px 12px rgba(0,0,0,.06)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {!!feature.status && (
              <Box
                sx={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  zIndex: 3,
                }}
              >
                <Chip
                  label={feature.status}
                  size="small"
                  sx={{
                    backgroundColor: feature.statusColor,
                    color: feature.statusTextColor,
                    fontWeight: 600,
                    fontSize: "11px",
                    height: "22px",
                  }}
                />
              </Box>
            )}

            <Box
              component="button"
              onClick={() => onCardClick(feature.cardPath)}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                height: "100%",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                padding: 0,
                textAlign: "left",
              }}
            >
              <CardMedia
                sx={{
                  height: 140,
                  background: feature.gradient,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                {React.createElement(feature.icon)}
              </CardMedia>

              <CardContent
                sx={{
                  flexGrow: 1,
                  padding: "18px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    mb: 1.5,
                  }}
                >
                  <Typography
                    variant="h6"
                    component="h3"
                    sx={{
                      fontWeight: "bold",
                      color: "#424242",
                      fontSize: 18,
                      lineHeight: 1.3,
                      flex: 1,
                    }}
                  >
                    {feature.name}
                  </Typography>
                  {feature.buttonType === "feedback" || (
                    <Tooltip
                      title="詳しい情報"
                      arrow
                    >
                      <IconButton
                        size="small"
                        onClick={(e) => e.stopPropagation()}
                        sx={{
                          color: "var(--color-text-secondary)",
                          ml: 1,
                          "&:hover": {
                            backgroundColor: "var(--color-border)",
                            color: "var(--color-primary)",
                          },
                        }}
                      >
                        <Help fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>

                <Typography
                  variant="body2"
                  sx={{
                    color: "var(--color-text-secondary)",
                    fontSize: 13,
                    lineHeight: 1.4,
                    mb: 2,
                    flexGrow: 1,
                  }}
                >
                  {feature.description}
                </Typography>
              </CardContent>
            </Box>

            <Box sx={{ p: "0 18px 18px 18px" }}>
              <Button
                component={RouterLink}
                to={feature.createPath}
                variant={feature.buttonType === "create" ? "contained" : "outlined"}
                startIcon={
                  feature.buttonType === "create" ? <Add /> : feature.buttonType === "feedback" || <Visibility />
                }
                fullWidth
                onClick={(e) => e.stopPropagation()}
                sx={{
                  height: 40,
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "13px",
                  textTransform: "none",
                  ...(feature.buttonType === "create"
                    ? {
                        backgroundColor: "var(--color-primary)",
                        color: "white",
                        "&:hover": {
                          backgroundColor: "var(--color-primary-hover)",
                          boxShadow: "0 4px 12px rgba(42,64,115,0.3)",
                          color: "#FFD700",
                        },
                      }
                    : {
                        borderColor: "var(--color-border)",
                        color: "var(--color-text-body)",
                        "&:hover": {
                          borderColor: "var(--color-primary)",
                          backgroundColor: "rgba(42,64,115,0.04)",
                          color: "#FFD700",
                        },
                      }),
                }}
              >
                {feature.buttonText}
              </Button>
            </Box>
          </MotionCard>
        </Grid>
      ))}
    </Grid>
  );
});
