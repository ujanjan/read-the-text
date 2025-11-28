import type { Env } from '../../types';

export const onRequestPost: PagesFunction<Env> = async (context) => {
    console.log('=== AUTH HANDLER CALLED ===');
    try {
        const { password } = await context.request.json() as { password: string };
        console.log('Password received, checking...');

        // Get the admin password from environment variable
        const adminPassword = context.env.ADMIN_PASSWORD;

        if (!adminPassword) {
            console.error('ADMIN_PASSWORD environment variable not set');
            return Response.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        // Verify password
        if (password === adminPassword) {
            // Generate a simple token (in production, use JWT)
            const token = btoa(`admin:${Date.now()}`);

            return Response.json({
                success: true,
                token
            });
        } else {
            return Response.json(
                { error: 'Invalid password' },
                { status: 401 }
            );
        }
    } catch (error) {
        console.error('Auth error:', error);
        return Response.json(
            { error: 'Authentication failed' },
            { status: 500 }
        );
    }
};
