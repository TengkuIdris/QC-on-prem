import { AxiosRequestConfig } from "axios";
import { instance } from "./axiosClient";

interface Dict<T> {
  [key: string]: T;
  [key: number]: T;
}

export interface ChangeListener {
  (event: any): any;
}

export class ServiceBase {
  private onChangeListeners: Dict<ChangeListener> = {};

  get = async (url: string, configs?: AxiosRequestConfig<any>): Promise<any> => {
    return await instance.get(url, configs);
  };

  put = async (url: string, data: any, configs?: AxiosRequestConfig<any>): Promise<any> => {
    return await instance.put(url, data, configs);
  };

  patch = async (url: string, data?: any, configs?: AxiosRequestConfig<any>): Promise<any> => {
    return await instance.patch(url, data, configs);
  };

  post = async (url: string, body?: any, configs?: AxiosRequestConfig<any>): Promise<any> => {
    return await instance.post(url, body, configs);
  };

  delete = async (url: string, id: number | string): Promise<any> => {
    return await instance.delete(`${url}/${id}`);
  };

  subscribe(key: string, listener: ChangeListener) {
    if (this.onChangeListeners[key]) return;
    this.onChangeListeners[key] = listener;
  }

  unsubcribe(key: string) {
    delete this.onChangeListeners[key];
  }

  fire(data: any) {
    Object.values(this.onChangeListeners).forEach((listener) => listener(data));
  }

  deleteV2 = async (url: string, config?: AxiosRequestConfig<any>) => {
    return await instance.delete(url, config);
  };
}
