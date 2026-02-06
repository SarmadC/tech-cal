'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import RichTextEditor from '@/components/admin/RichTextEditor';
import { generateSlug } from '@/lib/slugUtils';
import { MaterialIcon } from '@/components/ui/Icon';
import { CreatePostState } from '@/app/(protected)/admin/blog/actions';

type BlogPostFormProps = {
    action: (prevState: CreatePostState, formData: FormData) => Promise<CreatePostState>;
    initialData?: {
        title: string;
        slug: string;
        content: string;
        read_time_minutes: number;
        category_name?: string; // We might need to fetch categories to map this correctly, for now assuming string input
    };
    successMessage?: string;
};

function SubmitButton({ disabled, isEdit }: { disabled: boolean; isEdit: boolean }) {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending || disabled}
            className="bg-white text-black hover:bg-zinc-200 font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {pending ? (isEdit ? 'Updating...' : 'Publishing...') : (isEdit ? 'Update Post' : 'Publish Post')}
        </button>
    );
}

function getLengthColor(current: number, max: number) {
    if (current > max) return 'text-red-500 font-bold';
    if (current > max * 0.9) return 'text-yellow-500';
    return 'text-zinc-500';
}

export default function BlogPostForm({ action, initialData, successMessage = 'Post saved successfully!' }: BlogPostFormProps) {
    const initialState: CreatePostState = {};
    const [state, formAction] = useActionState(action, initialState);
    const formRef = useRef<HTMLFormElement>(null);

    // Controlled State
    const [title, setTitle] = useState(initialData?.title || '');
    const [slug, setSlug] = useState(initialData?.slug || '');
    const [content, setContent] = useState(initialData?.content || '');
    const [category, setCategory] = useState(initialData?.category_name || '');
    const [readTime, setReadTime] = useState(initialData?.read_time_minutes?.toString() || '5');
    const [isSlugTouched, setIsSlugTouched] = useState(!!initialData?.slug); // If editing, assume touched

    useEffect(() => {
        if (state.success) {
            alert(successMessage);
            if (!initialData) {
                // Only reset if it's a new post
                formRef.current?.reset();
                setTitle('');
                setSlug('');
                setContent('');
                setCategory('');
                setReadTime('5');
                setIsSlugTouched(false);
            }
        }
    }, [state.success, successMessage, initialData]);

    const handleTitleBlur = () => {
        if (!isSlugTouched && title.trim()) {
            setSlug(generateSlug(title));
        }
    };

    const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSlug(e.target.value);
        setIsSlugTouched(true);
    };

    const handleRegenerateSlug = () => {
        if (title.trim()) {
            setSlug(generateSlug(title));
            setIsSlugTouched(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8">
            {state.error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-md mb-6">
                    {state.error}
                </div>
            )}

            <form ref={formRef} action={formAction} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <label className="text-sm font-medium text-zinc-400">Title</label>
                            <span className={`text-xs ${getLengthColor(title.length, 60)}`}>
                                {title.length}/60
                            </span>
                        </div>
                        <input
                            type="text"
                            name="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onBlur={handleTitleBlur}
                            required
                            className={`w-full bg-zinc-900 border ${title.length > 60 ? 'border-red-500 focus:border-red-500' : 'border-zinc-800 focus:border-zinc-700'} rounded-md px-4 py-2 text-white focus:outline-none`}
                            placeholder="e.g. The Future of React"
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-zinc-400">Slug</label>
                            {title && (
                                <button
                                    type="button"
                                    onClick={handleRegenerateSlug}
                                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                    title="Regenerate slug from title"
                                >
                                    <MaterialIcon name="refresh" size={14} />
                                    Regenerate
                                </button>
                            )}
                        </div>
                        <input
                            type="text"
                            name="slug"
                            value={slug}
                            onChange={handleSlugChange}
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
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
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
                            value={readTime}
                            onChange={(e) => setReadTime(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-4 py-2 text-white focus:outline-none focus:border-zinc-700"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Content</label>
                    <div className="text-xs text-zinc-500 mb-2">
                        Use the editor below to write your post.
                    </div>
                    <RichTextEditor
                        content={content}
                        onChange={setContent}
                    />
                    <input type="hidden" name="content" value={content} />
                </div>

                <div className="pt-4 border-t border-zinc-800 flex justify-end">
                    <SubmitButton disabled={!content || content === '<p></p>' || !title || !slug} isEdit={!!initialData} />
                </div>
            </form>
        </div>
    );
}
