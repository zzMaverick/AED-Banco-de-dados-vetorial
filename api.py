from __future__ import annotations

from contextlib import asynccontextmanager
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

from app import (
    DIM,
    LIMIAR,
    MODEL,
    ROOT,
    Busca,
    DocumentoAusente,
    DocumentoDuplicado,
    avaliar,
)

ESTADO = Path(os.environ.get("ESTADO_DIR", ROOT / "estado"))
BASE = Path(os.environ.get("BASE_DADOS", ROOT / "dados/procedimentos.json"))
TESTES = Path(os.environ.get("TESTES", ROOT / "dados/consultas_teste.json"))

ORDEM_AREAS = ["Compras", "Financeiro", "Tecnologia", "Pessoas", "Administrativo", "Seguranca"]

CONJUNTOS = {
    "padrao": {"rotulo": "Conjunto de teste", "origem": TESTES.name},
    "base": {"rotulo": "Documentos da base", "origem": "Base de procedimentos"},
}

_estado: dict = {"busca": None}


@asynccontextmanager
async def lifespan(_: FastAPI):
    _estado["busca"] = Busca(BASE, ESTADO)
    try:
        yield
    finally:
        _estado["busca"].close()
        _estado["busca"] = None


app = FastAPI(
    title="Consulta de Procedimentos Internos",
    description="Busca semântica de procedimentos internos com banco vetorial Qdrant.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def busca() -> Busca:
    instancia = _estado.get("busca")
    if instancia is None:  # pragma: no cover
        raise HTTPException(status_code=503, detail="Índice ainda não carregado. Tente novamente.")
    return instancia


ROTULOS = {
    "id": "identificador",
    "titulo": "título",
    "area": "área",
    "fonte": "fonte",
    "versao": "versão",
    "secoes": "seções",
}


class SecaoEntrada(BaseModel):
    titulo: str = Field(..., max_length=200)
    texto: str = Field(..., max_length=20000)

    @field_validator("titulo", "texto")
    @classmethod
    def preencher(cls, valor: str) -> str:
        valor = valor.strip()
        if not valor:
            raise ValueError("Campo obrigatório.")
        return valor


class DocumentoEntrada(BaseModel):
    id: str = Field(..., max_length=40, pattern=r"^[A-Za-z0-9][A-Za-z0-9._-]*$")
    titulo: str = Field(..., max_length=200)
    area: str = Field(..., max_length=80)
    fonte: str = Field(..., max_length=200)
    versao: str = Field(..., max_length=40)
    secoes: list[SecaoEntrada] = Field(..., min_length=1)

    @field_validator("id", "titulo", "area", "fonte", "versao")
    @classmethod
    def preencher(cls, valor: str) -> str:
        valor = valor.strip()
        if not valor:
            raise ValueError("Campo obrigatório.")
        return valor


class AvaliacaoEntrada(BaseModel):
    conjunto: str = Field(default="padrao", pattern=r"^(padrao|base)$")


def _traduzir_erro(erro: dict) -> tuple[str, str]:
    partes = [p for p in erro.get("loc", ()) if p != "body"]
    tipo = erro.get("type", "")
    if not partes:
        return "geral", "Requisição inválida."
    if len(partes) >= 2 and partes[0] == "secoes" and isinstance(partes[1], int):
        indice = partes[1]
        campo = str(partes[2]) if len(partes) > 2 else ""
        rotulo = ROTULOS.get(campo, campo or "campo")
        if tipo == "missing":
            return f"secoes.{indice}.{campo}", f"Seção {indice + 1}: informe o {rotulo}."
        return f"secoes.{indice}.{campo}", f"Seção {indice + 1}: valor inválido para o {rotulo}."
    campo = str(partes[0])
    rotulo = ROTULOS.get(campo, campo)
    if tipo == "missing":
        return campo, f"Informe o {rotulo}."
    if tipo == "string_pattern_mismatch":
        return campo, "Use apenas letras, números, ponto, hífen ou sublinhado."
    if tipo == "too_short":
        return campo, "Inclua ao menos uma seção." if campo == "secoes" else f"Informe o {rotulo}."
    if tipo == "string_too_long":
        return campo, f"O {rotulo} excede o tamanho máximo permitido."
    return campo, f"Valor inválido para o {rotulo}."


@app.exception_handler(RequestValidationError)
async def tratar_requisicao_invalida(_: Request, exc: RequestValidationError) -> JSONResponse:
    erros: dict[str, str] = {}
    for erro in exc.errors():
        campo, mensagem = _traduzir_erro(erro)
        erros.setdefault(campo, mensagem)
    if not erros:
        erros = {"geral": "Requisição inválida."}
    return JSONResponse(status_code=400, content={"detail": "Verifique os campos destacados.", "erros": erros})


class BuscaRequest(BaseModel):
    pergunta: str = Field(..., min_length=1, description="Pergunta em linguagem natural.")
    area: str | None = Field(default=None, description="Recorte temático opcional.")
    top_k: int = Field(default=3, ge=1, le=20, description="Quantidade de trechos retornados.")
    limiar: float = Field(default=LIMIAR, ge=-1, le=1, description="Similaridade mínima de cosseno.")


@app.get("/api/saude", summary="Status do serviço e conectividade com o Qdrant")
def saude() -> dict:
    instancia = busca()
    try:
        total = instancia.cliente.count(instancia.colecao, exact=True).count
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"Qdrant indisponível: {exc}") from exc
    return {
        "status": "ok",
        "qdrant": "conectado",
        "colecao": instancia.colecao,
        "documentos": len(instancia.documentos),
        "trechos": total,
        "modelo": MODEL,
        "dimensoes": DIM,
    }


