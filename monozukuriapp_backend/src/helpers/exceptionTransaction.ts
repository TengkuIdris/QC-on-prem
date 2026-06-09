import { Exception } from "src/types/interfaces/exceptions.interface";

export const handleThrowExceptionTransaction = (exception: Exception) => {
  return new Error(`${exception.message}-${exception.code}`);
};

export const getExceptionTransaction = (error: string) => {
  const [message, code] = error.split("-");
  return { message, code };
};
