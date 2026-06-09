import { ReactElement } from "react";
import { RouteObject } from "react-router-dom";

export interface RouteConfig extends RouteObject {
  path: string;
  element: ReactElement;
  children?: RouteConfig[];
}
