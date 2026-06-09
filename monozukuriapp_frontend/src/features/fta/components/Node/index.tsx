/* eslint-disable no-unsafe-optional-chaining */
import React, { useState, useEffect, memo } from "react";
import { useAppDispatch } from "../../../../core/hooks";
import { setRootNode } from "../../../../store/slices/treeSlice";
import { useSelector } from "react-redux";
import { RootState } from "../../../../store/store";
import { setSubmitStatus } from "../../../../store/slices/submitSlice";
import NodeComponent from "../NodeComponent";

export enum Type {
  AI = "AI",
  USER = "USER",
}

const Tree = ({ root, maxNode, setTreeNode, isSubmittedRef, handleFormChange, queryIds, disableAi }: any) => {
  const dispatch = useAppDispatch();
  const isSubmitted = useSelector((state: RootState) => state.submit.isSubmitted);
  const [rootNode, setRootNodeTree] = useState<any>(
    root
      ? root
      : {
          id: 0,
          name: "Root",
          level: 0,
          children: [],
        },
  );
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<number | null>(null);

  const addChildToRoot = (newChild: any) => {
    setRootNodeTree((prevRoot: any) => ({
      ...prevRoot,
      children: JSON.parse(JSON.stringify([...prevRoot?.children, newChild])),
    }));
  };

  const saveTreeToRedux = () => {
    dispatch(setRootNode(rootNode));
    setTreeNode(rootNode);
  };
  useEffect(() => {
    if (isSubmitted) {
      saveTreeToRedux();
    }
    dispatch(setSubmitStatus(false));
  }, [isSubmitted]);

  const removeNodeFromRoot = (id: number) => {
    isSubmittedRef.current = false;
    handleFormChange("");
    const removeNode = (node: any, idToRemove: number): any => {
      if (node.id === idToRemove) {
        return null;
      }
      if (node.children) {
        const updatedChildren = node.children
          .map((child: any) => removeNode(child, idToRemove))
          .filter((child: any) => child !== null);
        return {
          ...node,
          children: updatedChildren,
        };
      }
      return node;
    };
    setRootNodeTree((prevRoot: any) => removeNode(prevRoot, id) || {});
  };

  const updateTree = (updatedNode: any, type: Type) => {
    const updateNode = (node: any, updatedNode: any): any => {
      if (node.id === updatedNode.id) {
        return {
          ...node,
          ...updatedNode,
        };
      }
      if (node.children) {
        return {
          ...node,
          children: JSON.parse(JSON.stringify(node.children.map((child: any) => updateNode(child, updatedNode)))),
        };
      }
      return node;
    };

    setRootNodeTree((prevRoot: any) => updateNode(prevRoot, updatedNode));
    if (type === Type.AI) {
      setTreeNode((prevRoot: any) => updateNode(prevRoot, updatedNode));
    }
  };

  const resetRoot = () => {
    isSubmittedRef.current = false;
    handleFormChange("");
    setRootNodeTree({ id: 0, name: "タイトル", level: 0, children: [] });
  };

  useEffect(() => {
    dispatch(setRootNode(rootNode));
  }, [rootNode]);

  return (
    <>
      <NodeComponent
        id={rootNode.id}
        name={rootNode.name}
        level={rootNode.level}
        addChild={addChildToRoot}
        removeNode={removeNodeFromRoot}
        updateTree={updateTree}
        resetRoot={resetRoot}
        children={rootNode.children}
        maxNode={maxNode ? maxNode : 6}
        isSubmittedRef={isSubmittedRef}
        handleFormChange={handleFormChange}
        limitText={255}
        queryIds={queryIds}
        disableAi={disableAi}
        hoveredNodeId={hoveredNodeId}
        setHoveredNodeId={setHoveredNodeId}
        selectedNodeId={selectedNodeId}
        setSelectedNodeId={setSelectedNodeId}
        editingNodeId={editingNodeId}
        setEditingNodeId={setEditingNodeId}
      />
    </>
  );
};

export default memo(Tree);
