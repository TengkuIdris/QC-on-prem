import axios from "axios";

const BASE_URL = import.meta.env.VITE_DIAGRAM_API_ENDPOINT;

export const fetchDiagramData = async () => {
  const response = await axios.get(`${BASE_URL}/diagram-data`);
  return response.data;
};
