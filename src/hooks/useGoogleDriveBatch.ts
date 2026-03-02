import { useState, useRef, useCallback } from 'react'
import type { OCRResult, ProcessedImage } from '../types/ocr'
import { listPDFs, downloadFile, createGoogleDoc, type DriveFile } from '../utils/googleDrive'
import { pdfToProcessedImages } from '../utils/pdfLoader'

export interface BatchJob {
  id: string
  fileName: string
  status: 'pending' | 'downloading' | 'processing' | 'saving' | 'done' | 'error'
  errorMessage?: string
  resultDocUrl?: string
}

export interface BatchState {
  isRunning: boolean
  jobs: BatchJob[]
  currentIndex: number
  totalFiles: number
}

const INITIAL_BATCH_STATE: BatchState = {
  isRunning: false,
  jobs: [],
  currentIndex: 0,
  totalFiles: 0,
}

export function useGoogleDriveBatch(
  processImage: (image: ProcessedImage, index: number, total: number) => Promise<OCRResult>,
) {
  const [batchState, setBatchState] = useState<BatchState>(INITIAL_BATCH_STATE)
  const cancelRef = useRef(false)

  const startBatch = useCallback(async (
    sourceFolderId: string,
    accessToken: string,
    outputFolderId?: string,
  ) => {
    cancelRef.current = false

    // List PDFs
    let pdfFiles: DriveFile[]
    try {
      pdfFiles = await listPDFs(accessToken, sourceFolderId)
    } catch {
      return
    }

    if (pdfFiles.length === 0) return

    const jobs: BatchJob[] = pdfFiles.map((f, i) => ({
      id: `batch-${i}`,
      fileName: f.name,
      status: 'pending' as const,
    }))

    setBatchState({
      isRunning: true,
      jobs: [...jobs],
      currentIndex: 0,
      totalFiles: pdfFiles.length,
    })

    for (let i = 0; i < pdfFiles.length; i++) {
      if (cancelRef.current) break

      const pdf = pdfFiles[i]

      // Update status: downloading
      jobs[i] = { ...jobs[i], status: 'downloading' }
      setBatchState(prev => ({
        ...prev,
        jobs: [...jobs],
        currentIndex: i,
      }))

      try {
        // Download PDF
        const arrayBuffer = await downloadFile(accessToken, pdf.id)
        const file = new File([arrayBuffer], pdf.name, { type: 'application/pdf' })

        if (cancelRef.current) break

        // Process PDF → images
        jobs[i] = { ...jobs[i], status: 'processing' }
        setBatchState(prev => ({ ...prev, jobs: [...jobs] }))

        const processedImages = await pdfToProcessedImages(file)

        // Run OCR on each page
        const pageTexts: string[] = []
        for (let p = 0; p < processedImages.length; p++) {
          if (cancelRef.current) break
          const result = await processImage(processedImages[p], p, processedImages.length)
          pageTexts.push(result.fullText)
        }

        if (cancelRef.current) break

        // Save to Google Docs
        jobs[i] = { ...jobs[i], status: 'saving' }
        setBatchState(prev => ({ ...prev, jobs: [...jobs] }))

        const docTitle = pdf.name.replace(/\.pdf$/i, '') + '_ocr'
        const fullText = pageTexts.join('\n\n')
        const targetFolder = outputFolderId ?? sourceFolderId
        const { docUrl } = await createGoogleDoc(
          accessToken,
          docTitle,
          fullText,
          targetFolder === 'root' ? undefined : targetFolder,
        )

        jobs[i] = { ...jobs[i], status: 'done', resultDocUrl: docUrl }
        setBatchState(prev => ({ ...prev, jobs: [...jobs] }))
      } catch (err) {
        jobs[i] = {
          ...jobs[i],
          status: 'error',
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
        }
        setBatchState(prev => ({ ...prev, jobs: [...jobs] }))
      }
    }

    setBatchState(prev => ({ ...prev, isRunning: false }))
  }, [processImage])

  const cancelBatch = useCallback(() => {
    cancelRef.current = true
    setBatchState(prev => ({ ...prev, isRunning: false }))
  }, [])

  const resetBatch = useCallback(() => {
    setBatchState(INITIAL_BATCH_STATE)
  }, [])

  return { batchState, startBatch, cancelBatch, resetBatch }
}
