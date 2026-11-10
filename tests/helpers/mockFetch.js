/**
 * Builds a fetch stand-in that routes by URL path/query to canned responses.
 * routes: array of [predicate(url: URL) => boolean, response | (url) => response]
 * response: { status?: number, body: any } | Error (thrown)
 */
export function mockFetch(routes) {
  const calls = [];
  const impl = async (input) => {
    const url = new URL(String(input));
    calls.push(url);
    for (const [match, resp] of routes) {
      if (match(url)) {
        const r = typeof resp === "function" ? resp(url) : resp;
        if (r instanceof Error) throw r;
        const text = typeof r.body === "string" ? r.body : JSON.stringify(r.body);
        return new Response(text, { status: r.status ?? 200, headers: { "content-type": "application/json" } });
      }
    }
    return new Response(JSON.stringify({ code: 404, message: "no mock route", status: "error" }), { status: 404 });
  };
  impl.calls = calls;
  return impl;
}

export const path = (p) => (url) => url.pathname.endsWith(p);
export const fn = (name) => (url) => url.searchParams.get("function") === name;
