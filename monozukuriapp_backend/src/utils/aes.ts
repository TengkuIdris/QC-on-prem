import { AES, enc } from "crypto-js";
export async function decryptPrivateKey(privateKey: string): Promise<string> {
  return AES.decrypt(privateKey, process.env.APP_KEY_SECRET).toString(enc.Utf8);
}
