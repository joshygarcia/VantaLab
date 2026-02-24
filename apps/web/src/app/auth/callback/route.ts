import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')

    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/dashboard'

    if (code) {
        const supabase = await createClient()
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            const accessToken = data.session?.access_token

            if (accessToken) {
                const timeoutController = new AbortController()
                const timeoutId = setTimeout(() => timeoutController.abort(), 3000)

                try {
                    await fetch(`${API_BASE}/auth/me`, {
                        method: 'GET',
                        cache: 'no-store',
                        headers: {
                            authorization: `Bearer ${accessToken}`
                        },
                        signal: timeoutController.signal
                    })
                } catch {
                    // Ignore sync errors so login flow is not blocked.
                } finally {
                    clearTimeout(timeoutId)
                }
            }

            return NextResponse.redirect(`${origin}${next}`)
        }
    }

    // Return the user to an error page with some instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
