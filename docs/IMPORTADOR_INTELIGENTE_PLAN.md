# PrevLegal — Importador Inteligente

## Objetivo

Permitir que o PrevLegal aceite planilhas e fontes de lead com formatos variados sem obrigar o operador a normalizar tudo manualmente antes do upload.

## Escopo em duas camadas

### Camada 1 — Resolvida nesta fase

- suportar planilhas com:
  - colunas em ordem diferente
  - cabeçalhos variados
  - CSV / XLSX / XLS
- manter compatibilidade com o layout legado por posição fixa
- mapear automaticamente campos canônicos quando os cabeçalhos forem reconhecíveis

### Camada 2 — Próxima fase

- suportar fontes que não seguem o modelo previdenciário clássico
- exemplos:
  - Google Maps / Places
  - listas de prospecção B2B
  - bases de parceiros
  - planilhas sem `NB`
- permitir import com confirmação de mapeamento e templates salvos por fonte

## Estado atual do core

Hoje o importador do PrevLegal já consegue aceitar:

- `layout legado fixo`
  - como a planilha clássica de benefícios
- `layout por cabeçalhos`
  - desde que existam pelo menos:
    - `nb`
    - `nome`
  - e haja cabeçalhos suficientes para o detector reconhecer a estrutura

Campos já reconhecíveis nesta fase:

- `nb`
- `nome`
- `cpf`
- `telefone`
- `email`
- `aps`
- `banco`
- `dib`
- `tipo_beneficio`
- `valor_rma`
- `status`
- `ganho_potencial`
- `categoria_profissional`

## Limite estrutural atual

O schema operacional ainda assume o lead previdenciário tradicional como base principal de importação.

Na prática isso significa:

- o import atual ainda depende de `nb`
- fontes sem `nb` ainda não entram corretamente no mesmo fluxo sem adaptação de produto/schema

Isso impacta diretamente:

- Google Maps / Places
- listas comerciais B2B
- planilhas externas de prospecção sem benefício identificado

## Direção recomendada para a próxima fase

Criar uma camada de importação orientada a fonte, com:

### 1. Modelo canônico interno

Separar:

- `dados mínimos de contato`
- `dados previdenciários`
- `metadados da origem`

Exemplo de leitura canônica:

- `nome`
- `telefone`
- `email`
- `empresa`
- `cargo/profissão`
- `cidade`
- `origem`
- `origem_tipo`
- `source_payload`
- `nb` opcional quando aplicável

### 2. Templates de importação

Cada fonte pode salvar um template:

- `Google Maps Advogados Curitiba`
- `CSV Ana Planejamento`
- `Lista escritório parceiro`

O template guarda:

- nome da fonte
- mapeamento de colunas
- campos obrigatórios
- defaults
- regras de limpeza

### 3. Fluxo assistido

O import ideal deve seguir:

1. upload
2. detecção automática
3. confirmação visual do mapeamento
4. preview de linhas
5. validação
6. importação final

### 4. Staging antes do lead final

Para fontes não previdenciárias, vale criar uma área intermediária de staging:

- `import_batches`
- `import_batch_rows`
- `import_templates`

Isso permite:

- revisar qualidade
- salvar erros por linha
- reaproveitar templates
- promover para `leads` só depois da confirmação

## Regra de produto

O PrevLegal deve padronizar o **modelo interno**, não exigir uma única planilha externa.

Ou seja:

- por fora, aceitamos formatos variados
- por dentro, normalizamos para um schema canônico do produto

## Próximo passo sugerido

Implementar a `Fase 2` do importador:

- preview com mapeamento assistido
- templates de importação
- preparação para fontes sem `NB`
- foundation para Google Maps / Places e listas comerciais externas
