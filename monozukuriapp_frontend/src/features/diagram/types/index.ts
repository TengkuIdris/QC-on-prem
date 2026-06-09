// Bone Interface
export interface Bone {
  id: string;
  text: string;
}

// Diagram State Interface
export interface DiagramState {
  characteristic: string;
  largeBones: Bone[];
  mediumBones: Bone[][];
  smallBones: Bone[][][];
  data: number;
  loading: boolean;
  error: string | null;
}

// Template Interface
export interface Template {
  value: string;
  label: string;
}

// Thickness Interface
export interface Thickness {
  backbone: number;
  largeBone: number;
  mediumBone: number;
  smallBone: number;
}

// Error State Interface
export interface ErrorState {
  message: string | null;
}
