"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange?.(false)}
      />
      <div className="relative">{children}</div>
    </div>
  );
};

const DialogContent = ({ children, className = "" }: DialogContentProps) => {
  return (
    <div className={cn("bg-white rounded-lg shadow-lg max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto", className)}>
      {children}
    </div>
  );
};

const DialogHeader = ({ children, className = "" }: DialogHeaderProps) => {
  return <div className={cn("flex flex-col space-y-1.5 p-6", className)}>{children}</div>;
};

const DialogTitle = ({ children, className = "" }: DialogTitleProps) => {
  return <h3 className={cn("text-lg font-semibold leading-none tracking-tight", className)}>{children}</h3>;
};

const DialogDescription = ({ children, className = "" }: DialogDescriptionProps) => {
  return <p className={cn("text-sm text-gray-500", className)}>{children}</p>;
};

const DialogClose = ({ onClose }: { onClose: () => void }) => {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
      onClick={onClose}
    >
      <X className="h-4 w-4" />
      <span className="sr-only">Close</span>
    </Button>
  );
};

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose };
