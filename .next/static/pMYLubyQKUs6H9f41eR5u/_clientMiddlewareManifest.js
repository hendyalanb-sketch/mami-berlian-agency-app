self.__MIDDLEWARE_MATCHERS = [
  {
    "regexp": "^(?:\\/(_next\\/data\\/[^/]{1,}))?(?:\\/((?!api\\/auth|api\\/health|api\\/capabilities|_next\\/static|_next\\/image|favicon.ico|icon.svg|manifest.webmanifest|sw.js|vendor\\/|login|canva-connected).*))(\\.json|\\.rsc|\\.segments\\/.+\\.segment\\.rsc)?[\\/#\\?]?$",
    "originalSource": "/((?!api/auth|api/health|api/capabilities|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|sw.js|vendor/|login|canva-connected).*)"
  }
];self.__MIDDLEWARE_MATCHERS_CB && self.__MIDDLEWARE_MATCHERS_CB()