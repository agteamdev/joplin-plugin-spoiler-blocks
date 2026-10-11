module.exports = {
    default: function(context) {
        return {
            plugin: async function(markdownIt, _options) {

                // Block-level rule: ":[ Title \n\n Body \n\n ]:"
                markdownIt.block.ruler.after('fence', 'spoiler_block', spoiler_block, {
                    alt: ['paragraph', 'reference', 'blockquote', 'list']
                });

                const esc = markdownIt.utils.escapeHtml;
                // Attribute values must keep line breaks, so encode them
                const attr = text => esc(text).replace(/\n/g, '&#10;');

                // Hidden copy of the original markdown. The Rich Text Editor
                // converts the rendered HTML back to markdown, and it uses this
                // element to restore the exact ":[ ... ]:" source.
                markdownIt.renderer.rules.spoiler_source = function(tokens, idx) {
                    const token = tokens[idx];
                    return '<pre class="joplin-source" hidden data-joplin-language="spoiler"'
                        + ' data-joplin-source-open="' + attr(token.meta.open) + '"'
                        + ' data-joplin-source-close="' + attr(token.meta.close) + '">'
                        + esc(token.content) + '</pre>';
                };

                // The Rich Text Editor's "Edit" dialog (double click) rewrites a
                // block as a fenced code block with the language name, so a
                // ```spoiler fence is rendered as a spoiler too.
                const defaultFence = markdownIt.renderer.rules.fence || function(tokens, idx, options, env, self) {
                    return self.renderToken(tokens, idx, options);
                };

                markdownIt.renderer.rules.fence = function(tokens, idx, options, env, self) {
                    const token = tokens[idx];
                    const lang = (token.info || '').trim().split(/\s+/)[0];
                    if (lang !== 'spoiler') return defaultFence(tokens, idx, options, env, self);

                    const raw = token.content.replace(/\n+$/, '');
                    const parts = raw.match(/^([^\n]*)\n+([\s\S]*)$/);
                    const title = parts ? parts[1] : raw;
                    const body = parts ? parts[2] : '';
                    const id = genRanHex(8);

                    return '<div class="joplin-editable">'
                        + '<pre class="joplin-source" hidden data-joplin-language="spoiler"'
                        + ' data-joplin-source-open="' + attr('```spoiler\n') + '"'
                        + ' data-joplin-source-close="' + attr('\n```\n') + '">' + esc(raw) + '</pre>'
                        + '<div class="spoiler-block">'
                        + '<input class="spoiler-block-input" type="checkbox" id="' + id + '">'
                        + '<label class="summary-title" for="' + id + '">' + markdownIt.renderInline(title, env) + '</label>'
                        + '<div class="summary-content">' + markdownIt.render(body, env) + '</div>'
                        + '</div></div>';
                };
            },

            // CSS that is injected into the note view / export.
            // Colors use semi-transparent grey, so the block adapts
            // to both light and dark themes without extra rules.
            assets: function() {
                return [
                    {
                        inline: true,
                        mime: 'text/css',
                        text: `
                        .spoiler-block {
                            margin: 0.6em 0;
                            border: 1px solid rgba(128, 128, 128, 0.3);
                            border-radius: 6px;
                            background: rgba(128, 128, 128, 0.06);
                            overflow: hidden;
                            font-size: 0.95em;
                        }

                        /* The real checkbox sits invisibly over the title row. Clicks land on
                           the checkbox itself, which the Rich Text Editor handles, instead
                           of on the label, which it swallows (it only selects the block). */
                        .spoiler-block {
                            position: relative;
                        }
                        .spoiler-block .spoiler-block-input {
                            position: absolute;
                            top: 0;
                            left: 0;
                            width: 100%;
                            height: 34px;
                            margin: 0;
                            opacity: 0;
                            cursor: pointer;
                            z-index: 1;
                        }

                        .spoiler-block .summary-title {
                            display: block;
                            width: 100%;
                            box-sizing: border-box;
                            padding: 6px 10px;
                            font-weight: 600;
                            color: inherit;
                            background: rgba(128, 128, 128, 0.10);
                            cursor: pointer;
                            user-select: none;
                        }

                        .spoiler-block .summary-title:hover {
                            background: rgba(128, 128, 128, 0.18);
                        }

                        .spoiler-block .summary-title::before {
                            content: "\\25B8";
                            margin-right: 6px;
                            opacity: 0.7;
                        }

                        .spoiler-block .spoiler-block-input:checked ~ .summary-title::before {
                            content: "\\25BE";
                        }

                        .spoiler-block .summary-content {
                            display: none;
                            padding: 8px 12px;
                            line-height: 1.5;
                            border-top: 1px solid rgba(128, 128, 128, 0.3);
                            cursor: default;
                        }

                        .spoiler-block .spoiler-block-input:checked ~ .summary-content {
                            display: block;
                            animation: spoiler-open 150ms ease-out;
                        }

                        /* Rich Text Editor (its body has the .mce-content-body class): the block
                           is a single non-clickable unit there, so it is always shown expanded. */
                        .mce-content-body .spoiler-block .spoiler-block-input {
                            display: none;
                        }
                        .mce-content-body .spoiler-block .summary-title {
                            cursor: default;
                        }
                        .mce-content-body .spoiler-block .summary-title::before {
                            content: "\\25BE";
                        }
                        .mce-content-body .spoiler-block .summary-content {
                            display: block;
                            animation: none;
                        }

                        .spoiler-block .summary-content > :first-child { margin-top: 0; }
                        .spoiler-block .summary-content > :last-child { margin-bottom: 0; }

                        @keyframes spoiler-open {
                            from { opacity: 0; }
                            to { opacity: 1; }
                        }

                        /* Export / print: show the body and hide the arrow */
                        @media print {
                            .spoiler-block .summary-content {
                                display: block;
                                animation: none;
                            }
                            .spoiler-block .summary-title::before {
                                content: "";
                            }
                        }
                        `
                    }
                ];
            },
        }
    }
}

