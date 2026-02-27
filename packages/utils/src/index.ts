export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export {
  createInviteLink,
  isNonEmptyString,
  isValidInviteToken,
  parseInviteTokenFromUrl,
} from "./invite";
