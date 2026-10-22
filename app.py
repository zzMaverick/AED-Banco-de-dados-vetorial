"""Busca de procedimentos internos com embeddings reais e Qdrant persistente."""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
from importlib.metadata import version
import json
import math
import os
from pathlib import Path
import platform
import re
import sys
import threading
import time
import unicodedata
import uuid

from fastembed import TextEmbedding
from qdrant_client import QdrantClient, models

ROOT = Path(__file__).resolve().parent
MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
DIM = 384
LIMIAR = 0.40
STOP = set("a o as os um uma de da do das dos em na no nas nos para por com e ou que qual quais como é ao aos se eu meu minha meus minhas preciso posso fazer tenho foi estou está estão isso esse essa quando onde".split())

COLECAO = "procedimentos"
PREFIXO_ANTIGO = "procedimentos_"


class DocumentoDuplicado(ValueError):
    pass


class DocumentoAusente(KeyError):
    pass


def palavras(texto: str) -> list[str]:
    texto = "".join(c for c in unicodedata.normalize("NFKD", texto.lower()) if not unicodedata.combining(c))
    return [p for p in re.findall(r"\w+", texto) if p not in STOP and len(p) > 1]


def fragmentar(texto: str, tamanho: int = 70, sobreposicao: int = 12) -> list[str]:
    if tamanho <= 0 or not 0 <= sobreposicao < tamanho:
        raise ValueError("Parâmetros de fragmentação inválidos.")
    itens = texto.split()
    resultado = []
    for inicio in range(0, len(itens), tamanho - sobreposicao):
        resultado.append(" ".join(itens[inicio:inicio + tamanho]))
        if inicio + tamanho >= len(itens):
            break
    return resultado


def validar_documento(doc: dict) -> None:
    if not isinstance(doc, dict):
        raise ValueError("Documento deve ser um objeto.")
    for campo in ("id", "titulo", "area", "fonte", "versao", "secoes"):
        if not doc.get(campo):
            raise ValueError(f"Documento sem {campo}.")
    if not isinstance(doc["secoes"], list):
        raise ValueError(f"Seções de {doc['id']} devem ser uma lista.")
    for secao in doc["secoes"]:
        if not isinstance(secao, dict) or not secao.get("titulo") or not secao.get("texto", "").strip():
            raise ValueError(f"Seção inválida em {doc['id']}.")


def carregar(base: Path) -> list[dict]:
    docs = json.loads(base.read_text(encoding="utf-8"))
    if not isinstance(docs, list) or not docs:
        raise ValueError("A base deve ser uma lista não vazia de documentos.")
    ids = set()
    for doc in docs:
        validar_documento(doc)
        if doc["id"] in ids:
            raise ValueError(f"ID repetido: {doc['id']}")
        ids.add(doc["id"])
    return docs


