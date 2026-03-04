export declare function isNonEmptyString(value: unknown): value is string;
export declare function isValidInviteToken(token: unknown): token is string;
export declare function createInviteLink(origin: string, token: string): string;
export declare function parseInviteTokenFromUrl(urlOrPath: string, fallbackOrigin?: string): string | null;
//# sourceMappingURL=invite.d.ts.map