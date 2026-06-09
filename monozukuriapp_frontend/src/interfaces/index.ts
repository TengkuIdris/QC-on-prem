import { TypeImprovement } from "@/enum/kaizenhub/typeImprovement";
import { Category } from "./improvement";

export interface IImprovement {
  id: number;
  userId: number;
  title: string;
  description: string;
  type: TypeImprovement;
  situationBeforeImprovement: string;
  situationAfterImprovement: string;
  improvementProcedures: string;
  tipsAndTricks: string;
  afterImage: string;
  beforeImage: string;
  createdAt: string;
  updatedAt: string;
  labels: ILabelImprovement[];
  user: IUser;
  isFavorite: boolean;
  isLike: boolean;
  _count: {
    likes: number;
  };
  categories: Category;
}

export interface ILabelImprovement {
  label: {
    id: number;
    title: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface IUser {
  id: number;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}
