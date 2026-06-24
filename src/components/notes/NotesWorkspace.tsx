'use client'
import { useState, useCallback } from 'react'
import {
  FolderPlus, FilePlus, ChevronRight, ChevronDown,
  Folder, FileText,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { NoteFolder, Note } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { RichEditor } from './RichEditor'
import { cn } from '@/lib/utils'

type NoteMeta = Pick<Note, 'id' | 'title' | 'folder_id' | 'subject_id' | 'updated_at'>

interface NotesWorkspaceProps {
  initialFolders: NoteFolder[]
  initialNotes: NoteMeta[]
  subjects: Array<{ id: string; name: string; color: string }>
  userId: string
}

export function NotesWorkspace({ initialFolders, initialNotes, subjects, userId }: NotesWorkspaceProps) {
  const [folders, setFolders]               = useState<NoteFolder[]>(initialFolders)
  const [notes, setNotes]                   = useState<NoteMeta[]>(initialNotes)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [newFolderName, setNewFolderName]   = useState('')
  const [addingFolder, setAddingFolder]     = useState(false)

  async function createFolder() {
    if (!newFolderName.trim()) return
    try {
      const supabase = createClient()
      const { data, error } = await (supabase as any)
        .from('note_folders')
        .insert({ user_id: userId, name: newFolderName.trim() })
        .select()
        .single()
      if (error) throw error
      if (data) { setFolders((prev) => [...prev, data]); setNewFolderName(''); setAddingFolder(false) }
    } catch (err) {
      console.error('[Notes] Erro ao criar pasta:', err)
    }
  }

  async function createNote(folderId?: string) {
    try {
      const supabase = createClient()
      const { data, error } = await (supabase as any)
        .from('notes')
        .insert({ user_id: userId, folder_id: folderId ?? null, title: 'Nova Anotação', content: {} })
        .select('id, title, folder_id, subject_id, updated_at')
        .single()
      if (error) throw error
      if (data) {
        setNotes((prev) => [data, ...prev])
        setSelectedNoteId(data.id)
        if (folderId) setExpandedFolders((prev) => new Set([...prev, folderId]))
      }
    } catch (err) {
      console.error('[Notes] Erro ao criar nota:', err)
    }
  }

  const handleTitleChange = useCallback((noteId: string, title: string) => {
    setNotes((prev) => prev.map((n) => n.id === noteId ? { ...n, title } : n))
  }, [])

  function toggleFolder(id: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const unfiledNotes = notes.filter((n) => !n.folder_id)

  return (
    <div className="flex h-[calc(100vh-24px)] overflow-hidden rounded-[22px] bg-white dark:bg-[#181816] border border-zinc-200/40 dark:border-zinc-800/40">

      {/* ── Painel lateral de pastas/notas ── */}
      <aside className="w-[240px] shrink-0 flex flex-col border-r border-zinc-200/40 dark:border-zinc-800/40">
        {/* Header da sidebar de notas */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200/40 dark:border-zinc-800/40">
          <span className="text-sm font-semibold text-black dark:text-[#F4F3EF]">Cadernos</span>
          <div className="flex gap-1">
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7 text-zinc-400 hover:text-black dark:hover:text-[#F4F3EF] hover:bg-[#F4F3EF] dark:hover:bg-[#2C2C27]"
              onClick={() => setAddingFolder(!addingFolder)}
              title="Nova pasta"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7 text-zinc-400 hover:text-black dark:hover:text-[#F4F3EF] hover:bg-[#F4F3EF] dark:hover:bg-[#2C2C27]"
              onClick={() => createNote()}
              title="Nova anotação"
            >
              <FilePlus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Input nova pasta */}
        {addingFolder && (
          <div className="px-3 py-2 border-b border-zinc-200/40 dark:border-zinc-800/40">
            <div className="flex gap-1.5">
              <Input
                autoFocus
                placeholder="Nome da pasta…"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createFolder()
                  if (e.key === 'Escape') setAddingFolder(false)
                }}
                className="h-8 text-xs bg-[#F4F3EF] dark:bg-[#181816] border-zinc-200/60 dark:border-zinc-700/60"
              />
              <Button size="sm" className="h-8 px-2 text-xs" onClick={createFolder}>OK</Button>
            </div>
          </div>
        )}

        {/* Lista de pastas e notas */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">

            {folders.map((folder) => {
              const folderNotes = notes.filter((n) => n.folder_id === folder.id)
              const isExpanded  = expandedFolders.has(folder.id)
              return (
                <div key={folder.id}>
                  <div
                    onClick={() => toggleFolder(folder.id)}
                    className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:bg-[#F4F3EF] dark:hover:bg-[#2C2C27] hover:text-black dark:hover:text-[#F4F3EF] cursor-pointer select-none group transition-colors"
                  >
                    {isExpanded
                      ? <ChevronDown className="h-3 w-3 shrink-0" />
                      : <ChevronRight className="h-3 w-3 shrink-0" />
                    }
                    <Folder className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate flex-1">{folder.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); createNote(folder.id) }}
                      className="hidden group-hover:flex items-center justify-center"
                    >
                      <FilePlus className="h-3 w-3" />
                    </button>
                  </div>
                  {isExpanded && folderNotes.map((note) => (
                    <NoteItem
                      key={note.id}
                      note={note}
                      selected={selectedNoteId === note.id}
                      onClick={() => setSelectedNoteId(note.id)}
                      indent
                    />
                  ))}
                </div>
              )
            })}

            {unfiledNotes.length > 0 && (
              <div>
                {folders.length > 0 && (
                  <p className="px-2.5 pt-3 pb-1 text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-600 font-medium">
                    Sem pasta
                  </p>
                )}
                {unfiledNotes.map((note) => (
                  <NoteItem
                    key={note.id}
                    note={note}
                    selected={selectedNoteId === note.id}
                    onClick={() => setSelectedNoteId(note.id)}
                  />
                ))}
              </div>
            )}

            {notes.length === 0 && (
              <div className="px-3 py-8 text-center">
                <FileText className="h-8 w-8 text-zinc-200 dark:text-zinc-700 mx-auto mb-2" />
                <p className="text-xs text-zinc-400 dark:text-zinc-500">Nenhuma anotação ainda</p>
                <button
                  onClick={() => createNote()}
                  className="mt-2 text-xs text-[#1E3A5F] dark:text-[#4A72A8] hover:underline underline-offset-4"
                >
                  Criar primeira nota
                </button>
              </div>
            )}
          </div>
        </ScrollArea>
      </aside>

      {/* ── Editor ── */}
      <div className="flex-1 overflow-hidden min-w-0">
        {selectedNoteId ? (
          <RichEditor
            noteId={selectedNoteId}
            userId={userId}
            onTitleChange={handleTitleChange}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#F4F3EF] dark:bg-[#181816]">
                <FileText className="h-7 w-7 text-zinc-300 dark:text-zinc-600" />
              </div>
              <p className="text-sm font-semibold text-black dark:text-[#F4F3EF]">
                Selecione uma anotação
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                ou crie uma nova com o botão acima
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function NoteItem({ note, selected, onClick, indent }: {
  note: NoteMeta; selected: boolean; onClick: () => void; indent?: boolean
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs cursor-pointer truncate transition-colors',
        indent && 'ml-4',
        selected
          ? 'bg-black dark:bg-[#F4F3EF] text-white dark:text-black font-semibold'
          : 'text-zinc-500 dark:text-zinc-400 hover:bg-[#F4F3EF] dark:hover:bg-[#2C2C27] hover:text-black dark:hover:text-[#F4F3EF]'
      )}
    >
      <FileText className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate flex-1">{note.title}</span>
    </div>
  )
}
