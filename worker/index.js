export default {
  async fetch(request, env) {
    const asset = await env.ASSETS.fetch(request);
    if (asset.status !== 404) {
      return asset;
    }

    const url = new URL(request.url);
    if (url.pathname !== "/" && url.pathname.includes(".")) {
      return asset;
    }

    url.pathname = "/index.html";
    return env.ASSETS.fetch(new Request(url, request));
  },
};