// Tokenizing the spoiler blocks
function spoiler_block(state, start, end, silent) {

    let found = false,
    pos = state.bMarks[start] + state.tShift[start],
    max = state.eMarks[start],
    next;

    let token;
    let curLine = start;

    if (pos + 2 > max) return false;

    // Block must start with ':['
    if (state.src.slice(pos, pos + 2) !== ':[') return false;
    pos += 2;

    // Empty blocks are not accepted
    if (state.src.slice(pos, pos + 2) == ']:') return false;
    pos += 2;

    if (silent) return true;

    curLine++;
    // Title line
    if (state.isEmpty(curLine)) return false;
    let title = curLine;

    curLine++;
    // Blank line required between title and body
    if (!state.isEmpty(curLine)) return false;

    curLine++;
    // Body must not be empty
    if (state.isEmpty(curLine)) return false;

    // Find the closing "]:" line first (nested blocks are supported)
    let bracketLevel = 1;

    for (next = curLine; !found;) {
        next++;

        if (next >= end) break;

        pos = state.bMarks[next] + state.tShift[next];
        max = state.eMarks[next];

        if (pos < max && state.tShift[next] < state.blkIndent) break;

        if (state.src.slice(pos, max).length == 2 && state.src.slice(pos, max).trim().slice(-2) == ':[') {
            bracketLevel++;
        }

        if (state.src.slice(pos, max).length == 2 && state.src.slice(pos, max).trim().slice(-2) == ']:') {
            if (bracketLevel == 1) found = true;
            else bracketLevel--;
        }
    }

    // Original markdown between ":[" and "]:" (kept for the Rich Text Editor)
    const innerSource = state.getLines(start + 1, Math.min(next, end), state.blkIndent, false).replace(/\n+$/, '');

    // Wrapper that the Rich Text Editor treats as one editable unit.
    // No whitespace is allowed between it and the source element.
    token = state.push('spoiler_editable_open', 'div', 1);
    token.attrs = [['class', 'joplin-editable']];
    token.block = false;

    token = state.push('spoiler_source', '', 0);
    token.content = innerSource;
    token.meta = { open: ':[\n', close: '\n\n]:\n' };
    token.block = false;

    // Spoiler block wrapper
    token = state.push('spoiler_block_open', 'div', 1);
    token.attrs = [['class', 'spoiler-block']];

    // Unique id links the hidden checkbox with its label
    let ranhex = genRanHex(8);

    // Hidden checkbox that holds the open/closed state
    token = state.push('spoiler_title_input', 'input', 0);
    token.attrs = [['class', 'spoiler-block-input'], ['type', 'checkbox'], ['id', ranhex]];

    // Clickable title
    token = state.push('spoiler_title_open', 'label', 1);
    token.attrs = [['class', 'summary-title'], ['for', ranhex]];

    token = state.push('inline', '', 0);
    token.map = [title, title];
    token.content = state.getLines(title, title + 1, state.tShift[title], false).trim();
    token.children = [];

    token = state.push('spoiler_title_close', 'label', -1);

    // Body
    token = state.push('spoiler_body_open', 'div', 1);
    token.attrs = [['class', 'summary-content']];

    // Render the body as Markdown
    state.md.block.tokenize(state, curLine, next, false);

    state.line = next + 1;

    state.push('spoiler_body_close', 'div', -1);
    state.push('spoiler_block_close', 'div', -1);
    state.push('spoiler_editable_close', 'div', -1);

    return true;
}

const genRanHex = size => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
