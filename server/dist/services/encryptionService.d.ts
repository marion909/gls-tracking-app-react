export declare class EncryptionService {
    private static readonly ALGORITHM;
    private static readonly KEY_LENGTH;
    private static readonly IV_LENGTH;
    private static readonly SALT_LENGTH;
    private static readonly ITERATIONS;
    static deriveKey(masterPassword: string, salt: Buffer): Promise<Buffer>;
    static encrypt(data: string, masterPassword: string): Promise<string>;
    static decrypt(encryptedData: string, masterPassword: string): Promise<string>;
    static hashPassword(password: string): Promise<{
        hash: string;
        salt: string;
    }>;
    static verifyPassword(password: string, storedHash: string, storedSalt: string): Promise<boolean>;
}
//# sourceMappingURL=encryptionService.d.ts.map