'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkKey from '@tiptap/extension-link';
import ImageKey from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import {
    TextB, TextItalic, TextStrikethrough,
    ListBullets, ListNumbers, Link as LinkIcon, Image as ImageIcon,
    TextAlignLeft, TextAlignCenter, TextAlignRight,
    Code
} from '@phosphor-icons/react';
import { useEffect, useState } from 'react';

function classNames(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(' ');
}

type RichTextEditorProps = {
    content: string;
    onChange: (content: string) => void;
};

const MenuBar = ({ editor, isSourceMode, toggleSource }: { editor: any, isSourceMode: boolean, toggleSource: () => void }) => {
    if (!editor) {
        return null;
    }

    const setLink = () => {
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL', previousUrl);

        // cancelled
        if (url === null) {
            return;
        }

        // empty
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        // update
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    const addImage = () => {
        const url = window.prompt('Image URL');

        if (url) {
            const alt = window.prompt('Alt Text (for SEO & Accessibility). Leave empty for decorative images.');
            // If user hits Cancel (null), we assume they changed their mind about inserting the image.
            if (alt === null) return;

            editor.chain().focus().setImage({ src: url, alt: alt }).run();
        }
    };

    return (
        <div className="flex flex-wrap gap-1 p-2 border-b border-zinc-800 bg-zinc-900/50 rounded-t-lg justify-between items-center">
            <div className="flex flex-wrap gap-1">
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    disabled={isSourceMode || !editor.can().chain().focus().toggleBold().run()}
                    className={classNames(
                        "p-1.5 rounded hover:bg-zinc-800 text-zinc-400 transition-colors",
                        editor.isActive('bold') ? "bg-zinc-800 text-white" : "",
                        isSourceMode ? "opacity-50 cursor-not-allowed" : ""
                    )}
                >
                    <TextB size={18} />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    disabled={isSourceMode || !editor.can().chain().focus().toggleItalic().run()}
                    className={classNames(
                        "p-1.5 rounded hover:bg-zinc-800 text-zinc-400 transition-colors",
                        editor.isActive('italic') ? "bg-zinc-800 text-white" : "",
                        isSourceMode ? "opacity-50 cursor-not-allowed" : ""
                    )}
                >
                    <TextItalic size={18} />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    disabled={isSourceMode || !editor.can().chain().focus().toggleStrike().run()}
                    className={classNames(
                        "p-1.5 rounded hover:bg-zinc-800 text-zinc-400 transition-colors",
                        editor.isActive('strike') ? "bg-zinc-800 text-white" : "",
                        isSourceMode ? "opacity-50 cursor-not-allowed" : ""
                    )}
                >
                    <TextStrikethrough size={18} />
                </button>

                <span className="w-px h-6 bg-zinc-800 mx-1 self-center" />

                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    disabled={isSourceMode}
                    className={classNames(
                        "p-1.5 rounded hover:bg-zinc-800 text-zinc-400 text-xs font-bold transition-colors w-8",
                        editor.isActive('heading', { level: 1 }) ? "bg-zinc-800 text-white" : "",
                        isSourceMode ? "opacity-50 cursor-not-allowed" : ""
                    )}
                >
                    H1
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    disabled={isSourceMode}
                    className={classNames(
                        "p-1.5 rounded hover:bg-zinc-800 text-zinc-400 text-xs font-bold transition-colors w-8",
                        editor.isActive('heading', { level: 2 }) ? "bg-zinc-800 text-white" : "",
                        isSourceMode ? "opacity-50 cursor-not-allowed" : ""
                    )}
                >
                    H2
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    disabled={isSourceMode}
                    className={classNames(
                        "p-1.5 rounded hover:bg-zinc-800 text-zinc-400 text-xs font-bold transition-colors w-8",
                        editor.isActive('heading', { level: 3 }) ? "bg-zinc-800 text-white" : "",
                        isSourceMode ? "opacity-50 cursor-not-allowed" : ""
                    )}
                >
                    H3
                </button>

                <span className="w-px h-6 bg-zinc-800 mx-1 self-center" />

                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    disabled={isSourceMode}
                    className={classNames(
                        "p-1.5 rounded hover:bg-zinc-800 text-zinc-400 transition-colors",
                        editor.isActive('bulletList') ? "bg-zinc-800 text-white" : "",
                        isSourceMode ? "opacity-50 cursor-not-allowed" : ""
                    )}
                >
                    <ListBullets size={18} />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    disabled={isSourceMode}
                    className={classNames(
                        "p-1.5 rounded hover:bg-zinc-800 text-zinc-400 transition-colors",
                        editor.isActive('orderedList') ? "bg-zinc-800 text-white" : "",
                        isSourceMode ? "opacity-50 cursor-not-allowed" : ""
                    )}
                >
                    <ListNumbers size={18} />
                </button>

                <span className="w-px h-6 bg-zinc-800 mx-1 self-center" />

                <button
                    type="button"
                    onClick={setLink}
                    disabled={isSourceMode}
                    className={classNames(
                        "p-1.5 rounded hover:bg-zinc-800 text-zinc-400 transition-colors",
                        editor.isActive('link') ? "bg-zinc-800 text-white" : "",
                        isSourceMode ? "opacity-50 cursor-not-allowed" : ""
                    )}
                >
                    <LinkIcon size={18} />
                </button>
                <button
                    type="button"
                    onClick={addImage}
                    disabled={isSourceMode}
                    className={classNames(
                        "p-1.5 rounded hover:bg-zinc-800 text-zinc-400 transition-colors",
                        isSourceMode ? "opacity-50 cursor-not-allowed" : ""
                    )}
                >
                    <ImageIcon size={18} />
                </button>

                <span className="w-px h-6 bg-zinc-800 mx-1 self-center" />

                <button
                    type="button"
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    disabled={isSourceMode}
                    className={classNames(
                        "p-1.5 rounded hover:bg-zinc-800 text-zinc-400 transition-colors",
                        editor.isActive({ textAlign: 'left' }) ? "bg-zinc-800 text-white" : "",
                        isSourceMode ? "opacity-50 cursor-not-allowed" : ""
                    )}
                >
                    <TextAlignLeft size={18} />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    disabled={isSourceMode}
                    className={classNames(
                        "p-1.5 rounded hover:bg-zinc-800 text-zinc-400 transition-colors",
                        editor.isActive({ textAlign: 'center' }) ? "bg-zinc-800 text-white" : "",
                        isSourceMode ? "opacity-50 cursor-not-allowed" : ""
                    )}
                >
                    <TextAlignCenter size={18} />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    disabled={isSourceMode}
                    className={classNames(
                        "p-1.5 rounded hover:bg-zinc-800 text-zinc-400 transition-colors",
                        editor.isActive({ textAlign: 'right' }) ? "bg-zinc-800 text-white" : "",
                        isSourceMode ? "opacity-50 cursor-not-allowed" : ""
                    )}
                >
                    <TextAlignRight size={18} />
                </button>
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
            StarterKit,
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
        ],
        content: content,
        editorProps: {
            attributes: {
                class: 'prose prose-invert max-w-none focus:outline-none min-h-[300px] px-4 py-4 text-zinc-300 prose-headings:text-white prose-strong:text-white prose-code:text-white prose-code:bg-zinc-800 prose-code:px-1 prose-code:rounded prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800',
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
            // Only reset if content prop is empty string (likely from form reset)
            editor.commands.setContent('');
        }
    }, [content, editor]);

    // Sync content when switching back to visual mode from source mode
    // (Although controlled input handles prop updates, we need to ensure editor instance is current)
    useEffect(() => {
        if (!isSourceMode && editor && content !== editor.getHTML()) {
            // Check if content is meaningfully different to avoid cursor jumps or loops
            // A simple check might trigger on formatting diffs, but usually safe for mode switch
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
        </div>
    );
}