@app.get("/api/areas", summary="Áreas disponíveis para filtro")
def areas() -> dict:
    instancia = busca()
    existentes = {doc["area"] for doc in instancia.documentos}
    ordenadas = [a for a in ORDEM_AREAS if a in existentes]
    ordenadas += sorted(existentes - set(ORDEM_AREAS))
    return {"areas": ordenadas}


@app.get("/api/documentos", summary="Documentos indexados e seus metadados")
def documentos() -> dict:
    instancia = busca()
    return {
        "total": len(instancia.documentos),
        "documentos": [
            {
                "id": doc["id"],
                "titulo": doc["titulo"],
                "area": doc["area"],
                "fonte": doc["fonte"],
                "versao": doc["versao"],
                "secoes": [s["titulo"] for s in doc["secoes"]],
            }
            for doc in instancia.documentos
        ],
    }


@app.get("/api/documentos/{doc_id}", summary="Detalhe completo de um documento, com as seções em texto")
def documento(doc_id: str) -> dict:
    instancia = busca()
    doc = next((d for d in instancia.documentos if d["id"] == doc_id), None)
    if doc is None:
        raise HTTPException(status_code=404, detail=f"Documento {doc_id} não encontrado.")
    return {"documento": doc}


@app.get("/api/trechos", summary="Trechos indexados da base real")
def trechos(documento_id: str | None = None) -> dict:
    instancia = busca()
    selecionados = [t for t in instancia.trechos if documento_id is None or t["documento_id"] == documento_id]
    return {
        "total": len(selecionados),
        "trechos": [
            {
                "trecho_id": t["trecho_id"],
                "documento_id": t["documento_id"],
                "titulo": t["titulo"],
                "area": t["area"],
                "secao": t["secao"],
            }
            for t in selecionados
        ],
    }


@app.post("/api/documentos", status_code=201, summary="Cria um documento e indexa apenas os seus trechos")
def criar_documento(documento: DocumentoEntrada) -> dict:
    try:
        criado = busca().criar(documento.model_dump())
    except DocumentoDuplicado as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"documento": criado, "mensagem": f"Documento {criado['id']} criado."}


@app.put("/api/documentos/{doc_id}", summary="Substitui um documento e reindexa somente os seus trechos")
def atualizar_documento(doc_id: str, documento: DocumentoEntrada) -> dict:
    try:
        atualizado = busca().atualizar(doc_id, documento.model_dump())
    except DocumentoAusente as exc:
        raise HTTPException(status_code=404, detail=f"Documento {doc_id} não encontrado.") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"documento": atualizado, "mensagem": f"Documento {doc_id} atualizado."}


@app.delete("/api/documentos/{doc_id}", summary="Remove um documento e os vetores associados")
def remover_documento(doc_id: str) -> dict:
    try:
        removido = busca().remover(doc_id)
    except DocumentoAusente as exc:
        raise HTTPException(status_code=404, detail=f"Documento {doc_id} não encontrado.") from exc
    return {"id": removido["id"], "mensagem": f"Documento {doc_id} removido."}


@app.post("/api/documentos/{doc_id}/reindexar", summary="Reprocessa um documento específico")
def reindexar_documento(doc_id: str) -> dict:
    try:
        return {"mensagem": f"Documento {doc_id} reindexado.", **busca().reindexar(doc_id)}
    except DocumentoAusente as exc:
        raise HTTPException(status_code=404, detail=f"Documento {doc_id} não encontrado.") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/reindexar", summary="Reconstrói o índice a partir do arquivo de procedimentos")
def reindexar_base() -> dict:
    try:
        return {"mensagem": "Índice reconstruído.", **busca().reindexar()}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/buscar", summary="Busca semântica por similaridade de cosseno")
def buscar(requisicao: BuscaRequest) -> dict:
    try:
        return busca().buscar(requisicao.pergunta, requisicao.top_k, requisicao.area, requisicao.limiar)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/api/avaliar", summary="Executa a avaliação e devolve o resumo das métricas")
def executar_avaliacao(requisicao: AvaliacaoEntrada | None = None) -> dict:
    instancia = busca()
    conjunto = requisicao.conjunto if requisicao else "padrao"
    if conjunto == "base":
        casos = [
            {"id": f"B-{doc['id']}", "pergunta": doc["titulo"], "esperado": doc["id"], "area": doc["area"]}
            for doc in instancia.documentos
        ]
    else:
        casos = TESTES
    resultado = avaliar(instancia, casos)
    return {**resultado, "conjunto": conjunto, **CONJUNTOS[conjunto]}


@app.get("/api/vetor/exemplo", summary="Vetor real de 384 dimensões e seus metadados")
def vetor_exemplo(trecho_id: str | None = None) -> dict:
    try:
        return busca().exemplo_vetor(trecho_id)
    except DocumentoAusente as exc:
        raise HTTPException(status_code=404, detail=f"Trecho {trecho_id} não encontrado.") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
