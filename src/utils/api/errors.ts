export const ErrorCode = {
    NotLinked: 'not_linked',
    InvalidDiscordId: 'invalid_discord_id',
    MissingToken: 'missing_session_token',
    InvalidToken: 'invalid_session_token',
    InvalidBody: 'invalid_request_body',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];