import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware.ts'
import { uploadSingleFile } from '../middlewares/upload.middleware.ts'
import {
    createTextDocument,
    deleteDocument,
    downloadFile,
    getDocument,
    getParticipants,
    replaceFile,
    updateDocument,
    uploadFile,
} from '../documents/documents.controller.ts'

const router = Router()

router.use(requireAuth)

router.post('/', createTextDocument)
router.post('/files', uploadSingleFile, uploadFile)
router.get('/:id', getDocument)
router.get('/:id/file', downloadFile)
router.get('/:id/participants', getParticipants)
router.put('/:id/file', uploadSingleFile, replaceFile)
router.patch('/:id', updateDocument)
router.delete('/:id', deleteDocument)

export { router as DocumentRoutes }
