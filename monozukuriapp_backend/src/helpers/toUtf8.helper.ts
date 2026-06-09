export const toUtf8 = (s: string) => Buffer.from(s, "latin1").toString("utf8");
