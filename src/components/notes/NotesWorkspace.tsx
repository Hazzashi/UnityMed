'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import {
  FolderPlus, FilePlus, ChevronRight, ChevronDown,
  Folder, FileText, BookOpen, X, Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { NoteFolder, Note } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { RichEditor } from './RichEditor'
import { cn } from '@/lib/utils'

const PDFViewer = dynamic(
  () => import('./PDFViewer').then(m => ({ default: m.PDFViewer })),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-[#F4F3EF] dark:bg-[#222220]">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
      </div>
    ),
  }
)

type NoteMeta = Pick<Note, 'id' | 'title' | 'folder_id' | 'subject_id' | 'updated_at' | 'pdf_url'>

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
  const [uploadingPdf, setUploadingPdf]     = useState(false)
  const [pdfSignedUrl, setPdfSignedUrl]     = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedNote  = notes.find(n => n.id === selectedNoteId)
  // pdf_url stores the storage PATH (e.g. "userId/noteId.pdf"), not a public URL
  const pdfPath = selectedNote?.pdf_url ?? null

  // Gera URL assinada (expira em 1h) sempre que a nota selecionada muda
  useEffect(() => {
    if (!pdfPath) { setPdfSignedUrl(null); return }
    let cancelled = false
    async function sign() {
      const supabase = createClient()
      const { data, error } = await supabase.storage.from('pdfs').createSignedUrl(pdfPath!, 3600)
      if (!cancelled && !error && data) setPdfSignedUrl(data.signedUrl)
    }
    sign()
    return () => { cancelled = true }
  }, [pdfPath])

  // ── Folders / Notes CRUD ─────────────────────────────────────────────────────

  async function createFolder() {
    if (!newFolderName.trim()) return
    try {
      const supabase = createClient()
      const { data, error } = await (supabase as any)
        .from('note_folders')
        .insert({ user_id: userId, name: newFolderName.trim() })
        .select().single()
      if (error) throw error
      if (data) { setFolders(prev => [...prev, data]); setNewFolderName(''); setAddingFolder(false) }
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
        .select('id, title, folder_id, subject_id, updated_at, pdf_url').single()
      if (error) throw error
      if (data) {
        setNotes(prev => [data, ...prev])
        setSelectedNoteId(data.id)
        if (folderId) setExpandedFolders(prev => new Set([...prev, folderId]))
      }
    } catch (err) {
      console.error('[Notes] Erro ao criar nota:', err)
    }
  }

  const handleTitleChange = useCallback((noteId: string, title: string) => {
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, title } : n))
  }, [])

  function toggleFolder(id: string) {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── PDF upload / remove ──────────────────────────────────────────────────────

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !selectedNoteId) return
    setUploadingPdf(true)
    try {
      const supabase = createClient()
      const path = `${userId}/${selectedNoteId}.pdf`

      const { error: uploadError } = await supabase.storage
        .from('pdfs')
        .upload(path, file, { upsert: true, contentType: 'application/pdf' })
      if (uploadError) throw uploadError

      // Salva o CAMINHO (não a URL pública) no banco
      await (supabase as any).from('notes').update({ pdf_url: path }).eq('id', selectedNoteId)
      setNotes(prev => prev.map(n => n.id === selectedNoteId ? { ...n, pdf_url: path } : n))

      // Gera URL assinada imediatamente para abrir sem esperar o useEffect
      const { data: signed } = await supabase.storage.from('pdfs').createSignedUrl(path, 3600)
      if (signed) setPdfSignedUrl(signed.signedUrl)
    } catch (err) {
      console.error('[PDF] Upload error:', err)
    } finally {
      setUploadingPdf(false)
      e.target.value = ''
    }
  }

  async function handleRemovePdf() {
    if (!selectedNoteId || !pdfPath) return
    const supabase = createClient()
    await supabase.storage.from('pdfs').remove([pdfPath])
    await (supabase as any).from('notes').update({ pdf_url: null }).eq('id', selectedNoteId)
    setNotes(prev => prev.map(n => n.id === selectedNoteId ? { ...n, pdf_url: null } : n))
    setPdfSignedUrl(null)
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const unfiledNotes = notes.filter(n => !n.folder_id)

  return (
    <div className="flex h-[calc(100vh-24px)] overflow-hidden rounded-[22px] bg-white dark:bg-[#181816] border border-zinc-200/40 dark:border-zinc-800/40">

      {/* ── Sidebar de pastas/notas ── */}
      <aside className="w-[240px] shrink-0 flex flex-col border-r border-zinc-200/40 dark:border-zinc-800/40">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200/40 dark:border-zinc-800/40">
          <span className="text-sm font-semibold text-black dark:text-[#F4F3EF]">Cadernos</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-black dark:hover:text-[#F4F3EF] hover:bg-[#F4F3EF] dark:hover:bg-[#2C2C27]" onClick={() => setAddingFolder(!addingFolder)} title="Nova pasta">
              <FolderPlus className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-black dark:hover:text-[#F4F3EF] hover:bg-[#F4F3EF] dark:hover:bg-[#2C2C27]" onClick={() => createNote()} title="Nova anotação">
              <FilePlus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {addingFolder && (
          <div className="px-3 py-2 border-b border-zinc-200/40 dark:border-zinc-800/40">
            <div className="flex gap-1.5">
              <Input
                autoFocus placeholder="Nome da pasta…"
                value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') setAddingFolder(false) }}
                className="h-8 text-xs bg-[#F4F3EF] dark:bg-[#181816] border-zinc-200/60 dark:border-zinc-700/60"
              />
              <Button size="sm" className="h-8 px-2 text-xs" onClick={createFolder}>OK</Button>
            </div>
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            {folders.map(folder => {
              const folderNotes = notes.filter(n => n.folder_id === folder.id)
              const isExpanded  = expandedFolders.has(folder.id)
              return (
                <div key={folder.id}>
                  <div onClick={() => toggleFolder(folder.id)} className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:bg-[#F4F3EF] dark:hover:bg-[#2C2C27] hover:text-black dark:hover:text-[#F4F3EF] cursor-pointer select-none group transition-colors">
                    {isExpanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                    <Folder className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate flex-1">{folder.name}</span>
                    <button onClick={e => { e.stopPropagation(); createNote(folder.id) }} className="hidden group-hover:flex items-center justify-center">
                      <FilePlus className="h-3 w-3" />
                    </button>
                  </div>
                  {isExpanded && folderNotes.map(note => (
                    <NoteItem key={note.id} note={note} selected={selectedNoteId === note.id} onClick={() => setSelectedNoteId(note.id)} indent />
                  ))}
                </div>
              )
            })}

            {unfiledNotes.length > 0 && (
              <div>
                {folders.length > 0 && (
                  <p className="px-2.5 pt-3 pb-1 text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-600 font-medium">Sem pasta</p>
                )}
                {unfiledNotes.map(note => (
                  <NoteItem key={note.id} note={note} selected={selectedNoteId === note.id} onClick={() => setSelectedNoteId(note.id)} />
                ))}
              </div>
            )}

            {notes.length === 0 && (
              <div className="px-3 py-8 text-center">
                <FileText className="h-8 w-8 text-zinc-200 dark:text-zinc-700 mx-auto mb-2" />
                <p className="text-xs text-zinc-400 dark:text-zinc-500">Nenhuma anotação ainda</p>
                <button onClick={() => createNote()} className="mt-2 text-xs text-[#1E3A5F] dark:text-[#4A72A8] hover:underline underline-offset-4">
                  Criar primeira nota
                </button>
              </div>
            )}
          </div>
        </ScrollArea>
      </aside>

      {/* ── Área principal (editor + PDF) ── */}
      <div className="flex flex-1 overflow-hidden min-w-0">

        {/* Painel do editor */}
        <div className={cn(
          'flex flex-col overflow-hidden',
          pdfSignedUrl
            ? 'w-[42%] border-r border-zinc-200/40 dark:border-zinc-800/40'
            : 'flex-1'
        )}>
          {selectedNoteId ? (
            <>
              <div className="flex items-center justify-end px-3 py-1 border-b border-zinc-200/40 dark:border-zinc-800/40 bg-[#F4F3EF] dark:bg-[#2C2C27] shrink-0">
                {pdfPath ? (
                  <Button variant="ghost" size="sm" className="h-6 gap-1 text-[11px] text-zinc-400 hover:text-red-500 hover:bg-transparent px-1.5" onClick={handleRemovePdf}>
                    <X className="h-3 w-3" />
                    Fechar livro
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" className="h-6 gap-1 text-[11px] text-zinc-400 hover:text-black dark:hover:text-[#F4F3EF] hover:bg-transparent px-1.5" onClick={() => fileInputRef.current?.click()} disabled={uploadingPdf}>
                    {uploadingPdf ? <Loader2 className="h-3 w-3 animate-spin" /> : <BookOpen className="h-3.5 w-3.5" />}
                    {uploadingPdf ? 'Enviando…' : 'Abrir livro'}
                  </Button>
                )}
                <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={handlePdfUpload} />
              </div>

              <div className="flex-1 min-h-0 overflow-hidden">
                <RichEditor noteId={selectedNoteId} userId={userId} onTitleChange={handleTitleChange} />
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-center">
              <div>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#F4F3EF] dark:bg-[#181816]">
                  <FileText className="h-7 w-7 text-zinc-300 dark:text-zinc-600" />
                </div>
                <p className="text-sm font-semibold text-black dark:text-[#F4F3EF]">Selecione uma anotação</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">ou crie uma nova com o botão acima</p>
              </div>
            </div>
          )}
        </div>

        {/* Painel do PDF */}
        {pdfSignedUrl && selectedNoteId && (
          <div className="flex-1 overflow-hidden">
            <PDFViewer pdfUrl={pdfSignedUrl} noteId={selectedNoteId} userId={userId} />
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
      {note.pdf_url && <BookOpen className="h-3 w-3 shrink-0 opacity-40" />}
    </div>
  )
}
