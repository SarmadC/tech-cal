'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { X, PaperPlaneRight } from '@phosphor-icons/react';
import { BrandLoadingLogo } from '@/components/brand/BrandLoadingLogo';
import { HackathonService } from '@/services/hackathonService';
import { useSupabaseSafe } from '@/components/providers/SupabaseProvider';
import type { HackathonTeam, TeamMessage } from '@/types/hackathon';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSafeImageSrc } from '@/utils/imageUrl';

interface TeamChatRoomProps {
  team: HackathonTeam;
  userId: string;
  onClose: () => void;
}

export function TeamChatRoom({ team, userId, onClose }: TeamChatRoomProps) {
  const { supabase } = useSupabaseSafe();
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Load message history
  useEffect(() => {
    if (!supabase) return;

    let cancelled = false;

    HackathonService.getTeamMessages(supabase, team.id)
      .then(msgs => {
        if (!cancelled) {
          setMessages(msgs);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [supabase, team.id]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!supabase) return;

    channelRef.current = HackathonService.subscribeToTeamMessages(
      supabase,
      team.id,
      (newMsg) => {
        setMessages(prev => {
          // Avoid duplicates (we may have sent this ourselves)
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }
    );

    return () => {
      channelRef.current?.unsubscribe();
      channelRef.current = null;
    };
  }, [supabase, team.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!supabase || !input.trim() || sending) return;

    const content = input.trim();
    setInput('');
    setSending(true);

    try {
      const msg = await HackathonService.sendTeamMessage(supabase, team.id, userId, content);
      // Add optimistically — realtime will dedup
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    } catch {
      // Restore input on failure
      setInput(content);
    } finally {
      setSending(false);
    }
  }, [supabase, input, sending, team.id, userId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] border-l border-white/10 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div>
          <h3 className="text-sm font-bold text-white">{team.name}</h3>
          <p className="text-[10px] text-white/30 uppercase tracking-widest mt-0.5">Team Chat</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <BrandLoadingLogo size={20} color="rgba(255, 255, 255, 0.72)" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <p className="text-white/20 text-xs">No messages yet</p>
              <p className="text-white/10 text-[10px] mt-1">Be the first to say something!</p>
            </div>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.userId === userId;
            const avatarSrc = getSafeImageSrc(msg.user?.avatarUrl);
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-white/10 flex-shrink-0 overflow-hidden relative">
                  {avatarSrc ? (
                    <Image
                      src={avatarSrc}
                      alt={msg.user?.fullName || 'User'}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-white/40">
                      {(msg.user?.fullName || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Bubble */}
                <div className={`max-w-[75%] space-y-1 ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                  {!isMe && (
                    <span className="text-[10px] text-white/30 font-medium px-1">
                      {msg.user?.fullName || 'Member'}
                    </span>
                  )}
                  <div
                    className={`px-3 py-2 rounded-xl text-xs leading-relaxed ${
                      isMe
                        ? 'bg-blue-600 text-white rounded-tr-sm'
                        : 'bg-white/[0.05] text-white/80 border border-white/5 rounded-tl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                  <span className="text-[9px] text-white/20 px-1">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1 bg-white/[0.05] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/20 outline-none focus:border-blue-500/40 focus:bg-white/[0.08] transition-all disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
          >
            <PaperPlaneRight size={16} weight="fill" />
          </button>
        </div>
      </div>
    </div>
  );
}
