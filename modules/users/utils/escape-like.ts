// Escapes LIKE wildcards so user input is matched literally.
export function escapeLike(text: string) {
  return text.replace(/[\\%_]/g, "\\$&");
}
