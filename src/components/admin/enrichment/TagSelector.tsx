'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

interface Tag {
    id: string;
    event_tag: string;
    category: string | null;
}

interface TagSelectorProps {
    selectedTagIds: string[];
    tags: Tag[];
    onToggleTag: (tagId: string) => void;
    onCreateTag: (tagName: string) => Promise<void>;
}

export function TagSelector({
    selectedTagIds,
    tags,
    onToggleTag,
    onCreateTag,
}: TagSelectorProps) {
    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState('');
    const [isCreating, setIsCreating] = React.useState(false);

    const checkDuplicate = (name: string) => {
        return tags.some(tag => tag.event_tag.toLowerCase() === name.toLowerCase());
    };

    const handleCreateTag = async () => {
        if (!inputValue.trim()) return;

        setIsCreating(true);
        try {
            await onCreateTag(inputValue.trim());
            setInputValue('');
            // Don't close the popover so user can see it was added or add more
        } catch (error) {
            console.error('Failed to create tag:', error);
        } finally {
            setIsCreating(false);
        }
    };

    const selectedTags = tags.filter(tag => selectedTagIds.includes(tag.id));

    return (
        <div className="flex flex-col gap-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between min-h-[44px] h-auto px-3 py-2 border-default bg-transparent hover:bg-transparent"
                    >
                        <div className="flex flex-wrap gap-1 w-full items-center">
                            {selectedTags.length > 0 ? (
                                selectedTags.map((tag) => (
                                    <Badge
                                        key={tag.id}
                                        variant="secondary"
                                        className="mr-1 mb-1 border-accent-primary/30 bg-accent-primary-light text-accent-primary hover:bg-accent-primary-light/80"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onToggleTag(tag.id);
                                        }}
                                    >
                                        {tag.event_tag}
                                        <span className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">×</span>
                                    </Badge>
                                ))
                            ) : (
                                <span className="text-foreground-muted">Select tags...</span>
                            )}
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-foreground-tertiary" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                    <Command shouldFilter={false}>
                        <CommandInput
                            placeholder="Search or create tag..."
                            value={inputValue}
                            onValueChange={setInputValue}
                        />
                        <CommandList>
                            <CommandEmpty className="py-2 px-2 text-sm">
                                {inputValue.trim() && !checkDuplicate(inputValue) ? (
                                    <div className="flex flex-col gap-2 p-1">
                                        <p className="text-muted-foreground text-xs">No existing tag found.</p>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            className="w-full justify-start h-8 text-xs"
                                            onClick={handleCreateTag}
                                            disabled={isCreating}
                                        >
                                            <Plus className="mr-2 h-3 w-3" />
                                            {isCreating ? 'Creating...' : `Create "${inputValue}"`}
                                        </Button>
                                    </div>
                                ) : (
                                    <span className="text-foreground-muted">No tags found.</span>
                                )}
                            </CommandEmpty>
                            <CommandGroup heading="Available Tags" className="max-h-[300px] overflow-auto">
                                {tags
                                    .filter(tag =>
                                        !inputValue ||
                                        tag.event_tag.toLowerCase().includes(inputValue.toLowerCase())
                                    )
                                    .map((tag) => (
                                        <CommandItem
                                            key={tag.id}
                                            value={tag.event_tag} // Use name for value to help with default filtering if we enabled it
                                            onSelect={() => {
                                                onToggleTag(tag.id);
                                                setInputValue(''); // Optional: clear search after selection
                                            }}
                                            className="cursor-pointer"
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    selectedTagIds.includes(tag.id) ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {tag.event_tag}
                                        </CommandItem>
                                    ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}
