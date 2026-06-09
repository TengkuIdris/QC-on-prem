export function scrollToBottom(selector: string) {
  const element = document.querySelector(selector);
  if (element) {
    element.scrollTop = element.scrollHeight;
  }
}
