import axios from "axios";
import { DataItem } from "../types";

const API_ENDPOINT = import.meta.env.VITE_PARETO_API_ENDPOINT;

export const fetchParetoChartData = async (data: DataItem[]) => {
  try {
    const response = await axios.post(`${API_ENDPOINT}/pareto`, { data });
    return response.data;
  } catch (error) {
    console.error("Error fetching Pareto chart data:", error);
    throw error;
  }
};
