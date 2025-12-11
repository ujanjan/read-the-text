/**
 * Masks an email address for privacy protection during presentations.
 * Converts emails like "john.doe@example.com" to "j***@***.com"
 * 
 * @param email - The email address to mask
 * @returns The masked email string
 */
export function maskEmail(email: string): string {
    if (!email || !email.includes('@')) {
        return email;
    }

    const [username, domain] = email.split('@');

    // Mask username: show first character + asterisks
    const maskedUsername = username.length > 0
        ? username[0] + '***'
        : '***';

    // Mask domain: show asterisks + extension
    const domainParts = domain.split('.');
    const extension = domainParts.length > 0 ? domainParts[domainParts.length - 1] : '';
    const maskedDomain = '***.' + extension;

    return `${maskedUsername}@${maskedDomain}`;
}