def escrever_json(base: Path, documentos: list[dict]) -> None:
    base.parent.mkdir(parents=True, exist_ok=True)
    temporario = base.with_name(base.name + ".tmp")
    temporario.write_text(json.dumps(documentos, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(temporario, base)


def hash_documento(doc: dict) -> str:
    canonical = json.dumps(doc, sort_keys=True, ensure_ascii=False).encode()
    return hashlib.sha256(canonical).hexdigest()[:16]


class Busca:
    def __init__(self, base: Path, estado: Path, cache_modelo: Path | None = None):
        self.base = base
        self.documentos = carregar(base)
        estado.mkdir(parents=True, exist_ok=True)
        self.modelo = TextEmbedding(MODEL, cache_dir=str(cache_modelo or estado / "modelos"), threads=2)
        self.assinatura = self._assinatura_pipeline()
        self.colecao = COLECAO
        self._lock = threading.Lock()
        qdrant_host = os.environ.get(
            "QDRANT_HOST",
            "http://localhost:6333"
        )
        self.cliente = QdrantClient(url=qdrant_host)
        self.trechos = self._montar_trechos()
        try:
            self.indexar()
        except Exception:
            self.cliente.close()
            raise

    def close(self):
        self.cliente.close()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()

    @staticmethod
    def _assinatura_pipeline() -> str:
        dados = {"modelo": MODEL, "fastembed": version("fastembed"), "pipeline": "secoes-70-12-v1"}
        return hashlib.sha256(json.dumps(dados, sort_keys=True).encode()).hexdigest()

    def _trechos_de(self, doc: dict) -> list[dict]:
        trechos = []
        for s, secao in enumerate(doc["secoes"], 1):
            for n, texto in enumerate(fragmentar(secao["texto"]), 1):
                trechos.append({
                    "documento_id": doc["id"], "titulo": doc["titulo"],
                    "area": doc["area"], "fonte": doc["fonte"], "versao": doc["versao"],
                    "secao": secao["titulo"], "trecho_id": f"{doc['id']}-S{s}-T{n}",
                    "texto": texto, "modelo": MODEL, "assinatura": self.assinatura,
                    "hash_documento": hash_documento(doc),
                })
        return trechos

    def _montar_trechos(self) -> list[dict]:
        return [t for doc in self.documentos for t in self._trechos_de(doc)]

    def _pontos(self, trechos: list[dict]) -> list[models.PointStruct]:
        if not trechos:
            return []
        entradas = [f"{t['titulo']}. {t['secao']}. {t['texto']}" for t in trechos]
        vetores = list(self.modelo.embed(entradas, batch_size=16))
        return [models.PointStruct(id=str(uuid.uuid5(uuid.NAMESPACE_URL, t["trecho_id"])),
                                   vector=v.tolist(), payload=t) for t, v in zip(trechos, vetores)]

    def _garantir_colecao(self) -> None:
        if not self.cliente.collection_exists(self.colecao):
            self.cliente.create_collection(self.colecao, vectors_config=models.VectorParams(size=DIM, distance=models.Distance.COSINE))
        config = self.cliente.get_collection(self.colecao).config.params.vectors
        if config.size != DIM or config.distance != models.Distance.COSINE:
            raise ValueError("Coleção incompatível com o modelo e a métrica configurados.")

    def _remover_colecoes_antigas(self) -> None:
        try:
            existentes = self.cliente.get_collections().collections
        except Exception:
            return
        for colecao in existentes:
            if colecao.name.startswith(PREFIXO_ANTIGO):
                self.cliente.delete_collection(colecao.name)

    def _documentos_indexados(self) -> dict[str, str | None]:
        mapa: dict[str, str | None] = {}
        offset = None
        while True:
            registros, offset = self.cliente.scroll(
                self.colecao, limit=256, offset=offset,
                with_payload=["documento_id", "hash_documento"], with_vectors=False,
            )
            for ponto in registros:
                payload = ponto.payload or {}
                if payload.get("documento_id"):
                    mapa[payload["documento_id"]] = payload.get("hash_documento")
            if offset is None:
                break
        return mapa

    def _excluir_vetores(self, documentos_ids) -> None:
        ids = [i for i in documentos_ids if i]
        if not ids:
            return
        self.cliente.delete(
            self.colecao,
            points_selector=models.FilterSelector(filter=models.Filter(must=[
                models.FieldCondition(key="documento_id", match=models.MatchAny(any=ids))
            ])),
            wait=True,
        )

    def _reindexar_documento(self, doc: dict) -> None:
        self._garantir_colecao()
        self._excluir_vetores([doc["id"]])
        self.cliente.upsert(self.colecao, points=self._pontos(self._trechos_de(doc)), wait=True)

    def indexar(self):
        self._remover_colecoes_antigas()
        self._garantir_colecao()
        atuais = {doc["id"]: hash_documento(doc) for doc in self.documentos}
        indexados = self._documentos_indexados()

        removidos = [i for i in indexados if i not in atuais]
        alterados = [i for i, marca in atuais.items() if indexados.get(i) != marca]
        if removidos:
            self._excluir_vetores(removidos)
        if not removidos and not alterados:
            return
        pendentes = [doc for doc in self.documentos if doc["id"] in set(alterados)]
        pontos = [p for doc in pendentes for p in self._pontos(self._trechos_de(doc))]
        if pontos:
            self.cliente.upsert(self.colecao, points=pontos, wait=True)

    def _gravar_base(self) -> None:
        escrever_json(self.base, self.documentos)

    def criar(self, doc: dict) -> dict:
        with self._lock:
            if any(d["id"] == doc["id"] for d in self.documentos):
                raise DocumentoDuplicado(f"Já existe um documento com o ID {doc['id']}.")
            validar_documento(doc)
            self._reindexar_documento(doc)
            try:
                self.documentos.append(doc)
                self._gravar_base()
            except Exception:
                self.documentos.pop()
                self._excluir_vetores([doc["id"]])
                raise
            self.trechos = self._montar_trechos()
            return doc

    def atualizar(self, doc_id: str, doc: dict) -> dict:
        with self._lock:
            indice = next((n for n, d in enumerate(self.documentos) if d["id"] == doc_id), None)
            if indice is None:
                raise DocumentoAusente(doc_id)
            anterior = self.documentos[indice]
            novo = {**doc, "id": doc_id}
            validar_documento(novo)
            self._reindexar_documento(novo)
            try:
                self.documentos[indice] = novo
                self._gravar_base()
            except Exception:
                self.documentos[indice] = anterior
                self._reindexar_documento(anterior)
                raise
            self.trechos = self._montar_trechos()
            return novo

    def remover(self, doc_id: str) -> dict:
        with self._lock:
            indice = next((n for n, d in enumerate(self.documentos) if d["id"] == doc_id), None)
            if indice is None:
                raise DocumentoAusente(doc_id)
            anterior = self.documentos[indice]
            self._excluir_vetores([doc_id])
            try:
                self.documentos.pop(indice)
                self._gravar_base()
            except Exception:
                self.documentos.insert(indice, anterior)
                self._reindexar_documento(anterior)
                raise
            self.trechos = self._montar_trechos()
            return anterior

    def reindexar(self, doc_id: str | None = None) -> dict:
        with self._lock:
            if doc_id is None:
                if self.cliente.collection_exists(self.colecao):
                    self.cliente.delete_collection(self.colecao)
                self.indexar()
                return {"escopo": "base", "documentos": len(self.documentos), "trechos": len(self.trechos)}
            doc = next((d for d in self.documentos if d["id"] == doc_id), None)
            if doc is None:
                raise DocumentoAusente(doc_id)
            self._reindexar_documento(doc)
            return {"escopo": doc_id, "documentos": 1, "trechos": len(self._trechos_de(doc))}

    def buscar(self, pergunta: str, top_k: int = 3, area: str | None = None, limiar: float = LIMIAR) -> dict:
        if not pergunta.strip():
            raise ValueError("Informe uma pergunta.")
        if not 1 <= top_k <= 20 or not -1 <= limiar <= 1:
            raise ValueError("Top-k deve estar entre 1 e 20 e limiar entre -1 e 1.")
        inicio = time.perf_counter()
        vetor = next(self.modelo.embed([pergunta])).tolist()
        filtro = models.Filter(must=[models.FieldCondition(key="area", match=models.MatchValue(value=area))]) if area else None
        hits = self.cliente.query_points(collection_name=self.colecao, query=vetor,
                                         query_filter=filtro, limit=top_k, with_payload=True).points
        resultado = [{**p.payload, "similaridade": round(p.score, 6)} for p in hits]
        relevantes = [p for p in resultado if p["similaridade"] >= limiar]
        return {"pergunta": pergunta, "area": area, "top_k": top_k, "limiar": limiar,
                "status": "trechos_encontrados" if relevantes else "sem_evidencia_suficiente",
                "resultados": relevantes, "candidatos": resultado,
                "tempo_ms": round((time.perf_counter() - inicio) * 1000, 3)}

    def lexical(self, pergunta: str, top_k: int = 3, area: str | None = None) -> list[dict]:
        textos = [set(palavras(f"{t['titulo']} {t['secao']} {t['texto']}")) for t in self.trechos]
        df = Counter(p for texto in textos for p in texto)
        consulta = set(palavras(pergunta))
        resultados = []
        for t, termos in zip(self.trechos, textos):
            if area is not None and t["area"] != area:
                continue
            pontos = sum(math.log(1 + (len(textos) + 1) / (df[p] + 1)) for p in consulta & termos)
            if pontos > 0:
                resultados.append({**t, "pontuacao_lexical": round(pontos, 6)})
        return sorted(resultados, key=lambda x: (-x["pontuacao_lexical"], x["trecho_id"]))[:top_k]

    def exemplo_vetor(self, trecho_id: str | None = None) -> dict:
        if not self.trechos:
            raise ValueError("A base não possui trechos indexados.")
        if trecho_id is None:
            trecho_id = min(self.trechos, key=lambda t: (t["documento_id"], t["trecho_id"]))["trecho_id"]
        elif not any(t["trecho_id"] == trecho_id for t in self.trechos):
            raise DocumentoAusente(trecho_id)
        ponto_id = str(uuid.uuid5(uuid.NAMESPACE_URL, trecho_id))
        registros = self.cliente.retrieve(self.colecao, ids=[ponto_id], with_payload=True, with_vectors=True)
        if not registros:
            raise DocumentoAusente(trecho_id)
        ponto = registros[0]
        return {"id": str(ponto.id), "dimensoes": len(ponto.vector), "vetor": ponto.vector, "metadados": ponto.payload}


def avaliar(busca: Busca, testes: Path | list[dict]) -> dict:
    casos = testes if isinstance(testes, list) else json.loads(testes.read_text(encoding="utf-8"))
    resultados = []
    for caso in casos:
        r = busca.buscar(caso["pergunta"], area=caso.get("area"))
        lexical = busca.lexical(caso["pergunta"], area=caso.get("area"))
        esperado = caso["esperado"]
        ids = [p["documento_id"] for p in r["candidatos"]]
        ids_lex = [p["documento_id"] for p in lexical]
        resultados.append({**caso, **r, "lexical": lexical,
                           "acerto_top1": bool(esperado and ids and ids[0] == esperado),
                           "acerto_top3": bool(esperado and esperado in ids),
                           "lexical_top1": bool(esperado and ids_lex and ids_lex[0] == esperado),
                           "lexical_top3": bool(esperado and esperado in ids_lex),
                           "abstencao_correta": esperado is None and r["status"] == "sem_evidencia_suficiente"})
    positivos = [r for r in resultados if r["esperado"] is not None]
    negativos = [r for r in resultados if r["esperado"] is None]
    medias = lambda chave: round(sum(r[chave] for r in positivos) / len(positivos), 6) if positivos else None
    return {"executado_em_utc": datetime.now(timezone.utc).isoformat(),
            "ambiente": {"python": platform.python_version(), "sistema": platform.system(),
                         **{p: version(p) for p in ("qdrant-client", "fastembed", "onnxruntime", "numpy")}},
            "modo": "Qdrant persistente com coleção estável e busca exata",
            "modelo": MODEL, "dimensoes": DIM, "colecao": busca.colecao,
            "documentos": len(busca.documentos), "trechos": len(busca.trechos),
            "resumo": {"positivos": len(positivos), "negativos": len(negativos),
                       "acuracia_top1_vetorial": medias("acerto_top1"),
                       "hit_rate_top3_vetorial": medias("acerto_top3"),
                       "acuracia_top1_lexical": medias("lexical_top1"),
                       "hit_rate_top3_lexical": medias("lexical_top3"),
                       "abstencoes_corretas": sum(r["abstencao_correta"] for r in negativos),
                       "positivos_acima_limiar": sum(r["status"] == "trechos_encontrados" for r in positivos)},
            "nota": "Base e perguntas fictícias de demonstração. Top-1 e Top-3 medidos antes do limiar. Cada pergunta positiva tem um documento esperado. Não é benchmark de produção nem comparação entre todos os mecanismos lexicais.",
            "casos": resultados}


def exibir(resultado: dict):
    print(f"\nPergunta: {resultado['pergunta']}")
    print(f"Filtro por área: {resultado['area'] or 'todas'}")
    print(f"Status: {resultado['status']} | Tempo da consulta: {resultado['tempo_ms']:.1f} ms")
    if not resultado["resultados"]:
        print("Nenhum trecho atingiu o limiar. Consulte a área responsável.")
    for n, p in enumerate(resultado["resultados"], 1):
        print(f"\n{n}. {p['titulo']} | cosseno {p['similaridade']:.4f}")
        print(f"Fonte: {p['fonte']}, versão {p['versao']}, seção {p['secao']} ({p['trecho_id']})")
        print(p["texto"])
    print("\nA pontuação mede proximidade vetorial e não é percentual de certeza.")


def salvar(path: Path, conteudo):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(conteudo, ensure_ascii=False, indent=2), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", type=Path, default=ROOT / "dados/procedimentos.json")
    parser.add_argument("--estado", type=Path, default=Path(os.environ.get("ESTADO_DIR", ROOT / "estado")))
    subs = parser.add_subparsers(dest="comando", required=True)
    subs.add_parser("indexar", help="Prepara ou reutiliza a coleção persistente.")
    subs.add_parser("demo", help="Executa a pergunta do exemplo da apresentação.")
    b = subs.add_parser("buscar", help="Pesquisa livre por similaridade.")
    b.add_argument("pergunta")
    b.add_argument("--area")
    b.add_argument("--top-k", type=int, default=3)
    b.add_argument("--limiar", type=float, default=LIMIAR)
    b.add_argument("--json", action="store_true")
    a = subs.add_parser("avaliar", help="Mede recuperação e compara com baseline lexical simples.")
    a.add_argument("--testes", type=Path, default=ROOT / "dados/consultas_teste.json")
    a.add_argument("--saida", type=Path, default=ROOT / "evidencias/nova_avaliacao.json")
    v = subs.add_parser("vetor", help="Exporta um vetor real da coleção e seus metadados.")
    v.add_argument("--saida", type=Path, default=ROOT / "evidencias/vetor_exemplo.json")
    args = parser.parse_args()
    try:
        with Busca(args.base, args.estado) as busca:
            if args.comando == "indexar":
                print(f"Coleção pronta: {busca.colecao}; {len(busca.documentos)} documentos; {len(busca.trechos)} trechos; {DIM} dimensões.")
            elif args.comando == "demo":
                exibir(busca.buscar("Qual é o procedimento para aprovar uma compra emergencial?"))
            elif args.comando == "buscar":
                r = busca.buscar(args.pergunta, args.top_k, args.area, args.limiar)
                print(json.dumps(r, ensure_ascii=False, indent=2)) if args.json else exibir(r)
            elif args.comando == "vetor":
                salvar(args.saida, busca.exemplo_vetor())
                print(f"Vetor de {DIM} dimensões salvo em {args.saida}.")
            else:
                r = avaliar(busca, args.testes)
                salvar(args.saida, r)
                print(json.dumps(r["resumo"], ensure_ascii=False, indent=2))
                print(f"Evidências salvas em {args.saida}.")
    except (ValueError, OSError, RuntimeError) as exc:
        print(f"Erro: {exc}\nNa primeira execução, mantenha acesso à internet para baixar o modelo. Execute apenas um processo por diretório de estado.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
