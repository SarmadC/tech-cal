'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkKey from '@tiptap/extension-link';
import ImageKey from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { Highlight } from '@tiptap/extension-highlight';
import { Underline } from '@tiptap/extension-underline';
import { Youtube } from '@tiptap/extension-youtube';
import { common, createLowlight } from 'lowlight';
import {
    TextB, TextItalic, TextStrikethrough, TextUnderline,
    ListBullets, ListNumbers, Link as LinkIcon, Image as ImageIcon,
    TextAlignLeft, TextAlignCenter, TextAlignRight,
    Code, Table as TableIcon, YoutubeLogo, Quotes, HighlighterCircle,
    Plus, Minus, Rows, Columns
} from '@phosphor-icons/react';
import { useEffect, useState, useRef } from 'react';

const lowlight = createLowlight(common);

function classNames(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(' ');
}

type RichTextEditorProps = {
    content: string;
    onChange: (content: string) => void;
};

// Toolbar button component for consistency
const ToolbarButton = ({
    onClick,
    disabled,
    active,
    title,
    children
}: {
    onClick: () => void;
    disabled?: boolean;
    active?: boolean;
    title?: string;
    children: React.ReactNode;
}) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={classNames(
            "p-1.5 rounded hover:bg-zinc-800 text-zinc-400 transition-colors",
            active ? "bg-zinc-800 text-white" : "",
            disabled ? "opacity-50 cursor-not-allowed" : ""
        )}
    >
        {children}
    </button>
);

