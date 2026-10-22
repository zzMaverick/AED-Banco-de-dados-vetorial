# Consulta de procedimentos internos com banco vetorial

Aplicação prática do conteúdo dos três arquivos enviados pelo grupo. O problema é localizar uma orientação interna mesmo quando o funcionário usa palavras diferentes das do manual.

Exemplo: perguntar **"Qual é o procedimento para aprovar uma compra emergencial?"** recupera o procedimento **"Aquisição urgente de materiais"**. O sistema exibe os trechos originais, sua fonte e a similaridade de cosseno.

## O que está implementado

- Banco vetorial **Qdrant em modo local persistente**, executado pelo cliente Python.
- Embeddings reais do modelo multilíngue `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`, com **384 dimensões**, usando FastEmbed e ONNX Runtime na CPU.
- Base fictícia de 12 procedimentos da Empresa Horizonte, dividida em 24 trechos.
- Consulta Top-k, filtro por área aplicado no Qdrant e limite mínimo de similaridade.
- Fonte, versão, seção e identificador em cada resultado.
- Persistência entre execuções em uma coleção de nome estável, reconciliada pelo hash de cada documento.
- API HTTP em FastAPI (`api.py`) e interface React que gerenciam o acervo: criar, editar, excluir e reindexar documentos, mantendo o JSON e o índice consistentes.
- Avaliação de 12 perguntas com documento esperado e 4 perguntas fora do domínio.
- Oito testes de integração executados com o modelo e o banco reais.

A aplicação é uma **busca semântica documental**. Ela implementa a recuperação utilizada em um RAG. Não há modelo generativo: os resultados são trechos originais, não uma resposta redigida por uma LLM. As políticas da empresa são fictícias e servem à demonstração de um problema real.

## Executar no Docker Desktop

Abra o terminal na pasta que contém `compose.yaml`. No Windows, use Docker Desktop em modo de contêineres Linux.

```powershell
docker compose build
docker compose run --rm app demo
```

Na primeira execução, o modelo é baixado da Hugging Face. A descrição do FastEmbed estima cerca de 0,22 GB para os pesos, além de arquivos auxiliares. Mantenha internet disponível e aguarde o término. As próximas execuções reutilizam o cache no volume `estado_vetorial`. Não é necessária chave de API nem instalação local do PostgreSQL.

Para perguntar livremente:

```powershell
docker compose run --rm app buscar "Paguei o hotel da viagem do meu bolso. Como recebo de volta?"
docker compose run --rm app buscar "Como aprovar uma compra emergencial?" --area Compras --top-k 3
docker compose run --rm app buscar "Esqueci minha senha"
docker compose run --rm app buscar "Qual é a receita de bolo de cenoura?"
```

As áreas cadastradas são `Compras`, `Financeiro`, `Tecnologia`, `Pessoas`, `Administrativo` e `Seguranca`. Os filtros exigem a grafia exata. Eles representam recortes temáticos, não autenticação ou controle de acesso.

Para ver um vetor real e repetir a avaliação:

```powershell
docker compose run --rm app vetor
docker compose run --rm app avaliar
docker compose run --rm --entrypoint python app testes.py
```

O arquivo `evidencias/nova_avaliacao.json` recebe os resultados da nova avaliação. Os resultados verificados nesta entrega estão em `evidencias/avaliacao_verificada.json`. A exportação do vetor usa `evidencias/vetor_exemplo.json`. O banco fica no volume e continua disponível quando o contêiner temporário termina. Execute um comando por vez: o modo local usa bloqueio exclusivo do diretório do banco.

## Executar diretamente em Python

