import React, { useState, useCallback, useRef } from "react";
import {
  TextField,
  Button,
  IconButton,
  Box,
  Typography,
  Select,
  MenuItem,
  Collapse,
  Tooltip,
  Paper,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  SelectChangeEvent,
} from "@mui/material";
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  ArrowDropDown as ExpandIcon,
  ArrowRight as CollapseIcon,
  DragIndicator as DragIcon,
  FileCopy as DuplicateIcon,
  Comment as CommentIcon,
} from "@mui/icons-material";
import { useDrag, useDrop } from "react-dnd";
import { FTANode, GateType } from "../../types/ftaTypes";
import { useHotkeys } from "react-hotkeys-hook";

interface NodeFormProps {
  node: FTANode;
  onUpdate: (updatedNode: FTANode) => void;
  onAddChild: (parentId: string) => void;
  onRemove: (nodeId: string) => void;
  onMove: (dragId: string, hoverId: string) => void;
  onDuplicate: (nodeId: string) => void;
  onAddComment: (nodeId: string, comment: string) => void;
  searchTerm: string;
  selectedNodes: string[];
  onSelectNode: (nodeId: string, isSelected: boolean) => void;
  collapsedNodes: string[];
  onToggleCollapse: (nodeId: string) => void;
  zoom: number;
}

const NodeForm: React.FC<NodeFormProps> = React.memo(
  ({
    node,
    onUpdate,
    onAddChild,
    onRemove,
    onMove,
    onDuplicate,
    onAddComment,
    searchTerm,
    selectedNodes,
    onSelectNode,
    collapsedNodes,
    onToggleCollapse,
    zoom,
  }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false);
    const [comment, setComment] = useState(node.comment || "");

    const [{ isDragging }, drag, preview] = useDrag({
      type: "NODE",
      item: { id: node.id, depth: node.depth },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    });

    const [, drop] = useDrop({
      accept: "NODE",
      hover(item: { id: string; depth: number }, monitor) {
        if (!ref.current) {
          return;
        }
        const dragIndex = item.depth;
        const hoverIndex = node.depth;

        if (item.id === node.id) {
          return;
        }

        const hoverBoundingRect = ref.current?.getBoundingClientRect();
        const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
        const clientOffset = monitor.getClientOffset();
        const hoverClientY = (clientOffset as any).y - hoverBoundingRect.top;

        if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
          return;
        }
        if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
          return;
        }

        onMove(item.id, node.id);
        item.depth = hoverIndex;
      },
    });

    drag(drop(ref));

    const handleContentChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdate({ ...node, content: e.target.value });
      },
      [node, onUpdate],
    );

    const handleGateTypeChange = useCallback(
      (e: SelectChangeEvent<GateType>) => {
        const newGateType = e.target.value as GateType;
        onUpdate({ ...node, gateType: newGateType });
      },
      [node, onUpdate],
    );

    const handleCommentSubmit = useCallback(() => {
      onAddComment(node.id, comment);
      setIsCommentDialogOpen(false);
    }, [node.id, comment, onAddComment]);

    const isHighlighted = searchTerm && node.content.toLowerCase().includes(searchTerm.toLowerCase());
    const isCollapsed = collapsedNodes.includes(node.id);

    useHotkeys("ctrl+enter", () => onAddChild(node.id), { enableOnFormTags: ["INPUT"] });
    useHotkeys("ctrl+backspace", () => node.id !== "root" && onRemove(node.id), { enableOnFormTags: ["INPUT"] });
    useHotkeys("ctrl+d", () => onDuplicate(node.id), { enableOnFormTags: ["INPUT"] });

    return (
      <Paper
        ref={preview}
        elevation={3}
        data-testid="node-paper"
        sx={{
          opacity: isDragging ? 0.5 : 1,
          mb: 2,
          ml: node.depth * 4,
          p: 2,
          borderLeft: `4px solid ${node.gateType === "AND" ? "blue" : node.gateType === "OR" ? "green" : node.gateType === "XOR" ? "purple" : "gray"}`,
          transition: "all 0.3s ease",
          backgroundColor: isHighlighted ? "yellow" : selectedNodes.includes(node.id) ? "lightblue" : "white",
          transform: `scale(${zoom})`,
          transformOrigin: "top left",
        }}
      >
        <Box
          display="flex"
          alignItems="center"
          ref={ref}
        >
          <Checkbox
            checked={selectedNodes.includes(node.id)}
            onChange={(e) => onSelectNode(node.id, e.target.checked)}
            size="small"
          />
          <Tooltip title="Drag to reorder">
            <IconButton
              size="small"
              sx={{ cursor: "move" }}
            >
              <DragIcon />
            </IconButton>
          </Tooltip>
          {node.children && node.children.length > 0 && (
            <IconButton
              onClick={() => onToggleCollapse(node.id)}
              size="small"
              data-testid="collapse-expand-button"
            >
              {isCollapsed ? <CollapseIcon /> : <ExpandIcon />}
            </IconButton>
          )}
          <TextField
            value={node.content}
            onChange={handleContentChange}
            variant="outlined"
            size="small"
            sx={{ flexGrow: 1, mr: 1 }}
          />
          <Select
            value={node.gateType || "BASIC"}
            onChange={handleGateTypeChange}
            size="small"
            sx={{ width: 100, mr: 1 }}
          >
            <MenuItem value="BASIC">Basic</MenuItem>
            <MenuItem value="AND">AND</MenuItem>
            <MenuItem value="OR">OR</MenuItem>
            <MenuItem value="XOR">XOR</MenuItem>
          </Select>
          <Tooltip title="Add child node (Ctrl+Enter)">
            <IconButton
              onClick={() => onAddChild(node.id)}
              size="small"
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
          {node.id !== "root" && (
            <>
              <Tooltip title="Remove node (Ctrl+Backspace)">
                <IconButton
                  onClick={() => onRemove(node.id)}
                  size="small"
                >
                  <RemoveIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Duplicate node (Ctrl+D)">
                <IconButton
                  onClick={() => onDuplicate(node.id)}
                  size="small"
                >
                  <DuplicateIcon />
                </IconButton>
              </Tooltip>
            </>
          )}
          <Tooltip title="Add comment">
            <IconButton
              onClick={() => setIsCommentDialogOpen(true)}
              size="small"
            >
              <CommentIcon />
            </IconButton>
          </Tooltip>
        </Box>
        {node.comment && (
          <Typography
            variant="body2"
            color="textSecondary"
            sx={{ mt: 1, fontStyle: "italic" }}
          >
            Comment: {node.comment}
          </Typography>
        )}
        <Collapse in={!isCollapsed}>
          <Box sx={{ mt: 2 }}>
            {node.children?.map((child) => (
              <NodeForm
                key={child.id}
                node={child}
                onUpdate={onUpdate}
                onAddChild={onAddChild}
                onRemove={onRemove}
                onMove={onMove}
                onDuplicate={onDuplicate}
                onAddComment={onAddComment}
                searchTerm={searchTerm}
                selectedNodes={selectedNodes}
                onSelectNode={onSelectNode}
                collapsedNodes={collapsedNodes}
                onToggleCollapse={onToggleCollapse}
                zoom={zoom}
              />
            ))}
          </Box>
        </Collapse>
        <Dialog
          open={isCommentDialogOpen}
          onClose={() => setIsCommentDialogOpen(false)}
        >
          <DialogTitle>Add Comment</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Comment"
              type="text"
              fullWidth
              variant="outlined"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsCommentDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCommentSubmit}>Submit</Button>
          </DialogActions>
        </Dialog>
      </Paper>
    );
  },
);

export default NodeForm;
