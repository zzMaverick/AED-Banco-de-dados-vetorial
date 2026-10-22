"""Testes de integração com embeddings reais e Qdrant, sem mocks."""
from pathlib import Path
import tempfile
import unittest

from app import Busca, ROOT, fragmentar


class Integracao(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import os
        cls.temp = tempfile.TemporaryDirectory()
        cls.estado = Path(cls.temp.name)
        cls.cache = Path(os.environ.get("ESTADO_DIR", ROOT / "estado")) / "modelos"
        cls.busca = Busca(ROOT / "dados/procedimentos.json", cls.estado, cache_modelo=cls.cache)

    @classmethod
    def tearDownClass(cls):
        cls.busca.close()
        cls.temp.cleanup()

    def test_01_consulta_semantica_com_vocabulario_diferente(self):
        r = self.busca.buscar("Qual é o procedimento para aprovar uma compra emergencial?")
        self.assertEqual(r["candidatos"][0]["documento_id"], "PR001")

    def test_02_filtro_antes_da_busca(self):
        r = self.busca.buscar("Como solicitar equipamentos?", area="Compras", top_k=20, limiar=-1)
        self.assertTrue(r["candidatos"])
        self.assertTrue(all(p["area"] == "Compras" for p in r["candidatos"]))

    def test_03_area_inexistente_nao_retorna(self):
        self.assertEqual(self.busca.buscar("compra", area="Área inexistente")["candidatos"], [])

    def test_04_fonte_e_vetor_reais(self):
        p = self.busca.exemplo_vetor()
        self.assertEqual(p["dimensoes"], 384)
        self.assertTrue(p["metadados"]["fonte"])
        self.assertGreater(sum(abs(x) for x in p["vetor"]), 0)

    def test_05_pergunta_fora_do_dominio(self):
        r = self.busca.buscar("Qual é a receita de bolo de cenoura com cobertura de chocolate?")
        self.assertEqual(r["status"], "sem_evidencia_suficiente")

    def test_06_reindexacao_idempotente(self):
        antes = self.busca.cliente.count(self.busca.colecao, exact=True).count
        self.busca.indexar()
        self.assertEqual(self.busca.cliente.count(self.busca.colecao, exact=True).count, antes)

    def test_07_persistencia_apos_reabrir(self):
        nome = self.busca.colecao
        self.busca.close()
        self.__class__.busca = Busca(ROOT / "dados/procedimentos.json", self.estado, cache_modelo=self.cache)
        self.assertEqual(self.busca.colecao, nome)
        self.assertEqual(self.busca.buscar("Esqueci minha senha")["candidatos"][0]["documento_id"], "PR003")

    def test_08_validacao_e_fragmentacao(self):
        with self.assertRaises(ValueError):
            self.busca.buscar(" ")
        with self.assertRaises(ValueError):
            self.busca.buscar("teste", top_k=0)
        itens = " ".join(str(i) for i in range(100))
        partes = fragmentar(itens)
        self.assertEqual(len(partes), 2)
        self.assertEqual(partes[0].split()[-12:], partes[1].split()[:12])


if __name__ == "__main__":
    unittest.main(verbosity=2)
