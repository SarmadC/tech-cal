'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Switch from '@radix-ui/react-switch';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    UsersThree,
    Plus,
    MagnifyingGlass,
    Smiley,
    Check,
    CaretRight,
    Command,
    Terminal
} from '@phosphor-icons/react';
import { Command as CommandMenu } from 'cmdk';
import { HackathonEvent, HackathonTeam } from '@/types/hackathon';
import { cn } from '@/lib/utils';

interface TeamSetupModalProps {
    open: boolean;
    onClose: () => void;
    hackathon: HackathonEvent;
    userId: string;
    onCreateTeam: (teamData: { name: string; description: string; lookingForMembers: boolean; roles: string[]; icon?: string }) => Promise<void>;
    onJoinTeam: (teamId: string) => Promise<void>;
    initialView?: 'create' | 'join';
    availableTeams?: HackathonTeam[];
}

const ROLES = [
    { id: 'frontend', label: 'Frontend', color: 'text-blue-400 bg-blue-400/10' },
    { id: 'backend', label: 'Backend', color: 'text-green-400 bg-green-400/10' },
    { id: 'ui-ux', label: 'UI/UX', color: 'text-purple-400 bg-purple-400/10' },
    { id: 'ai-ml', label: 'AI/ML', color: 'text-orange-400 bg-orange-400/10' },
    { id: 'mobile', label: 'Mobile', color: 'text-pink-400 bg-pink-400/10' },
    { id: 'devops', label: 'DevOps', color: 'text-yellow-400 bg-yellow-400/10' },
];

const EMOJIS = []; // Removed for cleaner aesthetic

