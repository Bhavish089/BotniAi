
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/AlgoArena/',
  locale: undefined,
  routes: [
  {
    "renderMode": 2,
    "route": "/AlgoArena"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 497, hash: '2b4012b832909ea33a3682c7a3600f284d79cc5275028a2fc50657f9a333e64b', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 1010, hash: '03357750b3737ee6aae01451378256d2d2565177a683e0c20479b796f238fd73', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'index.html': {size: 1280, hash: 'e90de4aefa199efab8649d0a036e169b586f2237408287472d74d5cc18bf2127', text: () => import('./assets-chunks/index_html.mjs').then(m => m.default)},
    'styles-5INURTSO.css': {size: 0, hash: 'menYUTfbRu8', text: () => import('./assets-chunks/styles-5INURTSO_css.mjs').then(m => m.default)}
  },
};
