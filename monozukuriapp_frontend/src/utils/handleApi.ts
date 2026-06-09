import { AxiosError, AxiosResponse } from "axios";

export const handleApi = async (promise: Promise<AxiosResponse<any, any>>) => {
  return await promise
    .then((d) => [d.data, undefined])
    .catch((err: AxiosError<any, any>) => [undefined, err.response?.data?.message || ""]);
};
