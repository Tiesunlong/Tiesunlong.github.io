import { Marked } from 'marked';

// Content is first-party JSON; marked runs at build time only.
const md = new Marked({ gfm: true, breaks: false });

md.use({
  renderer: {
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      const external = /^https?:\/\//i.test(href);
      const attrs = [
        `href="${href}"`,
        title ? `title="${title}"` : '',
        external ? 'rel="noopener"' : '',
      ].filter(Boolean);
      return `<a ${attrs.join(' ')}>${text}</a>`;
    },
  },
});

export const renderInline = (src: string) => md.parseInline(src, { async: false });
export const renderBlock = (src: string) => md.parse(src, { async: false });
