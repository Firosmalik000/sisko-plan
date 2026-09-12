type RequestBody = FormData | Record<string, unknown> | undefined;

export type ApiResult<T> = {
    body: T;
    headers: Headers;
    ok: boolean;
    status: number;
};

function csrfToken() {
    const value = document.cookie
        .split('; ')
        .find((cookie) => cookie.startsWith('XSRF-TOKEN='))
        ?.split('=')
        .slice(1)
        .join('=');

    return value ? decodeURIComponent(value) : '';
}

function assertSameOrigin(url: string) {
    const target = new URL(url, window.location.origin);

    if (target.origin !== window.location.origin) {
        throw new Error('API requests must use the current application origin.');
    }
}

async function request<T>(method: string, url: string, body?: RequestBody, init: Omit<RequestInit, 'body' | 'method'> = {}) {
    assertSameOrigin(url);
    const formData = body instanceof FormData;
    const response = await fetch(url, {
        ...init,
        method,
        body: body === undefined ? undefined : formData ? body : JSON.stringify(body),
        headers: {
            Accept: 'application/json',
            ...(!formData && body !== undefined ? { 'Content-Type': 'application/json' } : {}),
            'X-XSRF-TOKEN': csrfToken(),
            'X-Requested-With': 'XMLHttpRequest',
            ...init.headers,
        },
    });

    return {
        body: (await response.json()) as T,
        headers: response.headers,
        ok: response.ok,
        status: response.status,
    } satisfies ApiResult<T>;
}

export const apiClient = {
    post: <T>(url: string, body: RequestBody, init?: Omit<RequestInit, 'body' | 'method'>) => request<T>('POST', url, body, init),
};
