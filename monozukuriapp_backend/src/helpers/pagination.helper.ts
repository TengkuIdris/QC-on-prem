import { OrderBy } from "src/types/enums/orderBy.enum";

export function pagination(pageNumber: number, size: number, orderBy: OrderBy): [number, number, OrderBy] {
  const take = size ? size : 10;
  const skip = ((pageNumber ? pageNumber : 1) - 1) * take;
  const _orderBy = orderBy ? orderBy : OrderBy.DESC;
  return [skip, take, _orderBy];
}
