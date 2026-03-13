import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = [
    'p', 'br', 'hr',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'pre', 'code',
    'ul', 'ol', 'li',
    'strong', 'em', 'u', 's',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'a', 'img', 'figure', 'figcaption',
    'iframe', 'div', 'aside',
];

const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions['allowedAttributes'] = {
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    iframe: ['src', 'title', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder'],
    th: ['colspan', 'rowspan'],
    td: ['colspan', 'rowspan'],
    '*': ['id', 'class', 'data-*'],
};

const ALLOWED_IFRAME_HOSTNAMES = [
    'www.youtube.com',
    'youtube.com',
    'www.youtube-nocookie.com',
    'youtube-nocookie.com',
    'player.vimeo.com',
];

export function sanitizeBlogHtml(rawHtml: string): string {
    return sanitizeHtml(rawHtml, {
        allowedTags: ALLOWED_TAGS,
        allowedAttributes: ALLOWED_ATTRIBUTES,
        allowedSchemes: ['http', 'https', 'mailto'],
        allowedSchemesAppliedToAttributes: ['href', 'src'],
        allowProtocolRelative: false,
        disallowedTagsMode: 'discard',
        allowedIframeHostnames: ALLOWED_IFRAME_HOSTNAMES,
        transformTags: {
            a: (_tagName, attribs) => {
                const nextAttribs = { ...attribs };
                if (nextAttribs.target === '_blank') {
                    nextAttribs.rel = 'noopener noreferrer nofollow';
                }
                return { tagName: 'a', attribs: nextAttribs };
            },
        },
    });
}
