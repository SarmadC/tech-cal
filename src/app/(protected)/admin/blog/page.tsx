'use client';

import { useActionState, useEffect, useRef } from 'react';
import { createPost, type CreatePostState } from './actions';
import { useFormStatus } from 'react-dom';

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="bg-white text-black hover:bg-zinc-200 font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50"
        >
            {pending ? 'Publishing...' : 'Publish Post'}
        </button>
    );
}

export default function AdminBlogPage() {
    const initialState: CreatePostState = {};
    const [state, formAction] = useActionState(createPost, initialState);
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        if (state.success) {
            formRef.current?.reset();
            alert('Post published successfully!');
        }
    }, [state.success]);

    return (
        <div className="max-w-4xl mx-auto py-8 px-6">
            <h1 className="text-2xl font-bold text-white mb-8">Write New Blog Post</h1>

            {state.error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-md mb-6">
                    {state.error}
                </div>
            )}

            <form ref={formRef} action={formAction} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">Title</label>
                        <input
                            type="text"
                            name="title"
                            required
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-4 py-2 text-white focus:outline-none focus:border-zinc-700"
                            placeholder="e.g. The Future of React"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">Slug</label>
                        <input
                            type="text"
                            name="slug"
                            required
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-4 py-2 text-white focus:outline-none focus:border-zinc-700"
                            placeholder="e.g. future-of-react"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">Category</label>
                        <input
                            type="text"
                            name="category"
                            required
                            list="categories"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-4 py-2 text-white focus:outline-none focus:border-zinc-700"
                            placeholder="e.g. Engineering"
                        />
                        <datalist id="categories">
                            <option value="Engineering" />
                            <option value="Product" />
                            <option value="Company" />
                        </datalist>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">Read Time (min)</label>
                        <input
                            type="number"
                            name="readTime"
                            defaultValue="5"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-4 py-2 text-white focus:outline-none focus:border-zinc-700"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Excerpt</label>
                    <textarea
                        name="excerpt"
                        required
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-4 py-2 text-white focus:outline-none focus:border-zinc-700 h-24 resize-none"
                        placeholder="Short summary for the card preview..."
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Content (HTML)</label>
                    <div className="text-xs text-zinc-500 mb-2">
                        Tip: You can write HTML directly here. Use &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, etc.
                    </div>
                    <textarea
                        name="content"
                        required
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-4 py-2 text-white focus:outline-none focus:border-zinc-700 h-96 font-mono text-sm"
                        placeholder="<p>Start writing your masterpiece...</p>"
                    />
                </div>

                <div className="pt-4 border-t border-zinc-800 flex justify-end">
                    <SubmitButton />
                </div>
            </form>
        </div>
    );
}
