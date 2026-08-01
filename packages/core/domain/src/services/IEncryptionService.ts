export interface EncryptionPayload {
  ciphertext: string;
  algorithm: string;
  iv?: string;
  keyId?: string;
}

export interface IEncryptionService {
  encrypt(plaintext: string): Promise<EncryptionPayload>;
  decrypt(payload: EncryptionPayload): Promise<string>;
  hash(value: string): Promise<string>;
  verifyHash(value: string, hash: string): Promise<boolean>;
}
