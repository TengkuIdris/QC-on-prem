import { styled } from "@mui/material/styles";
import { Paper, Box } from "@mui/material";

export const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  height: "100%",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
}));

export const ScrollableBox = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  overflow: "auto",
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
}));

export const MessageBox = styled(Box)<{ isUser: boolean }>(({ theme, isUser }) => ({
  alignSelf: isUser ? "flex-end" : "flex-start",
  backgroundColor: isUser ? theme.palette.primary.light : theme.palette.secondary.light,
  color: isUser ? theme.palette.primary.contrastText : theme.palette.secondary.contrastText,
  padding: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(1),
  maxWidth: "70%",
}));

export const TreeNodeBox = styled(Box)<{ level: number }>(({ theme, level }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(1),
  paddingLeft: theme.spacing(2 + level * 3),
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));
