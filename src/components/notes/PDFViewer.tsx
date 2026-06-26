'use client'
import { useEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Pencil, Highlighter, Eraser, RotateCcw, RotateCw,
  Trash2, Download, Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Point { x: number; y: number }

interface Stroke {
  id: string
  tool: 'pen' | 'highlighter' | 'eraser'
  color: string
  width: number
  points: Point[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PEN_COLORS = ['#1E3A5F', '#000000', '#DC2626', '#16A34A', '#7C3AED', '#EA580C']
const HL_COLORS  = ['#FDE047', '#86EFAC', '#93C5FD', '#F9A8D4', '#FCA5A5', '#C4B5FD']
const WIDTHS     = [{ label: 'Fino', value: 1 }, { label: 'Médio', value: 2 }, { label: 'Grosso', value: 4 }]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return r
    ? [parseInt(r[1], 16) / 255, parseInt(r[2], 16) / 255, parseInt(r[3], 16) / 255]
    : [0, 0, 0]
}

// ─── Component ────────────────────────────────────────────────────────────────

interface PDFViewerProps {
  pdfUrl: string
  noteId: string
  userId: string
}

export function PDFViewer({ pdfUrl, noteId, userId }: PDFViewerProps) {
  const [numPages, setNumPages]       = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale]             = useState(0.9)
  const [tool, setTool]               = useState<'pen' | 'highlighter' | 'eraser'>('pen')
  const [penColor, setPenColor]       = useState('#1E3A5F')
  const [hlColor, setHlColor]         = useState('#FDE047')
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [strokes, setStrokes]         = useState<Stroke[]>([])
  const [redoStack, setRedoStack]     = useState<Stroke[]>([])
  const [exporting, setExporting]     = useState(false)
  const [pdfError, setPdfError]       = useState<string | null>(null)
  // Sinaliza quando a página do PDF terminou de renderizar
  const [pdfRendered, setPdfRendered] = useState(false)

  const containerRef   = useRef<HTMLDivElement>(null)
  const canvasRef      = useRef<HTMLCanvasElement>(null)
  const isDrawingRef   = useRef(false)
  const strokeRef      = useRef<Stroke | null>(null)
  const strokesRef        = useRef<Stroke[]>([])
  const saveTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadingRef        = useRef(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  // Rastreia posição inicial do dedo para scroll manual (JS)
  const touchScrollRef    = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null)
  // Promise do save em andamento — o load aguarda antes de buscar
  const pendingSaveRef = useRef<Promise<unknown> | null>(null)
  // Indica se o usuário fez alguma alteração nesta página
  const isDirtyRef     = useRef(false)

  const activeColor = tool === 'highlighter' ? hlColor : penColor

  useEffect(() => { strokesRef.current = strokes }, [strokes])

  // Reset do estado de renderização ao trocar de página
  useEffect(() => { setPdfRendered(false) }, [currentPage])

  // ── Salva anotações de uma página (parâmetros explícitos — sem closure) ──────

  async function saveAnnotationsNow(nId: string, uId: string, pageNum: number, strokesToSave: Stroke[]) {
    const supabase = createClient()
    const { error: delErr } = await (supabase as any).from('pdf_annotations').delete()
      .eq('note_id', nId).eq('page_number', pageNum)
    if (delErr) { console.error('[PDF] delete error:', delErr); return }
    if (strokesToSave.length === 0) return
    const { error: insErr } = await (supabase as any).from('pdf_annotations').insert(
      strokesToSave.map(s => ({ note_id: nId, user_id: uId, page_number: pageNum, type: 'stroke', data: s }))
    )
    if (insErr) console.error('[PDF] insert error:', insErr)
  }

  // Dispara um save imediato e registra a promise para o próximo load aguardar
  function triggerSave(nId: string, uId: string, pageNum: number, strokesToSave: Stroke[]) {
    // .catch garante que a promise sempre resolve — evita que o loadPage lance exceção no await
    const p = saveAnnotationsNow(nId, uId, pageNum, strokesToSave)
      .catch(err => console.error('[PDF] save error:', err))
    pendingSaveRef.current = p
    void p.finally(() => { if (pendingSaveRef.current === p) pendingSaveRef.current = null })
  }

  // Debounce de 600ms; ao chamar também marca a página como modificada
  function scheduleSave(strokesToSave: Stroke[]) {
    isDirtyRef.current = true
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    // Captura tudo que precisa no momento da chamada — sem depender de closure do render
    const snap = { nId: noteId, uId: userId, pg: currentPage, strokes: strokesToSave }
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null
      triggerSave(snap.nId, snap.uId, snap.pg, snap.strokes)
    }, 600)
  }

  // ── Load annotations on page change ─────────────────────────────────────────

  useEffect(() => {
    let cancelled = false
    isDirtyRef.current = false // nova página — resetar flag de modificação

    async function loadPage() {
      // Aguarda qualquer save em andamento para evitar race condition
      if (pendingSaveRef.current) await pendingSaveRef.current
      if (cancelled) return

      loadingRef.current = true
      setStrokes([])

      const supabase = createClient()
      const { data, error } = await supabase
        .from('pdf_annotations')
        .select('data')
        .eq('note_id', noteId)
        .eq('page_number', currentPage)
      if (error) console.error('[PDF] load error:', error)
      if (!cancelled) {
        setStrokes((data ?? []).map((r: any) => r.data as Stroke))
        loadingRef.current = false
      }
    }
    loadPage()

    return () => {
      cancelled = true
      // Ao sair da página: cancela debounce e salva imediatamente se houve modificações
      if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null }
      if (isDirtyRef.current && !loadingRef.current) {
        triggerSave(noteId, userId, currentPage, strokesRef.current)
      }
    }
  }, [noteId, currentPage])

  // ── Redraw quando strokes mudam E página já renderizou ──────────────────────
  // Garante que se os strokes carregarem DEPOIS do onRenderSuccess, ainda são desenhados

  useEffect(() => {
    if (!pdfRendered) return
    const overlay = syncCanvas()
    if (!overlay) return
    drawAll(overlay, strokes)
  }, [strokes, pdfRendered])

  // ── Canvas sync ──────────────────────────────────────────────────────────────

  function syncCanvas(): HTMLCanvasElement | null {
    const container = containerRef.current
    const overlay   = canvasRef.current
    if (!container || !overlay) return null
    const pdfCanvas = container.querySelector('.react-pdf__Page__canvas') as HTMLCanvasElement | null
    if (!pdfCanvas) return null
    if (overlay.width !== pdfCanvas.width)   overlay.width  = pdfCanvas.width
    if (overlay.height !== pdfCanvas.height) overlay.height = pdfCanvas.height
    return overlay
  }

  function drawAll(overlay: HTMLCanvasElement, list: Stroke[]) {
    const ctx = overlay.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, overlay.width, overlay.height)
    for (const s of list) paintStroke(ctx, s, overlay.width, overlay.height)
  }

  function paintStroke(ctx: CanvasRenderingContext2D, s: Stroke, w: number, h: number) {
    if (s.points.length < 2) return
    ctx.save()
    ctx.lineCap  = 'round'
    ctx.lineJoin = 'round'
    if (s.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = 'rgba(0,0,0,1)'
      ctx.lineWidth   = s.width * 10
      ctx.globalAlpha = 1
    } else if (s.tool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = s.color
      ctx.lineWidth   = s.width * 14
      ctx.globalAlpha = 0.4
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = s.color
      ctx.lineWidth   = s.width
      ctx.globalAlpha = 1
    }
    ctx.beginPath()
    ctx.moveTo(s.points[0].x * w, s.points[0].y * h)
    for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x * w, s.points[i].y * h)
    ctx.stroke()
    ctx.restore()
  }

  // ── Pointer events ───────────────────────────────────────────────────────────

  function getPoint(e: React.PointerEvent): Point | null {
    const overlay = canvasRef.current
    if (!overlay) return null
    const rect = overlay.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top)  / rect.height,
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === 'touch') {
      // Dedo: captura e rola o container via JS — touch-action:none impede o browser de fazer scroll
      canvasRef.current?.setPointerCapture(e.pointerId)
      const c = scrollContainerRef.current
      if (c) touchScrollRef.current = { startX: e.clientX, startY: e.clientY, scrollLeft: c.scrollLeft, scrollTop: c.scrollTop }
      return
    }
    // Caneta / mouse: desenha
    e.preventDefault()
    canvasRef.current?.setPointerCapture(e.pointerId)
    isDrawingRef.current = true
    const pt = getPoint(e)
    if (!pt) return
    strokeRef.current = {
      id: crypto.randomUUID(), tool, color: activeColor, width: strokeWidth, points: [pt],
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (e.pointerType === 'touch') {
      const s = touchScrollRef.current
      const c = scrollContainerRef.current
      if (s && c) {
        c.scrollLeft = s.scrollLeft - (e.clientX - s.startX)
        c.scrollTop  = s.scrollTop  - (e.clientY - s.startY)
      }
      return
    }
    if (!isDrawingRef.current || !strokeRef.current) return
    const pt = getPoint(e)
    if (!pt) return
    strokeRef.current.points.push(pt)

    const overlay = canvasRef.current
    if (!overlay) return
    const ctx = overlay.getContext('2d')
    if (!ctx) return
    const s   = strokeRef.current
    const pts = s.points
    if (pts.length < 2) return

    ctx.save()
    ctx.lineCap  = 'round'
    ctx.lineJoin = 'round'
    if (s.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = 'rgba(0,0,0,1)'; ctx.lineWidth = s.width * 10; ctx.globalAlpha = 1
    } else if (s.tool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = s.color; ctx.lineWidth = s.width * 14; ctx.globalAlpha = 0.4
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = s.color; ctx.lineWidth = s.width; ctx.globalAlpha = 1
    }
    ctx.beginPath()
    ctx.moveTo(pts[pts.length - 2].x * overlay.width, pts[pts.length - 2].y * overlay.height)
    ctx.lineTo(pts[pts.length - 1].x * overlay.width, pts[pts.length - 1].y * overlay.height)
    ctx.stroke()
    ctx.restore()
  }

  function onPointerUp(e: React.PointerEvent) {
    if (e.pointerType === 'touch') { touchScrollRef.current = null; return }
    if (!isDrawingRef.current || !strokeRef.current) return
    isDrawingRef.current = false
    const s = strokeRef.current
    strokeRef.current = null
    if (s.points.length < 2) return
    const next = [...strokesRef.current, s]
    setStrokes(next)
    setRedoStack([])
    scheduleSave(next)
  }

  // ── Undo ─────────────────────────────────────────────────────────────────────

  function handleUndo() {
    if (strokes.length === 0) return
    const last = strokes[strokes.length - 1]
    const next = strokes.slice(0, -1)
    setStrokes(next)
    setRedoStack(prev => [...prev, last])
    scheduleSave(next)
  }

  function handleRedo() {
    if (redoStack.length === 0) return
    const nextStroke = redoStack[redoStack.length - 1]
    const next = [...strokes, nextStroke]
    setRedoStack(prev => prev.slice(0, -1))
    setStrokes(next)
    scheduleSave(next)
  }

  function handleClearPage() {
    setStrokes([])
    scheduleSave([])
  }

  // ── Export ────────────────────────────────────────────────────────────────────

  async function handleExport() {
    setExporting(true)
    try {
      const { PDFDocument, rgb } = await import('pdf-lib')
      const bytes  = await fetch(pdfUrl).then(r => r.arrayBuffer())
      const pdfDoc = await PDFDocument.load(bytes)

      const supabase = createClient()
      const { data: allRows } = await supabase
        .from('pdf_annotations').select('page_number, data').eq('note_id', noteId)

      const byPage = new Map<number, Stroke[]>()
      for (const row of allRows ?? []) {
        const pg = (row as any).page_number as number
        if (!byPage.has(pg)) byPage.set(pg, [])
        byPage.get(pg)!.push((row as any).data as Stroke)
      }

      const pages = pdfDoc.getPages()
      for (const [pageNum, pageStrokes] of byPage) {
        const page = pages[pageNum - 1]
        if (!page) continue
        const { width: pw, height: ph } = page.getSize()
        for (const s of pageStrokes) {
          if (s.tool === 'eraser' || s.points.length < 2) continue
          const lw      = s.tool === 'highlighter' ? s.width * 14 : s.width
          const opacity = s.tool === 'highlighter' ? 0.4 : 1
          const [r, g, b] = hexToRgb(s.color)
          const color = rgb(r, g, b)
          for (let i = 1; i < s.points.length; i++) {
            page.drawLine({
              start: { x: s.points[i - 1].x * pw, y: ph - s.points[i - 1].y * ph },
              end:   { x: s.points[i].x     * pw, y: ph - s.points[i].y     * ph },
              thickness: lw, color, opacity,
            })
          }
        }
      }

      const output = await pdfDoc.save()
      const blob   = new Blob([output.buffer as ArrayBuffer], { type: 'application/pdf' })
      const url    = URL.createObjectURL(blob)
      const a      = document.createElement('a')
      a.href = url; a.download = 'livro-anotado.pdf'; a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[PDF] Export error:', err)
    } finally {
      setExporting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const colorPalette = tool === 'highlighter' ? HL_COLORS : PEN_COLORS
  const selectedColor = tool === 'highlighter' ? hlColor : penColor

  function setActiveColor(c: string) {
    if (tool === 'highlighter') setHlColor(c)
    else setPenColor(c)
  }

  return (
    <div className="flex flex-col h-full bg-[#F4F3EF] dark:bg-[#222220]">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-zinc-200/40 dark:border-zinc-800/40 bg-white dark:bg-[#181816] flex-wrap shrink-0">

        {/* Tool selector */}
        <div className="flex items-center gap-0.5 bg-[#F4F3EF] dark:bg-[#2C2C27] rounded-lg p-0.5">
          {([
            { id: 'pen'         as const, icon: Pencil,      title: 'Caneta' },
            { id: 'highlighter' as const, icon: Highlighter, title: 'Marca-texto' },
            { id: 'eraser'      as const, icon: Eraser,      title: 'Borracha' },
          ]).map(({ id, icon: Icon, title }) => (
            <button
              key={id} title={title} onClick={() => setTool(id)}
              className={cn(
                'p-1.5 rounded-md transition-all',
                tool === id
                  ? 'bg-white dark:bg-[#181816] shadow-sm text-black dark:text-[#F4F3EF]'
                  : 'text-zinc-400 hover:text-black dark:hover:text-[#F4F3EF]'
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>

        {/* Colors */}
        {tool !== 'eraser' && (
          <div className="flex items-center gap-1">
            {colorPalette.map(c => (
              <button
                key={c} onClick={() => setActiveColor(c)}
                className={cn(
                  'h-5 w-5 rounded-full border-2 transition-transform hover:scale-110',
                  selectedColor === c
                    ? 'border-zinc-700 dark:border-zinc-200 scale-125'
                    : 'border-transparent'
                )}
                style={{ background: c }}
              />
            ))}
          </div>
        )}

        {/* Stroke width (all tools including eraser) */}
        <div className="flex items-center gap-0.5">
          {WIDTHS.map(({ value, label }) => (
            <button
              key={value} title={label} onClick={() => setStrokeWidth(value)}
              className={cn(
                'flex items-center justify-center h-7 w-7 rounded-md transition-colors',
                strokeWidth === value
                  ? 'bg-[#EAE8DF] dark:bg-[#2C2C27]'
                  : 'hover:bg-[#F4F3EF] dark:hover:bg-[#2C2C27]'
              )}
            >
              <div
                className={cn('rounded-full', tool === 'eraser' ? 'bg-zinc-400 border border-zinc-400' : 'bg-zinc-600 dark:bg-zinc-300')}
                style={{ width: value + 3, height: value + 3 }}
              />
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-zinc-200/60 dark:bg-zinc-700/60 mx-0.5" />

        {/* Undo / Redo / Clear */}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleUndo} title="Desfazer" disabled={strokes.length === 0}>
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRedo} title="Refazer" disabled={redoStack.length === 0}>
          <RotateCw className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-500" onClick={handleClearPage} title="Limpar página" disabled={strokes.length === 0}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>

        <div className="w-px h-5 bg-zinc-200/60 dark:bg-zinc-700/60 mx-0.5" />

        {/* Page navigation */}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums select-none">
          {currentPage} / {numPages || '—'}
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))} disabled={currentPage >= numPages}>
          <ChevronRight className="h-4 w-4" />
        </Button>

        <div className="w-px h-5 bg-zinc-200/60 dark:bg-zinc-700/60 mx-0.5" />

        {/* Zoom */}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScale(s => parseFloat(Math.max(0.5, s - 0.2).toFixed(1)))} title="Reduzir">
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums select-none w-9 text-center">
          {Math.round(scale * 100)}%
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScale(s => parseFloat(Math.min(3, s + 0.2).toFixed(1)))} title="Ampliar">
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>

        {/* Export */}
        <div className="ml-auto">
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* ── PDF + Canvas ── */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto flex justify-center p-4 bg-[#F4F3EF] dark:bg-[#222220]"
      >
        {pdfError && (
          <div className="flex flex-col items-center justify-center gap-3 text-center p-8">
            <p className="text-sm font-medium text-red-500">{pdfError}</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Tente um arquivo menor ou verifique se o PDF não está corrompido.
            </p>
          </div>
        )}
        {!pdfError && (
        <div ref={containerRef} className="relative inline-block shadow-xl">
          <Document
            file={pdfUrl}
            onLoadSuccess={({ numPages: n }) => { setNumPages(n); setCurrentPage(1); setPdfError(null) }}
            onLoadError={() => setPdfError('Não foi possível carregar o PDF. O arquivo pode ser muito grande ou estar corrompido.')}
            loading={
              <div className="flex items-center justify-center bg-white dark:bg-[#181816]" style={{ width: 595, height: 842 }}>
                <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
              </div>
            }
          >
            <Page
              pageNumber={currentPage}
              scale={scale}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              onRenderSuccess={() => {
                const overlay = syncCanvas()
                if (overlay) drawAll(overlay, strokesRef.current)
                setPdfRendered(true)
              }}
            />
          </Document>
          <canvas
            ref={canvasRef}
            className="absolute inset-0"
            style={{ touchAction: 'none', cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        </div>
        )}
      </div>

    </div>
  )
}