Use Python 3.12. As dependências do arquivo `requirements.txt` estão fixadas nas versões utilizadas no teste em Linux.

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe app.py demo
.\.venv\Scripts\python.exe app.py buscar "Como solicitar acesso remoto?"
.\.venv\Scripts\python.exe app.py avaliar
.\.venv\Scripts\python.exe testes.py
```

No Linux, substitua o executável por `.venv/bin/python`. O estado local é salvo em `estado/`. Para usar outra pasta, coloque a opção global antes do comando: `python app.py --estado outra_pasta demo`.

## Resultado verificado

| Medida | Busca vetorial | Baseline lexical simples |
| --- | --- | --- |
| Documento esperado em primeiro lugar | 11 de 12, ou 91,7% | 7 de 12, ou 58,3% |
| Documento esperado entre os três trechos retornados | 12 de 12, ou 100% | 9 de 12, ou 75% |

Com limiar de cosseno 0,40, as 12 perguntas positivas tiveram pelo menos um candidato acima do limite e as 4 perguntas fora do domínio foram recusadas. Isso **não significa 100% de respostas corretas**. Na pergunta sobre férias, o primeiro resultado foi o procedimento de integração de novo colaborador; o documento correto ficou em segundo lugar.

O limiar foi ajustado de 0,50 para 0,40 após observar que 5 perguntas positivas ficavam sem resultado. Os dois registros estão em `evidencias/`. A calibração e a avaliação usam o mesmo conjunto didático, portanto esses números são exploratórios. Antes do uso real, defina o limiar e valide a qualidade em perguntas independentes de usuários, incluindo perguntas ambíguas e outras sem resposta.

O baseline soma pesos IDF dos termos da pergunta presentes no texto, após normalização. Ele não representa todos os mecanismos lexicais e não equivale a uma comparação com PostgreSQL, BM25 ou busca híbrida. As pontuações lexicais e de cosseno têm escalas diferentes.

## Fluxo implementado

1. Ler os documentos de `dados/procedimentos.json`.
2. Dividir cada seção em janelas de até 70 palavras, com sobreposição de 12 quando houver mais de uma janela. Nesta base, cada seção cabe em uma janela.
3. Vetorizar título, seção e trecho pelo mesmo modelo.
4. Gravar os vetores de 384 dimensões e os metadados no Qdrant.
5. Vetorizar a pergunta, aplicar o filtro opcional e buscar os Top-k por cosseno.
6. Exibir os trechos acima do limite e sua procedência. Quando nenhum atingir o limite, informar ausência de evidência suficiente.

O modo local faz busca exata nesta pequena base. A demonstração não mede HNSW, IVF, ANN, concorrência, escalabilidade ou latência de produção. Um servidor Qdrant seria uma evolução para atender múltiplos processos e configurar índices adequados ao volume.

## Alterar os procedimentos

Use a página **Documentos** da interface (criar, editar, excluir e reindexar) ou o `dados/procedimentos.json`, mantendo os campos e IDs únicos. O arquivo JSON é a fonte da verdade e o Qdrant é o índice derivado: cada operação grava o arquivo de forma atômica (`arquivo temporário + rename`) e atualiza somente os vetores do documento afetado, sob um lock de processo. Se a escrita no índice falhar, o arquivo não é alterado.

A coleção tem nome estável, `procedimentos`, em vez do nome derivado do hash do conteúdo. Na inicialização o serviço remove coleções antigas no formato `procedimentos_<hash>` e reconcilia o índice pelo hash de cada documento: órfãos são excluídos, alterados são reindexados e novos são inseridos. Não sobra coleção órfã após edições.

Reiniciar os serviços não perde documentos: `./dados` é montado como gravável e o índice fica no volume `qdrant_data`. Para forçar a reconstrução completa do índice a partir do JSON:

```powershell
docker compose run --rm app indexar
```

Com a pilha no ar, o mesmo efeito pelo endpoint `POST /api/reindexar` (um único documento: `POST /api/documentos/{id}/reindexar`):

```powershell
curl -X POST http://localhost:8000/api/reindexar
```

O formato de entrada implementado é JSON. PDFs, DOCX, OCR e pastas de documentos exigiriam uma etapa de extração e normalização antes de alimentar esse formato. O corpus de políticas não foi extraído dos anexos: os anexos são a fundamentação teórica, e os procedimentos são a base fictícia criada para a aplicação prática.

## Demonstração em sala em cerca de cinco minutos

1. Apresente o problema: o funcionário chama uma aquisição urgente de compra emergencial.
2. Execute `demo` e mostre o PR001, os trechos e as fontes. Explique que Top-k pode incluir candidatos pouco relevantes.
3. Repita a pergunta com `--area Compras` para mostrar a filtragem por metadados.
4. Execute `vetor` e abra o JSON para mostrar as 384 dimensões junto aos metadados.
5. Execute uma pergunta fora do domínio e a avaliação. Comente a falha observada na pergunta sobre férias.
6. Conclua explicando que o banco recupera contexto. Uma LLM seria uma camada adicional se fosse necessário redigir respostas com base nos trechos.

Prepare o ambiente e baixe o modelo antes da apresentação. Os comandos Docker estão preparados, mas Docker não estava disponível no ambiente desta entrega. O fluxo Python, a persistência, as consultas e os oito testes de integração foram executados.

## Relação com os arquivos enviados

O caso concretiza a seção 5.5 de `BancoDeDadosVetoriais.docx` e o exemplo de empresa no slide 10 da apresentação anexada. Embeddings, cosseno, Top-k e caminhos de escrita e leitura aparecem no código. O roteiro anexado enumera 16 slides, mas o PPTX fornecido contém 13. Para localizar o exemplo no arquivo atual, use o título do slide e a posição 10.

## Referências técnicas

- Qdrant Client, modo local persistente e consultas: https://github.com/qdrant/qdrant-client
- FastEmbed, modelos suportados e dimensões: https://qdrant.github.io/fastembed/examples/Supported_Models/
- Qdrant, guia de execução local: https://qdrant.tech/documentation/quickstart/
- Modelo ONNX usado pelo FastEmbed: https://huggingface.co/qdrant/paraphrase-multilingual-MiniLM-L12-v2-onnx-Q

O modelo utiliza licença Apache 2.0, segundo a relação de modelos do FastEmbed. Os pesos não integram este pacote e são obtidos na primeira execução.
