export function cleanValues<T extends Record<string, any>>(values: T): Partial<T> {
  return (
    Object.entries(values)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter(([_, value]) => {
        if (Array.isArray(value)) {
          return value.length > 0;
        }
        return Boolean(value);
      })
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {} as Partial<T>)
  );
}