export function TeamSetupModal({
    open,
    onClose,
    hackathon,
    userId,
    onCreateTeam,
    onJoinTeam,
    initialView = 'create',
    availableTeams = []
}: TeamSetupModalProps) {
    const [view, setView] = useState<'create' | 'join'>(initialView);
    const [teamName, setTeamName] = useState('');
    const [description, setDescription] = useState('');
    const [lookingForMembers, setLookingForMembers] = useState(true);
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const nameInputRef = useRef<HTMLInputElement>(null);

    // Auto-save logic
    useEffect(() => {
        if (open) {
            const saved = localStorage.getItem(`team-setup-${hackathon.id}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                setTeamName(parsed.teamName || '');
                setDescription(parsed.description || '');
                setLookingForMembers(parsed.lookingForMembers ?? true);
                setSelectedRoles(parsed.selectedRoles || []);
            }
        }
    }, [open, hackathon.id]);

    useEffect(() => {
        if (open && view === 'create') {
            const timeout = setTimeout(() => nameInputRef.current?.focus(), 100);
            return () => clearTimeout(timeout);
        }
    }, [open, view]);

    const saveToMemory = () => {
        localStorage.setItem(`team-setup-${hackathon.id}`, JSON.stringify({
            teamName,
            description,
            lookingForMembers,
            selectedRoles
        }));
    };

    const handleCreate = async () => {
        if (!teamName.trim() || isSubmitting) return;
        setIsSubmitting(true);
        try {
            await onCreateTeam({
                name: teamName.trim(),
                description: description.trim(),
                lookingForMembers,
                roles: selectedRoles
            });
            localStorage.removeItem(`team-setup-${hackathon.id}`);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                if (view === 'create') handleCreate();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [view, teamName, description, lookingForMembers, selectedRoles]);

    const filteredTeams = useMemo(() => {
        if (!searchQuery.trim()) return availableTeams;
        const q = searchQuery.toLowerCase();
        return availableTeams.filter(t =>
            t.name.toLowerCase().includes(q) ||
            t.description?.toLowerCase().includes(q)
        );
    }, [availableTeams, searchQuery]);

    useEffect(() => {
        setView(initialView);
    }, [initialView]);

    return (
        <Dialog.Root open={open} onOpenChange={(o) => { if (!o) { saveToMemory(); onClose(); } }}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200" />
                <Dialog.Content
                    className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-gradient-to-b from-[#222222] to-[#1A1A1A] border border-white/10 rounded-xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] z-50 overflow-hidden outline-none animate-in zoom-in-95 fade-in duration-200"
                >
                    {/* Header with Segmented Control */}
                    <div className="p-4 border-b border-white/5 flex items-center justify-between">
                        <Dialog.Title className="text-sm font-medium text-white">Team Setup</Dialog.Title>
                        <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="p-4 pb-0 flex justify-center">
                        <div className="flex p-1 bg-white/5 rounded-lg w-full max-w-[280px]">
                            <button
                                onClick={() => setView('create')}
                                className={cn(
                                    "flex-1 py-1.5 text-xs font-semibold rounded-md transition-all duration-200",
                                    view === 'create' ? "bg-white/10 text-white shadow-[0_1px_3px_rgba(0,0,0,0.5)]" : "text-[#8A8A93] hover:text-white/60"
                                )}
                            >
                                Create a Team
                            </button>
                            <button
                                onClick={() => setView('join')}
                                className={cn(
                                    "flex-1 py-1.5 text-xs font-semibold rounded-md transition-all duration-200",
                                    view === 'join' ? "bg-white/10 text-white shadow-[0_1px_3px_rgba(0,0,0,0.5)]" : "text-[#8A8A93] hover:text-white/60"
                                )}
                            >
                                Join a Team
                            </button>
                        </div>
                    </div>

                    <div className="relative min-h-[400px]">
                        <AnimatePresence mode="wait">
                            {view === 'create' ? (
                                <motion.div
                                    key="create"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    transition={{ duration: 0.15 }}
                                    className="p-6 space-y-6"
                                >
                                    {/* Team Identity */}
                                    <div className="flex flex-col gap-4">
                                        <div className="flex-1">
                                            <div className="bg-[#242424] border border-white/[0.04] rounded-lg p-3 focus-within:ring-1 focus-within:ring-indigo-500/30 focus-within:border-indigo-500/30 transition-all">
                                                <input
                                                    ref={nameInputRef}
                                                    type="text"
                                                    placeholder="Team Name"
                                                    value={teamName}
                                                    onChange={(e) => setTeamName(e.target.value)}
                                                    className="w-full bg-transparent text-sm font-medium text-white placeholder:text-[#8A8A93] outline-none border-none p-0 focus:ring-0"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Project Idea */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-[#8A8A93] tracking-tight">Project Idea (Optional)</label>
                                        <textarea
                                            placeholder="What are you building?"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            rows={2}
                                            className="w-full bg-[#242424] border border-white/[0.04] rounded-lg p-3 text-sm text-white placeholder:text-[#8A8A93] focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500/30 transition-all outline-none resize-none"
                                        />
                                    </div>

                                    {/* Recruiting Switch */}
                                    <div className="flex items-center justify-between py-2">
                                        <div className="space-y-0.5">
                                            <label className="text-sm font-medium text-white">Open to new members</label>
                                            <p className="text-xs text-white/40">Allow others to find and join your team</p>
                                        </div>
                                        <Switch.Root
                                            checked={lookingForMembers}
                                            onCheckedChange={setLookingForMembers}
                                            className="w-10 h-5 bg-[#2A2A2A] rounded-full relative shadow-inner data-[state=checked]:bg-indigo-500 transition-colors outline-none cursor-pointer"
                                        >
                                            <Switch.Thumb className="block w-4 h-4 bg-white rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.4)] transition-transform duration-200 translate-x-0.5 data-[state=checked]:translate-x-[22px]" />
                                        </Switch.Root>
                                    </div>

                                    {/* Role Tags */}
                                    <AnimatePresence>
                                        {lookingForMembers && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="space-y-3 overflow-hidden"
                                            >
                                                <label className="text-[10px] font-bold text-[#8A8A93] tracking-tight">Who do you need?</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {ROLES.map(role => (
                                                        <button
                                                            key={role.id}
                                                            onClick={() => setSelectedRoles(prev =>
                                                                prev.includes(role.id) ? prev.filter(r => r !== role.id) : [...prev, role.id]
                                                            )}
                                                            className={cn(
                                                                "px-3 py-1 rounded-full text-[11px] font-semibold transition-all duration-200 border-none",
                                                                selectedRoles.includes(role.id)
                                                                    ? "bg-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.3)]"
                                                                    : "bg-[#2A2A2A] text-[#8A8A93] hover:bg-[#333333] hover:text-white"
                                                            )}
                                                        >
                                                            {role.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="join"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.15 }}
                                    className="p-0 flex flex-col h-[400px]"
                                >
                                    <CommandMenu className="flex flex-col h-full bg-transparent overflow-hidden">
                                        <div className="px-6 py-4 flex items-center gap-3 border-b border-white/5">
                                            <MagnifyingGlass size={18} className="text-white/20" />
                                            <CommandMenu.Input
                                                placeholder="Search by team name or skills..."
                                                value={searchQuery}
                                                onValueChange={setSearchQuery}
                                                className="flex-1 bg-transparent border-none p-0 text-sm text-white placeholder:text-white/20 focus:ring-0 outline-none"
                                            />
                                        </div>

                                        <CommandMenu.List className="flex-1 overflow-y-auto px-2 py-2 space-y-1 custom-scrollbar">
                                            <CommandMenu.Empty className="py-12 text-center text-xs text-white/20">
                                                No teams found matching your search.
                                            </CommandMenu.Empty>

                                            {(filteredTeams || []).map(team => (
                                                <CommandMenu.Item
                                                    key={team.id}
                                                    onSelect={() => onJoinTeam(team.id)}
                                                    className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 cursor-pointer group transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded bg-white/5 border border-white/5 flex items-center justify-center text-lg">
                                                            {team.icon || '🚀'}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-sm font-semibold text-white">{team.name}</div>
                                                            <div className="text-[10px] text-white/30 flex items-center gap-2">
                                                                <span>{team.memberCount || 0}/{hackathon.maxTeamSize} members</span>
                                                                {team.roles && team.roles.length > 0 && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <div className="flex gap-1">
                                                                            {team.roles?.slice(0, 3).map((role: string) => (
                                                                                <div key={role} className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                                            ))}
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-400 tracking-tight">
                                                            Join <CaretRight size={10} />
                                                        </div>
                                                    </div>
                                                </CommandMenu.Item>
                                            ))}
                                        </CommandMenu.List>
                                    </CommandMenu>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Footer / Action Bar */}
                    <div className="p-4 bg-white/[0.02] border-t border-white/5 flex items-center justify-end">
                        {view === 'create' && (
                            <button
                                onClick={handleCreate}
                                disabled={!teamName.trim() || isSubmitting}
                                className="group flex items-center gap-2 px-6 py-2 bg-[#FFFFFF] text-black hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-bold transition-all shadow-[0_8px_16px_-4px_rgba(255,255,255,0.2),inset_0_1px_0_rgba(255,255,255,0.2)] active:scale-[0.98]"
                            >
                                {isSubmitting ? 'Creating...' : 'Create Team'}
                                <div className="flex items-center gap-0.5 opacity-40">
                                    <Command size={10} weight="bold" />
                                    <span className="text-[10px] pb-0.5">↵</span>
                                </div>
                            </button>
                        )}
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