// Table dropdown menu
const TableMenu = ({ editor, disabled }: { editor: any; disabled: boolean }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const insertTable = () => {
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={menuRef}>
            <ToolbarButton
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
                active={editor?.isActive('table')}
                title="Table"
            >
                <TableIcon size={18} />
            </ToolbarButton>

            {isOpen && !disabled && (
                <div className="absolute top-full left-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 min-w-[180px] py-1">
                    <button
                        onClick={insertTable}
                        className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 flex items-center gap-2"
                    >
                        <Plus size={14} />
                        Insert 3×3 Table
                    </button>
                    {editor?.isActive('table') && (
                        <>
                            <div className="border-t border-zinc-800 my-1" />
                            <button
                                onClick={() => { editor.chain().focus().addColumnAfter().run(); setIsOpen(false); }}
                                className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 flex items-center gap-2"
                            >
                                <Columns size={14} />
                                Add Column
                            </button>
                            <button
                                onClick={() => { editor.chain().focus().addRowAfter().run(); setIsOpen(false); }}
                                className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 flex items-center gap-2"
                            >
                                <Rows size={14} />
                                Add Row
                            </button>
                            <button
                                onClick={() => { editor.chain().focus().deleteColumn().run(); setIsOpen(false); }}
                                className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 flex items-center gap-2"
                            >
                                <Minus size={14} />
                                Delete Column
                            </button>
                            <button
                                onClick={() => { editor.chain().focus().deleteRow().run(); setIsOpen(false); }}
                                className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 flex items-center gap-2"
                            >
                                <Minus size={14} />
                                Delete Row
                            </button>
                            <div className="border-t border-zinc-800 my-1" />
                            <button
                                onClick={() => { editor.chain().focus().deleteTable().run(); setIsOpen(false); }}
                                className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-zinc-800 flex items-center gap-2"
                            >
                                <Minus size={14} />
                                Delete Table
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

const MenuBar = ({ editor, isSourceMode, toggleSource }: { editor: any, isSourceMode: boolean, toggleSource: () => void }) => {
    if (!editor) {
        return null;
    }

    const setLink = () => {
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL', previousUrl);

        if (url === null) return;

        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    const addImage = () => {
        const url = window.prompt('Image URL');

        if (url) {
            const alt = window.prompt('Alt Text (for SEO & Accessibility). Leave empty for decorative images.');
            if (alt === null) return;
            editor.chain().focus().setImage({ src: url, alt: alt }).run();
        }
    };

    const addYoutube = () => {
        const url = window.prompt('YouTube Video URL');
        if (url) {
            editor.chain().focus().setYoutubeVideo({ src: url }).run();
        }
    };

    return (
        <div className="flex flex-wrap gap-1 p-2 border-b border-zinc-800 bg-zinc-900/50 rounded-t-lg justify-between items-center">
            <div className="flex flex-wrap gap-1 items-center">
                {/* Text Formatting */}
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    disabled={isSourceMode}
                    active={editor.isActive('bold')}
                    title="Bold"
                >
                    <TextB size={18} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    disabled={isSourceMode}
                    active={editor.isActive('italic')}
                    title="Italic"
                >
                    <TextItalic size={18} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    disabled={isSourceMode}
                    active={editor.isActive('underline')}
                    title="Underline"
                >
                    <TextUnderline size={18} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    disabled={isSourceMode}
                    active={editor.isActive('strike')}
                    title="Strikethrough"
                >
                    <TextStrikethrough size={18} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHighlight().run()}
                    disabled={isSourceMode}
                    active={editor.isActive('highlight')}
                    title="Highlight"
                >
                    <HighlighterCircle size={18} />
                </ToolbarButton>

                <span className="w-px h-6 bg-zinc-800 mx-1" />

                {/* Headings */}
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    disabled={isSourceMode}
                    active={editor.isActive('heading', { level: 1 })}
                    title="Heading 1"
                >
                    <span className="text-xs font-bold w-5">H1</span>
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    disabled={isSourceMode}
                    active={editor.isActive('heading', { level: 2 })}
                    title="Heading 2"
                >
                    <span className="text-xs font-bold w-5">H2</span>
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    disabled={isSourceMode}
                    active={editor.isActive('heading', { level: 3 })}
                    title="Heading 3"
                >
                    <span className="text-xs font-bold w-5">H3</span>
                </ToolbarButton>

                <span className="w-px h-6 bg-zinc-800 mx-1" />

                {/* Lists */}
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    disabled={isSourceMode}
                    active={editor.isActive('bulletList')}
                    title="Bullet List"
                >
                    <ListBullets size={18} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    disabled={isSourceMode}
                    active={editor.isActive('orderedList')}
                    title="Numbered List"
                >
                    <ListNumbers size={18} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    disabled={isSourceMode}
                    active={editor.isActive('blockquote')}
                    title="Blockquote"
                >
                    <Quotes size={18} />
                </ToolbarButton>

                <span className="w-px h-6 bg-zinc-800 mx-1" />

                {/* Media & Links */}
                <ToolbarButton
                    onClick={setLink}
                    disabled={isSourceMode}
                    active={editor.isActive('link')}
                    title="Link"
                >
                    <LinkIcon size={18} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={addImage}
                    disabled={isSourceMode}
                    title="Image"
                >
                    <ImageIcon size={18} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={addYoutube}
                    disabled={isSourceMode}
                    title="YouTube Video"
                >
                    <YoutubeLogo size={18} />
                </ToolbarButton>

                <span className="w-px h-6 bg-zinc-800 mx-1" />

                {/* Table */}
                <TableMenu editor={editor} disabled={isSourceMode} />

                {/* Code Block */}
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    disabled={isSourceMode}
                    active={editor.isActive('codeBlock')}
                    title="Code Block"
                >
                    <Code size={18} />
                </ToolbarButton>

                <span className="w-px h-6 bg-zinc-800 mx-1" />

                {/* Alignment */}
                <ToolbarButton
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    disabled={isSourceMode}
                    active={editor.isActive({ textAlign: 'left' })}
                    title="Align Left"
                >
                    <TextAlignLeft size={18} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    disabled={isSourceMode}
                    active={editor.isActive({ textAlign: 'center' })}
                    title="Align Center"
                >
                    <TextAlignCenter size={18} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    disabled={isSourceMode}
                    active={editor.isActive({ textAlign: 'right' })}
                    title="Align Right"
                >
                    <TextAlignRight size={18} />
                </ToolbarButton>
            </div>

            <button
                type="button"
                onClick={toggleSource}
                title={isSourceMode ? "Switch to Visual Editor" : "Edit as HTML"}
                className={classNames(
                    "p-1.5 rounded hover:bg-zinc-800 text-zinc-400 transition-colors flex items-center gap-1 text-xs font-medium ml-2 border border-zinc-800",
                    isSourceMode ? "bg-zinc-800 text-white" : ""
                )}
            >
                <Code size={18} />
                {isSourceMode ? "Visual" : "HTML"}
            </button>
        </div>
    );
};

export default function RichTextEditor({ content, onChange }: RichTextEditorProps) {
    const [isSourceMode, setIsSourceMode] = useState(false);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                codeBlock: false, // We use CodeBlockLowlight instead
            }),
            LinkKey.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-blue-400 hover:text-blue-300 underline',
                },
            }),
            ImageKey.configure({
                HTMLAttributes: {
                    class: 'rounded-lg max-w-full my-4 border border-zinc-800',
                },
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            TextStyle,
            Color,
            // Table extensions
            Table.configure({
                resizable: true,
                HTMLAttributes: {
                    class: 'border-collapse border border-zinc-700 my-4 w-full',
                },
            }),
            TableRow,
            TableHeader.configure({
                HTMLAttributes: {
                    class: 'border border-zinc-700 bg-zinc-800 px-4 py-2 text-left font-semibold text-white',
                },
            }),
            TableCell.configure({
                HTMLAttributes: {
                    class: 'border border-zinc-700 px-4 py-2 text-zinc-300',
                },
            }),
            // Code block with syntax highlighting
            CodeBlockLowlight.configure({
                lowlight,
                HTMLAttributes: {
                    class: 'bg-[#0d0d0d] border border-zinc-800 rounded-lg p-4 my-4 overflow-x-auto text-sm',
                },
            }),
            // Text highlight
            Highlight.configure({
                multicolor: false,
                HTMLAttributes: {
                    class: 'bg-yellow-500/30 text-yellow-200 px-0.5 rounded',
                },
            }),
            // Underline
            Underline,
            // YouTube embed
            Youtube.configure({
                HTMLAttributes: {
                    class: 'w-full aspect-video rounded-lg my-4',
                },
                width: 640,
                height: 360,
            }),
        ],
        content: content,
        editorProps: {
            attributes: {
                class: 'prose prose-invert max-w-none focus:outline-none min-h-[300px] px-4 py-4 text-zinc-300 prose-headings:text-white prose-strong:text-white prose-code:text-white prose-code:bg-zinc-800 prose-code:px-1 prose-code:rounded prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 prose-blockquote:border-l-4 prose-blockquote:border-zinc-600 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-zinc-400',
            },
        },
        onUpdate: ({ editor }) => {
            if (!isSourceMode) {
                onChange(editor.getHTML());
            }
        },
        immediatelyRender: false,
    });

    useEffect(() => {
        if (editor && content === '' && editor.getText() !== '') {
            editor.commands.setContent('');
        }
    }, [content, editor]);

    useEffect(() => {
        if (!isSourceMode && editor && content !== editor.getHTML()) {
            editor.commands.setContent(content);
        }
    }, [isSourceMode, editor, content]);

    return (
        <div className="w-full bg-zinc-900 border border-zinc-800 rounded-md overflow-hidden focus-within:border-zinc-700 transition-colors">
            <MenuBar
                editor={editor}
                isSourceMode={isSourceMode}
                toggleSource={() => setIsSourceMode(!isSourceMode)}
            />

            {isSourceMode ? (
                <textarea
                    value={content}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full h-[300px] p-4 bg-[#090909] text-zinc-300 font-mono text-sm focus:outline-none resize-y"
                    placeholder="Enter HTML code here..."
                />
            ) : (
                <EditorContent editor={editor} />
            )}

            {/* Editor styles for tables and code blocks */}
            <style jsx global>{`
                .ProseMirror table {
                    border-collapse: collapse;
                    margin: 1rem 0;
                    width: 100%;
                    table-layout: fixed;
                }
                .ProseMirror th,
                .ProseMirror td {
                    border: 1px solid #3f3f46;
                    padding: 0.5rem 1rem;
                    vertical-align: top;
                    position: relative;
                }
                .ProseMirror th {
                    background: #27272a;
                    font-weight: 600;
                    text-align: left;
                }
                .ProseMirror .selectedCell {
                    background: rgba(59, 130, 246, 0.2);
                }
                .ProseMirror pre {
                    background: #0d0d0d;
                    border: 1px solid #27272a;
                    border-radius: 0.5rem;
                    padding: 1rem;
                    overflow-x: auto;
                }
                .ProseMirror pre code {
                    background: transparent !important;
                    padding: 0 !important;
                    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
                    font-size: 0.875rem;
                }
                .ProseMirror blockquote {
                    border-left: 4px solid #52525b;
                    padding-left: 1rem;
                    margin-left: 0;
                    font-style: italic;
                    color: #a1a1aa;
                }
                .ProseMirror iframe {
                    border-radius: 0.5rem;
                    width: 100%;
                    aspect-ratio: 16/9;
                }
                /* Syntax highlighting */
                .hljs-comment,
                .hljs-quote { color: #6a737d; }
                .hljs-keyword,
                .hljs-selector-tag { color: #ff7b72; }
                .hljs-string,
                .hljs-attr { color: #a5d6ff; }
                .hljs-number,
                .hljs-literal { color: #79c0ff; }
                .hljs-built_in,
                .hljs-builtin-name { color: #ffa657; }
                .hljs-function,
                .hljs-title { color: #d2a8ff; }
                .hljs-variable,
                .hljs-template-variable { color: #ffa657; }
                .hljs-type,
                .hljs-class .hljs-title { color: #7ee787; }
            `}</style>
        </div>
    );
}
