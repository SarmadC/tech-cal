declare module 'sanitize-html' {
    export interface IOptions {
        allowedAttributes?: Record<string, string[]>;
        allowedIframeHostnames?: string[];
        allowedSchemes?: string[];
        allowedSchemesAppliedToAttributes?: string[];
        allowedTags?: string[];
        allowProtocolRelative?: boolean;
        disallowedTagsMode?: 'discard' | 'escape' | 'recursiveEscape' | 'completelyDiscard';
        transformTags?: Record<
            string,
            (tagName: string, attribs: Record<string, string>) => {
                attribs: Record<string, string>;
                tagName: string;
            }
        >;
    }

    export default function sanitizeHtml(dirty: string, options?: IOptions): string;
}
