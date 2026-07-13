from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path

MODULE_PATH = Path(__file__).with_name("build_fgv_wave1_corpus.py")
spec = importlib.util.spec_from_file_location("build_fgv_wave1_corpus", MODULE_PATH)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)


class Wave1ClassifierRegressionTests(unittest.TestCase):
    def classify(self, text: str) -> dict:
        return module.auto_classify(text)

    def test_redistribuicao_is_not_redis(self) -> None:
        result = self.classify(
            "O Poder Executivo promoveu redistribuição de cargo entre órgãos públicos."
        )
        self.assertNotEqual(result["primarySubtopicId"], "dp26-p3-esp-bd-nosql")

    def test_iso_38500_is_not_iso_27001(self) -> None:
        result = self.classify(
            "A norma ABNT NBR ISO/IEC 38500 trata da governança corporativa de TI."
        )
        self.assertNotEqual(result["primarySubtopicId"], "dp26-p3-esp-si-iso")

    def test_distractor_alternatives_do_not_override_apf_stem(self) -> None:
        result = self.classify(
            "A análise de pontos de função não expressou custos não funcionais. "
            "Qual metodologia complementar deve ser usada? (A) SNAP (B) WSDL "
            "(C) UDDI (D) REST (E) CI/CD"
        )
        self.assertEqual(result["primarySubtopicId"], "dp26-p3-esp-metricas")

    def test_css_solid_is_not_solid_principles(self) -> None:
        result = self.classify(
            "Analise o HTML e CSS: div { border: 10px solid black; } "
            "(A) 10px (B) 20px (C) 30px (D) 40px (E) 50px"
        )
        self.assertEqual(result["primarySubtopicId"], "dp26-p3-esp-frontend")

    def test_literary_interview_is_not_requirements_elicitation(self) -> None:
        result = self.classify(
            "Na frase meu amigo esqueceu o aviso da entrevista, identifique a função da linguagem. "
            "(A) referencial (B) fática (C) emotiva (D) conativa (E) poética"
        )
        self.assertNotEqual(result["primarySubtopicId"], "dp26-p3-esp-requisitos")

    def test_gitlab_https_url_is_not_tls_topic(self) -> None:
        result = self.classify(
            "No GitLab CI/CD, configure um pipeline com include remote: "
            "https://gitlab.exemplo/projeto/.gitlab-ci.yml. (A) trigger (B) stage "
            "(C) runner (D) artifact (E) cache"
        )
        self.assertEqual(result["primarySubtopicId"], "dp26-p3-esp-devops-git")

    def test_gitlab_trigger_is_not_database_trigger(self) -> None:
        result = self.classify(
            "No GitLab CI/CD, o job usa trigger para iniciar outro pipeline. "
            "(A) correto (B) incorreto (C) depende (D) nenhum (E) todos"
        )
        self.assertNotEqual(result["primarySubtopicId"], "dp26-p3-esp-bd-sgbd")

    def test_generic_legal_authorization_is_not_access_control(self) -> None:
        result = self.classify(
            "A contratação direta depende de autorização da autoridade competente. "
            "(A) sempre (B) nunca (C) apenas em lei (D) por decreto (E) por edital"
        )
        self.assertNotEqual(result["primarySubtopicId"], "dp26-p3-esp-si-acesso")

    def test_scrum_method_is_agile_not_project_management(self) -> None:
        result = self.classify(
            "Scrum é um método ágil, iterativo e incremental para gerenciamento de projetos. "
            "São eventos Scrum: (A) Sprint Planning (B) orçamento (C) licitação "
            "(D) auditoria (E) inventário"
        )
        self.assertEqual(result["primarySubtopicId"], "dp26-p3-esp-metodologias-ageis")


    def test_iso_organization_normalization_is_not_database_normalization(self) -> None:
        result = self.classify(
            "A norma específica da Organização Internacional de Normalização ISO para serviços de nuvem é a ISO/IEC 27017. "
            "(A) ISO 9001 (B) ISO 27002 (C) ISO 27017 (D) ISO 45001 (E) ISO 14004"
        )
        self.assertNotEqual(result["primarySubtopicId"], "dp26-p3-esp-bd-normalizacao")



    def test_data_mining_object_maps_to_bi_not_generic_ai(self) -> None:
        result = self.classify(
            "Data Mining é o processo de explorar dados usando estatística e aprendizado de máquina. No contexto de Data Mining, qual técnica descobre padrões categóricos? "
            "(A) Apriori (B) regressão (C) SVM (D) árvore (E) PCA"
        )
        self.assertEqual(result["primarySubtopicId"], "dp26-p3-esp-bi-dw-mining")

    def test_tdd_object_maps_to_tests_not_generic_agile(self) -> None:
        result = self.classify(
            "TDD é uma prática de programação no escopo das metodologias ágeis e XP. Com relação aos objetivos do TDD, analise as afirmativas. "
            "(A) I (B) II (C) III (D) I e II (E) todos"
        )
        self.assertEqual(result["primarySubtopicId"], "dp26-p3-esp-testes")

    def test_test_frameworks_map_to_tests(self) -> None:
        result = self.classify(
            "Relacione os frameworks de testes JUnit, Mockito, Selenium e Jest às suas características. "
            "(A) 1-2-3-4 (B) 2-1-4-3 (C) 3-4-1-2 (D) 4-3-2-1 (E) nenhuma"
        )
        self.assertEqual(result["primarySubtopicId"], "dp26-p3-esp-testes")

    def test_explicit_engineering_requirements_beats_incidental_json_xml(self) -> None:
        result = self.classify(
            "O sistema exporta listas em PDF, JSON e XML. Considerando a solicitação do cliente à luz da engenharia de requisitos, identifique os requisitos funcionais e não funcionais. "
            "(A) três (B) quatro (C) cinco (D) seis (E) sete"
        )
        self.assertEqual(result["primarySubtopicId"], "dp26-p3-esp-requisitos")

    def test_explicit_requirement_classification_beats_incidental_languages(self) -> None:
        result = self.classify(
            "Uma aplicação usa JavaScript no frontend e Java no backend. Foram definidos requisitos funcionais e não funcionais. "
            "É requisito funcional permitir cadastro e login. (A) I apenas (B) II apenas (C) ambos (D) nenhum (E) todos"
        )
        self.assertEqual(result["primarySubtopicId"], "dp26-p3-esp-requisitos")

    def test_database_normal_form_remains_classified(self) -> None:
        result = self.classify(
            "Em um banco de dados relacional, a terceira forma normal elimina dependências transitivas. "
            "(A) 1FN (B) 2FN (C) 3FN (D) FNBC (E) nenhuma"
        )
        self.assertEqual(result["primarySubtopicId"], "dp26-p3-esp-bd-normalizacao")


    def test_python_operator_is_out_of_profile_scope(self) -> None:
        result = self.classify(
            "A linguagem de programação Python é usada em inteligência artificial. Em Python, o operador // realiza divisão inteira. "
            "(A) soma (B) potência (C) divisão inteira (D) módulo (E) concatenação"
        )
        self.assertEqual(result["classificationStatus"], "AUTO_EXCLUDED_OUT_OF_SCOPE")

    def test_r_language_operator_is_out_of_profile_scope(self) -> None:
        result = self.classify(
            "A linguagem de programação R é usada em ciência de dados. Em R, o operador %in% verifica a presença de elementos em um vetor. "
            "(A) união (B) interseção (C) pertinência (D) ordenação (E) concatenação"
        )
        self.assertEqual(result["classificationStatus"], "AUTO_EXCLUDED_OUT_OF_SCOPE")

    def test_real_nosql_remains_classified(self) -> None:
        result = self.classify(
            "No MongoDB, banco NoSQL orientado a documentos, analise a coleção. "
            "(A) documento (B) tabela (C) linha (D) coluna (E) esquema"
        )
        self.assertEqual(result["primarySubtopicId"], "dp26-p3-esp-bd-nosql")


if __name__ == "__main__":
    unittest.main()
