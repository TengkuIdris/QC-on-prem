import { FormikErrors } from "formik";

export const scrollToError = (items: FormikErrors<any>[] | undefined, index: number, field: string) => {
  const nameError = items?.[index]?.name as any;
  const quantityError = items?.[index]?.quantity as any;
  if (nameError || quantityError) {
    const selector = `${field}?.[${index}]`;
    const errorElement = document.getElementById(selector) as HTMLElement;
    errorElement.scrollIntoView();
  }
};
