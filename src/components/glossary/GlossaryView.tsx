'use client'
import { useState, useMemo } from 'react'
import { Plus, Search, X, Loader2, Tag, Edit2, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { GlossaryEntry } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

interface GlossaryViewProps {
  initialEntries: GlossaryEntry[]
  subjects: Array<{ id: string; name: string; color: string }>
  userId: string
}

const LANGUAGES = ['PT', 'EN', 'ES', 'FR', 'LA']

function emptyForm() {
  return { term: '', definition: '', language: 'PT', subjectId: '', tagsRaw: '' }
}

export function GlossaryView({ initialEntries, subjects, userId }: GlossaryViewProps) {
  const [entries, setEntries] = useState<GlossaryEntry[]>(initialEntries)
  const [search, setSearch] = useState('')
  const [filterSubjectId, setFilterSubjectId] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<GlossaryEntry | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const matchSearch = !search ||
        e.term.toLowerCase().includes(search.toLowerCase()) ||
        e.definition.toLowerCase().includes(search.toLowerCase())
      const matchSubject = filterSubjectId === 'all' || e.subject_id === filterSubjectId
      return matchSearch && matchSubject
    })
  }, [entries, search, filterSubjectId])

  function openNew() {
    setEditingEntry(null)
    setForm(emptyForm())
    setDialogError(null)
    setDialogOpen(true)
  }

  function openEdit(entry: GlossaryEntry) {
    setEditingEntry(entry)
    setDialogError(null)
    setForm({
      term: entry.term,
      definition: entry.definition,
      language: entry.language,
      subjectId: entry.subject_id ?? '',
      tagsRaw: entry.tags.join(', '),
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.term.trim() || !form.definition.trim()) return
    setSaving(true)
    setDialogError(null)

    const tags = form.tagsRaw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    const payload = {
      user_id: userId,
      term: form.term.trim(),
      definition: form.definition.trim(),
      language: form.language,
      subject_id: form.subjectId || null,
      tags,
    }

    try {
      const supabase = createClient()
      if (editingEntry) {
        const { data, error } = await (supabase as any)
          .from('glossary').update(payload).eq('id', editingEntry.id).select().single()
        if (error) throw error
        if (data) setEntries((prev) => prev.map((e) => e.id === editingEntry.id ? data : e))
      } else {
        const { data, error } = await (supabase as any)
          .from('glossary').insert(payload).select().single()
        if (error) throw error
        if (data) setEntries((prev) => [data, ...prev].sort((a, b) => a.term.localeCompare(b.term)))
      }
      setDialogOpen(false)
    } catch (err) {
      console.error('[Glossary] Erro ao salvar termo:', err)
      setDialogError('Não foi possível salvar o termo. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setSaving(true)
    setDialogError(null)
    try {
      const supabase = createClient()
      const { error } = await (supabase as any).from('glossary').delete().eq('id', id)
      if (error) throw error
      setEntries((prev) => prev.filter((e) => e.id !== id))
      setDialogOpen(false)
    } catch (err) {
      console.error('[Glossary] Erro ao excluir termo:', err)
      setDialogError('Não foi possível excluir o termo. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-0 pt-5 px-5">
          {/* Filters + add */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por termo ou definição…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>

            <Select value={filterSubjectId} onValueChange={setFilterSubjectId}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Filtrar matéria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as matérias</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={openNew} className="gap-1.5 shrink-0">
              <Plus className="h-4 w-4" />
              Novo termo
            </Button>
          </div>

          <p className="text-xs text-muted-foreground pt-3 pb-1">
            {filtered.length} {filtered.length === 1 ? 'termo' : 'termos'} encontrados
          </p>
        </CardHeader>

        <CardContent className="p-0">
        {/* Table */}
        <div className="overflow-hidden rounded-b-[22px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40">Termo</TableHead>
              <TableHead className="w-16">Idioma</TableHead>
              <TableHead>Definição</TableHead>
              <TableHead className="w-36">Matéria</TableHead>
              <TableHead className="w-40">Tags</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-sm">
                  {entries.length === 0
                    ? 'Nenhum termo cadastrado ainda. Clique em "Novo termo" para começar.'
                    : 'Nenhum termo encontrado para os filtros aplicados.'}
                </TableCell>
              </TableRow>
            )}
            {filtered.map((entry) => {
              const subject = subjects.find((s) => s.id === entry.subject_id)
              return (
                <TableRow key={entry.id}>
                  <TableCell className="font-semibold">{entry.term}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{entry.language}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {entry.definition}
                  </TableCell>
                  <TableCell>
                    {subject && (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-[#1E3A5F]/10 text-[#1E3A5F] dark:bg-[#4A72A8]/20 dark:text-[#4A72A8]">
                        {subject.name}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {entry.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px] gap-0.5 py-0">
                          <Tag className="h-2.5 w-2.5" />{tag}
                        </Badge>
                      ))}
                      {entry.tags.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{entry.tags.length - 3}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(entry)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        </div>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingEntry ? 'Editar termo' : 'Novo termo'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Termo *</Label>
                <Input
                  placeholder="ex: Homeostase"
                  value={form.term}
                  onChange={(e) => setForm({ ...form, term: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Idioma</Label>
                <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Definição / Tradução *</Label>
              <Textarea
                placeholder="Significado, tradução ou contexto de uso…"
                value={form.definition}
                onChange={(e) => setForm({ ...form, definition: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Matéria (opcional)</Label>
                <Select value={form.subjectId} onValueChange={(v) => setForm({ ...form, subjectId: v })}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tags (separadas por vírgula)</Label>
                <Input
                  placeholder="ex: biologia, célula"
                  value={form.tagsRaw}
                  onChange={(e) => setForm({ ...form, tagsRaw: e.target.value })}
                />
              </div>
            </div>

            {dialogError && (
              <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/20 rounded-xl px-3 py-2.5">
                {dialogError}
              </p>
            )}
          </div>

          <DialogFooter className="flex-row justify-between">
            {editingEntry && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(editingEntry.id)}
                disabled={saving}
                className="gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button
                onClick={handleSave}
                disabled={saving || !form.term.trim() || !form.definition.trim()}
                className="gap-1.5"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
