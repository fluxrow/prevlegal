import { readdir, readFile, stat } from 'fs/promises'
import path from 'path'

type PlanningKnowledgeBlock = {
  content: string
  warning: string | null
  files: string[]
}

const KNOWLEDGE_ROOT = path.join(process.cwd(), 'docs', 'agent-knowledge', 'planejamento-previdenciario')

let planningKnowledgeCache:
  | {
      signature: string
      block: PlanningKnowledgeBlock
    }
  | null = null

function buildSectionTitle(fileName: string) {
  const base = fileName.replace(/\.md$/i, '')
  return base
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function getPlanningKnowledgeBlock(): Promise<PlanningKnowledgeBlock> {
  try {
    const dirEntries = await readdir(KNOWLEDGE_ROOT, { withFileTypes: true })
    const markdownFiles = dirEntries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))

    if (!markdownFiles.length) {
      return {
        content: '',
        warning: `Nenhum arquivo de conhecimento encontrado em ${KNOWLEDGE_ROOT}. Seguindo sem injeção técnica adicional.`,
        files: [],
      }
    }

    const fileStats = await Promise.all(
      markdownFiles.map(async (fileName) => {
        const filePath = path.join(KNOWLEDGE_ROOT, fileName)
        const info = await stat(filePath)
        return `${fileName}:${info.mtimeMs}`
      }),
    )

    const signature = fileStats.join('|')
    if (planningKnowledgeCache?.signature === signature) {
      return planningKnowledgeCache.block
    }

    const fileContents = await Promise.all(
      markdownFiles.map(async (fileName) => {
        const filePath = path.join(KNOWLEDGE_ROOT, fileName)
        const raw = await readFile(filePath, 'utf8')
        return `===== ${buildSectionTitle(fileName)} (${fileName}) =====\n${raw.trim()}`
      }),
    )

    const block = {
      content: fileContents.join('\n\n'),
      warning: null,
      files: markdownFiles,
    } satisfies PlanningKnowledgeBlock

    planningKnowledgeCache = {
      signature,
      block,
    }

    return block
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return {
        content: '',
        warning: `Diretório de conhecimento não encontrado em ${KNOWLEDGE_ROOT}. Seguindo sem injeção técnica adicional.`,
        files: [],
      }
    }

    console.warn('[agent-knowledge] Falha ao carregar base técnica do planejamento previdenciário:', error)
    return {
      content: '',
      warning: 'Falha ao carregar a base de conhecimento técnico do planejamento previdenciário. Seguindo sem injeção adicional.',
      files: [],
    }
  }
}
