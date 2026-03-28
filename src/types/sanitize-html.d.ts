declare module 'sanitize-html' {
  export type Attributes = Record<string, string>;

  export interface IOptions {
    allowedTags?: string[];
    allowedAttributes?: Record<string, string[]>;
    allowedSchemes?: string[];
    allowedSchemesAppliedToAttributes?: string[];
    allowProtocolRelative?: boolean;
    disallowedTagsMode?:
      | 'discard'
      | 'completelyDiscard'
      | 'escape'
      | 'recursiveEscape';
    allowedIframeHostnames?: string[];
    transformTags?: Record<
      string,
      | string
      | ((tagName: string, attribs: Attributes) => { tagName: string; attribs: Attributes })
    >;
  }

  export default function sanitizeHtml(dirty: string, options?: IOptions): string;
}
