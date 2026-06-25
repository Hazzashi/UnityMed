'use client'
import { useEffect, useState, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import {
  Bold, Italic, Strikethrough, Code, List, ListOrdered,
  CheckSquare, Heading2, Heading3, Quote, Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Note } from '@/types'
import { Input } from '@/components/ui/input'

import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface RichEditorProps {
  noteId: string
  userId: string
  onTitleChange: (id: string, title: string) => void
}

export function RichEditor({ noteId, userId, onTitleChange }: RichEditorProps) {
  const [note, setNote]     = useState<Note | null>(null)
  const [title, setTitle]   = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // CORRIGIDO: useRef em vez de useState evita stale closures no debounce
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const titleRef       = useRef(title)       // ref para capturar título atual nas closures
  const noteIdRef      = useRef(noteId)

  // Mantém refs sincronizados com state
  useEffect(() => { titleRef.current = title }, [title])
  useEffect(() => { noteIdRef.current = noteId }, [noteId])

  // CORRIGIDO: saveContent usa apenas refs, sem dependências estáticas que causariam re-criação
  async function saveContent(currentTitle: string, content: object) {
    setSaving(true)
    setSaveError(null)
    try {
      const supabase = createClient()
      const { error } = await (supabase as any)
        .from('notes')
        .update({ title: currentTitle, content })
        .eq('id', noteIdRef.current)
      if (error) throw error
      setLastSaved(new Date())
    } catch (err) {
      console.error('[Notes] Erro ao salvar nota:', err)
      setSaveError('Falha ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const editor = useEditor({
    immediatelyRender: false, // evita hydration mismatch no SSR
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: '',
    editorProps: {
      attributes: { class: 'tiptap-editor focus:outline-none' },
    },
    onUpdate: ({ editor }) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => {
        saveContent(titleRef.current, editor.getJSON())
      }, 1500)
    },
  })

  // Carrega nota ao trocar de noteId
  useEffect(() => {
    async function loadNote() {
      setLoading(true)
      setSaveError(null)
      setLastSaved(null)
      try {
        const supabase = createClient()
        const { data: rawData, error } = await supabase
          .from('notes')
          .select('*')
          .eq('id', noteId)
          .single()
        if (error) throw error
        const data = rawData as Note | null
        if (data) {
          setNote(data)
          setTitle(data.title)
          titleRef.current = data.title
          // Conteúdo vazio ({} ou null) → string vazia para evitar "Unknown node type"
          const raw = data.content as Record<string, unknown> | null
          const hasContent = raw && typeof raw === 'object' && Object.keys(raw).length > 0
          editor?.commands.setContent(hasContent ? raw : '')
        }
      } catch (err) {
        console.error('[Notes] Erro ao carregar nota:', err)
      } finally {
        setLoading(false)
      }
    }
    if (editor) loadNote()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId, editor])

  // Limpa timeout ao desmontar
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  async function handleTitleBlur() {
    const currentTitle = titleRef.current
    if (currentTitle !== note?.title) {
      onTitleChange(noteId, currentTitle)
      await saveContent(currentTitle, editor?.getJSON() ?? {})
      setNote((prev) => prev ? { ...prev, title: currentTitle } : prev)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-300 dark:text-zinc-600" />
      </div>
    )
  }

  const toolbarItems = [
    { icon: Bold,          action: () => editor?.chain().focus().toggleBold().run(),               label: 'Negrito',   active: editor?.isActive('bold') },
    { icon: Italic,        action: () => editor?.chain().focus().toggleItalic().run(),             label: 'Itálico',   active: editor?.isActive('italic') },
    { icon: Strikethrough, action: () => editor?.chain().focus().toggleStrike().run(),             label: 'Tachado',   active: editor?.isActive('strike') },
    { icon: Code,          action: () => editor?.chain().focus().toggleCode().run(),               label: 'Código',    active: editor?.isActive('code') },
    null,
    { icon: Heading2,      action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), label: 'H2',       active: editor?.isActive('heading', { level: 2 }) },
    { icon: Heading3,      action: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(), label: 'H3',       active: editor?.isActive('heading', { level: 3 }) },
    null,
    { icon: List,          action: () => editor?.chain().focus().toggleBulletList().run(),         label: 'Lista',     active: editor?.isActive('bulletList') },
    { icon: ListOrdered,   action: () => editor?.chain().focus().toggleOrderedList().run(),        label: 'Lista num', active: editor?.isActive('orderedList') },
    { icon: CheckSquare,   action: () => editor?.chain().focus().toggleTaskList().run(),           label: 'Checklist', active: editor?.isActive('taskList') },
    { icon: Quote,         action: () => editor?.chain().focus().toggleBlockquote().run(),         label: 'Citação',   active: editor?.isActive('blockquote') },
  ]

  return (
    <div className="flex h-full flex-col bg-white dark:bg-[#181816]">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-4 py-2 border-b border-zinc-200/40 dark:border-zinc-800/40 sticky top-0 z-10 flex-wrap bg-white dark:bg-[#181816]">
        {toolbarItems.map((item, i) => {
          if (!item) return <div key={i} className="w-px h-4 bg-zinc-200/60 dark:bg-zinc-700/60 mx-1" />
          const Icon = item.icon
          return (
            <button
              key={i}
              onClick={item.action}
              title={item.label}
              className={cn(
                'p-1.5 rounded-lg text-sm transition-colors',
                item.active
                  ? 'bg-[#EAE8DF] dark:bg-[#2C2C27] text-black dark:text-[#F4F3EF]'
                  : 'text-zinc-400 dark:text-zinc-500 hover:text-black dark:hover:text-[#F4F3EF] hover:bg-[#F4F3EF] dark:hover:bg-[#181816]'
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
          )
        })}

        <div className="ml-auto flex items-center gap-2">
          {saving && (
            <span className="flex items-center gap-1 text-[11px] text-zinc-400 dark:text-zinc-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              Salvando…
            </span>
          )}
          {saveError && (
            <span className="text-[11px] text-red-400">{saveError}</span>
          )}
          {lastSaved && !saving && !saveError && (
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
              Salvo às {format(lastSaved, 'HH:mm', { locale: ptBR })}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
        <div className="w-full max-w-3xl mx-auto px-8 py-8">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            className="border-none shadow-none text-3xl font-bold h-auto px-0 py-0 mb-6 focus-visible:ring-0 bg-transparent text-black dark:text-[#F4F3EF] placeholder:text-zinc-300 dark:placeholder:text-zinc-600"
            placeholder="Sem título"
          />
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  )
}
